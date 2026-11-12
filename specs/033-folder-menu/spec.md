# 033 Folder menu

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-12 (PR #160 merged; proposals of Q-2 to Q-7 accepted) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc a right click on a folder of the sidebar opens a menu with everything that can be done to the
folder: rename it, change its icon, duplicate it, move it to another space, nest a new folder in it,
turn it into a space, and delete it. In VivArcDi the folders of the workspace favorites
([009](../009-bookmark-folders-in-tab-bar/spec.md), [012](../012-editable-folders/spec.md)) can only be
created and renamed (double click); the rest needs the Bookmarks panel. Tore's recording of 2026-11-12
shows Arc's menu; Delete is the most important item. This spec adds the folder menu with every item of
Arc that VivArcDi can reproduce, delivered in steps, Delete first.

## User stories

- **US-1.** As a user, I want to right-click a folder of my workspace and choose `Delete`, so that the
  folder goes away without opening the Bookmarks panel, as in Arc.
- **US-2.** As a user, I want a deleted folder to be recoverable, so that a wrong click does not lose
  bookmarks I care about.
- **US-3.** As a user, I want `Rename…` in the same menu, where Arc has it.
- **US-4.** As a user, I want to duplicate a folder, so that I start a similar one from a copy.
- **US-5.** As a user, I want to move a folder to another space, so that I reorganize my spaces
  without the Bookmarks panel.
- **US-6.** As a user, I want to create a folder inside a folder, so that I group links in levels.
- **US-7.** As a user, I want to give a folder its own icon, so that I recognize it at a glance.
- **US-8.** As a user, I want to turn a folder into a space, when it has grown into a topic of its own.

## Expected behavior

Seen in Arc (`Registrazione schermo 2026-11-12 alle 22.30.15.mov`, 50 s). A right click on the folder
`Esempio Folder` opens a menu with, in order and split by separator lines: `Share Folder…`; `New Nested
Folder…`, `Turn "<name>" into Space`; `Change Icon…`, `Rename…`; `Duplicate`, `Move to ▸`; `Delete`.
Tore uses them in turn:

- `Rename…` puts the name in edit mode in place (`Esempio Folder` becomes `Cartella Nuova`).
- `Move to ▸` lists the spaces with a check on the current one (`Riposino`, `ramino`) and `New Space…`;
  choosing `ramino` moves the folder to the end of that space's pinned area.
- `Change Icon…` opens a small popover titled `Icon` with a grid of 24 symbols (star, bookmark, heart,
  bolt, triangle, gear, bell, pin, chat, people, plane, ball, moon, globe, music, camera, code, smile…)
  and a trash button that goes back to the folder icon; the chosen symbol replaces the folder icon.
- `Duplicate` adds a copy with the same name right below the folder.
- `Delete` on the copy removes its row at once: no dialog, no toast. The folder was empty, so the
  recording does not show what happens to the tabs of a folder with content.

In VivArcDi a right click on a folder row of the workspace favorites, at any depth, opens VivArcDi's
own menu (the one of the link rows and tiles) instead of Vivaldi's, with the items below in Arc's
order. Live folders of [026](../026-live-folders/spec.md) keep their own menu. An item is shown only
from the release that implements it.

**Delete.** The folder row, with the rows of everything inside it, leaves the area at once with the
leaving transition of the rows. The bookmark folder, with its subfolders and links, moves into
Vivaldi's bookmark Trash (the top-level node marked `trash`, `Cestino` in Italian, as found by the
probe of 2026-11-12), where the Bookmarks panel can restore it. The open tabs of its links close, as Arc
closes a folder's tabs. A short toast says `Folder "<name>" moved to Trash`. Arc erases with no trace;
VivArcDi keeps the Trash because the folders are Tore's real Vivaldi bookmarks.

**Rename….** Starts editing the name in place, exactly as the double click of 012 (012 FR-2, FR-3).

**Duplicate.** Adds a copy of the bookmark folder, with all its subfolders and links, right below the
original, with the same name. The copy is closed and its links have no open tabs.

**Move to ▸.** A submenu lists the Vivaldi workspaces by name, with a check on the current one. Choosing
another workspace moves the bookmark folder to the end of that workspace's root (012 FR-4, created on
the first write as in 012 FR-5). The open tabs of its links move with it into that workspace, so they
stay the folder's tabs there. `New Space…` is not shown (see Q-6).

**New Nested Folder….** Creates a folder `Untitled` at the end of this folder, opens this folder and
puts the new row in edit mode, as `+` does at the top level (012 FR-1, FR-2). This lifts the 012 limit
"a new folder is always at the top level of the root".

