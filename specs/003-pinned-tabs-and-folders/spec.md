# 003 Pinned tabs and folders

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

## Summary

In Arc, pinned tabs belong to one Space and act as live bookmarks: they never close, they can be
reset to the page they were pinned with, and they can live in folders. When a folder is closed, its
active tab peeks out below it. This spec brings that model to Vivaldi workspaces and tab stacks, and
keeps Favorites global.

## User stories

- **US-1.** As a user, I want each workspace to have its own pinned tabs, while Favorites stay the
  same everywhere.
- **US-2.** As a user, I want closing a pinned tab or Favorite to unload it instead of removing it,
  whatever the way I close it.
- **US-3.** As a user, I want to go back to a pinned tab's saved page with one click after browsing
  away.
- **US-4.** As a user, I want to group pinned tabs in folders that I can collapse.
- **US-5.** As a user, I want the tab I opened from a collapsed folder to stay visible below the
  folder without expanding it.

## Expected behavior

Favorites (the grid of [001](../001-favorites-grid/spec.md)) are shared by every workspace. Below
them, each workspace shows its own pinned tabs, then a separator, then its other tabs.

A pinned tab remembers the URL it was pinned with. When the user navigates away, the tab shows a
reset affordance (Arc shows a "/" in the URL and makes the favicon clickable); clicking it, or the
"Reset tab" command, returns to the saved URL. Cmd/Ctrl+W on a pinned tab or a Favorite unloads it
and keeps it in place, dimmed.

Folders are Vivaldi tab stacks shown as an accordion. A collapsed folder shows only its title. When
one of its tabs is active, that tab is shown right below the folder title, indented, while the folder
stays collapsed; switching to another tab puts it back inside.

## Requirements

### Functional

- **FR-1.** Favorites are the same in every workspace without the user pinning them in all
  workspaces by hand.
- **FR-2.** Each pinned tab stores its pinned URL; a reset command and a clickable reset affordance
  restore it.
- **FR-3.** Cmd/Ctrl+W, the close button and the context menu close action unload pinned tabs and
  Favorites instead of closing them.
- **FR-4.** The active tab of a collapsed accordion stack is shown below the stack title.
- **FR-5.** Pinned tabs and tabs in folders are never auto-archived ([004](../004-today-tabs-and-keyboard/spec.md)).

### Non-functional

- **NFR-1.** Vivaldi's own data (sessions, workspaces, stacks) is never rewritten in a way that
  breaks it when VivArcDi is removed.
- **NFR-2.** Saved URLs survive a restart of Vivaldi.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user switches workspace, THE Favorites grid SHALL stay the same. | manual |
| AC-2 | WHEN the user switches workspace, THE pinned tabs shown SHALL be those of the new workspace. | manual |
| AC-3 | WHILE a pinned tab shows a URL different from its saved one, THE tab SHALL show the reset affordance. | manual |
| AC-4 | WHEN the user activates the reset affordance or command, THE tab SHALL load its saved URL. | manual |
| AC-5 | WHEN the user presses Cmd/Ctrl+W on a pinned tab or Favorite, THE tab SHALL be unloaded and stay in place. | manual |
| AC-6 | WHILE a folder is collapsed and one of its tabs is active, THAT tab SHALL appear below the folder title. | manual |
| AC-7 | WHEN another tab becomes active, THE peeking tab SHALL return inside the collapsed folder. | manual |
| AC-8 | WHEN Vivaldi restarts, THE saved URLs SHALL be kept. | manual |
| AC-9 | IF VivArcDi is uninstalled, THEN workspaces, pinned tabs and stacks SHALL remain usable in plain Vivaldi. | manual |

## Out of scope

- Hover preview of a closed folder with list and search.
- Sharing folders or workspaces.
- Nested folders, unless Vivaldi stacks support them natively.

## Open questions

- [ ] Where to store saved URLs: `vivExtData` on the tab (private API), `chrome.storage`, or a file
  in the profile? Needs a prototype.
- [ ] Global Favorites: rely on Vivaldi's "pin in all workspaces" (7.8+) and only tell them apart in
  the interface, or manage them ourselves?
- [ ] Is "lock to domain" (Vivaldi 7.8+) enough for the reset behavior, so we only add the
  affordance?
- [ ] Peek-out of the active tab: can CSS on accordion stacks do it, or does it need DOM work? The
  strategy marks this as the riskiest part; a prototype comes before the design.

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section "Spaces, Pinned tabs e
  cartelle".
- [docs/native-settings.md](../../docs/native-settings.md#favorites-and-pinned-tabs)
- [007 Reopen pinned tabs](../007-reopen-pinned-tabs/spec.md) reuses the peek-out of FR-4.
