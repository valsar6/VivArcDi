# 060 Clear bar and pinned tile unload: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-24. It says **how**; the spec says **what**. It builds
on the Clear control and the separator of [004](../004-today-tabs-and-keyboard/design.md), on the
pinned page, the row minus and the Favorite model of
[059](../059-pinned-tabs-arc/design.md), and on the pinned-group layout of
[058](../058-pinned-tabs-83/spec.md). It keeps the click path of
[ClearButton.ts](../../src/modules/today/ClearButton.ts) and the minus pattern of
[PinnedMinus.ts](../../src/modules/pinned/PinnedMinus.ts).

## Approach

Two independent pieces share no file: the owned separator row moves Clear out of the hidden pinned
row, and the tile minus gives a tiled pinned tab the row's unload affordance. Everything else that
the spec keeps stays as it is.

| Area | What changes | Where |
|---|---|---|
| Clear row | A VivArcDi-owned row above the first Today slot, with zero flow height; the line is drawn by the row only when no marked pinned row is visible | `modules/today`, `shared/tabs` |
| Tile minus | A minus button on each pinned tile, hidden until hover or current, unloads through `PinnedFavorites` | `modules/favorites`, `styles/favorites.scss` |
| Docs | 058's sentence on the pinned rows with the grid on; the manual and the README name the tile minus and the line above Today | `specs/058`, `README.md`, `docs/manual/tab-bar.md` |

The archive, the unload model and the Favorite tiles do not change.

### The owned separator row

**Why not `KeptElement`.** `KeptElement.sync` puts its element at the end of a parent
([KeptElement.ts](../../src/core/dom/KeptElement.ts) lines 62-69), which is right for the archive
footer and the Clear button today, but the owned row must sit in the middle of the tab strip: after
the last pinned slot and before the first Today slot. `TabBarAnchor` is not used either: its host is a
sibling before the tab list ([TabBarAnchor.ts](../../src/core/dom/TabBarAnchor.ts) lines 109-117), so
a row there would sit above the visible pinned rows, not on their separator. The row therefore reuses
the pieces of both (`watchSubtree` and `FrameTask`) with a placement function of its own.

**Placement.** `ClearSeparator.sync` runs on start and once per animation frame after a change below
`#browser`:

1. Read the strip with `selectors.get('tabStrip')`. When it is missing, remove the row, warn once
   `The tab strip is missing: the Clear control is left to the archive panel`, and leave the bar as
   Vivaldi draws it (NFR-4).
2. Find the first Today slot: the first child of the strip, other than the row, whose
   `TabSlot.idOf(child, selectors.get('tabWrapper'))` is a tab id and which is not a pinned slot
   (`child.matches(selectors.get('pinnedTab'))` or a pinned row inside it). Children without a tab id,
   such as Vivaldi's own `div.separator`, are skipped.
3. Place the row immediately above that slot, in the slot's own coordinate system. Vivaldi positions
   every `.tab-position` absolutely and draws it with
   `transform: translateX(var(--PositionX)) translateY(var(--PositionY))`, and `StripGapCloser` adds
   `--vivarcdi-gap-shift` ([050](../050-tab-strip-gap/spec.md),
   [hidden-tabs.scss](../../src/styles/hidden-tabs.scss) lines 7-9). The row copies the first Today
   slot's offset, subtracts the control's height (`$clear-height`) and applies the same shift, so the
   control lands exactly above the first Today slot in both layouts. The offset is read where
   `StripGapCloser.#read` reads it (the slot itself, or its first element child when the slot has no
   `--PositionY`), and the shift is the slot's `--vivarcdi-gap-shift`; `sync` writes the row's
   `--PositionY` (offset minus `$clear-height`) and `--vivarcdi-gap-shift` inline from those values,
   and only when they differ from what the row already has:
   - on 8.1 and 8.2 the slot sits after the pinned rows in the strip;
   - on 8.3 the slot is the first child of the strip and the pinned group is a sibling above it.

   The row is a `div[data-vivarcdi-clear-row]` holding the `button[data-vivarcdi-clear]`. It is never
   inside `[data-vivarcdi-pinned-last]` and never inside `.pinned-group`. `today.scss` gives it
   `position: absolute; top: 0; inset-inline: 0` and the same
   `transform: translateY(calc(var(--PositionY) - var(--vivarcdi-gap-shift, 0px)))` that
   hidden-tabs.scss applies to a slot.
