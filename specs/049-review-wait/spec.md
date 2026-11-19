# 049 Review wait

| | |
|---|---|
| Status | Implemented |
| Phase | Tooling |
| Owner | Tore |
| Approved | Tore, 2026-11-19 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

VivArcDi is built through pull requests that wait for Tore: the spec, the design, the code, and then
the manual checks. Nobody knows today how long they wait, or which stage waits longest. This spec adds
a read-only command that reads the pull requests with `gh` and prints, per stage and per spec, how
long each one waited, so that the next change to the process (more parallel specs, smaller pull
requests, batched approvals) is decided on numbers.

It is the last step of the automation roadmap, after live verification, the snapshot watch and the
rules for working in parallel.

## User stories

- **US-1.** As Tore, I want to see how long my approvals take per stage (spec, design, code), so that I
  know where the waiting is.
- **US-2.** As Tore, I want the time from the last code merge to the `Implemented` mark per spec, so
  that I see what the manual checks cost.
- **US-3.** As Tore, I want the same report for any period, so that I can compare before and after a
  change of process.

## Expected behavior

`npm run review-wait` reads the merged pull requests of the repository with `gh`, groups the ones that
belong to a spec, and prints a markdown report on the terminal and saves it as a dated file. It never
writes to GitHub.

A pull request belongs to every spec whose files it changes under `specs/NNN-*/`, so a pull request
that marks six specs as implemented shows up in the row of each. Its stage follows from what it
changes:

| Stage | The pull request |
|---|---|
| `spec` | adds `spec.md` |
| `design` | adds `design.md` or `tasks.md` |
| `code` | changes `src/`, `installer/`, `packaging/`, `scripts/` or `tests/` |
| `implemented` | changes only the status of the spec and the index |

The wait of a pull request is the time from its opening to its merge. The report gives, per stage, the
number of pull requests, the median and the longest wait; then a table per spec with the wait of each
stage and the **cycle**: from the opening of the first pull request to the `implemented` merge. The
wait of the manual checks of a spec is the time from its last `code` merge to its `implemented` merge.
Pull requests that belong to no spec (releases, README, tooling) are counted apart and not averaged
into the stages.

`--since <date>` limits the report to pull requests merged from that day on.

The report is saved as `<out>/<YYYY-MM-DD>.md`. `<out>` is `--out <dir>` when given; otherwise it is
the private `.claude/review-wait/` of the project, where the reports are versioned with the rest of
the private notes, and `build/review-wait/` when there is no `.claude/` (another contributor, a CI
runner). The command is a plain npm script, so a pipeline can run it too.

GitHub cannot tell Tore from the agent: every pull request, comment and merge goes through the same
account. The report therefore uses only the times of opening and merge, never who commented, and it
says so in its header.

## Requirements

### Functional

- **FR-1.** The command lists merged pull requests with their opening time, merge time, title, branch
  and changed files, through `gh pr list` and `gh pr view`, and never calls a write endpoint.
- **FR-2.** A pull request is assigned to every spec whose `specs/NNN-*/` folder it changes, and to a
  stage by the table above. In the per-stage summary it counts once; in the per-spec table it counts
  in the row of each of its specs.
- **FR-3.** The report has the per-stage summary, the per-spec table, the cycle of each spec and the
  wait of its manual checks.
- **FR-4.** `--since <date>` filters on the merge time.
- **FR-5.** The report is printed on stdout and written to `<out>/<YYYY-MM-DD>.md`, where `<out>` is
  `--out`, else `.claude/review-wait/` if `.claude/` exists, else `build/review-wait/`.
- **FR-6.** Durations are shown in hours and days, rounded to the hour.

### Non-functional

- **NFR-1.** The command needs only `gh`, already authenticated, and no secret of its own; it runs
  the same on a developer machine and in a pipeline.
- **NFR-2.** `make check` stays offline: the stage rules, the grouping and the statistics are unit
  tested on a fixed list of pull requests; `gh` is behind a small interface with a fake.
- **NFR-3.** The report of the repository (about two hundred pull requests) is produced in under a
  minute.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria) and verifiable one by one. `Check` says how:
`auto` names the test that proves it, `live` names the scenario that proves it on a lab Vivaldi,
`manual` is a step Tore performs on a real Vivaldi.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a pull request changes files of several specs, THE report SHALL assign it to each of them | auto: `assigns a pull request to every spec whose folder it changes` |
| AC-2 | WHEN a pull request adds spec.md, design.md or code, THE report SHALL classify it as spec, design or code | auto: `classifies a pull request by what it changes` |
| AC-3 | WHEN a pull request changes only the status and the index, THE report SHALL classify it as implemented | auto: `classifies a status-only pull request as implemented` |
| AC-4 | THE report SHALL compute the wait of a pull request from its opening to its merge | auto: `computes the wait from opening to merge` |
| AC-5 | WHEN a spec has code and implemented pull requests, THE report SHALL give the wait of the manual checks from the last code merge to the implemented merge | auto: `computes the wait of the manual checks of a spec` |
| AC-6 | THE report SHALL give the count, the median and the longest wait of each stage | auto: `summarises each stage with count, median and longest wait` |
| AC-7 | WHEN a pull request belongs to no spec, THE report SHALL count it apart from the stages | auto: `keeps pull requests without a spec out of the stages` |
| AC-8 | WHEN given `--since`, THE report SHALL ignore pull requests merged before that day | auto: `ignores pull requests merged before since` |
| AC-9 | THE command SHALL call only read commands of `gh` | auto: `calls only read commands of gh` |
| AC-10 | WHEN given no `--out`, THE command SHALL save the report in `.claude/review-wait/` if `.claude/` exists, else in `build/review-wait/` | auto: `saves the report in the private folder when there is one` |
| AC-11 | WHEN given `--out`, THE command SHALL save the report there | auto: `saves the report in the folder given by out` |
| AC-12 | WHEN Tore runs the command on the repository, THE report SHALL list specs 036 to 048 with plausible waits and finish within a minute (last double check) | manual |

## Out of scope

- Telling Tore's time from the agent's: GitHub has one account for both, and the checklist round trips
  happen in the chat, not on GitHub.
- Time Tore spends reading or testing: only waiting time is measured, not effort.
- Charts, a dashboard or a scheduled run: the report is on demand.
- Pull requests that are still open or closed without merge.
- Any action on the numbers (reminders, labels, comments): a later decision, taken from the report.

## Open questions

- [x] **Raw or working time.** Decided: raw elapsed time, because the nights and weekends are part of
  what a pull request waits; the median keeps a single weekend from dominating.
- [x] **Where the report goes.** Decided: stdout and a dated file in the private `.claude/review-wait/`
  of the project, so the reports are versioned privately; `build/review-wait/` where there is no
  `.claude/`, because nothing in `.claude/` may be required by the codebase. Alternative: a pinned
  GitHub issue, which would need a write endpoint.
- [x] **Name of the command.** Decided: `npm run review-wait`, a script in `scripts/review-wait/` like
  `scripts/watch/`, so it is easy to run by hand and from a pipeline.
- [x] **Manual checks.** Decided: measured only through the proxy of AC-5. Measuring the chat round
  trips would need Tore to log them by hand, which costs more time than it reveals. Less manual work, more automation: the one manual criterion
  (AC-12) stays as the last double check, after the automated ones.

## References

- Automation roadmap, step 4: `.claude/plans/2026-11-18-automation-roadmap.md`
- [Working in parallel](../../CONTRIBUTING.md#working-in-parallel)
