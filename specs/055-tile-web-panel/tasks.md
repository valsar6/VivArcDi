# 055 Open a tile as a web panel: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/tile-web-panel`, minor bump of the version (read the version on `main` right
before bumping).

- [ ] **T1.** Write test on the throwaway profile: add one element to `vivaldi.panels.web.elements`
  with `vivaldi.prefs.set` and see whether the panel appears in the panel bar; probe how the side panel
  is shown on it (a second preference or the bar button); whether `faviconUrl` may be empty. It decides
  "Showing the panel" and may revise AC-9 before T2.
- [ ] **T2.** `PanelPrefsWriter` and `WebPanelList` with the same-address rule. AC-3, AC-5, AC-6.
- [ ] **T3.** The two labels, and the items in `TileMenu` from the tile's page and the list; wired in
  `GridDragging`. AC-1, AC-2, AC-4.
- [ ] **T4.** The fallback when the write is not available. AC-7.
- [ ] **T5.** Live scenario `a tile becomes a web panel in the panel list`, and AC-8 of the spec
  changes from `manual` to `live: \`a tile becomes a web panel in the panel list\`` in the same
  pull request (the check `every live check has a scenario` fails a spec that names a scenario
  before it exists). AC-8.
- [ ] **T6.** README and `docs/manual/tab-bar.md`; manual checklist for Tore from AC-9.
- [ ] **T7.** Manual checks on macOS and Debian.
