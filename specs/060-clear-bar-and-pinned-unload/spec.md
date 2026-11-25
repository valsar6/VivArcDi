# 060 Clear bar and pinned tile unload

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-24 |
| Implemented | 2026-11-24 |
| Supersedes | Nothing. [004](../004-today-tabs-and-keyboard/spec.md) FR-5 and AC-7 keep their user-visible placement, hover and archive; [059](../059-pinned-tabs-arc/spec.md) FR-5 and AC-15 keep the row minus. This spec fixes where the Clear control sits in the DOM and adds the same minus to a pinned tile. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

With the Favorites grid on, which is the default, VivArcDi draws every pinned tab of the workspace as
a tile and hides its native row ([PinnedFavorites.ts](../../src/modules/favorites/PinnedFavorites.ts)
lines 93-101 and 157, [HiddenTabMarker.ts](../../src/shared/tabs/HiddenTabMarker.ts) lines 103-124).
Two controls still live in those hidden rows: the Clear bar of [004](../004-today-tabs-and-keyboard/spec.md)
inside the element marked `data-vivarcdi-pinned-last` ([ClearButton.ts](../../src/modules/today/ClearButton.ts)
line 35, [TabBarMarker.ts](../../src/modules/pinned/TabBarMarker.ts) lines 43-46), and the minus of
[059](../059-pinned-tabs-arc/spec.md) AC-15 on `.tab-position.is-pinned` rows
([PinnedMinus.ts](../../src/modules/pinned/PinnedMinus.ts) lines 66-76). In the normal layout neither
can be reached, so Clear cannot archive Today's tabs and a pinned tab cannot be unloaded with the
mouse.

This spec moves Clear to a row VivArcDi owns above the Today tabs, outside every element Vivaldi
hides, and gives the tile of a pinned tab the same minus as a pinned row. It keeps Clear's archive,
the pinned page and the unload model of 059, and changes nothing else of 003, 004 or 059.

## Seen in the lab

Measured on Vivaldi 8.3.4191.47 in the probe behind issue #267, with the default `favorites-grid`
configuration (`maxTiles` 12, `unloadOnMiddleClick` true; [config.json](../../src/config.json)
lines 27-35):

- With one pinned tab, its tile is drawn, the native pinned group is `display:none`, and
  `[data-vivarcdi-clear]` is in the DOM with a 0×0 box. The same holds with a Favorites folder and
  without one.
- With the grid off, or with a 13th pinned tab beyond `maxTiles`, the last pinned row is visible:
  Clear works there, and the row minus works at 14×14 on hover.
- The manual's current Today archive recording had to use the archive panel's Clear action because
  the bar was invisible.

The same code path hides the slot on 8.1 and 8.2 as well: the row sits in the strip and
`HiddenTabMarker` collapses it with `display:none` ([HiddenTabMarker.ts](../../src/shared/tabs/HiddenTabMarker.ts)
lines 109-124). Only 8.3 was measured.

## User stories

- **US-1.** As a user with the default Favorites grid, I want the Clear control above the Today tabs,
  so that I can archive them without opening the archive panel.
- **US-2.** As a user with the default Favorites grid, I want a minus on the tile of a pinned tab, so
  that I can unload it without a hidden row and without closing it.
- **US-3.** As a user, I want a click on an unloaded pinned tile to load the pinned page again, as
  059 says.
- **US-4.** As a user who turns the grid off, or who has more pinned tabs than tiles, I want the
  Clear control and the row minus to keep working as they do today.
- **US-5.** As a user, I want no unload control on a Favorite tile of the bookmark grid, so that
  059's Favorite model stays as it is.

## Expected behavior

**Where Clear lives.** Clear is a control owned by VivArcDi, placed on the separator between the
pinned area and the Today tabs, in a row VivArcDi owns. It is never a child of
`[data-vivarcdi-pinned-last]` or of a pinned group, so the rules that hide the native pinned rows
cannot collapse it. With the Favorites grid on and every pinned tab tiled, the control is still laid
out above the first Today tab. It is shown while the pointer rests on the separator, as
[004](../004-today-tabs-and-keyboard/spec.md) FR-5 says, and a click archives.

