# 001 Favorites grid

| | |
|---|---|
| Status | Implemented |
| Phase | 1 |
| Owner | Tore |
| Approved | 2026-10-25, written after the fact from PR #4 and PR #5; revised 2026-10-25 at Tore's request (at most three columns, other tabs stay rows; refined tiles and row spacing) |

## Summary

Arc shows its Favorites as a grid of square icon tiles at the top of the sidebar. They are global
pinned tabs that never close: closing one unloads it and leaves the tile in place. This spec makes
the first pinned tabs of Vivaldi's vertical tab bar behave the same way.

## User stories

- **US-1.** As a Vivaldi user with a vertical tab bar, I want my first pinned tabs shown as a grid of
  icon tiles, so that my most used sites take little room and are recognizable at a glance.
- **US-2.** As a user, I want at most three tiles per row, stretched to fill it, as Arc does.
- **US-5.** As a user, I want my other tabs to stay a vertical list of full-width rows below the
  grid, as in Arc.
- **US-3.** As a user, I want to see which tile is active and which tiles are not loaded.
- **US-4.** As a user, I want to free a Favorite's memory without losing the tile, so that it works
  like a bookmark that is also a tab.

## Expected behavior

With the tab bar on the left or right, the first pinned tabs, up to twelve, become square tiles in a
grid above the other tabs. A tile shows only the favicon, centered; the title appears in Vivaldi's
own tooltip on hover. A row holds at most three tiles; with fewer than three tiles the row has as
many columns as tiles, and a tab bar too narrow for three tiles gets fewer columns. Tiles stretch to
fill the row. Every other tab stays a full-width row, one below the other, with its title, as
without VivArcDi.

Rows of tiles are separated by the same gap as the tiles in a row, and the list of other tabs starts
one gap below the grid. Inside a tile the favicon is centered both ways; Vivaldi's loading bar and
selection outline are hidden, and a notification badge sits small in the top right corner.

The active tile has a lighter background and a small shadow. Tiles of unloaded (discarded or
hibernated) tabs show a faded, desaturated icon. A tile playing audio shows a small audio icon in
its top right corner.

A middle click on a tile, which Vivaldi treats as close, unloads the tab instead. The tile stays; a
normal click loads it again. If the tile was the active tab, the most recently used other tab
becomes active first, because the browser cannot unload the tab on screen.

Pinned tabs past the limit and every other tab keep their normal rows below the grid. Pinning,
unpinning, reordering and switching workspace update the grid on their own. With the tab bar at the
top or bottom there is no grid and Vivaldi looks as before.

Differences from Arc: Arc's Favorites are shared by every Space by design. In Vivaldi they are the
first pinned tabs of the current workspace; to have the same Favorites everywhere, the user pins
them in all workspaces (native setting). Separating global Favorites from per-workspace pinned tabs
belongs to [003](../003-pinned-tabs-and-folders/spec.md).

## Requirements

### Functional

- **FR-1.** The module `favorites-grid` turns the first `maxTiles` pinned tabs of a vertical tab bar
  into tiles. Other tabs are unchanged.
- **FR-2.** Columns are `max(1, min(maxColumns, tiles, floor((width + gap) / (tileMinWidth + gap))))`,
  recomputed when the tab strip is resized or the number of tiles changes.
- **FR-3.** Tiles show the favicon only, centered, with title, close button, stack counter,
  selection outline and loading bar hidden; a notification badge moves to the top right corner.
- **FR-4.** The active tile and tiles of unloaded tabs are styled differently from the others.
- **FR-5.** WHERE `unloadOnMiddleClick` is on and `chrome.tabs` exists, a middle click on a tile
  unloads the tab and never reaches Vivaldi's close action.
- **FR-6.** The successor of an unloaded active tile is the most recently used other tab, preferring
  loaded tabs, then the nearest by position.
- **FR-7.** Options in `config.json`: `maxTiles` (12), `maxColumns` (3), `tileMinWidth` (64),
  `tileHeight` (44), `gap` (8), `unloadOnMiddleClick` (true).

### Non-functional

