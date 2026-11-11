# 031 Pin and tile commands: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/pin-tile-commands`, minor bump of the version.

- [ ] **T1.** Read-only probe for Tore: the shape of `vivaldi.contextMenu` and of a tab's menu
  (`pin-tile/sonda-menu-scheda.md` in the project files). Decides step 3 of the design.
- [x] **T2.** `DragPill` and its tokens; fed by `RowDrag` and `TabDragRelease`; faded Vivaldi slot.
  AC-1, AC-2.
- [x] **T3.** `placeAt` and `moveTo` in `LinkRemoval` and `FavoriteRemoval`; `TodayList.first`,
  `LinkDropZone.end`, `FavoriteDropZone.end`. AC-5, AC-6, AC-7, AC-8.
- [x] **T4.** `ContextMenu`, `RowMenu`, `TileMenu`. AC-9.
- [x] **T5.** `TabMenuItems` and `TabCommands` from the result of T1. AC-3, AC-4.
- [ ] **T6.** README and `docs/manual/tab-bar.md`; manual verification checklist for Tore from AC-10
  to AC-12 (`pin-tile/verifica-pin-tile.md` in the project files).
- [ ] **T7.** Manual checks on macOS and Debian.
