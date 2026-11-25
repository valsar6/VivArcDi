# 061 Pinned minus UI

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-24 |
| Supersedes | Nothing yet. It refines the look and the press of [059](../059-pinned-tabs-arc/spec.md) FR-5 and AC-15 and of [060](../060-clear-bar-and-pinned-unload/spec.md) FR-4, and keeps 059/FR-17 and AC-28. It replaces the close button of an open link row in [009](../009-bookmark-folders-in-tab-bar/spec.md) FR-12 with the minus for the unload; the other close routes of 009/FR-15 stay. |
| Refined by | [062 Minus on hover and open-link indent](../062-minus-hover-and-indent/spec.md) FR-1, FR-2, AC-1, AC-3, AC-4 and AC-10: the minus is shown on row or tile hover only, and its badge on button hover only. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc shows the unload minus of a pinned row as a small light rounded-square badge with a dark dash at
its center, at the right end of the row, and the same control on the rows of its Favorites folders
and links. VivArcDi's minus, added by [059](../059-pinned-tabs-arc/spec.md) on pinned rows and by
[060](../060-clear-bar-and-pinned-unload/spec.md) on pinned tiles, is a bare 14 px glyph with no
badge, and the rows of the bookmark folder section have their own close `×`, if any.
This spec makes the minus look and act as in Tore's recording of 2026-11-24 on every surface where
it appears: the pinned row, the pinned tile, and the rows of a Favorites folder and a Favorites link.
It keeps the unload model and the label, and keeps the tiles of the bookmark grid without a minus.

## Seen in the recording

Tore's recording of 2026-11-24, analyzed at 4 to 8 frames per second. The file is 3104×1962 retina
pixels, so 1552×981 CSS px at 2×.

- The minus appears at the right end of a row while the pointer rests on it, in this order: the
  Favorites folder `Music`, the Favorites link `Welcome - Thomann...`, the pinned row
  `Introduction - Sig...`, the Favorites folder `Programming`.
- It is a dark horizontal dash at the center of a light gray rounded-square badge: about 41–42
  device px (about 21 CSS px) square, a radius of about 10 device px (about 5 CSS px), and a dash of
  about 22–23×4 device px (about 11×2 CSS px).
- It is hidden while the pointer is elsewhere and appears again on the next row that is hovered. A
  press on it does not drag the row and does not open it.
- Its tooltip reads `Close and Keep Pinned ⌥⌘W`.

| What Tore did | What the recording shows |
|---|---|
| Rested the pointer on `Music` | The minus appears at the right end of the folder row |
| Rested it on `Welcome - Thomann...` | The same minus on the link row |
| Rested it on `Introduction - Sig...` | The same minus on the pinned row |
| Rested it on `Programming` | The same minus on the other folder row |

The control VivArcDi draws today is a 14×14 px transparent masked glyph with no badge: its dash is
about 9.6×1.3 px, and the button has no background and no radius
([_tokens.scss](../../src/styles/_tokens.scss) lines 306-308,
[pinned.scss](../../src/styles/pinned.scss) lines 13-28). The recording's badge is not that.

## User stories

- **US-1.** As a user, I want the minus of a pinned row to look like Arc's, so that the sidebar
  matches the browser VivArcDi imitates.
- **US-2.** As a user, I want the minus of a pinned tile to look the same as the row's, so that a
  pinned tab looks the same whether it is a row or a tile.
- **US-3.** As a user, I want the minus to appear only while I hover or use the row or tile, so that
  the sidebar stays calm at rest.
- **US-4.** As a user, I want a press on the minus to unload the tab and never drag the row, close
  the tab or open the tile, so that one gesture has one result.
- **US-5.** As a user, I want the same minus on the rows of my Favorites folder and Favorites link,
  so that the pinned area reads as in Arc.
- **US-6.** As a user, I want the tiles of the Favorites grid to keep no minus, so that a Favorite
  keeps its own model and its own unload controls.

## Expected behavior