**Change Icon….** Opens a small popover beside the row, titled `Icon`, with a grid of 24 line symbols
in the spirit of Arc's and a trash button. Choosing a symbol draws it instead of the folder icon, closed
or open; the trash button goes back to the folder icon. The icon belongs to the bookmark folder and
follows it on every computer that syncs the bookmarks (see Q-5).

**Turn "<name>" into Space.** Creates a Vivaldi workspace named as the folder, through the same way 030
creates workspaces, moves the folder's content into that workspace's root (`VivArcDi/<name>`), removes
the empty folder, moves the open tabs of its links into the new workspace and switches to it.

**Share Folder….** Not reproduced: Arc shares through its own account, which Vivaldi has not (see Q-7).

## Requirements

### Functional

- **FR-1.** A right click on a bookmark folder row of the workspace favorites opens VivArcDi's menu and
  cancels Vivaldi's own. The items, in Arc's order and groups: `New Nested Folder…`, `Turn "<name>" into
  Space`; `Change Icon…`, `Rename…`; `Duplicate`, `Move to ▸`; `Delete`. Live folder rows keep the menu
  of 026.
- **FR-2.** `Delete` moves the bookmark folder, with all it contains, into Vivaldi's bookmark Trash,
  the node whose `trash` flag is true.
- **FR-3.** `Delete` closes every tab linked to a link inside the folder, at any depth, after the move
  succeeded, and shows the toast `Folder "<name>" moved to Trash`.
- **FR-4.** After any item the rows update at once, without a restart; a deleted or moved folder is
  forgotten by `OpenFolders`.
- **FR-5.** `Rename…` starts editing the folder name as the double click does.
- **FR-6.** `Duplicate` copies the bookmark folder and its content right below the original, with the
  same name, closed and with no tabs.
- **FR-7.** `Move to ▸` lists the workspaces with a check on the current one; choosing another moves the
  bookmark folder to the end of its root and moves the open tabs of its links to that workspace.
- **FR-8.** `New Nested Folder…` creates `Untitled` at the end of the folder, opens the folder and edits
  the new name.
- **FR-9.** `Change Icon…` opens a popover with 24 symbols and a reset button; the chosen symbol replaces
  the folder icon of that folder, and reset brings back the folder icon.
- **FR-10.** `Turn "<name>" into Space` creates a workspace named as the folder, moves the folder's
  content into its root, removes the empty folder, moves the open tabs of its links there and
  switches to it.

### Non-functional

- **NFR-1.** If a bookmark write fails, the folder and its tabs stay as they were, the problem is
  logged and a toast says the action failed. No tab is closed or moved before the bookmark write
  succeeds.
- **NFR-2.** The menu, the submenu and the icon popover are outside the window drag region.
- **NFR-3.** Uninstalling VivArcDi leaves every folder as an ordinary bookmark: deleted ones in the
  Trash, moved and duplicated ones where they are; a chosen icon is ignored by Vivaldi.

## Delivery

One menu, delivered in steps, each a `features/` pull request with its own tasks and Tore's check:

| Step | Items | Why in this order |
|---|---|---|
| 1 | `Delete`, `Rename…` | Tore's priority; Rename reuses 012. |
| 2 | `Duplicate`, `Move to ▸` | Bookmark copy (018) and roots per workspace (010, 012) already exist. |
| 3 | `New Nested Folder…`, `Change Icon…` | New folder reuses 012; the icon needs a stored value and a popover. |
| 4 | `Turn "<name>" into Space` | Depends on creating workspaces (030) and on 2. |

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a bookmark folder row is right-clicked, THE module SHALL open the folder menu with its items in Arc's order and cancel Vivaldi's menu. | auto: `opens the folder menu on a right click of a folder row` |
| AC-2 | WHEN a live folder row is right-clicked, THE module SHALL leave it to the live folder menu. | auto: `leaves live folder rows to their own menu` |
| AC-3 | WHEN `Delete` is chosen, THE module SHALL move the bookmark folder into the node marked as trash. | auto: `moves a deleted folder into the trash` |
| AC-4 | WHEN `Delete` is chosen, THE module SHALL close the tabs linked to links inside the folder, at any depth, and no other tab. | auto: `closes the tabs of the links of a deleted folder` |
| AC-5 | WHEN a folder is deleted, THE module SHALL show a toast that names it. | auto: `shows a toast after deleting a folder` |
| AC-6 | IF a bookmark write of a folder action fails, THEN THE module SHALL change no tab, keep the rows and show an error toast. | auto: `keeps the folder and its tabs when a folder action fails` |
| AC-7 | WHEN `Rename…` is chosen, THE module SHALL start editing the folder name. | auto: `starts editing the name from the folder menu` |
| AC-8 | WHEN `Duplicate` is chosen, THE module SHALL add a closed copy with the same name and content right below the folder. | auto: `duplicates a folder right below it` |
| AC-9 | WHEN another workspace is chosen in `Move to`, THE module SHALL move the folder to the end of that workspace's root and move the open tabs of its links there. | auto: `moves a folder and its tabs to another workspace` |
| AC-10 | WHILE the `Move to` submenu is open, THE current workspace SHALL be checked. | auto: `checks the current workspace in move to` |
| AC-11 | WHEN `New Nested Folder…` is chosen, THE module SHALL create `Untitled` at the end of the folder, open the folder and start editing the new name. | auto: `creates a nested folder and edits its name` |
| AC-12 | WHEN a symbol is chosen in the icon popover, THE folder row SHALL show it instead of the folder icon; WHEN reset is chosen, THE folder icon SHALL return. | auto: `shows the chosen icon of a folder and resets it` |
| AC-13 | WHEN `Turn into Space` is chosen, THE module SHALL create a workspace named as the folder, move the content into its root, remove the empty folder and move the open tabs there. | auto: `turns a folder into a workspace` |
| AC-14 | WHEN Tore deletes a folder of his workspace, THE folder SHALL disappear at once and its open tabs SHALL close; THE Bookmarks panel SHALL show it in the Trash, and restoring it SHALL show it again. | manual |
| AC-15 | WHEN Tore chooses `Rename…`, THE name SHALL become editable in place. | manual |
| AC-16 | WHEN Tore duplicates a folder and moves the copy to another workspace, THE copy SHALL show there, with its open tabs. | manual |
| AC-17 | WHEN Tore creates a nested folder and changes its icon, THE icon SHALL show in the tab bar and stay after a restart and on the other computer after Vivaldi Sync. | manual |
| AC-18 | WHEN Tore turns a folder into a space, THE new workspace SHALL open with the folder's links in its area. | manual |
| AC-19 | THE menu, the submenu and the popover SHALL work on macOS without moving the window. | manual |

## Out of scope

- `Share Folder…`: Arc shares through its account; Vivaldi has none (Q-7).
- `New Space…` inside `Move to` (Q-6).
- The space header `…` menu of Arc, also in the recording (`Change Space Icon…`, `Rename Space…`, `Edit
  Theme Color…`, `Set Profile ▸`, `New Folder`, `Live Folders ▸`, `Share Space…`, `Export "<name>" into
  Folder ▸`, `Manage Spaces…`, `Delete Space`): partly covered by 011, 019, 026 and 030; the rest is a
  later spec.
- Deleting a single link from the menu: the link rows keep `Remove pin` and `Tile tab` (031).
- An undo button in the toast: the Trash is the way back.

## Open questions

- [x] **Q-1. Trash or erase?** Move to Vivaldi's bookmark Trash (FR-2). The probe of 2026-11-12 found it
  through the bookmarks API: top-level node id `4`, `trash: true`, title `Cestino`.
- [x] **Q-2. What happens to the open tabs of a deleted folder?** Proposed: they close, as in Arc
  (FR-3). Alternative: they go back to today's list, so no open page is lost.
- [x] **Q-3. Confirmation before Delete?** Proposed: none, as in Arc, since the Trash keeps the folder.
  Alternative: ask when the folder holds links.
- [x] **Q-4. Steps.** Proposed: the four steps of Delivery, one pull request each, Delete first.
  Alternative: another order, or drop some items.
- [x] **Q-5. Where is a folder icon stored?** Proposed: in the bookmark folder itself, in a field that
  Vivaldi Sync carries and the panel does not show, so the icon follows the folder to the other
  computer; a probe before the step-3 design finds the field (the folder nodes have `description`,
  `nickname`, `themeColor`). Alternative: VivArcDi's local storage, on this computer only.
- [x] **Q-6. `New Space…` in `Move to`?** Proposed: not now; `Turn into Space` covers making a space
  from a folder. Alternative: create an empty workspace and move the folder into it.
- [x] **Q-7. `Share Folder…`?** Proposed: leave it out. Alternative: `Copy Links`, which copies the
  folder's links as a Markdown list.

## References

- Tore's recording `Registrazione schermo 2026-11-12 alle 22.30.15.mov`.
- Probe `folder-delete/sonda-cestino-segnalibri` (2026-11-12): Trash node `4` with `trash: true`; the
  private API also has `emptyTrash`.
- [009](../009-bookmark-folders-in-tab-bar/spec.md), [010](../010-folders-per-workspace/spec.md),
  [012](../012-editable-folders/spec.md), [018](../018-copy-bookmarks-to-workspace/spec.md),
  [026](../026-live-folders/spec.md), [027](../027-rename-pinned-tabs/spec.md) (icons of pinned
  tabs), [030](../030-workspace-sync/spec.md) (creating workspaces), [031](../031-pin-and-tile-commands/spec.md).