4. The row has **zero flow height**. It does not push the Today tabs down: `StripGapCloser` closes
   the space of the hidden pinned slots, and 050 keeps the first Today tab exactly where it is.
   The 13 px control overlays the separator area above the boundary (the pinned row's
   `margin-bottom` + `padding-bottom` + border when one is visible, the space above the strip
   otherwise), and the line is a 1 px pseudo-element of the row, so the row itself adds nothing.

**The gap closer must skip the row.** `StripGapCloser` reads every child of the strip as a slot and
`GapShifts.compute` returns null as soon as one slot has no finite `--PositionY` or `--Height`
([GapShifts.ts](../../src/shared/tabs/GapShifts.ts) lines 20-23,
[StripGapCloser.ts](../../src/shared/tabs/StripGapCloser.ts) lines 121-131). A VivArcDi row without
Vivaldi's inline offsets would therefore reopen every gap 050 closed. The row carries
`data-vivarcdi-own-row` (a constant in
[TabBarMarks.ts](../../src/shared/tabs/TabBarMarks.ts) next to `PINNED_LAST_ATTRIBUTE`), and
`StripGapCloser.#pass` filters such children out of `slots` before it reads the separators and
computes the shifts. Nothing else about the closer changes.

The watcher is `watchSubtree([HIDDEN_ATTRIBUTE, PINNED_LAST_ATTRIBUTE, 'style'])` on `#browser`:
Vivaldi's rebuilds arrive as child changes, a new mark or a hidden slot as an attribute change, and
the closer's `--vivarcdi-gap-shift` write on the first Today slot as a `style` change, so the row
follows the shift on the next frame. All of them coalesce into one pass per frame (`FrameTask`).
`stop` removes the row, the watcher and the three listeners.

**The line is drawn exactly once.** `TabBarMarker` marks the last non-linked pinned row with
`data-vivarcdi-pinned-last` and `pinned.scss` draws its `border-bottom`
([pinned.scss](../../src/styles/pinned.scss) lines 3-7). `HiddenTabMarker` writes
`data-vivarcdi-hidden` on every hidden slot and collapses a group whose slots are all hidden
([HiddenTabMarker.ts](../../src/shared/tabs/HiddenTabMarker.ts) lines 103-124). The row therefore
draws its line when no marked row is visible:

```ts
const marked = document.querySelector(`[${PINNED_LAST_ATTRIBUTE}]`);
const visible = marked !== null && !marked.hasAttribute(HIDDEN_ATTRIBUTE);
row.toggleAttribute(CLEAR_LINE_ATTRIBUTE, !visible);
```

The state comes from marks VivArcDi already writes, not from measuring layout. The CSS in `today.scss`
draws `1px solid var(--vivarcdi-line)` through the row's absolutely positioned `::before`, a 1 px bar
at `top: -$clear-height`, only under `[data-vivarcdi-clear-line]`, and the button loses the `border-top`
it draws today ([today.scss](../../src/styles/today.scss) lines 140-170). At most one of the two
borders exists at a time: the visible marked row keeps its `border-bottom`, otherwise the owned row's
pseudo-element draws the line at the top of the control area, and the row's zero height means it never
adds 050's gap back.

**Why the Today tabs do not move down.** The row is `position: absolute; top: 0; box-sizing:
border-box; height: 0`; the button is absolutely positioned with `height: $clear-height` and the line
is a pseudo-element. No part of the row is in the strip's flow, so the offsets and the strip height
that 050 computes stay exactly as they are, and the first Today tab keeps its place. The button overlays
the separator area above the first Today tab, which is the pinned row's reserved 13 px when one is
visible; when no pinned row is visible that area is the bottom of the section above the strip, and the
manual check decides how it looks. The design does not move the Today tabs to make room for the
control.

**The 13 px area when no pinned row is visible.** The probe of T1 records whether the strip clips its
top and where the 13 px area falls with the grid on. If the box lands outside the strip and is
clipped, the fallback is the anchor host as the last section, after the New Tab row (order 35), where
the same zero-height row over the same 13 px stays visible; the lead records the choice in the
findings. The line, the button, the line-state and the click handling do not change with that
choice.