**One control, one look.** The minus of a pinned row and the minus of a pinned tile are one
VivArcDi control with one look: a rounded-square badge of about 21×21 CSS px, a radius of about
5 px, and a dash of about 11×2 px centered in it, at the right end and vertically centered on the
row or tile. The badge is a light surface and the dash the row's foreground, both taken from the
theme, so the control is the light gray badge of the recording in the light theme and stays legible
in the dark themes of [029](../029-arc-light-theme/spec.md) and [051](../051-more-themes/spec.md);
the colors of the recording are not hardcoded.

**Visibility.** The minus is shown while its row or tile is hovered or its tab is the current one,
and hidden otherwise. On a pinned row the current tab is the row's own `.tab.active`; on a tile it
is `[data-vivarcdi-current]`. The transition stays short and quiet, as today.

**The press.** A press that starts on the minus belongs to the minus: it never starts Vivaldi's
drag of the row, never drags the tile and never opens the tile. A click unloads the tab through the
same path as 059/FR-5 and 060/FR-5, so the tab is discarded and never closed, the row or tile stays,
and opening it loads the pinned page again (059/FR-3). The control is a VivArcDi button, not
Vivaldi's own close button (Tore, 2026-11-23), so its styling and its press handling are ours.

**The label.** The minus of a pinned row and of a pinned tile keeps the accessible name
`Unload tab`. It does not use Arc's `Close and Keep Pinned` wording or its shortcut, because the
click unloads and never closes; a visible tooltip with that wording is not added. The minus is drawn
only while the `unloadOnClose` option of 003 is on, as today
([PinnedTabs.ts](../../src/modules/pinned/PinnedTabs.ts) lines 51-55).

**The rows of a Favorites folder and a Favorites link.** In VivArcDi these are not Vivaldi's pinned
rows: the bookmark-folders module draws them itself, as a folder row and a link row in its own
section above the pinned rows ([FolderRowElement.ts](../../src/modules/folders/view/FolderRowElement.ts)
lines 59-68 and 107-115). Today a link row with an open tab shows a 16 px `×` on hover that closes
the tab for real ([folders.scss](../../src/styles/folders.scss) lines 148-179,
[FolderSectionView.ts](../../src/modules/folders/view/FolderSectionView.ts) lines 160-167 and
239-244), and a folder row has no control. This spec gives them the same minus as a pinned row: the
link row shows it on hover or while its tab is current, and a press unloads its tab and never closes
it or removes the bookmark; the folder row shows it on hover while it has an open link tab, and a
press unloads the tabs of the link rows below it and never removes the folder or a bookmark. The
link row's minus is labelled `Unload tab` and the folder row's `Unload tabs`. The control never
starts the row's drag or opens the row. Q-1 asks Tore to confirm this model.

**Favorite tiles.** The tiles of the bookmark grid keep 059's model: no minus, no back arrow and no
reset control (059/FR-17, AC-28; 060/FR-7). Middle click and Cmd/Ctrl+W keep unloading a Favorite's
tab. This spec does not extend the minus to them.

**Versions.** The behavior holds on Vivaldi 8.1 and 8.2, where the pinned rows sit in the tab strip,
and on 8.3, where Vivaldi draws them in a `span.pinned-group` beside it
([058](../058-pinned-tabs-83/spec.md), [selectors/8.1.json](../../src/selectors/8.1.json) line 11),
with the Favorites grid on and off.

### Today