**The separator line.** VivArcDi draws the line above the Today tabs exactly once. When a native
pinned row is visible and already draws the line, the owned row does not add a second one;
when every native pinned row is hidden, the owned row draws the line where the pinned area ends. The
hidden Clear control and the line take the place of the separator and do not push the Today tabs
down.

**What Clear does.** Unchanged: a click archives every Today tab of the workspace except the active
one, and pinned tabs, Favorite tabs and stacked tabs stay open (004/FR-5,
[059](../059-pinned-tabs-arc/spec.md) FR-11, [TodayTabPolicy.ts](../../src/modules/today/TodayTabPolicy.ts)
line 15, [ArchiveSweeper.ts](../../src/modules/today/ArchiveSweeper.ts) lines 117-125).

**The tile of a pinned tab.** With the Favorites grid on, the tile that stands for a pinned tab gets a
minus at its right end, as a pinned row has. The minus uses the glyph, the size and the behavior of
[059](../059-pinned-tabs-arc/spec.md) AC-15: it is shown while the tile is hovered or its tab is the
current one, and a click unloads the tab and does not close it. A press on the minus never opens or
drags the tile. The unloaded tile stays in the grid, dimmed; a click on it loads the pinned page,
as 059/FR-3 and 059/AC-6 say.

**Favorite tiles.** A tile of the bookmark grid keeps 059's model: no minus, no back arrow, no reset
control (059/FR-17, 059/AC-28). Middle click and Cmd/Ctrl+W keep unloading a Favorite's tab.

**Visible pinned rows.** When the grid is off, or when a pinned tab past `maxTiles` keeps a native
row, that row keeps the minus of 059/FR-5 and AC-15 and shows no back arrow. Clear stays above the
Today tabs in both cases.

**Versions.** The behavior holds on Vivaldi 8.1 and 8.2, where the pinned rows sit in the tab strip,
and on 8.3.4191.47 and later 8.3 builds, where Vivaldi draws them in a `span.pinned-group` beside the
strip ([058](../058-pinned-tabs-83/spec.md), [selectors/8.1.json](../../src/selectors/8.1.json)).

### Today

| Case | What happens today | Where |
|---|---|---|
| Clear with the grid on | Inserted into the last pinned row; every pinned row is hidden as a tile and the group is collapsed; the control is in the DOM at 0×0 | `ClearButton.ts` line 35, `TabBarMarker.ts` lines 43-46, `HiddenTabMarker.ts` lines 103-124, `PinnedFavorites.ts` lines 93-101 and 157 |
| Clear with the grid off, or a visible 13th row | Sits on the last visible pinned row and archives the Today tabs | `ClearButton.ts`, `styles/today.scss` lines 140-170, `ArchiveSweeper.ts` lines 117-125 |
| What Clear archives | The workspace's Today tabs except the active one; pinned, Favorite and stacked tabs are kept | `TodayTabPolicy.ts` line 15, `src/shared/tabs/KeptTab.ts`, `ArchiveSweeper.ts` line 124 |
| Unload of a tiled pinned tab | Middle click on the tile, Cmd/Ctrl+W; no visible control on the tile and no menu on a pinned tile | `FavoritesView.ts` lines 158-170, `PinnedFavorites.ts` lines 206-212, `TileMenu.ts` line 57 |
| Reopening a tiled pinned tab | The tile is dimmed; a click activates the tab and loads its pinned page | `PinnedFavorites.ts` lines 185-204, `src/shared/tabs/UnloadedTabs.ts` |
| A 13th pinned tab | Keeps its native row; the minus works at 14×14 on hover; the first 12 are tiles | `PinnedFavorites.tilesOf`, `PinnedMinus.ts` lines 66-76, `styles/pinned.scss` lines 13-34 |
| Pinned row minus | A VivArcDi control on `.tab-position.is-pinned` rows; no back arrow, no reset button | `PinnedMinus.ts`, `styles/pinned.scss` lines 9-34 |

