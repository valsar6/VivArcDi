# 012 Editable folders

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-10-28; revisions approved 2026-11-01 (FR-10, FR-11 and AC-19 to AC-22 moved to 018) |

## Summary

In Arc a space's folders are made in the sidebar: a new folder appears with its name ready to type,
and a tab dragged onto a folder becomes one of its links. In VivArcDi the folders of
[009](../009-bookmark-folders-in-tab-bar/spec.md) and [010](../010-folders-per-workspace/spec.md) are
read-only: they are made in the Bookmarks panel and a workspace needs an entry in `config.json`. Tore's
check of 0.11.0 (2026-10-28) showed the gap: without a way to add folders, the collapse of
[011](../011-space-header/spec.md) has nothing to collapse. This spec makes the folders section
editable, writing to Vivaldi's bookmarks, as Tore accepted on 2026-10-28 (gaps B3, B9 and B10 of
`spaces/analisi-spaces-arc.md`).

## User stories

- **US-1.** As a user, I want to create a folder in my workspace from the tab bar and name it right
  away, so that I do not open the Bookmarks panel or edit `config.json`.
- **US-2.** As a user, I want to drag a tab of today onto a folder, so that it becomes a link of that
  folder and leaves the list of today's tabs.
- **US-3.** As a user, I want to drag a tab of today into the pinned tabs, so that it stays in my
  workspace.
- **US-4.** As a user, I want to rename a folder with a double click, as in Arc.
- **US-5.** As a user, I want a workspace I never configured to get its own folders as soon as I
  create the first one.
- **US-7.** As a user, I want Cmd/Ctrl+D to add the page I am on to the favorites area of my workspace,
  and the same keys again to take it back to my open tabs, as in Arc (Tore, 2026-11-01).

## Expected behavior

Seen in Arc (recording by Tore, 2026-10-28, seconds 6-7 and 22-31): the space menu has `New Folder`.
An `Untitled` folder appears at the end of the pinned area with its name selected; Tore types
`MyFolder` and presses Enter. He then drags the tab `Modifiche spunte…` from today's tabs onto
`MyFolder`: the tab leaves the list and shows below the closed folder, since it is open. Earlier he
drags `Rame Magazine` from today's tabs to the pinned area, and it becomes a pinned tab.

Revised with Tore on 2026-11-01, after a recording of Arc (`Registrazione schermo 2026-11-01 alle
01.04.27.mov`) and his annotated screenshot. The words: **Pinned Tabs** are Vivaldi's pinned tabs, the
Favorites grid of 001 and 003; **workspace favorites** are the blue area of the screenshot, the
folders section of 009 to 011 below the space header, where folders and single links live. In the
recording Tore presses Cmd+D on `Taglialegna`: the tab leaves today's list and shows at the end of the
workspace favorites, under `MyFolder`; he presses Cmd+D again and it goes back to the open tabs. He also
drags a tab from today's list into the area and drops it between two rows, where it stays.

In VivArcDi:

**Cmd/Ctrl+D.** On a page that is `http` or `https`, Cmd/Ctrl+D adds it to the workspace favorites: a
bookmark with the page's title and address at the end of the workspace's root, linked to the tab (as
in 009), so the tab leaves today's list and its row shows at the end of the area. The same keys with
the active tab already linked to a link of the root take it back: the tab shows again in today's list,
and the bookmark is removed only if VivArcDi created it with Cmd/Ctrl+D or a drop; a link that existed
before keeps its bookmark and stays in the area, and a toast says so. Cmd/Ctrl+D replaces the Pin/Unpin
mapping of [014](../014-arc-shortcuts/spec.md); Vivaldi's own Pin/Unpin stays in its menus, and pinning
to the Favorites grid is done by drag, as in Arc.

**Drop position.** A tab of today's list dropped between two rows of the area is added there, not at
the end (Arc, recording). Rows already in the area are not reordered: moving a link stays in the
Bookmarks panel.

**Mouse, not drag events.** The probe of 2026-10-31 saw no drag events in `window.html`: Vivaldi moves
tabs with the mouse. Drop targets are found by the pointer position when the button is released over
the area, not by `dragover` and `drop`.