| Case | What happens today | Where |
|---|---|---|
| Pinned row minus | A 14×14 px masked glyph in `currentcolor`, transparent, 4 px from the inline end and centered; no badge and no radius | `PinnedMinus.ts` lines 100-106, `pinned.scss` lines 13-34, `_tokens.scss` lines 306-308 |
| Pinned tile minus | The same glyph and offset on `[data-vivarcdi-tiles][data-vivarcdi-tile-source=pinned]` | `PinnedTileMinus.ts` lines 37-42 and 79-85, `favorites.scss` lines 125-146 |
| Visibility | `opacity: 0` and `pointer-events: none`, shown on hover or on the current row or tile | `pinned.scss` lines 25-34, `favorites.scss` lines 137-146 |
| Label | `aria-label="Unload tab"`, no tooltip | `PinnedMinus.ts` line 104, `PinnedTileMinus.ts` line 5 |
| Press | `mousedown` and `click` swallowed on a row; `pointerdown`, `mousedown` and `click` on a tile | `PinnedMinus.ts` lines 55-56 and 124-131, `PinnedTileMinus.ts` lines 37-42 and 87-97 |
| Unload | `discard` through `TabUnloader`; the tab is never removed | `PinnedMinus.ts` lines 133-135, `PinnedTileMinus.ts` lines 99-104, `TabUnloader.ts` lines 44-55 |
| Favorites folder and link rows | VivArcDi's own rows: a folder row has no control; an open link row shows a 16 px `×` on hover that closes its tab for real | `FolderRowElement.ts` lines 59-68 and 107-115, `folders.scss` lines 148-179, `FolderSectionView.ts` lines 160-167 and 239-244 |
| Favorite tiles | No minus | `PinnedTileMinus.test.ts` line 45, `favorites.scss` lines 125-146 |
| Versions | The same control in both pinned layouts | `selectors/8.1.json` line 11 |

### After

| Case | What happens after | Where |
|---|---|---|
| Pinned row minus | A badge of about 21×21 px with a 5 px radius and a centered 11×2 px dash, in the theme's colors, at the right end | `PinnedMinus.ts`, `pinned.scss`, `_tokens.scss` |
| Pinned tile minus | The same badge on the pinned tile | `PinnedTileMinus.ts`, `favorites.scss`, `_tokens.scss` |
| Visibility | Unchanged: hover or current row or tile, hidden otherwise | `pinned.scss`, `favorites.scss` |
| Label | `Unload tab`, unchanged | `PinnedMinus.ts`, `PinnedTileMinus.ts` |
| Press | A press never drags the row or tile and never opens the tile | `PinnedMinus.ts`, `PinnedTileMinus.ts` |
| Unload | Unchanged: discard, never close; the row or tile stays | `TabUnloader.ts` (kept) |
| Favorites folder and link rows | The same badge: the link row in place of its `×`, the folder row while it has an open link tab; a press unloads, never closes and never removes a bookmark or the folder (Q-1) | `FolderRowElement.ts`, `folders.scss`, a collaborator of the folder section |
| Favorite tiles | Unchanged: no minus, no back arrow and no reset control | `FavoritesView.ts` (kept) |
| Versions | The same in the strip and in the pinned group | `selectors/8.1.json` |

## Requirements

### Functional

- **FR-1.** The minus of a pinned row and of a pinned tile SHALL be a VivArcDi control of one look:
  a rounded-square badge of about 21×21 CSS px with a radius of about 5 px and a centered dash of
  about 11×2 px, at the right end and vertically centered, in the theme's colors so that it stays
  legible in light and dark themes.
- **FR-2.** The minus SHALL be visible while its row or tile is hovered, and hidden otherwise,
  even if its tab is the current one (062/FR-1). The badge and its colors SHALL appear only while
  the button itself is hovered (062/FR-2).
- **FR-3.** WHEN the minus is clicked, THE module SHALL unload the tab and SHALL NOT close it; the
  row or tile SHALL stay, and opening it SHALL load the pinned page (059/FR-3, FR-5; 060/FR-4, FR-5).
- **FR-4.** A press that starts on the minus SHALL NOT start a drag of the row or tile, and on a
  tile SHALL NOT open it.
- **FR-5.** The minus of a pinned row and of a pinned tile SHALL keep the accessible name
  `Unload tab`; it SHALL NOT use Arc's `Close and Keep Pinned` wording or its shortcut, because the
  click unloads and does not close.
- **FR-6.** The row of a Favorites link SHALL show the same minus on hover or while its tab is the
  current one, and a press SHALL unload its tab, never close it and never remove the bookmark. The
  row of a Favorites folder SHALL show the same minus on hover while it has an open link tab, and a
  press SHALL unload the tabs of the link rows below it, never close them and never remove the
  folder or a bookmark. The link row's minus SHALL be labelled `Unload tab` and the folder row's
  `Unload tabs`.
- **FR-7.** A tile of the bookmark grid SHALL keep no minus, no back arrow and no reset control
  (059/FR-17, AC-28; 060/FR-7).
