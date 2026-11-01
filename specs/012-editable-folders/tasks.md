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
  pointer (`spaces/diagnostica-cmd-d-pannello.js` in the project files). Decides FR-10 and the risks of
  step 4.
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
- [ ] **T9.** `SavedRoots`, `PanelFolderDrag` and `Reset folders`, if T1 allows it. AC-19, AC-20,
  AC-21.
- [ ] **T10.** Manual verification checklist for Tore from AC-11, AC-13 to AC-18, AC-22, AC-27 and
  AC-28 (`spaces/verifica-cartelle-modificabili.md` in the project files).
- [ ] **T11.** Manual checks on macOS and Debian.
- [x] **T12.** Empty Favorites grid: placeholder with a hint and pointer drop that pins the tab (FR-15). AC-29,
  AC-30; manual AC-31 is added to the checklist.