### After

| Case | What happens after | Where |
|---|---|---|
| Clear in the default layout | An owned row on the separator above the Today tabs, outside the hidden pinned group, with a non-zero box and a hover state; a click archives | `ClearButton.ts`, a new separator row collaborator, the Clear rules of `styles/today.scss` |
| What Clear archives | Unchanged | `TodayTabPolicy.ts`, `ArchiveSweeper.ts` (kept) |
| The separator | One line above the Today tabs, drawn by the own row when no native pinned row is visible | `styles/today.scss`, `styles/pinned.scss` |
| Unload of a tiled pinned tab | A minus at the right end of the tile, on hover or when the tile is current; a click unloads and does not close | `PinnedFavorites.ts`, `FavoritesView.ts`, `styles/pinned.scss` |
| Reopening a tiled pinned tab | Unchanged: the tile stays dimmed and a click loads the pinned page | `PinnedFavorites.ts` (kept) |
| Favorite tiles | Unchanged: no minus, no back arrow, no reset control | `FavoritesView.ts` (kept) |
| A visible pinned row | Keeps 059's minus and shows no back arrow | `PinnedMinus.ts` (kept) |
| Grid off | Clear above Today and the row minus as today | `ClearButton.ts`, `PinnedMinus.ts` |
| Vivaldi 8.1, 8.2, 8.3 | The same behavior in the strip and in the pinned group | `src/selectors/8.1.json` (`pinnedTab`, `pinnedGroup`) |

## Requirements

### Functional

- **FR-1.** The Clear control SHALL be placed outside `[data-vivarcdi-pinned-last]` and outside any
  pinned group, so that no rule that hides the native pinned rows can collapse it, and SHALL have a
  non-zero box whenever the tab bar is shown.
- **FR-2.** WHEN Clear is clicked, THE module SHALL archive every Today tab of the workspace except
  the active one, and pinned, Favorite and stacked tabs SHALL stay open (004/FR-5, 059/FR-11).
- **FR-3.** The Clear control SHALL sit on the separator above the Today tabs, SHALL be shown while
  the pointer rests on it, and SHALL be reachable with the keyboard. The separator SHALL be drawn
  exactly once and SHALL NOT push the Today tabs down.
- **FR-4.** The tile of a pinned tab SHALL show a minus with the glyph, the size, the placement and
  the hover and current-tab rules of 059/FR-5 and AC-15.
- **FR-5.** WHEN the minus of a pinned tile is clicked or activated, THE module SHALL unload the tab
  and SHALL NOT close it. A press on the minus SHALL NOT open or drag the tile.
- **FR-6.** WHEN an unloaded pinned tile is opened, THE tab SHALL load its pinned page (059/FR-3).
- **FR-7.** A Favorite tile of the bookmark grid SHALL show no minus, no back arrow and no reset
  control (059/FR-17).
- **FR-8.** WHEN a pinned row is visible, it SHALL keep the minus of 059/FR-5 and SHALL show no back
  arrow.
- **FR-9.** WHERE the Favorites grid is disabled, the Clear control SHALL stay above the Today tabs
  and the row minus SHALL keep working as 059 says.
- **FR-10.** The behavior SHALL hold on Vivaldi 8.1, 8.2 and 8.3.4191.47 and later 8.3 builds, in
  the tab strip and in the pinned group.

### Non-functional

- **NFR-1.** VivArcDi SHALL never block Vivaldi; no tab is unloaded or archived without a user
  action (059/NFR-1).
- **NFR-2.** The change adds no module, no option in `config.json` and no runtime dependency.
- **NFR-3.** The placement and the marks keep their cost of at most one pass per animation frame,
  and stopping the module removes the row, the minuses and every listener (058/NFR-3).
