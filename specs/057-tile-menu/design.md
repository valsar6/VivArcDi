# 057 Menu of a Favorites tile: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-21. It says **how**; the spec says **what**. It builds on
the tile menu of [031](../031-pin-and-tile-commands/design.md) (`TileMenu`, `ContextMenu`) and on the
items of [056](../056-saved-tab-menu/spec.md), whose design is written in parallel and is not repeated
here.

## Approach

The behavior of the five items is that of 056: Copy Link, `Edit Pinned Page ▸` (`Replace Pinned URL
with Current`, `Edit…`), `Open in Split View`, `Duplicate`. What changes is the thing they act on: not
a link row of the folders section, but the bookmark of a tile in the Favorites folder. So 057 reuses
the commands of 056 and adds only the glue that finds the tile's bookmark and its open tab.

### What it reuses from 056

Modules never import each other (`src/modules/favorites` cannot import `src/modules/folders`), so the
commands can be shared only through `src/shared/` or `src/core/`. The design of 056
(`specs/056-saved-tab-menu/design.md`, in progress when this was written) must therefore put its item
builders there. 057 needs these pieces and assumes them in `src/shared/`:

| Piece of 056 | Used by 057 as | Generalization needed |
|---|---|---|
| Copy Link (uses the copier of 004 and its toast) | `copies the saved link of a tile` | takes a bookmark id and its URL, not a row |
| Duplicate (`BookmarkCopier.copy(ids, parentId, index)`) | copy at `index + 1` of the tile's parent | none in what it copies: `BookmarkCopier` copies only title and URL (bookmarks of this Vivaldi have no `vivExtData` and no icon member); it moved to `src/shared/linkmenu/` in T3 |
| `Edit Pinned URL` dialog and its URL check | `edits the pinned url of a tile` | none, if it takes a callback `save(url)` |
| `Replace Pinned URL with Current` and its disabled rule | `replaces the pinned url of a tile...` | takes "the open tab" as an argument |
| Open in Split View (tiling, address-bar path, NFR-2) | AC-5 | takes "the tab of the row" as an argument |
| The bookmark URL write (041, 042) | `BookmarkWriter` | none |

If 056's design leaves a piece inside `modules/folders`, the first implementation task of 057 (T3)
moves it to `shared` with its tests unchanged; the tests of 056 keep their names. A tile and a link
row differ in only two ways, both resolved by the glue below: the bookmark lives under the Favorites
folder (not under a workspace root), and its open tab is found through `LinkedTabs` (the tab linked to
a Favorite in the active workspace), not through the row.

### The glue

**`TileLinkCommands`** in `src/modules/favorites/`: `items(id: string): Promise<MenuItem[]>`. It reads
the tile's bookmark with `writer.get(id)`, finds its open tab with `LinkedTabs.snapshot()` (by bookmark
id, active workspace only, as the removal commands do), and returns the items of 056 built for that
bookmark and tab:

| Group | Items |
|---|---|
| 1 | `Copy Link` |
| 2 | `Edit Pinned Page ▸` with `Replace Pinned URL with Current` and `Edit…` |
| 3 | `Open in Split View`, `Duplicate` |

The groups are split by `SeparatorItem`s. A tile whose bookmark cannot be read gets no items and the
failure is logged; the menu keeps Untile tab and Pin tab.

**Placement of Duplicate.** The copy goes to `parentId` of the tile's bookmark (the Favorites folder)
at `index + 1`, closed: no tab is created. `FavoritesFolder` reads the folder again on every change,
so the copy appears in the grid right after the tile, and its tile is in every workspace (FR-3). The
copy keeps title and URL (`BookmarkCopier` copies only those two); the name and icon of the tile are
the 027 label (store `vivarcdi.labels`, key `bookmark:<id>`), which `LinkExtras` copies on Duplicate.
A bookmark has no `vivExtData` and no icon member (its fields are title, url, description, nickname,
thumbnail, themeColor, speeddial, uuid), so there is nothing else to copy, and an open tab is not
copied: it stays with the original.

**An address change in every workspace.** The tile is one bookmark; `Edit…` and `Replace` write its
URL once with the service of 041/042 and the grid follows the bookmark. Task T1 (probe) confirms how
the other workspaces show it (below).

### Findings of the probe (T1)

The probe ran on the read-only lab. The lab has no Favorites folder and its guard blocks bookmark
writes, so findings 1 to 3 come from the code and the bookmark tree, not from a run on a real tile; the
live check is in the scenario of T7. Finding 4 is from `LinkedTabs.snapshot()` in the lab.

1. **Where a tile lives.** A tile's bookmark is a plain http(s) link, direct child of the folder at the
   path `favorites-grid.folder`. Grid order is folder order, that is `BookmarkNode.index`;
   `BookmarkFavorites` does not sort. It skips subfolders, separators and non-web links, then applies
   `slice(0, maxTiles)` (`maxTiles` = 12).