- **FR-8.** The behavior SHALL hold on Vivaldi 8.1, 8.2 and 8.3, in the tab strip and in the pinned
  group, with the Favorites grid on and off.
- **FR-9.** The minus of a pinned row and of a pinned tile SHALL be drawn only while the
  `unloadOnClose` option of 003 is on
  ([PinnedTabs.ts](../../src/modules/pinned/PinnedTabs.ts) lines 51-55); the minus of a folder row
  or a link row SHALL NOT depend on that option.

### Non-functional

- **NFR-1.** VivArcDi SHALL never block Vivaldi; no tab is unloaded without a user action
  (059/NFR-1).
- **NFR-2.** The controls keep their cost of at most one pass per animation frame, and stopping the
  modules removes the buttons and every listener (058/NFR-3, 060/NFR-3).
- **NFR-3.** The change adds no module, no option in `config.json` and no runtime dependency; the
  minus stays a button drawn by CSS.
- **NFR-4.** Works on macOS and Debian; texts in English; the badge stays legible in light and dark
  themes.
- **NFR-5.** IF Vivaldi's markup or a folder row is not what the module expects, THEN the module
  SHALL leave the tab bar as Vivaldi draws it and log the reason (003/NFR-3).

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). Test names and live scenario names are exact.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE minus of a pinned row SHALL be a rounded-square badge of about 21×21 CSS px with a radius of about 5 px and a centered dash of about 11×2 px, in the theme's colors, at the right end of the row. | auto: `draws the pinned row minus as a badge like Arc` |
| AC-2 | THE minus of a pinned tile SHALL be the same badge as the row's, at the right end of the tile. | auto: `draws the pinned tile minus as the same badge` |
| AC-3 | WHILE a pinned row is hovered, THE minus SHALL be visible, and WHEN the pointer leaves it, THE minus SHALL be hidden even if its tab is current (062/AC-1). | auto: `shows the pinned row minus only while the row is hovered` |
| AC-4 | WHILE a pinned tile is hovered, THE minus SHALL be visible, and WHEN the pointer leaves it, THE minus SHALL be hidden even if its tab is current (062/AC-2). | auto: `shows the pinned tile minus only while the tile is hovered` |
| AC-5 | THE minus of a pinned row and of a pinned tile SHALL carry the label `Unload tab`. | auto: `labels the pinned minus as Unload tab` |
| AC-6 | WHEN the minus of a pinned row is clicked, THE module SHALL unload the tab and SHALL NOT close it. | auto: `unloads a pinned tab from its minus` |
| AC-7 | WHEN the minus of a pinned tile is clicked, THE module SHALL unload the tab and SHALL NOT close it or open the tile. | auto: `unloads a pinned tab from its tile minus` |
| AC-8 | WHEN a press starts on the minus of a pinned row, THE module SHALL NOT start a drag of the row. | auto: `does not start a drag from the pinned row minus` |
| AC-9 | WHEN a press starts on the minus of a pinned tile, THE module SHALL NOT start a drag of the tile and SHALL NOT open it. | auto: `does not drag or open a pinned tile from its minus` |
| AC-10 | WHILE the pointer rests on the row of a Favorites link, THE minus SHALL be visible, and WHEN the pointer leaves it, THE minus SHALL be hidden even if the link is active (062/AC-3). | auto: `shows the link row minus only while the row is hovered` |
| AC-11 | WHEN the minus of a Favorites link row is clicked, THE module SHALL unload its tab and SHALL NOT close it or remove the bookmark. | auto: `unloads a link tab from its minus` |
| AC-12 | WHILE the pointer rests on the row of a Favorites folder with an open link tab, THE minus SHALL be visible, and WHEN it is clicked, THE module SHALL unload the tabs of the link rows below it and SHALL NOT remove the folder or its bookmarks. | auto: `unloads the link tabs of a folder from its minus` |
| AC-13 | THE minus SHALL NOT appear on a tile of the bookmark grid. | auto: `keeps the minus off a Favorite tile` |
| AC-14 | WHILE the Favorites grid is on, THE minus of a pinned tile SHALL be a badge of about 21×21 CSS px at the right end of the tile. | live: `the pinned minus is a badge on the tile of a pinned tab` |
| AC-15 | WHEN Tore compares VivArcDi with his recording of 2026-11-24 and the screenshots of 2026-11-25, the minus of a pinned row and of a pinned tile SHALL look and sit as in the recording, SHALL appear on hover only with its badge on button hover, and a press SHALL unload without closing, dragging or opening (062/AC-9). | manual |
| AC-16 | WHEN Tore compares the row of a Favorites folder and of a Favorites link with the recording, THE minus SHALL look and sit as on a pinned row, and a press SHALL unload the tabs it stands for without closing them or removing the bookmark or the folder. | manual |

