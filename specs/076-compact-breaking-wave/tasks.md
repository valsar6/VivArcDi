# 076 Compact Breaking wave: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/compact-breaking-wave`, minor bump, after 074 and 077. **Every task is blocked by 074 and
by 077**: 074 T5 (the marker `data-vivarcdi-wave` of FR-13), 074 T6 (the module, the preset without
`TabsTrash`, and `toolbarAfter` and `nestedButtons` in `src/selectors/8.1.json`) and 074 T8 (the scenarios run
green, which blocks 076), and the 077 task that makes the footer an icon-only button. T1 and T2 may be
written once 074 T5 and T6 are in `main`; T3 onward need 074 T8 and 077. Tests come first: nothing is styled
before its scenario or test exists and is red. In this prototype phase Tore checks the CSS himself after each
attempt; a passing scenario does not replace his look.

All tasks run one after the other; none is parallel, because each judges the previous one. T8 is closed last,
after T11.

- [ ] **T1. Live scenarios, red.** Write the eleven files under `tests/live/scenarios/`, each with
  `spec: '076'` and its name exactly as in the criteria, so that `tests/live/LiveChecks.test.ts`
  (`every live check has a scenario`) passes in CI. Names: `the compact breaking wave puts three
  buttons on one row`, `the compact breaking wave row has the height of an icon button`, `the compact
  new-tab button opens a tab`, `the compact workspace button opens its popup in place`, `the compact
  archive button opens the archive panel`, `the compact buttons keep their labels`, `the compact breaking
  wave row survives a resize`, `the compact form switches off with the breaking wave`, `the compact
  breaking wave stacks in the narrow tab bar`, `the compact workspace button shows only its icon`, `the
  compact row hides the workspace name whatever the option says`. A shared
  `tests/live/scenarios/compactBar.ts` sets the lists and the attribute and reads the buttons; it also reads
  where `#tabs-container` and `.toolbar-tabbar-after` meet, whether `#tabs-container` is positioned, whether
  the bundled Chromium has anchor positioning, and the selector of the workspace label (`span.button-title`, already measured). The selectors
  `toolbarAfter` and `nestedButtons` are added to `src/selectors/8.1.json` by 074 T6 and are read through the
  `SelectorCatalog`; 076 adds `workspaceButtonName`. Done when the live check test passes in CI and `npm run live -- 076` runs
  the eleven scenarios red (Tore agrees to the run first).
- [ ] **T2. Unit tests, red.** `tests/styles/CompactBreakingWave.test.ts` with `compact rules apply
  only under the breaking wave attribute`, `without the breaking wave attribute the bottom bar is
  unchanged`, `compact breaking wave uses tokens`, `compact breaking wave needs the archive, workspace and
  new-tab buttons`; and `compact breaking wave never writes preferences` next to it. Done when they fail
  only because the stylesheet and the tokens do not exist.
- [ ] **T3. Tokens and attempt 1 of the row.** Tokens in `_tokens.scss` (`$compact-bar-gap` 8px, `$compact-wrap-width` 116px, `$compact-bar-button-size` 28px, `$compact-bar-button-min` 24px, `$workspace-button`, `$new-tab-button`, `$workspace-label`), the selector `workspaceButtonName` in `src/selectors/8.1.json`, `compact-breaking-wave.scss` with
  the `display: contents` rules for `WorkspaceButton` and `NewTab`, the empty slot, the label hiding, and the
  `config.json` entry. Done when T2 passes and the scenarios of AC-5 (for the two buttons), AC-6, AC-15 and
  AC-16 pass or fail with a reading.
- [ ] **T4. Tore looks (attempt 1).** Tore opens the lab and the real window with the Breaking wave and
  decides: keep, adjust, or go to attempt 2. Done when his answer is in the pull request.
- [ ] **T5. Attempt 2 of the row, only if attempt 1 fails the live scenarios.** The grid rules replace those
  of T3. Done when the scenarios of T3 pass or the reading says why not; Tore looks again.
- [ ] **T6. Row helper, only if attempt 2 fails.** First a design amendment and Tore's approval, then a
  helper for the two buttons with `KeptElement`, `TabBarAnchor` and one frame task, test-first. Done when
  the scenarios of T3 pass, including the way back of AC-12.
- [ ] **T7. Settle the narrow bar.** From the readings of AC-11 and AC-13 record the break point in
  `design.md`. Done when the break point of the wrap (116 px) is confirmed there and AC-11 and AC-13 pass at it (row from 200 px, column at 42 px).
- [ ] **T8. Manual checklist and release.** Italian checklist `compact-breaking-wave/verifica-cavallone-compatto.md`
  from AC-14: la riga in basso ha l'icona dell'archivio a sinistra, una piccola icona dello spazio di lavoro
  al centro e il "+" a destra, nei temi chiaro e scuro, su macOS e Debian. Read `package.json` and
  `installer/vivarcdi/__init__.py` versions on `main` right before, bump the minor in `package.json`,
  `package-lock.json` and `__init__.py` (owned by the lead), update the README row, `make check`. Done
  when `make check` is green.
- [ ] **T9. Red scenarios for the Archive footer on the row.** Run the scenarios of T1 that involve the
  footer (AC-5, AC-6, AC-9, AC-11, AC-12, AC-13) against the result of T3 and write the readings in the pull
  request: the footer is still at the end of the tab list, which is the red state. Add to `compactBar.ts` the
  reading of the footer's box against the toolbar's. Done when each of those scenarios fails for the single
  reason that the footer is not in the row.
- [ ] **T10. Attempt (a): the footer over the slot, by style.** In `compact-breaking-wave.scss`:
  `position: absolute` on the footer, anchored to `.toolbar-tabbar-after` with CSS anchor positioning inside
  `#tabs-container` (already `position: relative`; measured), placed on the toolbar's bottom row (the toolbar
  is 540 px tall and the footer overlaps it by a few px). Record the DOM order limit of FR-5 in the pull request. Done when the scenarios of T9 pass or fail with a reading; then **Tore looks** at the CSS in
  the lab and the real window.
- [ ] **T11. Attempt (b): the footer by a helper, only if (a) fails the scenarios.** First a design
  amendment and Tore's approval, then `ArchiveButton` with the second parent and the wider watcher, test-first
  with the existing `ArchiveButton` tests unchanged in name, and the scenarios of T9 green, including the way
  back of AC-12. The trigger is the DOM order limit of FR-5 or a failure of (a). Done when they pass.