2. **Duplicate at `index + 1`.** `chrome.bookmarks.create({ parentId, index: index + 1 })` puts the copy
   right after the tile. `FavoritesFolder` rereads `getTree` on every change, and the folder is the
   same in every workspace, so the copy shows in all of them. The copy has no tab, so it appears
   closed. Caveat: when `maxTiles` is reached, the copy can fall past the cut-off and push the last
   tile out of the grid.
3. **Address change.** `BookmarkWriter.update` triggers `onChange`, so every workspace grid redraws.
   `LinkedTabs.sync` (current window, all workspaces) rewrites `vivarcdi.pinnedUrl` on the tabs with the
   matching `favoriteId`; the loaded page URL of those tabs does not change.
4. **The open tab.** `LinkedTabs.snapshot()` returns only tabs in the workspace of the active tab, and
   among them the active one, else the one with the greatest `lastAccessed`. This matches the rule of
   the design. The multi-workspace case could not be simulated in the lab: Vivaldi drops a `workspaceId`
   written through `vivExtData`, and the workspaces of the lab preferences are not recognized by tabs.
   T7 checks it on a real profile.

For the scenario of T7: `chrome.tabs.create({ pinned: true })` yields an unpinned tab; create the tab,
then `chrome.tabs.update(id, { pinned: true })`.

### The menu

`TileMenu` gains an optional `links: Pick<TileLinkCommands, 'items'>` dependency, like `panels`.
Without it the menu is as today (so `opens the menu of a tile with Untile tab and Pin tab` and the
tests of 055 keep passing). With it, the order is:

| Place | Items |
|---|---|
| top | the three groups of `TileLinkCommands` |
| then, after a separator | `Untile tab`, `Pin tab` |
| last | the web panel item of 055, when present |

`Pin tab` is where Arc puts the move of a tile to a workspace; there is no `Move to ▸` (spec, out of
scope). `GridDragging` builds `TileLinkCommands` and passes it to `TileMenu`, as it does for the panels.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/favorites/TileLinkCommands.ts` | The items of 056 for the bookmark and open tab of a tile | Adapter |
| `src/modules/favorites/TileMenu.ts` | Adds the groups from `links` before Untile tab | - |
| `src/modules/favorites/GridDragging.ts` | Builds `TileLinkCommands` and passes it | - |
| `src/shared/linkmenu/` | The item builders of 056 and `BookmarkCopier`, moved there from `modules/folders` in T3 (commit 7eb84dd on `wip/057-t3`) | - |
| `tests/live/scenarios/opens-a-tile-in-split-view.live.ts` | AC-5 | - |

## Texts and logs

The labels are those of 056 (`Copy Link`, `Edit Pinned Page`, `Replace Pinned URL with Current`,
`Edit…`, `Open in Split View`, `Duplicate`), kept in `src/shared/tabs/CommandLabels.ts` with the
others. Logger `favorites`: `warn` `The tile <id> cannot be read: its menu has no link commands`
(once per tile and session); a failed write shows the toast of 056 NFR-1.

## Mapping of the criteria to tests

| AC | Check | File |
|---|---|---|
| AC-1 | `copies the saved link of a tile` | `tests/modules/favorites/TileLinkCommands.test.ts` |
| AC-2 | `duplicates a tile right after it` | `tests/modules/favorites/TileLinkCommands.test.ts` |
| AC-3 | `edits the pinned url of a tile` | `tests/modules/favorites/TileLinkCommands.test.ts` |
| AC-4 | `replaces the pinned url of a tile with the current one` | `tests/modules/favorites/TileLinkCommands.test.ts` |
| AC-5 | `manual`; becomes `live: opens a tile in split view` in the pull request of T7, which also changes the spec | `tests/live/scenarios/opens-a-tile-in-split-view.live.ts` (scenario name `opens a tile in split view`, spec `057`) |
| AC-6 | `manual` | checklist of T9 |

The order of the menu and the missing `links` dependency are covered by tests of `TileMenu.test.ts`
that are not criteria (`puts the link commands before Untile tab`, `leaves the menu as it was without link commands`).

## Risks

- 056's design may place its builders differently from the table above; T3 absorbs the difference.
- The "open tab" of a tile in another workspace: the tile has a tab only in the workspaces where it was opened; with none, `Replace` is disabled and `Open in Split View` opens one (056). The probe could not simulate several workspaces; T7 checks the rule live.
- With `maxTiles` reached, a duplicate can fall past the cut-off and push the last tile out of the grid (finding 2); accepted, the spec does not change.
- Vivaldi's tiling may not be drivable on a version: the item is not shown and the reason is logged (056 NFR-2).
