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
- **US-2.** As a user, I want closing a pinned tab or Favorite to unload it instead of removing it.
- **US-3.** As a user, I want to go back to a pinned tab's saved page with one click after browsing
  away.
- **US-4.** As a user, I want to group pinned tabs in folders that I can collapse.
- **US-5.** As a user, I want the tab I opened from a collapsed folder to stay visible below the
  folder without expanding it.

## Expected behavior

**Favorites and pinned tabs.** A Favorite is a tab that Vivaldi pins in all workspaces (Vivaldi 7.8+).
Every other pinned tab belongs to its workspace. The Favorites grid of
[001](../001-favorites-grid/spec.md) shows the Favorites only, so it is the same in every workspace;
below it, each workspace shows its own pinned tabs as rows, then a separator, then its other tabs.
This replaces the rule of 001 that made the first pinned tabs of the tab bar into tiles, whatever
their workspace.

**Saved page.** A pinned tab, Favorite included, remembers the address it had when it was pinned. A
tab that was already pinned before VivArcDi saw it remembers the address it shows the first time
VivArcDi sees it. When the tab shows another page (other host or path, compared as in 007/FR-2),
its favicon turns into a reset button, as Arc does with the favicon and the "/" in the address.
Clicking it loads the saved address. Unpinning the tab forgets the address; pinning it again saves
the current one.

**Closing.** Cmd/Ctrl+W and the close button on a pinned tab or a Favorite unload it: the tab stays
in place, dimmed, and the last used tab becomes active, as the middle click of 001 already does. The
"Close tab" item of Vivaldi's context menu still closes the tab for real, so there is always a way
to remove one.

**Folders.** Folders are Vivaldi tab stacks shown as accordion. A collapsed folder shows only its
title. When one of its tabs is active, that tab shows right below the folder title, indented, while
the folder stays collapsed. When another tab becomes active, it goes back inside. This applies to
every accordion stack, pinned or not.

## Requirements

### Functional

- **FR-1.** Favorites are the tabs pinned in all workspaces. The grid shows only them, up to
  `maxTiles` of 001; the other pinned tabs show as rows of their own workspace.
- **FR-2.** Each pinned tab stores its saved address: the one it had when pinned, or the one it
  shows when VivArcDi first sees it pinned. Unpinning removes it.
- **FR-3.** WHILE a pinned tab shows a page different from its saved address, its favicon is a reset
  button that loads the saved address.
- **FR-4.** Cmd/Ctrl+W, with the focus in the interface or in the page, and the close button unload a
  pinned tab or Favorite instead of closing it, and activate the last used tab.
- **FR-5.** The active tab of a collapsed accordion stack shows below the stack title, indented.
- **FR-6.** Pinned tabs and tabs in folders are never auto-archived ([004](../004-today-tabs-and-keyboard/spec.md)).
- **FR-7.** Options in `config.json`, module `pinned-tabs`: `enabled` (true), `resetButton` (true),
  `unloadOnClose` (true); module `folders`: `enabled` (true).

### Non-functional

- **NFR-1.** Vivaldi's own data (sessions, workspaces, stacks) is never rewritten in a way that
  breaks it when VivArcDi is removed. VivArcDi adds at most its own key to a tab's data, which plain
  Vivaldi ignores.
- **NFR-2.** Saved addresses survive a restart of Vivaldi.
- **NFR-3.** IF Vivaldi's data or markup is not what the module expects, THEN the module does
  nothing and logs the error, and Vivaldi behaves as without VivArcDi.
