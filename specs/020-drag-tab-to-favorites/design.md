# 020 Drag a tab into the Favorites: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-09 (PR #119) and the two probes Tore ran the same day
(PR #118 and `pinned-regression/diagnostica-trascina-riquadro.md` in the project files). It says
**how**; the spec says **what**.

## Approach

### A tab released over the grid

Vivaldi moves its tabs with the mouse and sends no reliable drag event to the interface (probe of
PR #118); 012 already follows such a drag with `TabPointerDrag`. A second `TabPointerDrag`, owned by
the Favorites, follows the same press: while the pointer is over the Favorites grid it shows a gap
before the tile under the pointer (FR-6), and on release over the grid it adds the Favorite (FR-1,
FR-2). The grid is the element of `BookmarkFavorites`, and the pinned tiles grid of 028 right under
it counts as its end.

The second probe saw once an HTML5 `drop` on a tile with `vivaldi/x-tab-entries`, and no `mouseup`
follows an HTML5 drag. So the grid also accepts `dragover` and `drop` that carry
`vivaldi/x-tab-entries`; the tab is the one under the last `mousedown`, which `TabPointerDrag`
already knows. Both ways end in the same `FavoriteDrop.add(tabId, beforeId)`.

Adding a Favorite:

1. The page is already a Favorite (same address as a link of the folder): nothing changes (FR-3).
2. The Favorites folder is created with `BookmarkWriter.ensurePath` when it is missing.
3. A bookmark with the tab's title and address is created before the tile under the pointer, or at
   the end of the folder.
4. The tab is linked to the new Favorite with `LinkedTabs.link` and pinned. `BookmarkFavorites`
   already hides linked tabs and draws the tile, the same in every workspace (FR-7).

The tile seen in the 0.29.0 recording came from Vivaldi pinning a tab moved among the pinned
positions. With the Favorites drop in place the release lands on the grid, so Vivaldi has no pinned
position to move it to; nothing else is cancelled.

### A tile dragged out of the grid

The tiles are VivArcDi's own elements, so `TileDrag` follows `mousedown`, `mousemove` and `mouseup`
on them, with the same 6 px threshold. While a tile is dragged it is dimmed, the click that follows
the release is swallowed so the tile does not open, and the place under the pointer is marked.
On release:

- **Over the folders or the space header** (FR-5): the Favorite bookmark is removed and the page
  becomes a link of the workspace at that place. The folders section owns its drop targets (012), so
  the Favorites do not call it: a shared `LinkDropZone` in `src/core`, like `FolderCommands`, lets the
  folders section register `at(x, y)`, `mark`, `clear` and `drop(target, page)`. The page is the tab of
  the Favorite in the active workspace when there is one (unlinked and unpinned first, then
  `WorkspaceFavorites.add`), otherwise its title and address (`WorkspaceFavorites.addLink`, new).
- **Over the tab list below the separator** (FR-4): the Favorite bookmark is removed; the tab of the
  Favorite in the active workspace is unlinked and unpinned, so Vivaldi shows it as a Today tab, and
  moved to the index of the row under the pointer. Without a tab, a tab is opened on the address.
- **Over the grid or outside the tab bar**: nothing changes. Reordering tiles stays with 001 AC-14.

The Favorite's tabs in other workspaces are closed, so the tile is gone everywhere (AC-8) and no
other workspace is left with an unlinked pinned tab that would turn into a pinned tile. The page is
removed from the Favorites only after the link or the Today tab exists, so a failure leaves the
Favorite in place (AC-6).

Rejected:

- Letting Vivaldi pin the dropped tab and promoting pinned tabs to Favorites: pinned tabs belong to
  one workspace, the Favorites to all (Tore, 2026-11-09).
- Making the tiles `draggable` and using HTML5 drag: Vivaldi's tab list does not accept HTML5 drops
  of foreign elements, so the drop below the separator would have no target.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/favorites/FavoriteDrop.ts` | Adds a tab as a Favorite before a given tile or at the end; ignores pages already in the folder; creates the folder when missing; links and pins the tab | Command |
| `src/modules/favorites/GridDropZone.ts` | Hit test of the grid and of its tiles under the pointer; the gap element before the target tile; HTML5 `dragover`/`drop` with `vivaldi/x-tab-entries` | Adapter |
| `src/modules/favorites/TabToFavorite.ts` | Wires a `TabPointerDrag` and the HTML5 path to `GridDropZone` and `FavoriteDrop` | Mediator |
| `src/modules/favorites/TileDrag.ts` | Follows the press, move and release on a tile; dims it; swallows the click after a drag; reports the place of the release | Observer |
| `src/modules/favorites/FavoriteRemoval.ts` | Turns a released tile into a link through `LinkDropZone` or into a Today tab, closes the Favorite's tabs of the other workspaces, then removes the bookmark | Command |
| `src/core/LinkDropZone.ts` | Shared, per window: the folders section registers its targets; the Favorites ask for them | Mediator, like `FolderCommands` |
| `src/modules/folders/WorkspaceFavorites.ts` | Gains `addLink(page, place)` for a link without a tab | |
| `src/modules/folders/BookmarkFolders.ts` | Registers its `DropTargets` and `WorkspaceFavorites` in `LinkDropZone` | |
| `src/modules/favorites/FavoritesGrid.ts` | Starts and stops `TabToFavorite` and `TileDrag` with the bookmark Favorites | |
| `src/styles/favorites.scss`, `_tokens.scss` | Gap tile, dimmed dragged tile, mark of the drop below the separator; sizes as tokens | |

## Vivaldi interface

No new selector: the tab list uses `tabStrip` and `tabWrapper`, the drag uses `TabSlot`. New marks:
`data-vivarcdi-drop-gap` on the gap element, `data-vivarcdi-dragging` on the dragged tile,
`data-vivarcdi-drop-today` on the tab list while a tile is over it. Every element the user drags or
drops on keeps `-webkit-app-region: no-drag` (issue #30).

## Configuration

None. The Favorites folder is the `folder` option of `favorites-grid` (003).

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi pins the tab anyway when it computes a pinned position under the grid | `FavoriteDrop` links the tab whatever its pinned state, so the result is the same; manual check AC-7 |
| The HTML5 path and the pointer path both fire for one release | `TabToFavorite` handles one release per press |
| Closing the Favorite's tabs in other workspaces loses their history | Same as removing the bookmark in the panel today, where 003 unlinks them; the user moved the page out on purpose |
| A move to an index Vivaldi rejects | The tab stays a Today tab at Vivaldi's index; logged |
