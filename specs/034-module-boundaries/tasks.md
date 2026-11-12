# 034 Module boundaries: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `refactor/module-boundaries`, no version change. Moves are `git mv` commits of their own;
import paths change in the next commit. Every task ends green on `make check`, with the same sorted
list of test names as before.

- [ ] **T1.** Record the sorted list of test names on `main`, to compare after every task. NFR-1.
- [ ] **T2.** `shared/tabs/`: move `UnloadedTabs`, add `TabBarMarks` with `PINNED_LAST_ATTRIBUTE`,
  update importers. AC-1 for `folders`, `reopen`, `space-header` and `today`.
- [ ] **T3.** `shared/clipboard/`: split `TextCopier` and its strategies out of `UrlCopier.ts`; move
  their tests to `tests/shared/clipboard/`. AC-1 for `live-folders`.
- [ ] **T4.** `shared/links/`: move `FolderTree`, `LinkIcon`, `OpenLinks`, `LinkActivator` and
  `LastOpenedStore` with their tests; drop the two re-exports. AC-1 for `folder-preview` and `today`.
- [ ] **T5.** Rule `local/module-boundaries` in `tools/eslint/`, one `local` plugin in
  `eslint.config.mjs`, and `tests/tooling/ModuleBoundariesRule.test.ts`. AC-4, AC-5.
- [ ] **T6.** `tests/structure/ModuleBoundaries.test.ts` with the checks of AC-1, AC-2 and AC-3.
- [ ] **T7.** Move the 24 files of `folders` into `tree/`, `links/`, `favoritelinks/`, `dragdrop/`,
  `editing/` and `view/`, update imports, and mirror the tests. Add the AC-6 check to the structure
  test. AC-6.
- [ ] **T8.** `docs/architecture.md`: the shared layer, the boundary rule and the folders layout, and
  the module table brought up to date. NFR-4.
- [ ] **T9.** One-off check that every relative import in the built `dist/` points to a file. NFR-3.
- [ ] **T10.** Pull request; manual verification checklist for Tore from AC-7, in Italian.
- [ ] **T11.** Manual check on macOS and Debian (Tore). AC-7.
