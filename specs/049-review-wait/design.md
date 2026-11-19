# 049 Review wait: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

A small tool in `scripts/review-wait/`, next to `scripts/watch/` and with the same shape: a thin
`cli.ts`, and classes that take their collaborators through the constructor so the tests run on
fakes. Nothing in `src/`, no new dependency, no network call but `gh`.

One read call is enough: `gh pr list --state merged --limit 1000 --json
number,title,createdAt,mergedAt,headRefName,files`. The `files` field carries `path` and
`changeType` (`ADDED`, `MODIFIED`, `DELETED`) for each file, so a pull request that adds `spec.md` is
told apart from one that edits its status without a second request per pull request (FR-1; `gh pr
view` is not needed). The `--since` filter runs locally on `mergedAt` (FR-4), so the call is the same
for every period.

The data flows in one line: `GhSource` returns `MergedPullRequest[]`; `StageRules` gives each one a
`spec` and a `stage`; `SpecTimeline` groups them and computes the waits; `ReportText` writes the
markdown; `ReportFolder` says where it goes; `cli.ts` joins them and writes the file.

### Classification

`StageRules.classify(files)` returns `{ specs: string[]; stage: Stage | null }`.

- **Specs.** Every distinct folder matched by `^specs/(\d{3}-[a-z0-9-]+)/`, e.g. `049-review-wait`,
  in path order (FR-2). No such path: the list is empty.
- **Stage**, first rule that matches:
  1. `code`: a path under `src/`, `installer/`, `packaging/`, `scripts/` or `tests/`.
  2. `design`: `design.md` or `tasks.md` with `changeType` `ADDED`.
  3. `spec`: `spec.md` with `changeType` `ADDED`.
  4. `implemented`: every path is a `spec.md` of a spec folder or `specs/README.md`, all `MODIFIED`.
  5. otherwise `null`: a pull request of a spec that fits no stage (an amendment, a manual-check
     note) is counted apart like one without a spec.

`code` comes first because an implementation pull request also ticks `tasks.md`; `design` before
`spec` because the approval pull request edits `spec.md` and adds the design in one go.

### Waits

`wait = mergedAt - createdAt`, in milliseconds (AC-4). Per spec:

- `cycle`: from the earliest `createdAt` of its pull requests to the `mergedAt` of its `implemented`
  one; `null` without an `implemented` pull request.
- `manual`: from the latest `mergedAt` of its `code` pull requests to the `mergedAt` of its
  `implemented` one (AC-5); `null` if either is missing. A negative value (the status was marked
  before the code) is reported as `null`.

Per stage: count, median (the mean of the two middle values for an even count) and longest (AC-6).

## Components

### `PullRequestSource.ts`

```ts
export interface MergedPullRequest {
  number: number;
  title: string;
  branch: string;
  createdAt: Date;
  mergedAt: Date;
  files: Array<{ path: string; changeType: 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED' | 'CHANGED' }>;
}

export interface PullRequestSource {
  merged(): Promise<MergedPullRequest[]>;
}
```

### `GhCli.ts`

Implements `PullRequestSource` over a `GhRunner = (args: string[]) => Promise<string>` (the real one
spawns `gh`; the tests pass a fake). It refuses to run any command outside `READ_COMMANDS`
(`pr list`, `pr view`): the first two arguments are checked before the runner is called, and a
different command throws (AC-9, NFR-1). Parses the JSON and turns the dates into `Date`.

### `StageRules.ts`

`export type Stage = 'spec' | 'design' | 'code' | 'implemented'` and `StageRules.classify` as above.

### `WaitStatistics.ts`

`WaitStatistics.summarise(waits: number[]): { count: number; median: number; longest: number }`.
An empty list gives zeros.

### `SpecTimeline.ts`

`SpecTimeline.build(pullRequests: MergedPullRequest[], since: Date | null)` returns
`{ stages: Record<Stage, StageSummary>, specs: SpecRow[], apart: number }`:
filters on `mergedAt >= since` (AC-8), classifies each pull request, adds it to the row of each of its
specs, counts it once in its stage, and counts apart the ones with no spec or no stage (AC-7). `SpecRow` is `{ spec, waits: Partial<Record<Stage,
number>>, cycle, manual }`; with several pull requests of the same stage in one spec the row shows
the longest wait.