**New folder.** The space header of 011 shows a `+` button on hover (the `…` menu of Arc is a later
spec). A click adds a folder named `Untitled` at the end of the workspace's root, as a real bookmark
folder, and puts its row in edit mode with the name selected. Enter saves the typed name, Escape
keeps `Untitled`, an empty name keeps `Untitled`.

**Root of a workspace without an entry.** Today a workspace with no entry in `workspaces` uses `root`,
empty by default, so it shows no folders and has nowhere to create one. With this spec such a
workspace uses a folder named after it inside a base folder, `VivArcDi/<workspace name>` by default
(option `workspacesBase`). The folder is created the first time the user creates a folder or drops a
tab in that workspace; until then nothing changes and the section stays hidden. Outside any workspace
the base is `VivArcDi/Tabs`. An entry in `workspaces` still wins, and a non-empty `root` still applies
to every workspace without an entry, as in 010.

**Drag a tab onto a folder.** Dragging a tab of today's list (Vivaldi's own tab row) over a folder row
highlights the folder; dropping it adds a bookmark with the tab's title and address at the end of that
folder, and the tab becomes the tab of that link (the bookmark id in its `vivExtData`, as in 009): it
leaves today's list and shows below the folder while it is open. Dropping on the header adds the link
at the top level of the root. A tab that already is the tab of a link, a Favorite or a pinned tab is
ignored, and so is a page that is not `http` or `https`.

**Drag a tab into the pinned tabs.** Dropping a tab of today's list between the folders section and
the first pinned tab, or among the pinned tabs, pins it in its workspace. If Vivaldi's own drag
already pins the tab there (probe before the design), VivArcDi adds nothing.

**Drag a bookmark folder onto a workspace.** Superseded by [018](../018-copy-bookmarks-to-workspace/spec.md)
(Tore, 2026-11-01): a bookmark or folder dragged from the Bookmarks panel is copied into the
workspace favorites, never linked as the root. `config.json` (`workspaces`) stays the way to link a
folder as a root.

**Rename.** A double click on a folder row puts it in edit mode, as for a new folder. A single click
still opens and closes it, after the double-click delay.

Removing and moving folders and links stay in the Bookmarks panel for now.

## Requirements

### Functional

- **FR-1.** The space header shows a `+` button on hover; a click creates a bookmark folder named
  `Untitled` at the end of the active workspace's root and starts editing its name.
- **FR-2.** Editing a name: Enter or leaving the field saves a non-empty name; Escape or an empty name
  keeps the previous one. Only one row is in edit mode at a time.
- **FR-3.** A double click on a folder row starts editing its name.
- **FR-4.** The root of a workspace is, in order: its entry in `workspaces`, `root` when not empty,
  `<workspacesBase>/<workspace name>`. Outside any workspace: `root` when not empty, else
  `<workspacesBase>/Tabs`.
- **FR-5.** The base folder and the workspace folder are created only on the first write (a new folder
  or a dropped tab); a workspace that was never written shows no section, as today.
- **FR-6.** Dropping a tab of today's list on a folder row adds a bookmark with its title and address
  at the end of the folder and links the tab to it; dropping on the header adds it at the top level of
  the root.
- **FR-7.** Tabs that are links, Favorites or pinned, and pages that are not `http` or `https`, cannot
  be dropped.
- **FR-8.** Dropping a tab of today's list on the Favorites grid pins it through Vivaldi's own drag; VivArcDi adds no code for it.
- **FR-10.** Removed: replaced by [018](../018-copy-bookmarks-to-workspace/spec.md) (Tore, 2026-11-01).
- **FR-11.** Removed with FR-10.
- **FR-12.** Cmd/Ctrl+D on a web page adds a bookmark with its title and address at the end of the
  workspace's root and links the tab to it; on the tab of such a link it takes the tab back to today's
  list and removes the bookmark when VivArcDi created it.
- **FR-13.** A drop of a tab of today's list between two rows of the area adds the bookmark at that
  position of the root; a drop on a folder keeps FR-6.
