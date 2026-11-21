# 055 Open a tile as a web panel: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/tile-web-panel`, minor bump of the version (read the version on `main` right
before bumping).

- [x] **T1.** Probes on the throwaway profile (done 2026-11-21, recorded in the spec's question 1 and
  the design): the preference write does not show a panel; the form does.
- [ ] **T2.** The four names in `src/selectors/8.1.json` and in the selector check.
- [ ] **T3.** `WebPanelList` with the same-address rule, `find` and `show`. AC-5.
- [ ] **T4.** `WebPanelForm`: open, fill, submit, wait for the new button. AC-3, AC-7.
- [ ] **T5.** The two labels, and the items in `TileMenu` from the tile's page and the list; wired in
  `GridDragging`. AC-1, AC-2, AC-4, AC-6.
- [ ] **T6.** Live scenario `a tile becomes a web panel in the panel list`, and AC-8 of the spec
  changes from `manual` to `live: \`a tile becomes a web panel in the panel list\`` in the same
  pull request (the check `every live check has a scenario` fails a spec that names a scenario
  before it exists). AC-8.
- [ ] **T7.** README and `docs/manual/tab-bar.md`; manual checklist for Tore from AC-9.
- [ ] **T8.** Manual checks on macOS and Debian.