**Click.** Clear keeps the button, its title `Archive the Today tabs of this workspace`, its text
`Clear` and the document listeners in the capture phase for `pointerdown`, `mousedown` and `click`
([ClearButton.ts](../../src/modules/today/ClearButton.ts) lines 58-67). The listeners swallow the
three events on `[data-vivarcdi-clear]` and call `onClear` only on `click`; `TodayArchive` keeps
passing `() => void this.#clear()` and the panel refresh
([TodayArchive.ts](../../src/modules/today/TodayArchive.ts) lines 113-116 and 148-153).

**Decision for Tore.** With no pinned tab at all there is no marked row, so the row draws the line
above Today. That is the literal rule of the spec ("when every native pinned row is hidden"). If Tore
prefers no line in that case, the predicate becomes "there is a pinned slot and no visible marked
row".

### The minus on a pinned tile

**Owner.** `PinnedFavorites` owns the new collaborator `PinnedTileMinus`.
`FavoritesView` is **not** changed: it keeps drawing the tiles and keeps middle click in
`#handle` ([FavoritesView.ts](../../src/modules/favorites/FavoritesView.ts) lines 88-111 and 158-175).
`GridFavoriteTargets` is the drag-and-drop adapter and has nothing to do with the control.

The reason is the shared view: `BookmarkFavorites` builds a second `FavoritesView`
([BookmarkFavorites.ts](../../src/modules/favorites/BookmarkFavorites.ts) lines 70-77), so a minus
built by the view would need a flag to stay off Favorite tiles. A collaborator scoped to
`[data-vivarcdi-tiles][data-vivarcdi-tile-source="pinned"]` cannot reach them, which is FR-7 and
AC-10 by construction. The spec's After table names `FavoritesView.ts` as the place the behavior
shows up; the markup itself stays in the collaborator, and no view method changes.

**Sync and lifetime.** `PinnedFavorites` sets `data-vivarcdi-tile-source="pinned"` on its grid
([PinnedFavorites.ts](../../src/modules/favorites/PinnedFavorites.ts) lines 68-77). `#show` calls
`tileMinus.sync()` right after `view.show`, so every rebuild of the tiles re-adds the buttons in the
same pass
([PinnedFavorites.ts](../../src/modules/favorites/PinnedFavorites.ts) lines 161-173). `sync` gives
every direct child tile (`[data-vivarcdi-tile]`) one
`button[type=button][data-vivarcdi-tile-minus][aria-label="Unload tab"]` when it is missing and drops
the buttons of tiles that are gone. `start` attaches the listeners and syncs; `stop` removes the
buttons and the listeners before `view.destroy()`.

**The press never opens or drags the tile.** The collaborator listens on the document in the capture
phase for `pointerdown`, `mousedown` and `click`, matches
`closest('[data-vivarcdi-tile-minus]')` inside the pinned grid, and calls `preventDefault` plus
`stopImmediatePropagation`. `PinnedFavorites` starts before `FavoritesGrid` builds and starts
`GridDragging` (`FavoritesGrid.start` starts the pinned tiles before `#startDragging`), so the
collaborator's `mousedown` capture listener is registered before `RowDrag`'s
([RowDrag.ts](../../src/shared/dragdrop/RowDrag.ts) lines 60-65) and stops the press before the drag
records it. The view's own click listener is in the bubble phase, so it never sees the click either.

**The unload.** On `click` the collaborator reads the tab id from the enclosing
`[data-vivarcdi-tile]` (the pinned grid uses the tab id as the tile id,
[PinnedFavorites.ts](../../src/modules/favorites/PinnedFavorites.ts) lines 175-179 and
[FavoritesView.ts](../../src/modules/favorites/FavoritesView.ts) lines 132-142) and calls
`PinnedFavorites.#unload`, the same method the middle click reaches. It calls `TabUnloader.unload`
([TabUnloader.ts](../../src/core/tabs/TabUnloader.ts) lines 44-57) and logs
`Could not unload the pinned tab` on failure, so the tile and the row share one unload path and one
message ([PinnedFavorites.ts](../../src/modules/favorites/PinnedFavorites.ts) lines 206-212).