- **FR-14.** Drop targets are found by the pointer position on mouse release.
- **FR-15.** While the Favorites grid has no tiles, a placeholder of the grid's place says "Drag a tab here to pin it" (Tore, 2026-11-01).
  Releasing a tab of today's list on it pins the tab through `chrome.tabs`. With tiles, FR-8 holds: Vivaldi pins by its own drag.
- **FR-9.** Options of `bookmark-folders` in `config.json`: `workspacesBase` (`VivArcDi`). FR-7 of 009
  ("never creates, changes or deletes a bookmark") is replaced by FR-1 to FR-6.

### Non-functional

- **NFR-1.** A failed bookmark write leaves the section as it was and logs the problem; no half-made
  folder stays in edit mode.
- **NFR-2.** The `+` button, the edit field and the drop targets are outside the window drag region.
- **NFR-3.** Dragging a tab outside the folders section keeps Vivaldi's own drag behavior.
- **NFR-4.** Uninstalling VivArcDi leaves the created folders and links as ordinary bookmarks.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the `+` button of the header is clicked, THE module SHALL create a folder `Untitled` at the end of the active workspace's root and start editing it. | auto: `creates an Untitled folder at the end of the root` |
| AC-2 | WHEN Enter is pressed with a non-empty name, THE module SHALL rename the folder. | auto: `saves the typed name of a folder` |
| AC-3 | WHEN Escape is pressed or the name is empty, THE module SHALL keep the previous name. | auto: `keeps the name on escape or empty text` |
| AC-4 | WHEN a folder row is double clicked, THE module SHALL start editing its name and not toggle it. | auto: `edits the name on double click` |
| AC-5 | WHILE a workspace has no entry in `workspaces` and `root` is empty, THE root SHALL be `<workspacesBase>/<workspace name>`. | auto: `uses a folder named after the workspace as its root` |
| AC-6 | WHEN the first folder is created in a workspace whose root does not exist, THE module SHALL create the base and workspace folders first. | auto: `creates the workspace folder on the first write` |
| AC-7 | WHILE a workspace's root does not exist, THE section SHALL stay hidden and no bookmark SHALL be created. | auto: `creates nothing until the first write` |
| AC-8 | WHEN a tab of today is dropped on a folder row, THE module SHALL add a bookmark with its title and address to that folder and link the tab to it. | auto: `bookmarks a dropped tab into the folder and links it` |
| AC-9 | WHEN a tab is dropped on the header, THE module SHALL add the bookmark at the top level of the root. | auto: `bookmarks a tab dropped on the header at the top level` |
| AC-10 | IF the dropped tab is a link, a Favorite, a pinned tab or not a web page, THEN THE module SHALL ignore the drop. | auto: `ignores drops of tabs that cannot become links` |
| AC-11 | WHEN a tab of today is dropped on the Favorites grid, THE tab SHALL be pinned in its workspace. | manual |
| AC-12 | IF a bookmark write fails, THEN THE section SHALL stay as it was and log the problem. | auto: `keeps the section when a bookmark write fails` |
| AC-23 | WHEN Cmd/Ctrl+D is pressed on a web page that is not a link, THE module SHALL add a bookmark at the end of the root and link the tab to it. | auto: `adds the active tab to the workspace favorites on the shortcut` |
| AC-24 | WHEN Cmd/Ctrl+D is pressed on the tab of a link that VivArcDi created, THE module SHALL remove the bookmark and show the tab in today's list. | auto: `takes the tab back on a second press` |
| AC-25 | WHEN Cmd/Ctrl+D is pressed on the tab of a link that existed before, THE module SHALL keep the bookmark and the link. | auto: `keeps an existing bookmark on a second press` |
| AC-26 | WHEN a tab is released between two rows of the area, THE module SHALL add its bookmark at that position. | auto: `adds a dropped tab at the position of the drop` |
| AC-27 | WHEN Tore presses Cmd/Ctrl+D on a page, THE tab SHALL move to the end of the workspace favorites; WHEN he presses it again, THE tab SHALL go back to the open tabs. | manual |
| AC-28 | WHEN Tore drags a tab of today into the area and releases it between two rows, THE tab SHALL stay there. | manual |
| AC-13 | WHEN Tore clicks `+` in a workspace he never configured, types a name and presses Enter, THE folder SHALL appear in that workspace only. | manual |
| AC-14 | WHEN Tore drags a tab of today onto that folder, THE tab SHALL leave today's list and show below the closed folder. | manual |
| AC-15 | WHEN Tore drags a tab of today into the pinned tabs, THE tab SHALL become pinned. | manual |
| AC-16 | WHEN Tore double clicks a folder and types a new name, THE Bookmarks panel SHALL show the new name. | manual |
| AC-17 | WHEN Tore collapses the workspace after these steps, ONLY the open links and loaded pinned tabs SHALL stay visible (011 AC-14). | manual |
| AC-29 | WHILE the Favorites grid has no tiles, THE module SHALL show a placeholder with a hint where the grid goes, and remove it when a tile exists. | auto: `shows a placeholder while the grid has no tiles` |
| AC-30 | WHEN a tab of today is released on the placeholder, THE module SHALL pin the tab; IF the tab is already pinned, THEN it SHALL do nothing. | auto: `pins a tab released on the empty grid` |
| AC-31 | WHEN Tore drags a tab onto the empty grid, THE tab SHALL become pinned and the grid SHALL show it as a tile. | manual |
| AC-18 | THE `+` button, the edit field and the drops SHALL work on macOS without moving the window. | manual |