- **NFR-4.** IF Vivaldi's tab strip or pinned group does not match the selectors, THEN VivArcDi SHALL
  leave the bar as Vivaldi draws it and log the reason (003/NFR-3).
- **NFR-5.** Works on macOS and Debian; texts in English.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). Test names and live scenario names are exact.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN Clear is clicked, THE module SHALL archive every Today tab of the workspace except the active one. | auto: `clear archives every Today tab of the workspace except the active one` |
| AC-2 | WHEN Clear runs, THE module SHALL leave pinned, Favorite and stacked tabs open. | auto: `never archives protected tabs` |
| AC-3 | THE Clear control SHALL sit outside the native pinned row and its group, so hiding that row SHALL NOT collapse it. | auto: `keeps the Clear control out of the hidden pinned group` |
| AC-4 | WHEN Vivaldi rebuilds the tab list, THE module SHALL put the Clear control back above the Today tabs and take its clicks. | auto: `puts the Clear control above the Today tabs and takes its clicks` |
| AC-5 | THE Clear control SHALL be drawn on the separator above the Today tabs. | auto: `draws the Clear bar on the separator above the Today tabs` |
| AC-6 | WHILE the Favorites grid is on and every pinned row is hidden, THE Clear control SHALL keep a non-zero box above the Today tabs. | live: `the Clear bar keeps a box above Today with the Favorites grid on` |
| AC-7 | THE tile of a pinned tab SHALL show a minus, hidden until the tile is hovered or its tab is current. | auto: `shows a minus on the tile of a pinned tab` |
| AC-8 | WHEN the minus of a pinned tile is clicked, THE module SHALL unload the tab and SHALL NOT close it or open the tile. | auto: `unloads a pinned tab from its tile minus` |
| AC-9 | WHEN an unloaded pinned tile is opened, THE tab SHALL load its pinned page. | auto: `loads the own page of an unloaded pinned tile` |
| AC-10 | THE minus SHALL NOT appear on a Favorite tile of the bookmark grid. | auto: `keeps the minus off a Favorite tile` |
| AC-11 | WHILE a pinned row is visible, THE row SHALL keep the minus of 059, and a click SHALL unload it. | auto: `unloads a pinned tab from its minus` |
| AC-12 | WHEN Tore compares VivArcDi with Arc, the Clear control SHALL appear on hover on the line above the Today tabs, SHALL look as in 004, and a click SHALL archive the Today tabs while pinned and Favorite tabs stay. | manual |
| AC-13 | WHEN Tore hovers the tile of a pinned tab on Vivaldi 8.3 with the Favorites grid on, the minus SHALL look and sit as on a pinned row, a click SHALL unload the tab, and a click on the dimmed tile SHALL load the pinned page; a Favorite tile SHALL show no minus. | manual |
| AC-14 | WHEN Tore turns the Favorites grid off on Vivaldi 8.3, the Clear control SHALL stay above the Today tabs and the row minus SHALL unload as before. | manual |

The scenario of AC-6 opens a pinned tab and a Today tab with the default Favorites grid on the lab
Vivaldi of [046](../046-live-verification/spec.md); on the 8.3 lab it proves the case measured in
issue #267.

## Out of scope

- The layout of the pinned group, the hiding rules, `maxTiles` and the tile grid:
  [001](../001-favorites-grid/spec.md), [058](../058-pinned-tabs-83/spec.md),
  [059](../059-pinned-tabs-arc/spec.md).
- What a 13th pinned tab looks like and where its row sits: it keeps today's behavior.
- Polishing the row minus against Arc: #264, a follow-up.
- A menu for the tile of a pinned tab: the minus is the only new control.
- The archive panel and its own Clear action (004/FR-4).
- Vivaldi 8.4 and later.
- Re-recording the manual's Today archive GIF: documentation after the fix.

## Follow-ups

- #264 (pinned minus UI check and polish) now covers the tile minus as well as the row minus.
- #267 is this spec.
- The manual's Today archive recording can be made again with the visible Clear bar.

