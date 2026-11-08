# 028 Arc sidebar look: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

## Approach

Most of the spec is style: a new stylesheet, `sidebar-look.scss`, holds every rule of the look and
applies only under `#browser[data-vivarcdi-look]`. A small module, `sidebar-look`, sets that mark when
it is enabled and removes it when it stops, so NFR-2 holds without touching the other stylesheets.
Colors come from three CSS variables set on `#browser`:

| Variable | Meaning | Value without 019 |
|---|---|---|
| `--vivarcdi-space` | Space color | Sky `#a3cee0` |
| `--vivarcdi-pill` | Active pill | Sky `#e9f3f7` |
| `--vivarcdi-ink` | Text | Sky `#0f2129` |

019 will write the same three variables for the active workspace; until then the stylesheet falls back
to the Sky palette (FR-8, AC-9). Veil, hover and separator are `color-mix` of white or ink over
`--vivarcdi-space`, so a palette is only three colors.

Two parts of the spec are not style:

1. **Order of the sections (FR-1, FR-10).** The most likely reading of Tore's screenshot, to confirm with
   the probe of T1: his `Favorites` bookmark folder exists but is empty, so `BookmarkFavorites` is
   active with no tiles: `FavoritesGrid` sets `FavoriteTagger.maxTiles` to 0, the placeholder of 012
   shows, and Vivaldi draws its pinned tabs with its own compact icons, four per row, inside the tab
   list, which sits below VivArcDi's anchor (space header 15, folders 20). The fix: when the Favorites
   folder is missing or empty, the first `maxTiles` pinned tabs become VivArcDi's own tiles, drawn by
   the same `FavoritesView` at anchor order 10, laid out by `GridLayout` (at most `maxColumns`, 3), and
   their slots in Vivaldi's list are hidden through `HiddenTabs`. Favorites from the bookmark folder
   keep working as today when the folder has links.
2. **"+ New Tab" row (FR-6).** `NewTabRow` of the incognito module (013) already draws such a row.
   It moves to `src/core` and `sidebar-look` adds one at the end of the anchor (order 30), so it sits
   right above today's tabs once the tiles are above. Vivaldi's own `+` at the end of the list is hidden
   under the look.

Rejected:

- Reordering with CSS `order` and `display: contents` on Vivaldi's tab list: Vivaldi positions the
  rows of the list itself and rebuilds it, so the tiles cannot leave the list without breaking it.
- Moving Vivaldi's pinned slots into the anchor: Vivaldi moves them back on the next render (the
  reason `TabBarAnchor` is a sibling of the list).
- One stylesheet per state of 019: the three variables keep 019 and 028 independent.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/sidebarlook/SidebarLook.ts` | Module: sets `data-vivarcdi-look`, the default palette variables and the scroll mark; adds the New Tab row | Template method (`Module`) |
| `src/modules/sidebarlook/ScrollMark.ts` | Sets `data-vivarcdi-scrolling` on the tab list while it scrolls and 800 ms after (FR-7) | Observer |
| `src/modules/sidebarlook/Palettes.ts` | The six palettes as data (name, space, pill, ink), the default, and `contrast()` for AC-11; 019 reads it for its presets (FR-11) | Value object |
| `src/core/NewTabRow.ts` | Moved from `incognito`; shared by 013 and 028 | – |
| `src/modules/favorites/PinnedFavorites.ts` | Own tiles for the first pinned tabs when the Favorites folder is missing or empty; click activates the tab | Adapter, same interface as `BookmarkFavorites` |
| `src/modules/favorites/FavoritesGrid.ts` | Chooses the source: bookmark folder with links, otherwise pinned tabs | Strategy |
| `src/styles/sidebar-look.scss` | All rules of the look, under `$look` | – |
| `src/styles/_tokens.scss` | Row height 36, gap 2, radius 8, veil 22%, hover 35%, pill shadow, scroll bar 6, palette colors | – |

Removed with the change request to 012 (PR #89, T13 of 012): `EmptyGridDrop`, its style and test,
`emptyHint`.

## Vivaldi interface

No new selector: rows use `tabStrip`, `pinnedTab`, `tabWrapper`, `tabClose` and `newTabButton`, the
folders and header use VivArcDi's own marks (`$folders`, `$space-header`), the separator uses
`$pinned-last`. New marks: `data-vivarcdi-look` on `#browser`, `data-vivarcdi-scrolling` on the tab
list, `data-vivarcdi-tile-source="pinned"` on the grid for tests and diagnostics.

The drag slot (spec, last open question) needs a probe on Vivaldi 8.2: while a tab is dragged, which
element keeps its place and which mark Vivaldi sets on it. If no element can be styled, Vivaldi's own
indicator stays and the look skips the slot.

## Configuration

```json
"sidebar-look": {
  "enabled": true,
  "palette": "sky"
}
```

`palette` is one of `sky`, `ice`, `powder`, `aqua`, `mist`, `lagoon`: the default for workspaces
without a color of their own. `styles` gains `styles/sidebar-look.css`, last in the list so it wins
over the older rules without `!important` where Vivaldi does not use it.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi rows use inline sizes and `!important` rules | Same approach as `favorites.scss`: override with `!important` only on the properties Vivaldi sets inline |
| Hiding pinned slots also hides them from Vivaldi's keyboard order | Same as the bookmark tiles today (003); Cmd/Ctrl+1..9 of 014 act on the tiles |
| A light default looks wrong on a dark Vivaldi theme | Dark mode values follow `prefers-color-scheme` and Vivaldi's `.theme-dark` class; checked in the manual steps |
| Drag slot not reachable | Probe first (T1); skipped if not possible |
| 019 not implemented yet | The look works alone with the default palette |
