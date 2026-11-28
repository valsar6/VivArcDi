# 077 Archive button as an icon: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/archive-icon`, with a minor version change in `package.json`, `package-lock.json` and
`installer/vivarcdi/__init__.py` (NFR-4), done in T5 by the lead. Test-first: T1 and T2 write the checks and
they run red; T3 and T4 turn them green. Each task ends with its own tests as stated; `make check` is green
only after T4. Tests keep the names of the `auto:` checks and the scenarios keep the names of the `live:`
checks, so `every live check has a scenario` in `tests/live/LiveChecks.test.ts` passes.

Order and parallel work: T1 and T2 touch different files and can run in parallel, each in its own
`vivarcdi-implementer` worktree from the same base commit. T3 and T4 both need T1 and T2 merged; they touch
different files (T3 `ArchiveIcon.ts` and `ArchiveButton.ts`, T4 the stylesheets) and can run in parallel from
the commit that has T1 and T2. T5 and T6 run alone, in that order, after T3 and T4.

- [ ] **T1. Red tests for the button and the icon.** In `tests/modules/today/TodayParts.test.ts`:
  `archive button holds an icon and no text`, `archive button keeps its tooltip and gets an accessible
  name`, `archive icon is a stroke svg colored with currentColor`, `archive icon button opens the archive
  on click`, `archive icon draws the box with the sparkle`. Add `createElementNS` to the `DomDocument`
  fake in `tests/core/dom.ts` if it lacks one. AC-1 to AC-4 and AC-13. They fail until T3.
- [ ] **T2. Red tests for the styles, and the live scenarios.** Create `tests/styles/ArchiveIcon.test.ts`:
  `archive icon button uses size tokens`, `archive footer has no label rules`, `compact tab bar leaves the
  archive footer alone`, `archive icon button follows the theme`, `archive icon button is aligned to the
  start`. Create the two scenarios `the archive footer is only an icon` and `the archive icon opens the
  archive panel` under `tests/live/scenarios/`, with `spec: '077'`. AC-5 to AC-10 and AC-12. The style
  tests fail until T4; the scenarios are not run here (see T6).
- [ ] **T3. Icon and button.** `src/modules/today/ArchiveIcon.ts` with `ARCHIVE_SHAPES` and
  `ArchiveIcon.create`; `ArchiveButton.ts` builds the button with `aria-label`, the same `title`, the icon
  and no text. T1 turns green.
- [ ] **T4. Styles.** `_tokens.scss` (add `$archive-button-size`, remove `$archive-glyph`), `today.scss`
  footer block, `compact-tab-bar.scss` footer block removed. T2 style tests turn green, and the 032 tests
  edited in T5 stay green. `column-scroll.scss` is not touched.
- [ ] **T5. Docs, 032 amendment and version (lead).** The edits to 032 of the design (`Amended by` row,
  design notes) and to `tests/styles/CompactTabBar.test.ts` (remove `archive footer shows the archive icon
  beside its label`, adjust the two tests named in the design); `docs/` and the README of the module if they
  show the label; version bump; set the 077 status to `Implemented` and update its row in
  [specs/README.md](../README.md) when the PR merges. Run `make check`.
- [ ] **T6. Live run, with Tore's agreement.** `npm run live` for the two 077 scenarios and
  `favorites and footer stay fixed while the column scrolls`; only on a machine with Vivaldi and a desktop
  session. Skipped and reported when it cannot run.
- [ ] **T7. Manual checklist in Italian (lead).** Built from AC-11 only: Tore looks at the icon in the light
  and dark themes on macOS and Debian, checks that it is legible, in the colors of the tab bar, with a visible
  hover and focus ring, left aligned at the full and at the narrow width, and that the tooltip and
  Cmd/Ctrl+Shift+A still work. The file is `archive-icon/verifica-icona-archivio.md`, like the other checklists
  (see `specs/032-compact-tab-bar/tasks.md` T6 and 076 T8).
