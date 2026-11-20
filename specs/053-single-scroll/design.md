# 053 Single scroll: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was `Approved`. It says **how**; the spec says **what**.

## Approach

`#tabs-container`, the flex column that holds VivArcDi's host, the folder section and Vivaldi's
`.resize`, becomes the one scroller. Three style rules do the join, none moves an element:

1. The folder section loses `max-height` and `overflow` and takes its content height (FR-2).
2. The `.resize` that wraps `.tab-strip` stops shrinking: `flex: none` and `max-height: none`, so the
   strip is drawn at the height of its content and its own scroll has nothing left to do (FR-3).
3. `#tabs-container` gets `overflow-y: auto`. The Favorites group and the Archive footer are taken out
   of the scrolling area: the footer is `position: sticky; bottom: 0`, the tiles stay above the
   scroller (Q-1, checked by T1).

The rules are in a new stylesheet and apply only under a mark, `data-vivarcdi-column-scroll`, that a
small module puts on `#tabs-container` when the selectors resolve. Without the mark Vivaldi's column is
untouched (AC-11, NFR-2), and removing the module removes the mark.

Rejected:

- **A wrapper around the tab list.** Vivaldi rebuilds the list and would drop or move it
  ([009](../009-bookmark-folders-in-tab-bar/design.md)); the scroller is an element Vivaldi already
  owns and keeps.
- **`position: sticky` for the Favorites tiles inside the scroller.** Tabs would scroll visibly in the
  gaps between tiles. They stay outside the scrolling area.
- **A lower `maxHeightPercent`.** Still two scrollers, only a smaller squeeze.
- **Scrolling the strip from our code.** Duplicates Vivaldi's wheel and drag handling; used only as the
  fallback of the risk "Vivaldi scrolls the strip itself" below.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/columnscroll/ColumnScroll.ts` | Module: puts and removes `data-vivarcdi-column-scroll` on the column; logs a warning and stays off when the selectors do not match | Template method (`Module`) |
| `src/styles/column-scroll.scss` | The three rules above, under the mark; the 6 px scroll bar of 028 FR-7 on the column | – |
| `src/styles/folders.scss` | The `max-height` and `overflow` rules are removed | – |
| `src/modules/folders/*` | `maxHeightPercent` and `--vivarcdi-folders-max-height` removed from options, `FolderSection`, `FolderSectionView` | – |
| `src/modules/sidebarlook/ScrollMark.ts` | Unchanged: it already marks whichever element scrolls inside the tab bar | – |
| `src/modules/index.ts`, `src/config.json` | Register and enable `column-scroll`; add `styles/column-scroll.css` to `styles` | – |
| `tests/live/scenarios/*.live.ts` | The six `live:` scenarios of the spec | – |

If T1 shows that Vivaldi rewrites `max-height` or scrolls the strip itself, a second class,
`ColumnScrollSync`, joins the module: one `FrameTask` pass per frame that re-applies the frame height
or forwards the strip's `scrollTop` to the column. It is written only if a probe proves it is needed.

## Vivaldi interface

Selectors, read through `context.selectors`:

| Key | Selector | Use |
|---|---|---|
| `tabsContainer` | `#tabs-container` | Already in the catalog: the scroller and the mark |
| `tabStripFrame` | `#tabs-container .resize:has(> .tab-strip)` | Already in the catalog (050): the frame that stops shrinking |
| `verticalTabBar` | `#tabs-tabbar-container:is(.left, .right)` | Already in the catalog: the mark is put only on a vertical bar |

The Archive footer is VivArcDi's own (`data-vivarcdi-archive-footer`); the Favorites group is
`pinnedGroup`, already in the catalog. No new selector is expected; any found in T1 goes in
`src/selectors/8.1.json` and `tests/live/selector-states.json`.

Probe of 2026-11-20 on Vivaldi 8.2: no ancestor of `.resize` scrolls; `.tab-strip` is
`overflow: hidden` at its content height; `.resize` is `flex: 1 1 100%` with an inline `max-height`
equal to its content. 050 writes that `max-height` too, so the new rule uses `!important` and the two
stay compatible: 050 keeps computing the strip's height from its slots, and the frame follows the
strip because it no longer has a maximum.

## Configuration

`maxHeightPercent` leaves the options of `bookmark-folders` and `config.json` (FR-8). A new module
`column-scroll` is enabled by default and has no options.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi writes `max-height` on `.resize` again after a change | `!important` in the stylesheet beats an inline value; T1 checks it with many tabs (Q-2) |
| Vivaldi scrolls to the active tab or during a drag by `scrollTop` of the strip, which no longer scrolls | T1 reads the bundle and probes both; if confirmed, `ColumnScrollSync` forwards the scroll (Q-3) |
| With `.resize` unbounded, 050's offsets and the strip's height disagree | A live scenario runs both together (AC-9); the strip's height stays Vivaldi's, corrected by 050 |
| The Favorites group sits inside the scrolling area on the lab copy | T1 probes with pinned tabs (Q-1); if so the group is lifted with `position: sticky` and a background, or the tiles are moved to the host above the scroller |
| Arc-like sticky footer hides the last rows | The scroller gets `padding-bottom` equal to the footer's height |
| A Vivaldi version changes the column | The mark is not set and the column stays as Vivaldi draws it, with a warning (NFR-2); the selector check of `npm run live` names the broken selector |
| Tab bar on the right or an auto-hide bar | `verticalTabBar` covers both sides; AC-13 is a manual check, and the auto-hide bar of [021](../021-auto-hide-tab-bar/spec.md) is checked in the same run |