**Hover and current.** The button is hidden at rest and shown on the tile's `:hover` or when the tile
carries `data-vivarcdi-current`, which `FavoritesView.apply` already toggles
([FavoritesView.ts](../../src/modules/favorites/FavoritesView.ts) lines 105-111). The CSS lives in
`favorites.scss`, scoped to the pinned source, and reuses `$minus-glyph`, `$minus-size` and
`$minus-offset`, so the glyph, the size and the placement match the row minus
([pinned.scss](../../src/styles/pinned.scss) lines 13-34).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/today/ClearSeparator.ts` (new) | The owned row, its placement, its line state and the Clear click | Replaces `ClearButton.ts` |
| `src/modules/today/ClearButton.ts` (deleted) | Removed with its test; its attributes and texts move to `ClearSeparator` | - |
| `src/modules/today/TodayArchive.ts` | Builds `ClearSeparator` with the selectors and the logger | Existing wiring |
| `src/shared/tabs/TabBarMarks.ts` | `OWN_ROW_ATTRIBUTE = 'data-vivarcdi-own-row'`, shared by the row and the closer | Marks |
| `src/shared/tabs/StripGapCloser.ts` | Leaves the row out of the slots, so a child without offsets does not reopen 050's gaps | One pass per frame |
| `src/modules/favorites/PinnedTileMinus.ts` (new) | The minus of every pinned tile; swallows the press and unloads | Control, like `PinnedMinus` |
| `src/modules/favorites/PinnedFavorites.ts` | Starts the collaborator, calls `sync` after `view.show`, stops it before the view | Module |
| `src/styles/today.scss` | The row, its line and the Clear button without its own border | Stylesheet |
| `src/styles/favorites.scss` | The tile minus, scoped to the pinned source | Stylesheet |
| `src/styles/_tokens.scss` | `$tile-minus: '[data-vivarcdi-tile-minus]'` | Tokens |

### Changed signatures

```ts
export const OWN_ROW_ATTRIBUTE = 'data-vivarcdi-own-row';

export const CLEAR_ATTRIBUTE = 'data-vivarcdi-clear';
export const CLEAR_ROW_ATTRIBUTE = 'data-vivarcdi-clear-row';
export const CLEAR_LINE_ATTRIBUTE = 'data-vivarcdi-clear-line';

export interface ClearSeparatorDependencies {
  document: Document;
  /** Needs `tabStrip`, `pinnedTab` and `tabWrapper`; uses `browser` as the watched root. */
  selectors: SelectorCatalog;
  onClear: () => void;
  logger?: Pick<Logger, 'warn'>;
  watch?: SubtreeWatcher;
  timing?: FrameTiming;
}

export class ClearSeparator {
  constructor(dependencies: ClearSeparatorDependencies);
  start(): void;
  stop(): void;
  sync(): void;
}

export const TILE_MINUS_ATTRIBUTE = 'data-vivarcdi-tile-minus';

export interface PinnedTileMinusDependencies {
  document: Document;
  grid: () => HTMLElement;
  unload: (tabId: number) => void;
}

export class PinnedTileMinus {
  constructor(dependencies: PinnedTileMinusDependencies);
  start(): void;
  sync(): void;
  stop(): void;
}
```

Call sites that change: `TodayArchive.#startInterface` builds `ClearSeparator` instead of
`ClearButton` and passes `context.selectors` and `context.logger`; `PinnedFavorites` builds the
collaborator in its constructor, starts it in `start`, syncs it in `#show` and stops it in `stop`.
`FavoritesView`, `BookmarkFavorites`, `PinnedMinus`, `TabBarMarker` and `HiddenTabMarker` keep their
constructors.

## Vivaldi interface

| Name | Value | Used for |
|---|---|---|
| `tabStrip` | `#tabs-container .tab-strip` | The host of the owned row and the first Today slot |
| `pinnedTab` | `.tab-position.is-pinned` | Telling a pinned slot from a Today slot |
| `tabWrapper` | `.tab-wrapper` | `TabSlot.idOf` on a strip child |
| `browser` | `#browser` | The watched root and the warning target |

No selector is added. Marks added: `data-vivarcdi-own-row`, `data-vivarcdi-clear-row`,
`data-vivarcdi-clear-line` and `data-vivarcdi-tile-minus`. Marks unchanged:
`data-vivarcdi-clear`, `data-vivarcdi-pinned-last`, `data-vivarcdi-hidden`,
`data-vivarcdi-tile`, `data-vivarcdi-tile-source` and `data-vivarcdi-current`. No new stylesheet: the
rules go into `today.css` and `favorites.css`, both already in the `styles` list of
[config.json](../../src/config.json) lines 2-22.

## Configuration

