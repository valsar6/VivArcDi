# 003 Favorites and pinned tabs

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

## Summary

In Arc, Favorites are the same in every Space, while pinned tabs belong to one Space; both act as
live bookmarks: they never close and they go back to their own page with one click. Vivaldi 8.2 has
no tab shared by every workspace, so VivArcDi draws the Favorites from a bookmark folder, the same in
every workspace, and keeps Vivaldi's pinned tabs as the pinned tabs of each workspace. Folders, which
in Arc live in the same area, have their own spec, [009](../009-bookmark-folders-in-tab-bar/spec.md).

## User stories

- **US-1.** As a user, I want the same Favorites in every workspace, and each workspace to have its
  own pinned tabs.
- **US-2.** As a user, I want closing a Favorite or a pinned tab to unload it instead of removing it.
- **US-3.** As a user, I want to go back to a Favorite's or pinned tab's own page with one click
  after browsing away.

## Expected behavior

**Favorites.** The Favorites are the links of one bookmark folder, the **Favorites folder** (an
option; `Favorites` by default). VivArcDi draws them as the grid of icon tiles of
[001](../001-favorites-grid/spec.md), at the top of the vertical tab bar of every workspace, in the
folder's order. The user adds, removes and orders Favorites in the Bookmarks panel; VivArcDi never
changes a bookmark.

A click on a tile brings the user to the Favorite's tab in the current workspace, loading it if it
was unloaded. When the workspace has no tab for that Favorite yet, VivArcDi opens one with the
bookmark's address, pins it and links it to the bookmark. A linked tab is hidden from Vivaldi's list
of tabs, because its tile already shows it: the active tile is highlighted and the tile of an unloaded
tab is dimmed, as in 001. Each workspace has its own tab for a Favorite, since a Vivaldi tab belongs
to one workspace.

**Pinned tabs.** Vivaldi's pinned tabs of a workspace show as rows below the Favorites, then the
folders of 009, then a separator and the other tabs. This replaces the rule of 001 that made the
first pinned tabs into tiles.

**Own page.** A Favorite's own page is its bookmark's address. A pinned tab's own page is the
address it had when it was pinned, or the one it shows the first time VivArcDi sees it pinned;
unpinning forgets it, pinning again saves the current one. When the tab shows another page (other
host or path, compared as in 007/FR-2), a click brings it back: on the favicon of a pinned row, and
on the tile when the Favorite is already active, as in Arc.

**Closing.** Cmd/Ctrl+W and the close button on a Favorite or pinned tab unload it: the tile or the
row stays, dimmed, and the last used tab becomes active, as the middle click of 001 already does. The
"Close tab" item of Vivaldi's context menu still closes the tab for real.

## Requirements

### Functional

- **FR-1.** The Favorites grid shows the web links of the Favorites folder, in its order, up to
  `maxTiles` of 001, in every workspace. Subfolders, separators and other links are skipped.
- **FR-2.** A click on a tile activates the tab linked to that Favorite in the current window and
  workspace, loading it if unloaded; with none, it opens the bookmark's address in a new pinned tab of
  the current workspace and links it to the bookmark.
- **FR-3.** Tabs linked to a Favorite are hidden from the tab list; their tile shows them as active
  or unloaded.
- **FR-4.** Each pinned tab stores its own page: the address it had when pinned, or the one it shows
  when VivArcDi first sees it pinned. Unpinning removes it.
- **FR-5.** WHILE a Favorite or pinned tab shows another page than its own, a click on the active tile
  or on the row's favicon loads its own page.
- **FR-6.** Cmd/Ctrl+W, with the focus in the interface or in the page, and the close button unload a
  Favorite or pinned tab instead of closing it, and activate the last used tab.
- **FR-7.** WHEN a Favorite's bookmark is removed, its tabs are unlinked and show again as pinned rows.
- **FR-8.** Favorites and pinned tabs are never auto-archived ([004](../004-today-tabs-and-keyboard/spec.md)).
- **FR-9.** Options in `config.json`: module `favorites-grid` gains `folder` (path of titles
  separated by `/`, searched as in 009/FR-10; `Favorites` by default); module `pinned-tabs` with
  `enabled` (true), `resetButton` (true), `unloadOnClose` (true).

### Non-functional

- **NFR-1.** VivArcDi never creates, changes or deletes a bookmark. On tabs it adds at most its own
  key to Vivaldi's tab data, which plain Vivaldi ignores.
- **NFR-2.** The links between tabs and Favorites, and the own pages of pinned tabs, survive a
  restart of Vivaldi.
- **NFR-3.** IF the Favorites folder is missing, THEN the grid falls back to the rule of 001 and the
  reason is logged. IF `chrome.tabs` or Vivaldi's markup is not what the module expects, THEN the
  module does nothing and logs the error.
