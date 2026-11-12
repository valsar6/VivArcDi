# 033 Folder menu: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Step 1 goes on branch `features/folder-delete` with a minor bump of
the version; steps 2 to 4 get their own tasks with their design revision.

## Step 1: Delete and Rename…

- [x] **T1.** Probe for Tore that creates a throw-away folder `VivArcDi probe 033`, moves it into the
  Trash with `chrome.bookmarks.move` and reports the result (`folder-delete/sonda-sposta-nel-cestino`
  in the project files). Done 2026-11-12: Tore's Vivaldi moved the folder into the Trash (node `4`) with its link, and the panel showed it there.
- [x] **T2.** `ContextMenu` separator item; `BookmarkNode.trash`; `BookmarkTrash` with tests on a fake
  tree (found, cached, missing).
- [x] **T3.** `FolderMenuItems` and `FolderMenu`, wired in `FolderDragDrop`. AC-1, AC-2, AC-7.
- [x] **T4.** `FolderDeletion`, `OpenFolders.forget` and the `keep` set of `unlinkExcept`. AC-3, AC-4,
  AC-5, AC-6.
- [x] **T5.** Version bump, README and manual (docs/manual) note on the folder menu, `make check`.
- [ ] **T6.** Manual verification checklist for Tore from AC-14, AC-15 and AC-19
  (`folder-delete/verifica-cancella-cartella.md` in the project files).
- [ ] **T7.** Manual checks on macOS and Debian.

## Step 2: Duplicate and Move to

- [ ] **T8.** Design revision for step 2, approved by Tore.

## Step 3: New Nested Folder and Change Icon

- [ ] **T9.** Probe for the icon field (Q-5), then design revision for step 3, approved by Tore.

## Step 4: Turn into Space

- [ ] **T10.** Design revision for step 4, approved by Tore.
