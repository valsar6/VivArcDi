# 003 Favorites and pinned tabs: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

## Approach

Two modules share the work. `favorites-grid` stops turning Vivaldi's pinned tabs into tiles and draws
its own tiles from the Favorites folder. A new module, `pinned-tabs`, gives every pinned tab, linked
Favorite tabs included, its own page, the reset and the unload on close. Both work in Vivaldi's
interface document with `chrome.bookmarks`, `chrome.tabs` and data attributes on the tab bar.

1. **Favorites from bookmarks (FR-1, AC-1, AC-2).** The grid finds the folder by its path with
   `BookmarkFolderFinder`, shared with [009](../009-bookmark-folders-in-tab-bar/spec.md), keeps its
   web links in order and rebuilds them on every bookmark event. It draws one tile per link in its own
   element, added with order 10 to the shared `TabBarAnchor`: a host placed in `#tabs-container`
   before its child that holds `.tab-strip`, and created again if Vivaldi removes it. 009's second
   probe (Vivaldi 8.2, 2026-10-27) showed this spot gives full-width rows above the tab list and
   survives workspace switches, opening and closing tabs, pinning and the auto-hidden sidebar, while
   an element inside the tab strip is moved by Vivaldi's rebuilds. Tile icons come from Vivaldi's favicon service (`chrome://favicon/`), with the
   first letter of the title when there is none. Column count and sizes reuse `GridLayout` of 001.
2. **Linked tabs (FR-2, FR-3, AC-3 to AC-5).** A tab is linked to a Favorite by the bookmark id
   written in its `vivExtData` under VivArcDi's own key, `{"vivarcdi": {"favoriteId": "…",
   "pinnedUrl": "…"}}`, which survives restarts (probe, 2026-10-27). A click on a tile looks for the
   linked tab in the current window and in the workspace of the active tab. If found, it activates it
   and reloads it if unloaded; if not, it creates a tab with the bookmark's address, pins it and writes
   the link, the workspace id of the active tab and the bookmark's address as its own page. Slots of
   linked tabs get `data-vivarcdi-hidden` and the stylesheet hides them. The tile of the active linked
   tab gets `data-vivarcdi-active` (thin glowing outer border) and the tile of an unloaded one
   `data-vivarcdi-unloaded` (dimmed). Middle click on a tile unloads its tab, as in 001.
3. **Removed Favorites (FR-7, AC-13).** When a bookmark leaves the folder, the module removes the
   `favoriteId` from its linked tabs, so they show again as pinned rows. A changed bookmark address
   updates the own page of its linked tabs.
4. **Own page of pinned tabs (FR-4, AC-6 to AC-8).** `pinned-tabs` saves `pinnedUrl` on start for
   pinned tabs that have none, on `tabs.onUpdated` with `pinned: true`, and removes it with
   `pinned: false`. Every write reads the tab again and changes only VivArcDi's key.
5. **Reset (FR-5, AC-9, AC-10).** A tab is away when the address key of its page (`AddressKey` of
   007) differs from its `pinnedUrl`. Away rows get `data-vivarcdi-away` and a "back" arrow over the
   favicon; a click on that favicon loads `pinnedUrl`. A click on the tile of the active, away
   Favorite loads it too.
6. **Closing (FR-6, AC-11, AC-12).** A keydown listener in the capture phase of the interface
   document catches Cmd/Ctrl+W when the active tab is pinned, stops it and unloads the tab with
   `TabUnloader`, which first activates the last used tab. For focus inside the page, a small script
   injected into pinned tabs' pages forwards Cmd/Ctrl+W to the interface, as Peek does for its panel.
   A click listener in the capture phase catches the close button of pinned rows. Ordinary tabs are
   left to Vivaldi.
7. **Order of the tab bar.** Favorites grid (anchor order 10), folders of 009 (anchor order 20), then
   Vivaldi's list, where pinned rows already come first, a separator, and the other tabs. The last
   pinned row gets `data-vivarcdi-pinned-last` for the separator.

Rejected alternatives:

- **Copies of each Favorite pinned in every workspace**, kept in step: N loaded copies of the same
  page and a fragile sync (Tore's choice, 2026-10-27).
- **Recreating a pinned tab after `tabs.onRemoved`**: it loses its history and its id.
- **Saved addresses in `localStorage`**: tab ids change at every restart; `vivExtData` follows the tab.
- **Turning Vivaldi's tab slots of linked tabs into tiles** (the 001 way): a Favorite without a tab in
  the workspace would have no slot to turn into a tile.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/bookmarks/BrowserBookmarks.ts` | Promise-based `chrome.bookmarks`: `getTree`, change events (shared with 009) | Adapter |