- **NFR-1.** The module only adds `data-vivarcdi-*` attributes and CSS variables to Vivaldi's
  elements, which Vivaldi's re-renders leave alone, and removes them all on stop.
- **NFR-2.** Redraws happen at most once per animation frame, whatever the number of mutations.
- **NFR-3.** IF `chrome.tabs` is missing, the grid still works; only dimming and middle click
  unloading are off, with a warning in the log.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHILE the tab bar is vertical, THE module SHALL mark the first `maxTiles` pinned tabs as tiles. | auto: `pinned tabs of a vertical tab bar become tiles` |
| AC-2 | THE module SHALL leave pinned tabs beyond `maxTiles` as rows. | auto: `pinned tabs beyond the limit stay rows` |
| AC-3 | WHILE the tab bar is horizontal, THE module SHALL show no grid. | auto: `a horizontal tab bar gets no grid`, `turning the tab bar horizontal removes the marks` |
| AC-4 | WHEN a tab is unpinned, THE module SHALL turn its tile back into a row. | auto: `unpinning a tab turns its tile back into a row` |
| AC-5 | THE grid SHALL have at most `maxColumns` columns, as many as the tiles when they are fewer, and fewer when the tab bar is too narrow. | auto: `a full row never has more than three columns`, `fewer tiles than columns stretch to fill the row`, `a tab bar too narrow for three tiles gets fewer columns`, `follow sets the grid variables and tracks resizes and tile counts` |
| AC-6 | WHILE a tile's tab is unloaded, THE module SHALL mark the tile as unloaded. | auto: `tiles of unloaded tabs are marked`, `UnloadedTabs follows discard and reload updates` |
| AC-7 | WHEN a non-active tile is middle clicked, THE module SHALL unload the tab and keep the tile. | auto: `an inactive tile is unloaded in place` |
| AC-8 | WHEN the active tile is middle clicked, THE module SHALL activate the most recently used other tab, then unload the tile's tab. | auto: `an active tile hands focus to the most recently used tab first` |
| AC-9 | IF the tile's tab is the only tab of its window, THEN THE module SHALL not unload it. | auto: `the only tab of a window is not unloaded` |
| AC-10 | IF `chrome.tabs` is missing, THEN THE grid SHALL still appear and middle click SHALL be left to Vivaldi. | auto: `without chrome.tabs the grid still works and middle click is left alone` |
| AC-11 | WHEN the module stops, THE tab bar SHALL return to Vivaldi's original state. | auto: `start lays out the grid and stop removes it`, `release removes the variables and stops observing` |
| AC-12 | THE tiles SHALL show the favicon only, three per row in a narrow tab bar, with the title in Vivaldi's tooltip on hover. | manual |
| AC-13 | THE active tile SHALL be lighter than the others, and unloaded tiles SHALL look faded. | manual |
| AC-14 | WHEN a tile is reordered by dragging, THE grid SHALL follow the new order. | manual |
| AC-15 | WHEN the workspace changes, THE grid SHALL show the pinned tabs of the new workspace. | manual |
| AC-16 | WHILE a tile plays audio, THE audio icon SHALL appear small in its top right corner. | manual |
| AC-17 | WHILE the grid is shown, every tab that is not a tile SHALL keep a full-width row with its title, one row below the other. | manual |
| AC-18 | THE rows of tiles SHALL be separated by `gap`, the other tabs SHALL start one `gap` below the grid, and each tile SHALL show its favicon centered with no loading bar. | manual |

## Out of scope

- Cmd/Ctrl+W on a tile: Vivaldi handles the shortcut and closes the tab. To be specified in
  [003](../003-pinned-tabs-and-folders/spec.md) together with pinned tabs.
- Notification badges read from the page title, and Cmd+1…9 on Favorites: candidates for a later
  revision of this spec.
- Adding a Favorite by dragging a tab above the workspace title.
- Favorites shared by every workspace without the native "pin in all workspaces" setting.

## Open questions

None. Manual checks are pending on a real Vivaldi; see
[tasks.md](tasks.md).

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), sections "Favorites" and
  "Priorità per la replica in Vivaldi".
