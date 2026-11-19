# 049 Review wait: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `chore/review-wait`: tooling, so no version change. Each task ends green on `make check` and
no existing test changes its name.

Order and parallel work: T1 defines the types the others use and runs alone and first. T2 and T3
are independent and run in parallel, each in its own `vivarcdi-implementer` worktree from the commit
of T1. T4 and T5 are the lead's and come after.

- [ ] **T1. Types, stage rules and statistics.** `scripts/review-wait/PullRequestSource.ts`
  (`MergedPullRequest`, `PullRequestSource`), `StageRules.ts`, `WaitStatistics.ts`;
  `tests/review-wait/builders.ts` and `StageRules.test.ts`: `assigns a pull request to the spec whose
  folder it changes`, `classifies a pull request by what it changes`, `classifies a status-only pull
  request as implemented`. Small; it runs alone and first.
- [ ] **T2. Timeline and text.** `SpecTimeline.ts` and `ReportText.ts` with
  `tests/review-wait/SpecTimeline.test.ts`: `computes the wait from opening to merge`, `computes the
  wait of the manual checks of a spec`, `summarises each stage with count, median and longest wait`,
  `keeps pull requests without a spec out of the stages`, `ignores pull requests merged before
  since`; and `ReportText.test.ts`. From the commit of T1, in parallel with T3.
- [ ] **T3. Source and folder.** `GhCli.ts` and `ReportFolder.ts` with
  `tests/review-wait/GhCli.test.ts` (`calls only read commands of gh`) and `ReportFolder.test.ts`
  (`saves the report in the private folder when there is one`, `saves the report in the folder given
  by out`, `falls back to build when there is no private folder`). From the commit of T1, in
  parallel with T2.
- [ ] **T4. CLI, script and docs.** Owned by the lead: `scripts/review-wait/cli.ts`, the
  `review-wait` script in `package.json`, the row in the Tooling table of `CONTRIBUTING.md`,
  `make check`, and one real run against the repository to read the report once.
- [ ] **T5. Manual check.** Italian checklist for AC-12 under
  `~/Desktop/sonde-vivarci/049-review-wait/`, the last double check: run `npm run review-wait`,
  see specs 036 to 048 with plausible waits, finishing within a minute, and the file in
  `.claude/review-wait/`. When Tore reports it green, the spec becomes `Implemented`.
