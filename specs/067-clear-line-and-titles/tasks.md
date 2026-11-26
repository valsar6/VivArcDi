# 067 Clear line, its inset and centered titles: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/067-clear-line-and-titles`, with a patch version change per CONTRIBUTING: read the
version on `origin/main` right before T3 and bump `package.json`, `package-lock.json` and
`installer/vivarcdi/__init__.py`. Each code task follows TDD: first the failing tests with the
verbatim `auto:` names, then the code, then `make check`. T1 and T2 own separate files and can run
in parallel, each in its own worktree from the same base commit.

`npm run live -- --probe <file>` runs a lab Vivaldi: run it only on a machine with Vivaldi and a
desktop session, and only with Tore's agreement. The probes of T1 and T2 can be one run.

## Order

```
T1 ──┐
T2 ──┼──> T3 (lead: docs and version) ──> T4 (Tore: manual)
```

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `src/shared/tabs/TabBarMarks.ts`, `src/modules/today/ClearSeparator.ts`, `tests/modules/today/ClearSeparator.test.ts` |
| T2 | `src/styles/pinned.scss`, `src/styles/today.scss`, `src/styles/sidebar-look.scss`, `tests/styles/Pinned.test.ts`, `tests/styles/Today.test.ts`, `tests/styles/SidebarLook.test.ts` |
| T3 | `specs/004-today-tabs-and-keyboard/spec.md`, `specs/028-arc-sidebar-look/spec.md`, `specs/060-clear-bar-and-pinned-unload/spec.md`, `specs/067-clear-line-and-titles/` (status and ticks), `specs/README.md`, `docs/manual/tab-bar.md`, `README.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` |
| T4 | Nothing in the repository; the checklist comes from AC-8 |

## Tasks

- [x] **T1. The empty-state mark** (TDD; parallel with T2). In
  `tests/modules/today/ClearSeparator.test.ts` add `hides the Clear line while there is no Today tab`
  (AC-1), `shows the Clear line when a Today tab opens` (AC-3) and
  `ignores hidden and linked tabs for the Clear line` (AC-4), with the assertions of the design.
  Before AC-4, read `firstTodaySlot` and `#isToday` and build the hidden and linked slots the way the
  module really tells them apart; if one of them counts today, report it instead of changing
  scope. Then add `NO_TODAY_ATTRIBUTE` to `TabBarMarks.ts` and `#mark` to `ClearSeparator` with the
  three call sites of the design (no slot, slot found, strip missing) and `stop()`. Keep
  `firstTodaySlot`, `#place` and `#line` as they are. Done when `make check` is green.
- [x] **T2. Inset and centered titles** (TDD; parallel with T1). First confirm the design's
  assumptions with one DOM probe (`npm run live -- --probe`, with Tore's agreement) on a lab
  Vivaldi 8.3, no Today tab and one pinned tab: which element draws the line that stays, whether
  the pinned-last slot is already positioned, and the rects of a Today title and its row. Report the
  numbers. Then add `hides the pinned-last border while there is no Today tab` (AC-2) and
  `insets the pinned-last border like the rows` (AC-6) to `tests/styles/Pinned.test.ts`,
  `insets the Clear line like the rows` (AC-5) to `tests/styles/Today.test.ts` and
  `centers the Today title in its row` (AC-7) to `tests/styles/SidebarLook.test.ts`. Then change the
  stylesheets as the design says: the inset `::after` line and the `[data-vivarcdi-no-today]` rule
  in `pinned.scss`, the removal of the `border-bottom` of the pinned-last mark in
  `sidebar-look.scss` (update any existing assertion that expects it), the row inset in
  `today.scss`, and the centering of `.tab-header` and `.title`. Do not touch `.close`, the
  favicon or the New Tab row. Do not edit the live scenario of 060: its body stays valid. Done
  when `make check` is green and the probe shows the title center within 1 px of the row center
  and the line inset equal to the row inset.
- [x] **T3. Docs and version** (lead; after T1 and T2). Mark 060/FR-1, 004/FR-5 and 028/FR-5 as
  amended or refined by 067, set the 067 design Status to Approved, and update
  `docs/manual/tab-bar.md` and `README.md` where they describe the separator line or Clear so
  they say that nothing shows while there is no Today tab. Read the version on `origin/main` and make
  the patch bump in the three version files. If a `live:` scenario for the empty state is added
  later, change AC-8's note and the scenario catalog in the same step. Done when `make check` is
  green.
- [ ] **T4. Tore's manual check** (last). On Vivaldi 8.3, macOS and Debian, with the Favorites grid
  on and then off, in a light and a dark theme: close every Today tab and confirm no separator line
  and no "Clear" show and that "+ New Tab" sits right under the folders, with and without a pinned
  tab; open a Today tab and confirm the line and Clear return, the line starting and ending where
  the rows do and Clear at its right end; check that the pinned-last line, when pinned rows are
  visible, has the same inset; confirm every Today title is centered in its row. Compare with Arc
  and record the result in the checklist built from AC-8 (in Italian). T8 absorbs the check of the
  line and Clear once the amendment ships; do T4 and T8 in one session, after T7.

## Amendment tasks (FR-8 to FR-10)

Branch `fix/067-clear-always-shown`, with a patch version change read from `origin/main` right before
T7. T5 and T6 own disjoint files and run in parallel, each in its own worktree from the same base
commit; T7 and T8 run alone after them. TDD as above. The lab probe needs Tore's agreement (he agreed
to lab use for probes).