| `src/core/bookmarks/BookmarkFolderFinder.ts` | Finds a folder by a path of exact titles, first match (shared with 009) | |
| `src/core/bookmarks/BookmarkNode.ts` | Bookmark type used by both modules | |
| `src/core/TabBarAnchor.ts` | Host above the tab list shared with 009: created once, re-created if removed, `add(element, order)` | |
| `src/core/TabData.ts` | Reads and writes `vivExtData`: workspace id and VivArcDi's key, other keys untouched | Adapter |
| `src/core/AddressKey.ts` | Moved from `reopen/`, shared by 007, 003 and 009 | Value object |
| `src/core/TabUnloader.ts` | Moved from `favorites/TileUnloader.ts` | |
| `src/core/PageScriptInjector.ts` | Moved from `peek/` and made generic: a script per tab, chosen by a function | |
| `src/modules/favorites/FavoritesFolder.ts` | Web links of the folder, in order, rebuilt on bookmark events (AC-1, AC-2) | Observer |
| `src/modules/favorites/LinkedTabs.ts` | Linked tab of each Favorite in the current window and workspace, from tab events (AC-5, AC-13) | Repository |
| `src/modules/favorites/FavoriteOpener.ts` | Tile click: activate, reload, or open and link a pinned tab; reset when active and away (AC-3, AC-4, AC-10) | |
| `src/modules/favorites/FavoritesView.ts` | Draws the tiles, keeps them in the tab bar, marks active, unloaded and away | |
| `src/modules/favorites/FavoriteTagger.ts` | Kept for the fallback of NFR-3 when the folder is missing | |
| `src/modules/pinned/SavedAddresses.ts` | Saves, reads and forgets `pinnedUrl` (AC-6 to AC-8) | Repository |
| `src/modules/pinned/PinWatcher.ts` | Saves on start and on pin, forgets on unpin | Observer |
| `src/modules/pinned/AwayTabs.ts` | Which pinned tabs show another page than their own (AC-9) | |
| `src/modules/pinned/TabBarMarker.ts` | `data-vivarcdi-hidden`, `-away`, `-pinned-last` on slots, from a `FrameTask` after tab bar mutations | |
| `src/modules/pinned/ResetClick.ts` | Click on the favicon of an away row loads its own page (AC-10) | |
| `src/modules/pinned/CloseShortcut.ts` | Cmd/Ctrl+W and the close button unload pinned tabs; others pass through (AC-11, AC-12) | |
| `src/page/pinned-keys.ts` | Page script: forwards Cmd/Ctrl+W of a pinned tab's page | |
| `src/modules/pinned/PinnedTabs.ts` | Module: options, wiring, clean stop | Facade |
| `src/styles/favorites.scss`, `src/styles/pinned.scss` | Own tiles with glow and dimming; hidden slots, reset arrow, separator | |

`peek`, `reopen-pinned` and `favorites-grid` switch to the moved classes; their tests keep passing.
As 007's design announced, 007 then also matches and dates a pinned tab by its own page.

## Vivaldi interface

| What | Use | IF missing or failing |
|---|---|---|
| `chrome.bookmarks` | Favorites folder and its changes | Grid falls back to the first pinned tabs of 001, logged |
| `vivExtData.workspaceId` | Workspace of the active tab and of linked tabs | Linked tabs are looked up in the window only, logged once |
| `vivExtData.vivarcdi` | `favoriteId` and `pinnedUrl`, written by VivArcDi | No link or reset for that tab, logged once |
| `chrome.tabs` events, `query`, `get`, `create`, `update`, `discard`, `reload` | Links, state, open, reset, unload | Module does not start, logged; Vivaldi behaves as usual |
| `chrome://favicon/` in the interface | Tile icons | First letter of the title |
| `webview.executeScript` | Page script for Cmd/Ctrl+W | Only the interface shortcut is caught, logged once |
| New selectors in `src/selectors/8.1.json`: `tabListHost` (`#tabs-container > :has(> .tab-strip)`), `tabClose` (`.tab-header .close`), `tabFavicon` (`.tab-header .favicon`) | Grid placement, close button, reset target | The part that needs it stays off, logged |

Uninstalling VivArcDi leaves the linked tabs as ordinary pinned tabs and the `vivarcdi` key in
`vivExtData`, which plain Vivaldi ignores (AC-19).

## Configuration

```json
"favorites-grid": {
  "enabled": true,
  "folder": "Favorites",
  "maxTiles": 12,
  "maxColumns": 3,
  "tileMinWidth": 64,
  "tileHeight": 44,
  "gap": 8,
  "unloadOnMiddleClick": true
},
"pinned-tabs": {
  "enabled": true,
  "resetButton": true,
  "unloadOnClose": true
}
```

## Risks

| Risk | Mitigation |
|---|---|
| A tab made with `chrome.tabs.create` lands outside the current workspace | Write the active tab's `workspaceId` into the new tab right away; manual check AC-15 |
| Vivaldi removes the anchor on a redraw | `TabBarAnchor` puts it back; 009's probe saw it survive every tested redraw; manual check AC-14 |
| Hiding a slot leaves a gap | The strip is already laid out by the 001 grid stylesheet, where a hidden slot takes no room |
| `chrome://favicon/` is not served to the interface | Letter fallback; manual check AC-14 |
| Pinning a new linked tab triggers `PinWatcher` before the link is written | `PinWatcher` skips tabs without a web address yet, and the opener writes `pinnedUrl` itself |
| Vivaldi rewrites `vivExtData` without our key, for example when a tab moves workspace | Read again before each write; a pinned tab that lost its key saves its address on the next start; manual check AC-18 |
| Vivaldi handles Cmd/Ctrl+W before the page or interface sees it | Capture phase in both places; manual check AC-17 with focus in the page and in the address bar |
