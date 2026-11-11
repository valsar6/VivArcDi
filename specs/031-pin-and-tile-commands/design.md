# 031 Pin and tile commands, and the look of a dragged tab: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-11 (PR #128). It says **how**; the spec says **what**.
It builds on the drag code of the 012 revision (0.36.3): `TabDragRelease`, `RowDrag`, `LinkRemoval`,
`FavoriteRemoval`, `LinkDropZone` and `FavoriteDropZone`.

## Approach

### The drag pill (FR-1)

A `DragPill` in `src/core` draws one element, `data-vivarcdi-drag-pill`, fixed in the browser window
and ignored by the pointer (`pointer-events: none`), with an icon and a title. It has `show(page, x,
y)`, `move(x, y)` and `hide()`. It is shown only while the pointer is over the tab bar (the element of
`tabBar` in the catalog), so outside it Vivaldi's own drag image is the only one.

- **Tab of today.** `TabDragRelease` gains an optional `onDrag(tabId, x, y)` and `onEnd()`; they are
  fed by the mouse moves and by the HTML5 `dragover`, which both carry the point. The first call reads
  the tab's title and `favIconUrl` with `chrome.tabs.get` and shows the pill. Vivaldi's own slot of
  the tab gets `data-vivarcdi-dragging`, so the row it came from is faded with the same style as a
  dragged tile.
- **Link row and tile.** `RowDrag` already knows the element and dims it; it passes its icon and label
  (`LinkIcon` and the row's text; the tile's icon and its `title`) to the pill on the first move.

One `DragPill` is shared per window (`DragPill.of(document)`, as `LinkDropZone`), so two drags never
draw two pills. Its look is a white pill with a soft shadow, sized with tokens in `_tokens.scss`.

### Moving a page by command (FR-5, FR-6)

The drags already know how to move a page; the commands reuse them with a fixed place instead of a
point:

- `LinkRemoval` and `FavoriteRemoval` split `release(id, x, y)` into `placeAt(x, y)` and
  `moveTo(id, place)`. A place is `today(rowTabId)`, `link(target)` or `favorite(target)`.
- `TodayList.first()` gives the place at the top of today's tabs (the first unpinned, unlinked row; an
  empty list puts the tab at the end). `LinkDropZone.end()` gives the end of the root (the header
  target of 012). `FavoriteDropZone.end()` gives the end of the grid (`beforeId: null`).
- A tab of today is pinned with `WorkspaceFavorites.add(tab)` (Cmd/Ctrl+D) and tiled with
  `FavoriteDropZone.drop(end, { tab })`.

| Command | On | Call |
|---|---|---|
| Pin tab | tab of today | `WorkspaceFavorites.add(tab)` |
| Tile tab | tab of today | `FavoriteDropZone.drop(end, { tab })` |
| Remove pin | link row | `LinkRemoval.moveTo(linkId, today(first))` |
| Tile tab | link row | `LinkRemoval.moveTo(linkId, favorite(end))` |
| Untile tab | tile | `FavoriteRemoval.moveTo(favoriteId, today(first))` |
| Pin tab | tile | `FavoriteRemoval.moveTo(favoriteId, link(end))` |

The bookmark rule and its toast stay inside `LinkRemoval` (AC-8); nothing new decides it.

### VivArcDi's menu (FR-3, FR-4, FR-7)

`ContextMenu` in `src/core` draws a small list of items at the pointer, kept inside the window, and
closes on Escape, on a click outside and after an item (FR-7). It is outside the window drag region
(NFR-1). `RowMenu` in the folders module opens it on `contextmenu` over `[data-vivarcdi-link-id]`, and
`TileMenu` in the Favorites module over `[data-vivarcdi-tile]`; both cancel Vivaldi's default for those
elements only. The items are a list of `{ label, run }`, so 027 adds Rename and Change icon to the
same menus later.

### Vivaldi's menu of a tab (FR-2, NFR-2)

Vivaldi 8 builds its menus in `window.html` and shows them with `vivaldi.contextMenu.show`, then
reports the chosen item. `TabMenuItems` in `src/core` wraps that call:

1. A capture `contextmenu` listener remembers the tab under the pointer (`TabSlot`).
2. When `show` is called right after it for a tab of today that is a web page and not yet a link or
   a Favorite, two items with VivArcDi's own ids are appended after a separator.
3. When Vivaldi reports one of those ids, `TabMenuItems` runs the command; other ids go to Vivaldi.

The exact shape of the parameters and of the activation event is checked by the probe of T1
(`pin-tile/sonda-menu-scheda.md`). IF `vivaldi.contextMenu.show` is missing or its shape differs,
THEN nothing is wrapped, the reason is logged, and Pin tab stays on Cmd/Ctrl+D and the drags (NFR-2).
The wrapper is restored when the module stops.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/DragPill.ts` | The pill that follows the pointer, shared per window | Singleton per scope |
| `src/core/ContextMenu.ts` | VivArcDi's own menu: items, position, closing | - |
| `src/core/TabMenuItems.ts` | Adds items to Vivaldi's menu of a tab and runs them | Decorator over `vivaldi.contextMenu.show` |
| `src/core/TabDragRelease.ts`, `RowDrag.ts` | Feed the pill; mark Vivaldi's dragged slot | - |
| `src/core/TodayList.ts`, `LinkDropZone.ts`, `FavoriteDropZone.ts` | `first()` and `end()` places | - |
| `src/modules/folders/LinkRemoval.ts`, `src/modules/favorites/FavoriteRemoval.ts` | `placeAt` and `moveTo` | Command |
| `src/modules/folders/RowMenu.ts` | Menu of a link row: Remove pin, Tile tab | - |
| `src/modules/favorites/TileMenu.ts` | Menu of a tile: Untile tab, Pin tab | - |
| `src/modules/folders/TabCommands.ts` | Pin tab and Tile tab of a tab of today, registered in `TabMenuItems` | Command |
| `src/styles/_tokens.scss`, `base.scss` | Pill and menu look; faded Vivaldi slot | - |

## Vivaldi interface

- `vivaldi.contextMenu.show` and its activation callback or event (probe T1).
- New marks: `data-vivarcdi-drag-pill`, `data-vivarcdi-menu`, `data-vivarcdi-dragging` also on
  Vivaldi's tab slot while it is dragged.

## Configuration

None.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi's menu API differs between 8.1 and 8.2 or is not callable from a mod | Probe T1; the wrapper checks the shape and steps aside (NFR-2) |
| The wrapped `show` breaks other menus | Items are appended only after a `contextmenu` on a tab of today in the same frame; any other call goes through unchanged; tests cover both |
| The HTML5 drag gives no `dragover` while the pointer is over Vivaldi's own list | The pill then shows only over VivArcDi's rows and the grid; manual check AC-10 |
| The pill lags behind the pointer | It moves with `transform` in one `requestAnimationFrame` per frame |
