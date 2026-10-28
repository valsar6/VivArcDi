# 011 Space header

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

## Summary

In Arc every space has a header between the Favorites and its folders: the space's icon and name, and
an arrow that collapses the space so that only what is open stays visible. Tore's screen recording of
2026-10-28 shows it on the space `Riposino`. This spec adds the same header above the folders of
[009](../009-bookmark-folders-in-tab-bar/spec.md) and [010](../010-folders-per-workspace/spec.md) and
the pinned tabs of [003](../003-pinned-tabs-and-folders/spec.md), using Vivaldi's workspaces as spaces.
It is the first gap of the Spaces analysis (`spaces/analisi-spaces-arc.md`, B1 and B7).

## User stories

- **US-1.** As a user, I want to see the icon and name of the workspace I am in above its folders, so
  that I always know which space I am using, as in Arc.
- **US-2.** As a user, I want to collapse the folders and pinned tabs of a workspace, so that the tab
  bar shows only the pages I have open.
- **US-3.** As a user, I want each workspace to remember whether I left it collapsed, also after a
  restart.

## Expected behavior

Seen in Arc (recording by Tore, 2026-10-28, seconds 0 and 20-21): under the Favorites grid a row with
the space icon (a heart) and the name `Riposino`. Hovering the row shows an arrow on its left. A click
collapses the space: the folders and the pinned tab that is not loaded disappear, the pinned tab that
is open (`Rame Magazine`) stays. A second click opens the space again. The Favorites grid and today's
tabs below `Clear` do not change.

In VivArcDi the header is a row of the tab bar, right below the Favorites grid and above the folders
section. It shows the icon and the name of the active workspace, read from Vivaldi's list of workspaces
like 010 does. When the user switches workspace, the header shows the new one, collapsed or open as
that workspace was left.

A click anywhere on the header toggles it. While a workspace is collapsed:

- the folders section shows only the links that have an open tab (the rows that 009 already keeps
  below a closed folder), without the folder rows;
- the pinned tabs of the workspace that are unloaded are hidden; the loaded ones, and the active one,
  stay;
- the header shows a closed arrow, so it is clear something is hidden.

Opening a hidden link or pinned tab another way (Cmd/Ctrl+T as in 007, or a click on a Favorite)
makes it loaded, so it appears in the collapsed list. Closing an open link or pinned tab while
collapsed hides it.