## Out of scope

- Deleting and moving folders and links from the tab bar, reordering by drag: the Bookmarks panel
  keeps doing it.
- Dragging a link row out of its folder back to today's tabs.
- The `…` space menu of Arc (rename, icon, color, delete): later spec.
- Subfolders created from the tab bar: a new folder is always at the top level of the root.

## Open questions

- [x] **Where is the `+`?** On the space header, on hover (Tore, 2026-10-28), since we have no space menu yet.
  Alternative: a right-click menu on the header with "Nuova cartella".
- [x] **Root of an unconfigured workspace?** Approved (Tore, 2026-10-28): `VivArcDi/<workspace name>`, created on the
  first write. Renaming the workspace in Vivaldi would then show a new, empty folder; the old one stays
  in the Bookmarks panel. Alternative: remember the folder by workspace id in VivArcDi's storage.
- [x] **Does Vivaldi already pin a tab dragged among the pinned tabs?** Probe of 2026-10-31: no drag
  events; the tab became pinned and unpinned again. Drops are found by the pointer (FR-14).
- [x] **Cmd/Ctrl+D replaces Pin/Unpin in 014.** Yes: 014 drops the Cmd+D mapping and VivArcDi handles
  the keys itself (Tore, 2026-11-01).
- [x] **Second press on a link that existed before.** The bookmark and link stay, a toast says so, so
  that a bookmark Tore made himself is never deleted (Tore, 2026-11-01).
- [x] **Empty grid (2026-11-01).** AC-11/15 failed on Vivaldi 8.2: with no Favorites folder and no pinned tab the grid is not drawn, so there is nowhere to drag. FR-15 adds a placeholder; Tore approved on a decision card (2026-11-01).
- [x] **FR-8 and AC-11.** Pinning a tab dragged onto the Favorites grid is left to Vivaldi and
  checked in the manual steps (Tore, 2026-11-01).
- [x] **What does "drag the Favorites folders into the workspaces" mean?** First approved reading (Tore, 2026-10-28):
  link a panel folder as the workspace's root. Revised 2026-11-01: Tore chose copying instead, in
  [018](../018-copy-bookmarks-to-workspace/spec.md), which removes FR-10 and FR-11.
- [x] **Where does a dropped link go?** Approved (Tore, 2026-10-28): at the end of the folder. Arc puts it where it is
  dropped, which needs reordering (out of scope).

## References

- `/mnt/project-files/spaces/analisi-spaces-arc.md`, behaviors B3, B9 and B10.
- Verification of 0.11.0 by Tore, 2026-10-28: steps 3 and 4 blocked for lack of folders.
- [009](../009-bookmark-folders-in-tab-bar/spec.md) FR-7 and FR-13, [010](../010-folders-per-workspace/spec.md) FR-1,
  [011](../011-space-header/spec.md).