None (NFR-2). No module, no option and no runtime dependency is added.

## Verification

- Automated: `make check` after every task. The tests below use the `auto:` names verbatim.
- Probe (T1): after Tore agrees, `npm run live -- --probe <file>` on the lab Vivaldi records the
  strip's computed `position` and `overflow`, the first Today slot's box and its inline
  `--PositionY`/`--Height` with the grid on and off, the native separator's box and `display`, and
  where a zero-height absolute test child with the computed top lands. The findings choose between the
  strip and the anchor host and are written in this design before T2 starts.
- Lab: after Tore agrees, `npm run live -- --only 060` on the lab Vivaldi 8.3.4191.47 runs the AC-6
  scenario. The scenario opens one pinned tab with the default Favorites grid, waits for its tile and
  for the native pinned slot to be hidden, and fails when `[data-vivarcdi-clear]` has a zero box,
  starts below the first visible Today slot, or is clipped (`document.elementFromPoint` at its center
  does not reach the control or its row). The implementation flips AC-6 to `live:` in the same commit
  as the scenario: `tests/live/LiveChecks.test.ts` requires every `live:` name to have a scenario and
  every scenario to name its spec.
- Manual: the three `manual` criteria become the Italian checklist of T6.

## Mapping of the criteria to tests

| AC | Check | File |
|---|---|---|
| AC-1 | `clear archives every Today tab of the workspace except the active one` | `tests/modules/today/ArchiveSweeper.test.ts` (existing) |
| AC-2 | `never archives protected tabs` | `tests/modules/today/ArchiveSweeper.test.ts` (existing) |
| AC-3 | `keeps the Clear control out of the hidden pinned group` | `tests/modules/today/ClearSeparator.test.ts` (new) |
| AC-4 | `puts the Clear control above the Today tabs and takes its clicks` | `tests/modules/today/ClearSeparator.test.ts` (new) |
| AC-5 | `draws the Clear bar on the separator above the Today tabs` | `tests/styles/Today.test.ts` (rewritten) |
| AC-6 | `the Clear bar keeps a box above Today with the Favorites grid on` | `tests/live/scenarios/the-clear-bar-keeps-a-box-above-today.live.ts` (new) |
| AC-7 | `shows a minus on the tile of a pinned tab` | `tests/modules/favorites/PinnedFavorites.test.ts` |
| AC-8 | `unloads a pinned tab from its tile minus` | `tests/modules/favorites/PinnedFavorites.test.ts` |
| AC-9 | `loads the own page of an unloaded pinned tile` | `tests/modules/favorites/PinnedFavorites.test.ts` (existing) |
| AC-10 | `keeps the minus off a Favorite tile` | `tests/modules/favorites/PinnedTileMinus.test.ts` (new) |
| AC-11 | `unloads a pinned tab from its minus` | `tests/modules/pinned/PinnedTabs.test.ts` (existing) |
| AC-12 | `manual` | checklist of T6 |
| AC-13 | `manual` | checklist of T6 |
| AC-14 | `manual` | checklist of T6 |

Behavior that no criterion names, and its tests:

| Behavior | Test | File |
|---|---|---|
| The row draws its line only when no pinned row shows it (renamed by [067](../067-clear-line-and-titles/spec.md): the line is always drawn) | `draws its line whether or not a pinned row shows it` | `tests/modules/today/ClearSeparator.test.ts` |
| A missing strip leaves the bar as Vivaldi draws it, with one warning | `warns once when the tab strip is missing` | `tests/modules/today/ClearSeparator.test.ts` |
| The row does not stop 050's gap corrections | `ignores the row that is not a slot` | `tests/shared/tabs/StripGapCloser.test.ts` |
| The minus is hidden until hover or current | `draws the tile minus only on hover and on the current tile` | `tests/styles/Favorites.test.ts` |
| A rebuilt grid gets its minuses back | `puts the minus back after the tiles are drawn again` | `tests/modules/favorites/PinnedFavorites.test.ts` |

The existing test `puts the Clear button back in the separator row and takes its clicks` in
`tests/modules/today/TodayParts.test.ts` is removed with `ClearButton.ts`; its scenarios move into
the two new ClearSeparator tests. The existing test `draws the Clear bar on the pinned separator` in
`tests/styles/Today.test.ts` is rewritten with the AC-5 name.

## Texts and logs

