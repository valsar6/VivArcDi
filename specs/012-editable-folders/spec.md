# 012 Editable folders

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-10-28 |

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
- **US-6.** As a user, I want to drag a bookmark folder from the Bookmarks panel onto a workspace, so
  that the folder becomes what that workspace shows, without editing `config.json` (Tore, 2026-10-28).

## Expected behavior

Seen in Arc (recording by Tore, 2026-10-28, seconds 6-7 and 22-31): the space menu has `New Folder`.
An `Untitled` folder appears at the end of the pinned area with its name selected; Tore types
`MyFolder` and presses Enter. He then drags the tab `Modifiche spunte…` from today's tabs onto
`MyFolder`: the tab leaves the list and shows below the closed folder, since it is open. Earlier he
drags `Rame Magazine` from today's tabs to the pinned area, and it becomes a pinned tab.

In VivArcDi:

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

**Drag a bookmark folder onto a workspace.** Dragging a folder from Vivaldi's Bookmarks panel onto the
space header, or onto a workspace in Vivaldi's workspace switcher, makes that folder the root of the
workspace: the section shows its children at once. The choice is saved by VivArcDi, per workspace, and
wins over `workspaces` and `root` of `config.json` and over the default folder of the previous
paragraph. Dropping a folder on the header removes nothing: the bookmarks stay where they are.
`Reset folders` on the header's hover menu forgets the choice and goes back to the configured or
default root. Whether Vivaldi lets a page drop from the panel onto the switcher is unknown (probe
before the design).

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
- **FR-4.** The root of a workspace is, in order: the folder dropped on it (FR-10), its entry in `workspaces`, `root` when not empty,
  `<workspacesBase>/<workspace name>`. Outside any workspace: `root` when not empty, else
  `<workspacesBase>/Tabs`.
- **FR-5.** The base folder and the workspace folder are created only on the first write (a new folder
  or a dropped tab); a workspace that was never written shows no section, as today.
- **FR-6.** Dropping a tab of today's list on a folder row adds a bookmark with its title and address
  at the end of the folder and links the tab to it; dropping on the header adds it at the top level of
  the root.
- **FR-7.** Tabs that are links, Favorites or pinned, and pages that are not `http` or `https`, cannot
  be dropped.
- **FR-8.** Dropping a tab of today's list on the pinned area pins it, unless Vivaldi already does so.
- **FR-10.** Dropping a bookmark folder on the header, or on a workspace of the switcher, saves its
  path as the root of that workspace; it wins over `workspaces`, `root` and the default folder.
- **FR-11.** `Reset folders` forgets the saved root of the active workspace.
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
| AC-11 | WHEN a tab of today is dropped on the pinned area, THE tab SHALL be pinned in its workspace. | auto: `pins a tab dropped on the pinned area` |
| AC-12 | IF a bookmark write fails, THEN THE section SHALL stay as it was and log the problem. | auto: `keeps the section when a bookmark write fails` |
| AC-19 | WHEN a bookmark folder is dropped on the header, THE module SHALL save it as the root of the active workspace and show its children. | auto: `saves a dropped bookmark folder as the root of the workspace` |
| AC-20 | WHILE a workspace has a saved root, THE root SHALL win over `workspaces`, `root` and the default folder. | auto: `prefers the dropped folder to every other root` |
| AC-21 | WHEN `Reset folders` is used, THE module SHALL forget the saved root of the active workspace. | auto: `forgets the dropped folder on reset` |
| AC-22 | WHEN Tore drags a folder from the Bookmarks panel onto a workspace, THE workspace SHALL show its links and no other workspace SHALL change. | manual |
| AC-13 | WHEN Tore clicks `+` in a workspace he never configured, types a name and presses Enter, THE folder SHALL appear in that workspace only. | manual |
| AC-14 | WHEN Tore drags a tab of today onto that folder, THE tab SHALL leave today's list and show below the closed folder. | manual |
| AC-15 | WHEN Tore drags a tab of today into the pinned tabs, THE tab SHALL become pinned. | manual |
| AC-16 | WHEN Tore double clicks a folder and types a new name, THE Bookmarks panel SHALL show the new name. | manual |
| AC-17 | WHEN Tore collapses the workspace after these steps, ONLY the open links and loaded pinned tabs SHALL stay visible (011 AC-14). | manual |
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
- [ ] **Does Vivaldi already pin a tab dragged among the pinned tabs, and can a folder of the
  Bookmarks panel be dropped on the header or on the workspace switcher?** Two read-only probes on
  Tore's Vivaldi before the design (`spaces/diagnostica-trascinamento.md`). If Vivaldi already pins, FR-8
  needs no code; if the switcher takes no drop, only the header is a target for FR-10.
- [x] **What does "drag the Favorites folders into the workspaces" mean?** Approved reading (Tore, 2026-10-28): drag a
  bookmark folder (from the Bookmarks panel) onto a workspace to make it that workspace's root. The
  other reading, copying the folder's links, is not done.
- [x] **Where is the choice saved?** Approved (Tore, 2026-10-28): in VivArcDi's storage by workspace id, so a rename does
  not lose it; `config.json` keeps working as the fallback.
- [x] **Where does a dropped link go?** Approved (Tore, 2026-10-28): at the end of the folder. Arc puts it where it is
  dropped, which needs reordering (out of scope).

## References

- `/mnt/project-files/spaces/analisi-spaces-arc.md`, behaviors B3, B9 and B10.
- Verification of 0.11.0 by Tore, 2026-10-28: steps 3 and 4 blocked for lack of folders.
- [009](../009-bookmark-folders-in-tab-bar/spec.md) FR-7 and FR-13, [010](../010-folders-per-workspace/spec.md) FR-1,
  [011](../011-space-header/spec.md).