- **NFR-4.** Works on Vivaldi 8.1 and 8.2, on macOS and Debian.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE grid SHALL mark as tiles only the tabs pinned in all workspaces. | auto: `marks only tabs pinned in all workspaces as tiles` |
| AC-2 | WHEN a tab is pinned, THE module SHALL save its current address. | auto: `saves the address of a newly pinned tab` |
| AC-3 | WHEN the module first sees a pinned tab without a saved address, THE module SHALL save its current address. | auto: `saves the address of a pinned tab seen for the first time` |
| AC-4 | WHEN a tab is unpinned, THE module SHALL forget its saved address. | auto: `forgets the address of an unpinned tab` |
| AC-5 | WHILE a pinned tab shows another host or path than its saved address, THE tab SHALL be marked for the reset button. | auto: `marks pinned tabs that left their saved address` |
| AC-6 | WHEN the user clicks the reset button, THE tab SHALL load its saved address. | auto: `loads the saved address on reset` |
| AC-7 | WHEN Cmd/Ctrl+W targets a pinned tab or Favorite, THE module SHALL unload it and activate the last used tab. | auto: `unloads a pinned tab on close shortcut` |
| AC-8 | WHEN Cmd/Ctrl+W targets an ordinary tab, THE module SHALL leave the shortcut to Vivaldi. | auto: `leaves the close shortcut to Vivaldi for ordinary tabs` |
| AC-9 | WHILE a stack is collapsed and one of its tabs is active, THE module SHALL mark that tab as peeking. | auto: `marks the active tab of a collapsed stack as peeking` |
| AC-10 | WHEN another tab becomes active, THE module SHALL remove the peeking mark. | auto: `removes the peeking mark when another tab is active` |
| AC-11 | WHEN Tore switches workspace, THE Favorites grid SHALL stay the same and the pinned rows SHALL be those of the new workspace. | manual |
| AC-12 | WHEN Tore browses away from a pinned tab's page and clicks its favicon, THE tab SHALL go back to the saved page. | manual |
| AC-13 | WHEN Tore presses Cmd/Ctrl+W on a pinned tab or clicks its close button, THE tab SHALL stay in place, dimmed. | manual |
| AC-14 | WHILE a folder is collapsed and Tore opens one of its tabs, THAT tab SHALL show below the folder title and go back inside when Tore opens another tab. | manual |
| AC-15 | WHEN Vivaldi restarts, THE saved addresses SHALL be kept. | manual |
| AC-16 | IF VivArcDi is uninstalled, THEN workspaces, pinned tabs and stacks SHALL remain usable in plain Vivaldi. | manual |

## Out of scope

- Hover preview of a closed folder with list and search: [008](../008-folder-hover-preview/spec.md).
- A keyboard shortcut or menu item for the reset: Vivaldi's menus and shortcut list cannot be
  extended safely by a mod.
- Changing what the "Close tab" item of the context menu does.
- Sharing folders or workspaces.
- Nested folders, which Vivaldi stacks do not support.

## Open questions

- [ ] Where to store saved addresses? Proposed: under a `vivarcdi` key in the tab's `vivExtData`,
  which Vivaldi saves with the session, so the address follows the tab across restarts and
  workspaces. To be confirmed by the probe below; if Vivaldi drops the key on restart, the fallback
  is the `localStorage` of the browser window, keyed by workspace and position among pinned tabs.
- [ ] Global Favorites? Proposed: rely on Vivaldi's "pin in all workspaces" and only tell them apart
  in the interface (FR-1). Less code, and nothing to undo when VivArcDi is removed.
- [ ] Is "lock to domain" enough for the reset? Proposed: no. It keeps the tab on one site but has
  no way back to the saved page, and Arc lets pinned tabs leave their site. VivArcDi adds its own
  reset and leaves "lock to domain" as an optional Vivaldi setting that works with it.
- [ ] Context menu "Close tab"? Proposed: it keeps closing for real (Expected behavior).
- [ ] Peek-out of the active tab: CSS on a mark, or a copy of the row? Proposed: a data attribute on
  the active tab plus CSS when Vivaldi keeps the tabs of a collapsed stack in the page; a clickable
  copy of the row drawn below the title when it removes them. To be decided by the probe below.

The probe is a script Tore runs in Vivaldi's interface console (`phase-3/diagnostica-cartelle.js` in
the project files). It reports the `vivExtData` of the tabs, the markup of a collapsed stack, and
writes a test key that a second run, after a restart, reads back and removes.

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section "Spaces, Pinned tabs e
  cartelle".
- [docs/native-settings.md](../../docs/native-settings.md#favorites-and-pinned-tabs)
- [007 Reopen pinned tabs](../007-reopen-pinned-tabs/spec.md) matches addresses with FR-2 of 007
  and reuses the peek-out of FR-5.