```
T5 ──┐
T6 ──┴──> T7 (lead: docs and version) ──> T8 (Tore: manual)
```

| Task | Owns |
|---|---|
| T5 | `src/modules/today/ClearSeparator.ts`, `tests/modules/today/ClearSeparator.test.ts` |
| T6 | `src/styles/today.scss`, `src/styles/pinned.scss`, `tests/styles/Today.test.ts`, `tests/styles/Pinned.test.ts`, the probe file |
| T7 | `specs/` (notes in the 060 design and tasks, 067 status), `docs/manual/tab-bar.md`, `README.md`, version files |
| T8 | Nothing in the repository |

- [ ] **T5. Always-on line mark** (TDD; parallel with T6). Change the bodies of
  `shows the Clear line when a Today tab opens` and of `draws its line only when no pinned row shows
  it`, renamed `draws its line whether or not a pinned row shows it`, so they fail. Then remove
  `#line()` and set `data-vivarcdi-clear-line` in `sync` next to `#mark(false)`, guarded by
  `hasAttribute`; drop the `PINNED_LAST_ATTRIBUTE` import if unused. Keep `firstTodaySlot`, `#place`
  and the empty state. Done when `make check` is green.
- [ ] **T6. Styles and probe** (TDD; parallel with T5). Add `shows the Clear label at rest` (AC-9),
  `ends the Clear line before its label` (AC-10) and `strengthens the Clear label on hover` (AC-11)
  to `tests/styles/Today.test.ts`; update the bodies of `draws the Clear bar on the separator above
  the Today tabs`, `insets the Clear line like the rows`, `insets the pinned-last border like the
  rows` and `hides the pinned-last border while there is no Today tab` as the design says. Then
  change `today.scss` (flex row, flex line, static muted label, hover color) and `pinned.scss`
  (remove the pinned-last `::after` and its empty-state twin). Write the probe and run it on a lab
  Vivaldi 8.3 (`npm run live -- --probe <file>`), with and without pinned tabs and the Favorites
  grid on and off. Report the numbers against the limits of the design and say whether the 13 px
  band above Today exists with no pinned tab. Run the scenario `the Clear bar keeps a box above
  Today with the Favorites grid on` and do not edit it. Done when `make check` is green and the
  probe is within 1 px.
- [ ] **T7. Docs and version** (lead; after T5 and T6). Update `docs/manual/tab-bar.md` and
  `README.md` to say Clear shows at rest; note in the 060 design and tasks that
  `draws its line only when no pinned row shows it` was renamed by 067; read the version on
  `origin/main` and bump the patch in the three version files. Done when `make check` is green.
- [ ] **T8. Tore's manual check** (last). On Vivaldi 8.3, with and without pinned tabs, the
  Favorites grid on and off, light and dark: with a Today tab, confirm "↓ Clear" shows without hover
  in a muted color and gets stronger on hover and keyboard focus; confirm the line starts at the
  left inset, ends with a visible gap before the arrow, sits on the middle of the label, and that
  only one line shows between the folders (or pinned rows) and Today; confirm a click still
  archives. Compare with Arc and record the result in the checklist built from AC-8 (in Italian).
