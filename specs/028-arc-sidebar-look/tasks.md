# 028 Arc sidebar look: tasks

Branch `features/arc-sidebar-look`, minor bump (0.21.0). Each task names the criteria it proves.

- [ ] **T1.** Probe for Tore (`design-sidebar/diagnostica-sidebar.js`): Favorites folder state, the
  element and marks of a dragged tab, the computed width of the tab list scroll bar.
- [ ] **T2.** `Palettes`: six palettes, default, contrast check. AC-11.
- [ ] **T3.** Tokens and `sidebar-look.scss`: rows, hover, active pill, tiles, separator, scroll bar,
  hidden "Tabs" heading and Vivaldi `+`. AC-2 to AC-5, AC-7.
- [ ] **T4.** `SidebarLook` module, `ScrollMark`, config and default palette. AC-8, AC-9.
- [ ] **T5.** Move `NewTabRow` to `src/core`; New Tab row at anchor order 30. FR-6.
- [ ] **T6.** `PinnedFavorites` and source choice in `FavoritesGrid`; at most three columns. AC-10, FR-1.
- [ ] **T7.** Drag slot style, only if T1 finds a mark.
- [ ] **T8.** `make check`, version 0.21.0, PR.
- [ ] **T9.** Manual checklist for Tore from AC-1 to AC-6, AC-12 and AC-13 (`design-sidebar/verifica-sidebar.md`).
- [ ] **T10.** Manual checks on macOS and Debian.
