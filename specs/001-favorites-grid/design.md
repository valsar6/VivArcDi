# 001 Favorites grid: design

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |

Written after the fact from PR #4.

## Approach

Vivaldi renders its tab bar with React and rewrites the `class` attribute of tabs on every render,
so changing classes or moving nodes does not last. The module marks Vivaldi's own elements with
`data-vivarcdi-*` attributes, which survive re-renders, and the stylesheet turns the marked tab strip
into a CSS grid. A `MutationObserver` on `#browser` re-applies the marks through a `FrameTask`.

Unloading uses `chrome.tabs.discard`, available in Vivaldi's interface document. Middle clicks are
caught in the capture phase on the document so Vivaldi never sees them.

Rejected alternatives:

- **Drawing our own grid** next to the tab bar: drag and drop, context menus, tooltips and audio
  icons would all have to be rebuilt.
- **Pure CSS with `:nth-child`**: cannot tell pinned tabs past the limit, nor unloaded tabs.

## Components

| Class | Responsibility | Pattern |
|---|---|---|
| `FavoritesGrid` | Module: wires the parts, observes the interface, stops cleanly | Facade |
| `FavoriteTagger` | Marks the grid strip, tiles and unloaded tiles; reads tab ids | |
| `GridLayout` | Column count from width; CSS variables on the strip; `ResizeObserver` | |
| `UnloadedTabs` | Set of unloaded pinned tab ids, kept current by `tabs.onUpdated` | Observer |
| `MiddleClickUnload` | Captures middle clicks on tiles and calls the unloader | |
| `TileUnloader` | Picks a successor for the active tab, then discards | |

## Vivaldi interface

Selectors used: `browser`, `tabBar`, `verticalTabBar`, `tabStrip`, `pinnedTab`, `tabWrapper`.
The tab id comes from `data-id="tab-<id>"` on `.tab-wrapper`.

Marks and variables:

| Name | On | Meaning |
|---|---|---|
| `data-vivarcdi-favorites` | tab strip | The strip is laid out as a grid |
| `data-vivarcdi-favorite` | strip child | The slot is a tile |
| `data-vivarcdi-unloaded` | strip child | The tile's tab is unloaded |
| `--vivarcdi-favorites-columns` | tab strip | Column count |
| `--vivarcdi-favorites-tile-height`, `--vivarcdi-favorites-gap` | tab strip | Sizes from options |

Styles: `src/styles/favorites.scss`, with tokens in `src/styles/_tokens.scss`.

## Configuration

See the options in [spec.md](spec.md) FR-7; defaults live in `FavoritesGrid.defaults`.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi 8.2 strip children may not be grid items themselves | Stylesheet sets them to `display: contents` and places their `.tab-position`, so placement works whatever Vivaldi's own display is |
| Vivaldi 8.2 keeps the tab header at its row height inside a tile | Favicon, badge and audio icon are positioned against the tile's `.tab-wrapper`, with the tab and its header set to `position: static` |
| Vivaldi positions tabs absolutely for drag and drop | Stylesheet resets position inside the grid; reordering is a manual check (AC-14) |
| Status of hibernated tabs differs from Chromium's `discarded` | `UnloadedTabs.isUnloaded` accepts `discarded` and `status: unloaded` |