Outside any workspace (Vivaldi's default area, where tabs have no workspace) the header shows no icon
and the name `Tabs`, and can be collapsed as well. Renaming a workspace or changing its icon in
Vivaldi updates the header.

Deliberate difference from Arc: the header has no `…` menu. Renaming, changing the icon and deleting
a workspace stay in Vivaldi's own workspace menu; the space menu of Arc is a later spec.

## Requirements

### Functional

- **FR-1.** The header shows the icon and name of the active workspace from `vivaldi.workspaces.list`,
  and follows its changes.
- **FR-2.** A click on the header toggles the collapsed state of the active workspace.
- **FR-3.** While collapsed, folder rows and links without an open tab are hidden; links with an open
  tab stay visible.
- **FR-4.** While collapsed, unloaded pinned tabs of the workspace are hidden; loaded and active ones
  stay visible.
- **FR-5.** The collapsed state is saved for each workspace in `chrome.storage.local` (the shared store
  of 0.7.1) and restored at start-up and on every workspace switch.
- **FR-6.** Tabs outside any workspace use the name `Tabs` and their own saved state.
- **FR-7.** The header belongs to a new module `space-header`, enabled by default and disabled with
  `"space-header": false` in `config.json`.

### Non-functional

- **NFR-1.** The header follows Vivaldi's theme colors and the style of the folder rows of 009.
- **NFR-2.** The header is outside the window drag region, so clicks and hover reach it on macOS.
- **NFR-3.** Pinned tabs are hidden with an inline style on their slot, as 009 does for link tabs,
  since Vivaldi's own rules beat the stylesheet.
- **NFR-4.** If the list of workspaces cannot be read, the header shows `Tabs` and logs the problem
  once; Vivaldi keeps working.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE header SHALL show the icon and name of the active workspace. | auto: `shows the icon and name of the active workspace` |
| AC-2 | WHEN the active workspace changes, THE header SHALL show the new workspace and its saved state. | auto: `shows the new workspace and its state on switch` |
| AC-3 | WHEN a workspace is renamed or its icon changes, THE header SHALL show the new name and icon. | auto: `follows a renamed workspace` |
| AC-4 | WHILE the active tab is outside any workspace, THE header SHALL show the name `Tabs` and no icon. | auto: `uses Tabs outside any workspace` |
| AC-5 | WHEN the header is clicked, THE module SHALL toggle the collapsed state of the active workspace. | auto: `toggles the collapsed state on click` |
| AC-6 | WHILE a workspace is collapsed, THE folders section SHALL hide folder rows and links without an open tab. | auto: `hides folders and closed links while collapsed` |
| AC-7 | WHILE a workspace is collapsed, THE links with an open tab SHALL stay visible. | auto: `keeps open links visible while collapsed` |
| AC-8 | WHILE a workspace is collapsed, THE module SHALL hide its unloaded pinned tabs and keep the loaded and active ones. | auto: `hides only unloaded pinned tabs while collapsed` |
| AC-9 | WHEN a hidden pinned tab or link gets loaded while collapsed, THE module SHALL show it. | auto: `shows a pinned tab that gets loaded while collapsed` |
| AC-10 | THE module SHALL save the collapsed state for each workspace separately. | auto: `remembers the collapsed state of each workspace` |
| AC-11 | IF the list of workspaces cannot be read, THEN THE header SHALL show `Tabs` and log the problem once. | auto: `falls back to Tabs when workspaces are unreadable` |
| AC-12 | WHERE `space-header` is disabled, THE module SHALL draw no header and hide nothing. | auto: `disabled module draws no header` |
| AC-13 | WHEN Tore switches between two workspaces, THE header SHALL show the icon and name of each. | manual |
| AC-14 | WHEN Tore collapses a workspace with a loaded pinned tab, an unloaded pinned tab and an open link, ONLY the loaded pinned tab and the open link SHALL stay visible. | manual |
| AC-15 | WHEN Tore restarts Vivaldi, EACH workspace SHALL be collapsed or open as he left it. | manual |
| AC-16 | WHEN Tore hovers and clicks the header on macOS, THE arrow SHALL appear and the click SHALL toggle it. | manual |

## Out of scope

Later specs, in Tore's priority order of 2026-10-28:

- Editable folders section: new folder with inline name, dragging a tab into a folder or into the
  pinned tabs (gaps B3, B9, B10). Next spec; Tore accepts that it writes to Vivaldi's bookmarks.
- "Replace pinned address with the current one" in the pinned tab menu (B5). Renaming a tab is
  already native in Vivaldi 8.2 (Tore, 2026-10-28).
- Bar of space icons at the bottom of the tab bar, replacing Vivaldi's workspace switcher (B11). Low
  priority.
- Color per space, chosen from a menu (B8, B11). Low priority.
- Closing a pinned tab shows an empty page as in Arc instead of the last used tab (B2). Low priority,
  changes 003.
- The `…` space menu, profiles, Live Folders, sharing and exporting a space.

## Open questions

- [ ] **What does a click do?** Proposed: a click anywhere on the header toggles it, the arrow only
  shows the state. In Arc only the arrow toggles; a whole-row target is easier to hit.
- [ ] **Default area name?** Proposed: `Tabs`. Alternative: no header outside a workspace.
- [ ] **Unloaded but active pinned tab?** Proposed: the active tab always stays visible, even when
  Vivaldi reports it unloaded.

## References

- `/mnt/project-files/spaces/analisi-spaces-arc.md` (project files), behaviors B1 and B7.
- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md), AC-28 (inline
  style on the tab slot).
- [010 Folders per workspace](../010-folders-per-workspace/spec.md), FR-8 (workspace names).
- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section "Spazi".