- **NFR-4.** Works on Vivaldi 8.1 and 8.2, on macOS and Debian.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE grid SHALL list the web links of the Favorites folder in their order, skipping subfolders, separators and other links. | auto: `lists the web links of the favorites folder in order` |
| AC-2 | WHEN a Favorite's bookmark is created, renamed, moved or removed, THE grid SHALL be rebuilt. | auto: `rebuilds the favorites when the folder changes` |
| AC-3 | WHEN the user clicks a tile with a linked tab in the current workspace, THE module SHALL activate it, loading it if unloaded. | auto: `activates the linked tab of a favorite` |
| AC-4 | WHEN the user clicks a tile without a linked tab in the current workspace, THE module SHALL open the bookmark's address in a new pinned tab linked to it. | auto: `opens a pinned linked tab for a favorite without one` |
| AC-5 | THE module SHALL mark linked tabs as hidden, and their tiles as active or unloaded. | auto: `hides linked tabs and mirrors their state on the tile` |
| AC-6 | WHEN a tab is pinned, THE module SHALL save its current address as its own page. | auto: `saves the address of a newly pinned tab` |
| AC-7 | WHEN the module first sees a pinned tab without an own page, THE module SHALL save its current address. | auto: `saves the address of a pinned tab seen for the first time` |
| AC-8 | WHEN a tab is unpinned, THE module SHALL forget its own page. | auto: `forgets the address of an unpinned tab` |
| AC-9 | WHILE a Favorite or pinned tab shows another host or path than its own page, THE module SHALL mark it as away. | auto: `marks favorites and pinned tabs that left their own page` |
| AC-10 | WHEN the user clicks the active away tile or the favicon of an away row, THE tab SHALL load its own page. | auto: `loads the own page on reset` |
| AC-11 | WHEN Cmd/Ctrl+W targets a Favorite or pinned tab, THE module SHALL unload it and activate the last used tab. | auto: `unloads a pinned tab on close shortcut` |
| AC-12 | WHEN Cmd/Ctrl+W targets an ordinary tab, THE module SHALL leave the shortcut to Vivaldi. | auto: `leaves the close shortcut to Vivaldi for ordinary tabs` |
| AC-13 | WHEN a Favorite's bookmark is removed, THE module SHALL unlink its tabs. | auto: `unlinks tabs of a removed favorite` |
| AC-14 | WHEN Tore switches workspace, THE Favorites grid SHALL stay the same and the pinned rows SHALL be those of the new workspace. | manual |
| AC-15 | WHEN Tore clicks a Favorite in two workspaces, EACH workspace SHALL get its own tab, hidden from the tab list. | manual |
| AC-16 | WHEN Tore browses away from a Favorite or pinned tab and clicks the tile or favicon, THE tab SHALL go back to its own page. | manual |
| AC-17 | WHEN Tore presses Cmd/Ctrl+W on a Favorite or pinned tab or clicks its close button, THE tile or row SHALL stay, dimmed. | manual |
| AC-18 | WHEN Vivaldi restarts, THE Favorites SHALL keep their tabs and the pinned tabs their own pages. | manual |
| AC-19 | IF VivArcDi is uninstalled, THEN bookmarks, workspaces and pinned tabs SHALL remain usable in plain Vivaldi, with the Favorites' tabs as ordinary pinned tabs. | manual |

## Out of scope

- Adding a Favorite by dragging a tab onto the grid, and reordering tiles by dragging: Favorites are
  managed in the Bookmarks panel for now.
- One tab shared by every workspace, which Vivaldi does not support.
- Folders in the tab bar: [009](../009-bookmark-folders-in-tab-bar/spec.md).
- A keyboard shortcut or menu item for the reset, and changing the "Close tab" item of the context
  menu.

## Open questions

- [x] Where to store saved addresses and links? Under a `vivarcdi` key in the tab's `vivExtData`,
  which Vivaldi saves with the session: the probe on Vivaldi 8.2 (macOS, 2026-10-27) found the key
  again after a restart, while tab ids changed.
- [x] Global Favorites? Vivaldi 8.2 has no "pin in all workspaces" (Tore's context menu,
  2026-10-27), so Favorites come from a bookmark folder drawn in every workspace (Tore, 2026-10-27).
- [x] Is "lock to domain" enough for the reset? No: it keeps the tab on one site but has no way back
  to its own page. It stays an optional Vivaldi setting that works with the reset (Tore, 2026-10-27).
- [x] Context menu "Close tab"? It keeps closing for real (Tore, 2026-10-27).
- [ ] Which folder holds the Favorites? Proposed: a new folder `Favorites` that Tore creates in the
  Bookmarks panel, with WhatsApp, Reddit, Claude and Rasterbator; option `folder` points to it.
- [ ] Hide the Favorite's tab from the tab list? Proposed: yes, the tile shows it, as in Arc (FR-3).
- [ ] One tab per Favorite in each workspace? Proposed: yes, opened only when the Favorite is first
  clicked in that workspace and unloaded like any other.

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section "Spaces, Pinned tabs e
  cartelle".
- [docs/native-settings.md](../../docs/native-settings.md#favorites-and-pinned-tabs)
- [007 Reopen pinned tabs](../007-reopen-pinned-tabs/spec.md) matches addresses with FR-2 of 007.
- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md) reads and draws
  bookmarks in the tab bar; the grid shares its reader and its search of a folder by path.
