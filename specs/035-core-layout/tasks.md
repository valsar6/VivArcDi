# 035 Core layout: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `refactor/core-layout`, no version change. Moves are `git mv` commits of their own; import
paths change in the next commit. Every task ends green on `make check`, with the same sorted list of
test names as before.

- [ ] **T1.** Record the sorted list of test names on `main`, to compare after every task. NFR-1.
- [ ] **T2.** Out to modules: move the 6 files of [Out to modules](design.md#out-to-modules) and their
  tests, and update the importers.
- [ ] **T3.** Out to shared: move the 24 files of [Out to shared](design.md#out-to-shared) and their
  tests, and update the importers. 034/AC-3 must still pass.
- [ ] **T4.** Core folders: move the 39 remaining files into `boot/`, `browser/`, `tabs/`,
  `workspaces/`, `dom/` and `support/`, together with their tests; update the importers and
  `src/loader.ts`.
- [ ] **T5.** Message `coreToOuter` in `tools/eslint/module-boundaries.mjs`, and its cases in
  `tests/tooling/ModuleBoundariesRule.test.ts`. AC-4, AC-5.
- [ ] **T6.** The checks of AC-1, AC-2 and AC-3 in `tests/structure/ModuleBoundaries.test.ts`.
- [ ] **T7.** `docs/architecture.md`: the core folders, the three layers and the core paths it cites.
  NFR-5.
- [ ] **T8.** One-off check that every relative import in the built `dist/` points to a file. NFR-4.
- [ ] **T9.** Pull request, with the manual verification checklist for Tore from AC-6, in Italian, in
  its description.
- [ ] **T10.** Manual check on macOS and Debian (Tore). AC-6.
