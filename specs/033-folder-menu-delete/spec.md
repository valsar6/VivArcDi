# 033 Folder menu and Delete

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc a right click on a folder of the sidebar opens a menu, and its last item, `Delete`, removes the
folder. In VivArcDi the folders of the workspace favorites ([009](../009-bookmark-folders-in-tab-bar/spec.md),
[012](../012-editable-folders/spec.md)) can be created and renamed from the tab bar, but deleting one
still needs the Bookmarks panel (012, Out of scope). Tore's recording of 2026-11-12 names Delete as the
most important missing folder feature. This spec adds a right-click menu to folder rows, with `Rename…`
and `Delete`, and catalogs the other items of Arc's folder menu as gaps for later specs.

## User stories

- **US-1.** As a user, I want to right-click a folder of my workspace and choose `Delete`, so that the
  folder goes away without opening the Bookmarks panel, as in Arc.
- **US-2.** As a user, I want a deleted folder to be recoverable, so that a wrong click does not lose
  bookmarks I care about.
- **US-3.** As a user, I want `Rename…` in the same menu, so that I find it where Arc has it, besides
  the double click of 012.

## Expected behavior

Seen in Arc (`Registrazione schermo 2026-11-12 alle 22.30.15.mov`, 50 s). A right click on the folder
`Esempio Folder` opens a menu with, in order: `Share Folder…`; `New Nested Folder…`, `Turn "<name>"
into Space`; `Change Icon…`, `Rename…`; `Duplicate`, `Move to ▸`; `Delete`. Groups are split by
separator lines. Tore uses them in turn:

- `Rename…` puts the name in edit mode in place (`Esempio Folder` becomes `Cartella Nuova`).
- `Move to ▸` lists the spaces with a check on the current one (`Riposino`, `ramino`) and `New Space…`;
  choosing `ramino` moves the folder to the end of that space's pinned area.
- `Change Icon…` opens a small popover titled `Icon` with a grid of symbols and a trash button that
  goes back to the folder icon; the chosen symbol replaces the folder icon.
- `Duplicate` adds a copy with the same name right below the folder.
- `Delete` on the copy removes its row at once: no dialog, no toast. The folder was empty, so the
  recording does not show what happens to the tabs of a folder with content.

In VivArcDi:

**The menu.** A right click on a folder row of the workspace favorites, at any depth, opens VivArcDi's
own menu (the one of the link rows and tiles) instead of Vivaldi's, with `Rename…`, a separator and
`Delete`. Live folders of [026](../026-live-folders/spec.md) keep their own menu, which already has
`Delete Live Folder`. Items of Arc's menu that VivArcDi does not have yet are not shown.

**Rename….** Starts editing the name in place, exactly as the double click of 012 (FR-2 and FR-3 of 012).

**Delete.** The row of the folder, with the rows of everything inside it, leaves the area at once with
the leaving transition of the rows. The bookmark folder, with its subfolders and links, goes to
Vivaldi's bookmark **Trash**, where the Bookmarks panel can restore it; it is not erased. The tabs that
are open for links inside the folder are closed, as Arc closes a folder's tabs; a tab that is the
active one is closed too, and Vivaldi activates its neighbour. A short toast says `Folder "<name>"
moved to Trash`.

This differs from Arc on purpose: Arc deletes with no trace, VivArcDi keeps the bookmarks in the Trash
because the folders are Tore's real Vivaldi bookmarks, often made outside VivArcDi.

**Which folders.** Every folder row of the area can be deleted, inside the `VivArcDi` base folder of 012
or in a root set in `config.json`, since the Trash keeps them. The root of a workspace itself has no
row, so it can never be deleted from here.

## Requirements

### Functional

- **FR-1.** A right click on a bookmark folder row of the workspace favorites opens VivArcDi's menu with
  `Rename…`, a separator and `Delete`, and cancels Vivaldi's own menu. Live folder rows keep the menu of
  026.
- **FR-2.** `Rename…` starts editing the folder name as the double click does (012 FR-2, FR-3).
- **FR-3.** `Delete` moves the bookmark folder, with all it contains, into Vivaldi's bookmark Trash.
- **FR-4.** `Delete` closes every tab linked to a link inside the folder, at any depth.
- **FR-5.** After `Delete` a toast says `Folder "<name>" moved to Trash`.
- **FR-6.** The folder's rows leave the area with the leaving transition of 009, without waiting for
  a restart; the remembered open state of the folder (`OpenFolders`) is forgotten.

### Non-functional

- **NFR-1.** If moving to the Trash fails, the folder and its tabs stay as they were, the problem is
  logged and the toast says `Could not delete "<name>"`. No tab is closed before the bookmark write
  succeeds.