### `ReportText.ts`

`ReportText.write(timeline, context)` returns the markdown (FR-3, FR-6): the header with the
period, the day of the run and the line `Times come from the opening and merge of the pull
requests; GitHub does not tell Tore from the agent.`, the per-stage table, the per-spec table
(`Spec | Spec | Design | Code | Implemented | Manual checks | Cycle`) and the count apart.
`formatDuration(ms)` rounds to the hour and prints `7 h` or `3 d 5 h`; `null` prints `–`.

### `ReportFolder.ts`

`ReportFolder.resolve({ out, root, exists })` returns the file path (AC-10, AC-11): `out` when given;
else `<root>/.claude/review-wait` when `exists('<root>/.claude')`; else `<root>/build/review-wait`.
The file is `<YYYY-MM-DD>.md` with the day of the run, so running twice in a day overwrites and
a later run adds a file for the private repo to version.

### `cli.ts`

`parseArgs` with `--since <date>` and `--out <dir>`; builds the pieces, prints the report, writes the
file with `mkdir -p`, prints its path. Usage error: exit 2; any other error: message and exit 1,
like `scripts/watch/cli.ts`. `package.json` gains `"review-wait": "tsx scripts/review-wait/cli.ts"`.

Sizes: every class stays far under the 200-line and complexity limits; `ReportText` is the largest
(about 90 lines).

## Tests

Names identical to the `auto:` checks, in `tests/review-wait/`. A `builders.ts` makes
`MergedPullRequest` values with one line each (the files, the two dates).

| AC | Test | File |
|---|---|---|
| AC-1 | `assigns a pull request to every spec whose folder it changes` | `StageRules.test.ts` |
| AC-2 | `classifies a pull request by what it changes` | `StageRules.test.ts` |
| AC-3 | `classifies a status-only pull request as implemented` | `StageRules.test.ts` |
| AC-4 | `computes the wait from opening to merge` | `SpecTimeline.test.ts` |
| AC-5 | `computes the wait of the manual checks of a spec` | `SpecTimeline.test.ts` |
| AC-6 | `summarises each stage with count, median and longest wait` | `SpecTimeline.test.ts` |
| AC-7 | `keeps pull requests without a spec out of the stages` | `SpecTimeline.test.ts` |
| AC-8 | `ignores pull requests merged before since` | `SpecTimeline.test.ts` |
| AC-9 | `calls only read commands of gh` | `GhCli.test.ts` |
| AC-10 | `saves the report in the private folder when there is one` | `ReportFolder.test.ts` |
| AC-11 | `saves the report in the folder given by out` | `ReportFolder.test.ts` |
| AC-12 | manual | checklist, T5 |

Extra tests, not tied to an AC: `ReportText.test.ts` (a fixed timeline gives the expected tables,
`3 d 5 h`, `–` for a missing value, the header line about the account) and
`falls back to build when there is no private folder` in `ReportFolder.test.ts`.

## Vivaldi interface

None. This is tooling; it ships nothing to users.

## Configuration

None. No option, no storage key, no secret.

## Docs owned by the lead

- `CONTRIBUTING.md`, Tooling table: a row for `npm run review-wait -- [--since <date>] [--out
  <dir>]`, with where the report goes.
- `specs/README.md`: row 049 to `Implemented` after the manual check.
- Version: none. The branch is `chore/review-wait` (tooling, like `chore/snapshot-watch`).

## Risks

| Risk | Mitigation |
|---|---|
| A pull request touching several specs (the bulk `Implemented` pull request #212) | It is assigned to each spec (FR-2, amended 2026-11-19 on Tore's decision) and counts once in the stage summary, so the stage numbers are not inflated |
| The `gh` JSON drops files beyond the first 100 of a pull request | Stage and spec are decided by the first matching paths; a pull request that big is a code pull request anyway |
| 1000 merged pull requests is a ceiling | The repository has about 215; the report prints a line when the list reached the ceiling |
| Waits include nights and weekends | Decided in the spec (raw time); the median keeps one weekend from dominating |