## Open questions

- [x] **Q-1. Where the Clear control lives.** Answered (Tore, 2026-11-24): **A**, a VivArcDi-owned
  separator row above the Today tabs. Two candidates.
  - **A. A VivArcDi-owned separator row above the Today tabs.** The control sits on the line where
    004 puts it, outside the native pinned row, and the row also draws the line when every pinned
    row is hidden. Keeps Arc's placement and the manual's wording, works in both pinned layouts,
    and leaves the footer to Archive. Costs one owned row that must survive Vivaldi's redraws.
  - **B. The archive footer at the bottom of the tab bar, next to Archive.** Simplest placement; the
    footer already exists ([ArchiveButton.ts](../../src/modules/today/ArchiveButton.ts) lines 17-27)
    and is never hidden. Moves Clear away from the divider, contradicts 004/FR-5 and the manual, and
    puts a second text button in a narrow footer.
  Recommendation: A, because it fixes the cause (an owned row outside the hidden group) and keeps
  the control where users and the manual expect it; fall back to B only if the design cannot anchor
  the row without a second line.
- [x] **Q-2. How an unload affordance reaches a pinned tab whose row is hidden.** Answered (Tore,
  2026-11-24): **A**, the minus on the pinned tile. Two candidates.
  - **A. The minus on the pinned tile**, with the glyph, size and behavior of 059 AC-15, on hover or
    when the tile is current. One click, the same gesture as the row, and the unload action already
    exists in [PinnedFavorites.ts](../../src/modules/favorites/PinnedFavorites.ts) lines 206-212.
    The tile is small, so the polish of #264 extends to it.
  - **B. An `Unload tab` item in a menu of the pinned tile.** Does not touch the tile art, but no
    pinned tile has a menu today ([TileMenu.ts](../../src/modules/favorites/TileMenu.ts) line 57) and
    the gesture would differ from the row's.
  Recommendation: A, for parity with Arc and 059 and for the smaller surface; B only if a minus on a
  tile proves unreadable in the design's probe.
- [x] **Q-3. Hover or always visible.** Answered (Tore, 2026-11-24): keep 004's hover behavior on the
  separator, hidden at rest (opacity 0), so the sidebar stays calm; the live check proves the box, and
  the manual check proves the hover and the look. An always-visible Clear is not this spec's change.

## References

- [001 Favorites grid](../001-favorites-grid/spec.md): the tile and its unload controls.
- [003 Favorites and pinned tabs](../003-pinned-tabs-and-folders/spec.md): the saved page, the
  separator and the unload on close.
- [004 Today tabs and keyboard](../004-today-tabs-and-keyboard/spec.md): Clear, the archive and the
  separator whose placement and hover this spec keeps.
- [046 Live verification](../046-live-verification/spec.md): the live scenario of AC-6.
- [057 Menu of a Favorites tile](../057-tile-menu/spec.md): the menu pinned tiles still do not have.
- [058 Pinned tabs on Vivaldi 8.3](../058-pinned-tabs-83/spec.md): the pinned-group layout.
- [059 Pinned tabs and Favorites like Arc](../059-pinned-tabs-arc/spec.md): the pinned page, the row
  minus and the Favorite model this spec extends.
- Code: [ClearButton.ts](../../src/modules/today/ClearButton.ts),
  [ArchiveButton.ts](../../src/modules/today/ArchiveButton.ts),
  [PinnedFavorites.ts](../../src/modules/favorites/PinnedFavorites.ts),
  [FavoritesView.ts](../../src/modules/favorites/FavoritesView.ts),
  [PinnedMinus.ts](../../src/modules/pinned/PinnedMinus.ts),
  [HiddenTabMarker.ts](../../src/shared/tabs/HiddenTabMarker.ts),
  [TabBarMarker.ts](../../src/modules/pinned/TabBarMarker.ts), `src/styles/today.scss`,
  `src/styles/pinned.scss`, `src/selectors/8.1.json`.