- Clear keeps its text `Clear`, its title `Archive the Today tabs of this workspace` and the `↓`
  glyph before the label.
- The tile minus has no visible text; its `aria-label` is `Unload tab`, as the row minus has
  ([PinnedMinus.ts](../../src/modules/pinned/PinnedMinus.ts) lines 100-106).
- `today-archive`: new `warn` `The tab strip is missing: the Clear control is left to the archive
  panel`, once per start.
- `favorites-grid`: the tile minus keeps `Could not unload the pinned tab` from
  `PinnedFavorites.#unload`; no new message.

## The 058 amendment

The sentence at [058/spec.md](../058-pinned-tabs-83/spec.md) lines 52-55 contradicts
`PinnedFavorites.tilesOf` (lines 93-101): with the grid on, the pinned tabs that are not linked to a
Favorite become tiles too, up to `maxTiles`, and their rows are hidden. The docs task (T5) changes
exactly this sentence:

> with the grid on, a pinned tab linked to a Favorite stays hidden behind its tile
> ([003](../003-pinned-tabs-and-folders/spec.md) FR-3) and the other pinned tabs show as rows; with
> the grid off, every pinned tab shows as a row.

to:

> with the grid on, a pinned tab linked to a Favorite stays hidden behind its tile
> ([003](../003-pinned-tabs-and-folders/spec.md) FR-3), and every other pinned tab of the workspace up
> to `maxTiles` becomes a tile under the Favorites ([059](../059-pinned-tabs-arc/spec.md) FR-3), so no
> pinned row shows; a pinned tab past `maxTiles` keeps its row. With the grid off, every pinned tab
> shows as a row.

The footer row of 058 gains `060` next to `059`: "[060](spec.md)
(2026-11-24): the pinned rows with the grid on are tiles up to `maxTiles`." The status of 058 stays
`Draft`. No acceptance criterion or requirement of 058 changes.

## Risks

| Risk | Mitigation |
|---|---|
| The separator is drawn twice | One line at a time: the marked row's `border-bottom` or the row's pseudo-element; the Clear button loses its own border. The line-state test, AC-6 and the manual check prove it |
| The row reopens the gaps 050 closed | `StripGapCloser` skips `data-vivarcdi-own-row`; the `ignores the row that is not a slot` test proves it |
| The 13 px area above the first Today tab has no reserved space with the grid on | The row has zero flow height and overlays the area; T1's probe and AC-6 record the box, and the manual check judges the look. If the strip clips it, the row moves to the anchor host after the New Tab row |
| The minus is unreadable on a 44 px tile (#264) | The same 14 px glyph and offset as the row; AC-13 covers the look and #264 keeps the polish |
| 8.1 and 8.2 are inferred, not measured | The placement reads only `tabStrip`, `pinnedTab` and `tabWrapper`, which exist in the 8.1 catalog; T1 records the layout if a build is installed, and the manual check records the 8.3 result |
| The capture listener order changes | `PinnedFavorites` starts before `GridDragging`; AC-8 proves a press on the minus neither activates nor drags the tile |
| The row's own placement triggers another pass | The inline values are written only when they differ, the row is placed only when its position differs, and the line attribute is toggled only when it changes |
| A visible pinned row that the marker does not mark (a linked tab with the folder missing) | The rule follows the spec: the row draws when no *marked* row shows the line; Vivaldi's own separator stays as Vivaldi draws it |
| `PinnedFavorites` rebuilds the tiles and loses the buttons | `#show` syncs immediately; the "puts the minus back" test and the labels change cover it |
| The design changes no `FavoritesView` line while the spec's table names it | The collaborator decorates the tiles the view draws; the Favorite grid stays untouched by construction |

## Open decisions for Tore

1. **No pinned tabs.** The row draws the line above Today because no marked row is visible. Keep it,
   or require a pinned slot before drawing?
2. **`FavoritesView` unchanged.** The After table names it as a place the behavior shows up; this
   design keeps the tile markup in `PinnedTileMinus` so a Favorite tile cannot get a minus. Say if the
   button should instead be created by the view.
3. **The 13 px above the first Today tab with the grid on.** 050 closes the hidden separator, so with
   no visible pinned row the row's control overlays the area above the strip instead of reserving
   13 px. The probe and the manual check settle the look; if Tore prefers a reserved divider, the row
   takes its height and the Today tabs move down by it, which needs an explicit change to 050.
