# 053 Single scroll: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/single-scroll` (minor), version read from `main`
just before opening the pull request.

- [ ] **T1.** Answer Q-1 to Q-3 with probes on the lab copy (`npm run live -- --probe`), read only:
  the pinned group with pinned tabs and its place in the column; `.resize` and `.tab-strip` with many
  tabs and a long open folder, to see whether Vivaldi writes `max-height` again; and Vivaldi's
  `bundle.js` for how it scrolls to the active tab and during a drag. Done when the design records
  the three answers and says whether `ColumnScrollSync` is needed.
- [ ] **T2.** Remove `maxHeightPercent`: option, `FolderSection`, `FolderSectionView`, the CSS
  variable, `config.json` and their tests. Satisfies AC-12. Done when `has no maxHeightPercent option`
  passes and no reference is left.
- [ ] **T3.** Stylesheet `src/styles/column-scroll.scss` under the mark, with the folder section
  without a maximum, the frame that does not shrink, the column as scroller, the sticky footer and the
  6 px scroll bar; list it in `config.json`. Satisfies AC-1, AC-2, AC-10. Done when
  `lets the folder section grow to its content` and `keeps the tab strip frame at the height of its content` pass.
- [ ] **T4.** Module `ColumnScroll`: puts and removes the mark, stays off and logs a warning when the
  selectors do not match; register it and enable it. Satisfies AC-11. Done when
  `leaves the column untouched when the selectors do not match` passes.
- [ ] **T5.** Live scenarios in `tests/live/scenarios/`: `one scroller for the whole column`,
  `a long folder does not squeeze Today's tabs`, `favorites and footer stay fixed while the column scrolls`,
  `the active tab scrolls into view`, `no scroll when the list fits`; `no gap above the first Today
  tab` already exists and is rerun. Satisfies AC-3 to AC-6, AC-8, AC-9. Done when `npm run live`
  passes them on the lab copy.
- [ ] **T6.** Only if T1 requires it: `ColumnScrollSync`, test first, with its own `auto:` criteria
  added to the spec and approved before the code. Done when the matching tests and AC-6 pass.
- [ ] **T7.** Version bump (minor) in `package.json` and `installer/vivarcdi/__init__.py`;
  `docs/manual` note on the tab bar; `specs/009` design point 7 and FR-11 note that this spec
  replaced the compromise; tasks ticked.
- [ ] **T8.** Write the manual verification checklist for Tore from the `manual` criteria (AC-7,
  AC-10, AC-13), in Italian.
