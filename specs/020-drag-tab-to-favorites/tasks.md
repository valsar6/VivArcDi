# 020 Drag a tab into the Favorites: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/drag-tab-to-favorites`, minor bump of the version.

- [x] **T1.** Probes for Tore on Vivaldi's tab drag (PR #118 and
  `pinned-regression/diagnostica-trascina-riquadro.md`). Done 2026-11-09; results in the spec.
- [x] **T2.** `FavoriteDrop`: add before a tile or at the end, skip pages already in the folder,
  create the folder when missing, link and pin the tab. AC-2, AC-4.
- [x] **T3.** `GridDropZone` and `TabToFavorite`: hit test, gap before the target tile, HTML5 path,
  one release per press; wired in `FavoritesGrid`. FR-1, FR-6.
- [x] **T4.** `LinkDropZone` in `src/core`, registered by the folders section;
  `WorkspaceFavorites.addLink`.
- [x] **T5.** `TileDrag` and `FavoriteRemoval`: release over the folders, the header or the tab list;
  tabs of other workspaces closed; bookmark removed last. AC-5, AC-6.
- [x] **T6.** Styles and tokens; version bump; manual and README updated (the roadmap entry moves to
  the tab bar page); `make check`.
- [x] **T7.** Manual verification checklist for Tore from AC-1, AC-3, AC-7 and AC-8
  (`pinned-regression/verifica-trascina-favorites.md` in the project files).
- [ ] **T8.** Manual checks on macOS and Debian.

Revision of 2026-11-12 (reordering), branch `features/tile-reorder`, minor bump of the version:

- [x] **T9.** `BookmarkWriter.move` and `FavoriteReorder`. AC-9, AC-10, AC-11.
- [x] **T10.** `GridDragging`: gap and hidden tile while a tile is over the grid; release over the grid
  goes to `FavoriteReorder`. FR-8.
- [x] **T11.** `docs/manual/tab-bar.md`; manual checklist for Tore from AC-12
  (`pin-tile/verifica-riordino-tile.md` in the project files).
- [ ] **T12.** Manual checks on macOS and Debian.