AC-14 is checked by the live scenario on the lab Vivaldi of
[046](../046-live-verification/spec.md): it opens a pinned tab with the default Favorites grid and
reads the box, the radius and the place of the minus on its tile; the hover and the press stay the
manual checks of AC-15 and AC-16.

## Out of scope

- A minus on the tiles of the bookmark grid: 059/FR-17 and AC-28, 060/FR-7, and the manual's
  Favorites section keep them without one.
- The unload model, the pinned page, the row menu and the address editing: [059](../059-pinned-tabs-arc/spec.md).
- Where the Clear control and the tile minus live, and the tile's own layout:
  [060](../060-clear-bar-and-pinned-unload/spec.md).
- The menus, the folder panel, renaming and icons of the folder rows:
  [009](../009-bookmark-folders-in-tab-bar/spec.md), [056](../056-saved-tab-menu/spec.md),
  [057](../057-tile-menu/spec.md).
- The Little Arc indicator of a pinned row or tile: 059.
- The theme palettes themselves: [029](../029-arc-light-theme/spec.md), [051](../051-more-themes/spec.md).
- A visible tooltip that repeats Arc's `Close and Keep Pinned` wording or its shortcut.
- Vivaldi 8.4 and later.

## Open questions

- [x] **Q-1. What a press does on the rows of a Favorites folder and a Favorites link.** Tore chose
  **A** on 2026-11-24: the link row's `×` becomes the minus and a press unloads its tab, the row stays
  with its dimmed unloaded look and the bookmark stays. A folder row shows the minus on hover while it
  has an open link tab, and a press unloads the tabs of the link rows below it, keeping the folder and
  the bookmarks. Closing for real stays Cmd/Ctrl+W and Vivaldi's own close (009/FR-15). This matches
  the recording and gives every row one gesture; option B, keeping the `×` beside a link-row minus and
  no control on folders, is rejected.

## References

- [003 Favorites and pinned tabs](../003-pinned-tabs-and-folders/spec.md): the `unloadOnClose`
  option and the close affordance that the minus replaces.
- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md): the folder rows
  and link rows, their open and unloaded states and the close of a link's tab.
- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md): the row and tile look the minus belongs to.
- [029 Arc Light theme](../029-arc-light-theme/spec.md) and [051 More Arc themes](../051-more-themes/spec.md):
  the theme colors the badge must follow.
- [046 Live verification](../046-live-verification/spec.md): the live scenario of AC-14.
- [058 Pinned tabs on Vivaldi 8.3](../058-pinned-tabs-83/spec.md): the pinned-group layout.
- [059 Pinned tabs and Favorites like Arc](../059-pinned-tabs-arc/spec.md): the row minus, the pinned
  page and the Favorite model this spec refines; FR-17 and AC-28 stay.
- [060 Clear bar and pinned tile unload](../060-clear-bar-and-pinned-unload/spec.md): the tile minus
  this spec refines.
- [The tab bar](../../docs/manual/tab-bar.md#pinned-tabs): sections "Favorites", "Folders" and
  "Pinned tabs".
- Code: `src/modules/pinned/PinnedMinus.ts`, `src/modules/favorites/PinnedTileMinus.ts`,
  `src/modules/folders/view/FolderRowElement.ts`, `src/modules/folders/view/FolderSectionView.ts`,
  `src/styles/pinned.scss`, `src/styles/favorites.scss`, `src/styles/folders.scss`,
  `src/styles/_tokens.scss`.
- Issue #264 (pinned minus UI check and polish), the follow-up this spec answers.
