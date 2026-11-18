# 047 Snapshot watch: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Starts after #184 is merged.

- [ ] **T1.** `DebianVersion` and `AptIndex` with a fixture `Packages` file. Satisfies AC-1. Done when
  `picks the newest package of a channel from the apt index` passes.
- [ ] **T2.** `PackageFetcher`: download, SHA256 check, `dpkg-deb -x`. Satisfies AC-2. Done when
  `refuses a package whose checksum differs` passes.
- [ ] **T3.** `lab.py prepare --version`, and `--vivaldi-version` and `--no-sandbox` in the live CLI.
  Satisfies AC-3. Done when `test_lab_uses_the_given_version_for_an_unpacked_build` passes.
- [ ] **T4.** DOM dump in `LiveRun` and `--password-store=basic` in `VivaldiProcess`. Satisfies AC-4.
  Done when `harness saves a dom dump on a failed check` passes.
- [ ] **T5.** `IssueText` and `IssueTracker` with a fake `fetch`. Satisfies AC-5, AC-6, AC-7. Done
  when `a failed run opens one issue per channel and version`, `a failed run comments on the open
  issue` and `a passing run closes the open issue of its channel` pass.
- [ ] **T6.** `WatchRun` and `cli.ts`, job summary; `npm run watch`. Satisfies AC-8. Done when
  `failures before the checks are labelled infrastructure` passes.
- [ ] **T7.** The workflow, first with `workflow_dispatch` only; dispatch it on the branch for both
  channels and fix what the runner reveals. Then enable the schedule. Satisfies AC-9.
- [ ] **T8.** `docs/architecture.md`, `CONTRIBUTING.md` and the skill notes on the watch.
- [ ] **T9.** Write the manual verification checklist for Tore from AC-9, AC-10 and AC-11.