- **NFR-2.** The menu is outside the window drag region, as the other VivArcDi menus.
- **NFR-3.** Uninstalling VivArcDi leaves deleted folders in Vivaldi's Trash as ordinary bookmarks.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a bookmark folder row is right-clicked, THE module SHALL open a menu with `Rename…` and `Delete` and cancel Vivaldi's menu. | auto: `opens the folder menu on a right click of a folder row` |
| AC-2 | WHEN a live folder row is right-clicked, THE module SHALL leave it to the live folder menu. | auto: `leaves live folder rows to their own menu` |
| AC-3 | WHEN `Rename…` is chosen, THE module SHALL start editing the folder name. | auto: `starts editing the name from the folder menu` |
| AC-4 | WHEN `Delete` is chosen, THE module SHALL move the bookmark folder into Vivaldi's Trash. | auto: `moves a deleted folder into the trash` |
| AC-5 | WHEN `Delete` is chosen, THE module SHALL close the tabs linked to links inside the folder, at any depth, and no other tab. | auto: `closes the tabs of the links of a deleted folder` |
| AC-6 | WHEN a folder is deleted, THE module SHALL show a toast that names it. | auto: `shows a toast after deleting a folder` |
| AC-7 | IF moving the folder to the Trash fails, THEN THE module SHALL close no tab, keep the rows and show an error toast. | auto: `keeps the folder and its tabs when the delete fails` |
| AC-8 | WHEN Tore right-clicks a folder of his workspace and chooses `Delete`, THE folder SHALL disappear from the tab bar at once, and its open tabs SHALL close. | manual |
| AC-9 | WHEN Tore opens the Bookmarks panel after a delete, THE folder SHALL be in the Trash, and restoring it SHALL show it again in the workspace. | manual |
| AC-10 | WHEN Tore right-clicks a folder and chooses `Rename…`, THE name SHALL become editable in place. | manual |
| AC-11 | THE menu SHALL open and work on macOS without moving the window. | manual |

## Out of scope

The other items of Arc's folder menu, seen in the recording, are gaps for later specs, in Tore's order
of choice:

| Arc item | What it does in Arc | Gap in VivArcDi |
|---|---|---|
| `Move to ▸` | Lists the spaces (check on the current one) and `New Space…`; moves the folder to the end of the chosen space. | Missing. Feasible: move the bookmark folder to the other workspace's root (010, 012). |
| `Duplicate` | Adds a copy with the same name right below. | Missing. Feasible with the copier of 018. |
| `Change Icon…` | Popover `Icon` with a grid of symbols and a trash button to go back to the folder icon. | Missing. Needs a place to store the icon (bookmarks have no icon field); 027 does the same for pinned tabs. |
| `New Nested Folder…` | Creates a folder inside this one, name ready to type. | Missing: 012 creates folders only at the top level of the root. |
| `Turn "<name>" into Space` | Makes a new space whose pinned area is the folder's content. | Missing. Needs a new Vivaldi workspace plus moving the bookmarks (030 creates workspaces). |
| `Share Folder…` | Shares the folder through Arc's account. | Not applicable: there is no Arc account. Could become "copy the links" later. |

Also seen in the recording, and already covered elsewhere: the space header `…` menu (`Change Space
Icon…`, `Rename Space…`, `Edit Theme Color…`, `Set Profile ▸`, `New Folder`, `Live Folders ▸`, `Share
Space…`, `Export "<name>" into Folder ▸`, `Manage Spaces…`, `Delete Space`), the collapse arrow of the
header (011) and the `Clear` button of today's tabs (004).

- Deleting a single link from the menu: the link rows keep `Remove pin` and `Tile tab` (031).
- An undo button in the toast: the Trash is the way back.

## Open questions

- [ ] **Q-1. Trash or erase?** Proposed: move to Vivaldi's bookmark Trash, so nothing is lost (FR-3).
  Depends on the probe `folder-delete/sonda-cestino-segnalibri` finding the Trash through the bookmarks
  API; if it cannot be reached, fall back to erasing, with a confirmation dialog when the folder is not
  empty. Alternative: always erase, as Arc.
- [ ] **Q-2. What happens to the open tabs of a deleted folder?** Proposed: they close, as in Arc
  (FR-4). Alternative: they go back to today's list, so no open page is lost.
- [ ] **Q-3. Confirmation?** Proposed: none, as in Arc, since the Trash keeps the folder. Alternative:
  ask when the folder holds links.
- [ ] **Q-4. Rename in the menu?** Proposed: yes, since it costs little and is where Arc has it.
  Alternative: only `Delete` now.

## References

- Tore's recording `Registrazione schermo 2026-11-12 alle 22.30.15.mov`.
- [009](../009-bookmark-folders-in-tab-bar/spec.md), [012](../012-editable-folders/spec.md) (Out of
  scope: deleting folders), [026](../026-live-folders/spec.md) (`Delete Live Folder`),
  [031](../031-pin-and-tile-commands/spec.md) (row menu).
