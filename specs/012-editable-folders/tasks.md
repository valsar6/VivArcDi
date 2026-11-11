# 012 Editable folders: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/editable-folders`, minor bump of the version.

- [ ] **T1.** Read-only probe for Tore: does the page see Cmd/Ctrl+D with Vivaldi's own command
  unbound, and which element and attributes does a folder row of the Bookmarks panel have under the
  pointer (`spaces/diagnostica-cmd-d-pannello.js` in the project files). Decides the risks of step 4 (the panel part now feeds 018).
- [x] **T2.** `BookmarkWriter` with `create`, `update`, `remove`, `ensurePath`; `BrowserBookmarks` stays
  read-only. AC-6, AC-12.
- [x] **T3.** `WorkspaceRoots` order of FR-4 and `workspacesBase`; config and README. AC-5, AC-7.
- [x] **T4.** `CreatedLinks` and `WorkspaceFavorites` (`add`, `addFolder`, `take`). AC-1, AC-6, AC-8,
  AC-9, AC-12, AC-24, AC-25.
- [x] **T5.** Move `Toast` to `src/core`; `FavoriteShortcut` and its wiring in the folders module.
  AC-23, AC-24, AC-25.
- [x] **T6.** `FolderSectionView` edit mode, delayed single click, `+` button of the header. AC-1,
  AC-2, AC-3, AC-4.
- [x] **T7.** `TabPointerDrag`, `DropTargets`, drop highlight; add at the drop position. AC-8, AC-9,
  AC-10, AC-26.
- [x] **T8.** 014: `COMMAND_PIN_TAB` empty in `shortcuts.json`, installer tests, README table. AC-27.
- [x] **T9.** Dropped: FR-10 and FR-11 are replaced by [018](../018-copy-bookmarks-to-workspace/spec.md)
  (Tore, 2026-11-01).
- [ ] **T10.** Manual verification checklist for Tore from AC-11, AC-13 to AC-18, AC-27 and
  AC-28 (`spaces/verifica-cartelle-modificabili.md` in the project files).
- [ ] **T11.** Manual checks on macOS and Debian.
- [x] **T12.** Empty Favorites grid: placeholder with a hint and pointer drop that pins the tab (FR-15). AC-29,
  AC-30; manual AC-31 is added to the checklist.
- [x] **T13.** Remove the placeholder, `EmptyGridDrop`, its style, test and `emptyHint` (FR-15 removed,
  Tore, 2026-11-08).

Revision of 2026-11-11 (drag and drop of tabs). Branch `fix/drag-tabs-workspace-favorites`, patch bump.

- [ ] **T14.** Read-only probe for Tore: the events of a tab of today dragged over the rows, onto a
  folder, and of a link row dragged below the separator (`tab-drag/diagnostica-trascina-schede.md`
  in the project files). Confirms the risk of the HTML5 way.
- [x] **T15.** `TabEntries` and `TabDragRelease` in `src/core`; `TabToFavorite` and `GridDropZone`
  moved onto them with their tests unchanged. AC-33, AC-34.
- [x] **T16.** `FolderDragDrop` on `TabDragRelease`: the HTML5 drop over the area adds the link at the
  drop position. AC-32.
- [x] **T17.** `RowDrag` in `src/core` from `TileDrag`; `TodayList` moved to `src/core`;
  `FavoriteDropZone` and `FavoriteDrop.addPage`. AC-38.
- [x] **T18.** `LinkRemoval`, `WorkspaceFavorites.take` by bookmark id, copies of 018 in
  `CreatedLinks`, dimmed row style. AC-35, AC-36, AC-37.
- [ ] **T19.** Manual verification checklist for Tore from AC-39 and AC-40
  (`tab-drag/verifica-trascina-schede.md` in the project files).
