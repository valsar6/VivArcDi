# 062 Minus on hover and open-link indent

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-25 |
| Supersedes | Nothing yet. It refines the visibility and the badge of [061](../061-pinned-minus-ui/spec.md) FR-1, FR-2, AC-1 to AC-4 and of [009](../009-bookmark-folders-in-tab-bar/spec.md) FR-4 and AC-13, and keeps 061's unload model and labels. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Tore's screenshots of 2026-11-25 show Arc's sidebar with the unload minus only while the pointer
rests on a folder or tab row, and the badge around it only while the pointer rests on the minus
itself. They also show open links indented under their folder, with no dot beside them. VivArcDi
draws the badge as soon as the row is hovered, keeps the minus visible on the current tab even when
the pointer is elsewhere, and still marks an open link with the dot of 009. This spec aligns those
three details with the screenshots without changing what a press does.

## Seen in the screenshots

Four screenshots by Tore, 2026-11-25, of Arc's vertical sidebar:

- A folder `Music` with its links indented below it; the link `Welcome - Thomann...` is selected
  and shows only the dash at the right end, without the badge.
- The pointer on the `Music` folder row and on the `Welcome - Thomann...` row: the dash is at the
  right end of each row, and the light rounded badge surrounds a dash only while the pointer rests
  on that control.
- The folder `Hobbies` with its open link `Wikipedia` below it, indented one level further in than
  the folder row; no dot marks the link as open.
- A small dark tab with a white dot beside its title: the dot VivArcDi draws today for an open link,
  which has no counterpart in the Arc screenshots.

## User stories

- **US-1.** As a user, I want the minus to appear only while I hover the folder or tab row, so that
  the sidebar stays calm even when a tab is current.
- **US-2.** As a user, I want the badge and the color of the minus to change only while I hover the
  minus itself, so that a hovered row does not look like a pressed control.
- **US-3.** As a user, I want an open link to be shown by its indentation instead of a dot, so that
  the link rows read like Arc's tab rows.
- **US-4.** As a user, I want a press on the minus to keep unloading the tab, so that this visual
  correction changes no gesture.

## Expected behavior

**Visibility.** The minus of a pinned row, a pinned tile, a Favorites folder row and a Favorites
link row is drawn only while the pointer rests on that row or tile. When the pointer leaves, the
minus is hidden even if the row is the current tab or an active link. The state of the tab never
shows the button by itself. The button keeps its size, position and short opacity transition of 061.

**Badge.** At rest on a hovered row the minus is just its dash in the row's foreground color on a
transparent background: no badge surface, no border and no extra tint. While the pointer rests on
the minus itself, the rounded-square badge of 061 is drawn behind the dash, with the badge's color
and the dash's color changing to their hover values. Both colors still come from the theme, and the
change is short and quiet as in 061.

**Open tabs.** The dot of 009/FR-4 is removed: no element, pseudo-element or mark beside a row's
icon or title indicates that its tab is open. Every row that stands for an open tab is indented one
step further than a row of the same depth whose tab is closed, whether or not Vivaldi displays the
tab itself in its tab list. An open link still stays visible below its folder while that folder is
closed. Folder rows keep their own indentation, and an unloaded link keeps the indentation because
its tab is still open. The link's title, icon, active look and unload minus stay as they are in 009
and 061.

**Press.** A press on the minus still unloads the tab, never closes it, never drags the row or tile,
never opens the tile and never removes a bookmark or a folder. The accessible names `Unload tab`
and `Unload tabs` stay. The minus is drawn only while `unloadOnClose` is on for a pinned row or tile,
and independently of that option on folder and link rows (061/FR-9).

**Versions.** The behavior holds on Vivaldi 8.1, 8.2 and 8.3, in the tab strip and in the pinned
group, with the Favorites grid on and off, in the light and dark themes.

### Today

| Case | What happens today | Where |
|---|---|---|
| Pinned row and tile minus | Visible on hover or when the tab is current; the badge is painted with the button | `pinned.scss`, `favorites.scss`, `_minus.scss` |
| Folder and link row minus | Visible on row hover or on an active link; the badge is painted with the button | `folders.scss`, `_minus.scss` |
| Open link | A 6 px dot next to the row, and a row at the link's bookmark depth | `folders.scss` lines 169-180, `FolderRows.ts` lines 87-105 |
| Press | Swallowed by the minus, then unload through `TabUnloader` | 061 |

### After

| Case | What happens after | Where |
|---|---|---|
| Pinned row and tile minus | Visible only while the row or tile is hovered; badge only while the button is hovered | `pinned.scss`, `favorites.scss`, `_minus.scss` |
| Folder and link row minus | Visible only while its row is hovered; badge only while the button is hovered | `folders.scss`, `_minus.scss` |
| Open tab row | No dot; every row of an open tab, including a tab Vivaldi does not display in its tab list, is indented one step further than a closed link at the same depth | `folders.scss`, `FolderRows.ts`, `FolderRowElement.ts` |
| Press | Unchanged: unload, never close | 061 |

## Requirements

### Functional

- **FR-1.** WHEN a row or tile is hovered, THE minus of that row or tile SHALL be visible, and WHEN
  the pointer is elsewhere, THE minus SHALL be hidden even if its tab is current or active. This
  SHALL hold for pinned rows, pinned tiles, Favorites folder rows and Favorites link rows.
- **FR-2.** WHILE the pointer rests on a minus, THE badge surface and the hover colors SHALL be
  visible, and WHILE the pointer rests on its row but not on the minus, THE minus SHALL be only its
  dash on a transparent background with no badge, border or tint.
- **FR-3.** A press on a minus SHALL keep the unload, drag, open, bookmark and label behavior of
  061/FR-3 to FR-6 and FR-9.
- **FR-4.** An open link row SHALL NOT show a dot or another mark of its open state beside its icon
  or title, and an open link SHALL stay visible below its closed folder.
- **FR-5.** WHILE a row stands for an open tab, including a tab that Vivaldi does not display in its
  tab list or that is unloaded, THE row SHALL be indented one `$folders-indent` step further than a
  row whose tab is closed at the same bookmark depth; folder rows SHALL keep their depth. No row
  SHALL show a dot for its open tab. The indentation SHALL apply to links listed below a closed
  folder and to links of a collapsed space.
- **FR-6.** The behavior SHALL hold on Vivaldi 8.1, 8.2 and 8.3, in the tab strip and in the pinned
  group, with the Favorites grid on and off.

### Non-functional

- **NFR-1.** VivArcDi SHALL never block Vivaldi; no tab is unloaded without a user action.
- **NFR-2.** The change adds no module, no option in `config.json` and no runtime dependency; it
  keeps at most one redraw per animation frame and removes its listeners on stop (061/NFR-2).
- **NFR-3.** The dash and the badge SHALL stay legible in the light and dark themes, with their
  colors taken from the theme.
- **NFR-4.** Works on macOS and Debian; texts in English.
- **NFR-5.** IF Vivaldi's markup or a folder row is not what the module expects, THEN the module
  SHALL leave the tab bar as Vivaldi draws it and log the reason (003/NFR-3).

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). Test names and live scenario names are exact.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHILE a pinned row is hovered, THE minus SHALL be visible, and WHEN the pointer leaves it, THE minus SHALL be hidden even if its tab is current. | auto: `shows the pinned row minus only while the row is hovered` |
| AC-2 | WHILE a pinned tile is hovered, THE minus SHALL be visible, and WHEN the pointer leaves it, THE minus SHALL be hidden even if its tab is current. | auto: `shows the pinned tile minus only while the tile is hovered` |
| AC-3 | WHILE a Favorites link row is hovered, THE minus SHALL be visible, and WHEN the pointer leaves it, THE minus SHALL be hidden even if the link is active. | auto: `shows the link row minus only while the row is hovered` |
| AC-4 | WHILE a Favorites folder row with open links is hovered, THE minus SHALL be visible, and WHEN the pointer leaves it, THE minus SHALL be hidden. | auto: `shows the folder row minus only while the row is hovered` |
| AC-5 | WHILE the pointer rests on the minus of a pinned row or tile, THE badge and its hover colors SHALL be visible, and WHILE the pointer rests on the row elsewhere, THE minus SHALL be only a dash. | auto: `shows the pinned minus badge only while the button is hovered` |
| AC-6 | WHILE the pointer rests on the minus of a Favorites folder or link row, THE badge and its hover colors SHALL be visible, and WHILE the pointer rests on the row elsewhere, THE minus SHALL be only a dash. | auto: `shows the folder and link minus badges only while the buttons are hovered` |
| AC-7 | THE section SHALL draw no dot or other open-state mark on a link row with an open tab. | auto: `removes the dot from an open link row` |
| AC-8 | WHILE a row stands for an open tab, including a tab Vivaldi does not display in its tab list, THE row SHALL be indented one step further than a row whose tab is closed at the same depth, including below a closed folder and in a collapsed space. | auto: `indents every row of an open tab one step further than a closed link row` |
| AC-9 | WHEN Tore compares VivArcDi with his screenshots of 2026-11-25, THE minus SHALL appear only on row hover, its badge only on button hover, and open links SHALL be indented without a dot, while a press on the minus SHALL still unload without closing. | manual |

AC-1 to AC-8 are checked by reading the rendered rules and the row markup; the look of the badge
and its colors stay with the manual check of AC-9.

## Out of scope

- The unload model, the pinned page, the row menu and the other close routes of 009 and 061.
- The size, position and accessible names of the minus, and the themes' palettes: 061, 029, 051.
- A minus on the tiles of the bookmark grid: 059/FR-17 and AC-28, 060/FR-7, 061/FR-7.
- The indentation of folder rows, the folder panel and the Favorites grid layout.
- Keyboard focus as a trigger for the minus; this spec follows Tore's hover-only screenshots.
- Vivaldi 8.4 and later.

## Open questions

- [x] **Q-1. How much an open tab is indented.** Tore chose option A with an addition on
  2026-11-25: every row that stands for an open tab is one `$folders-indent` step further right than
  a closed row at the same depth, even when Vivaldi does not display the tab itself in its tab list;
  the dot is removed in every case. Option B, keeping every link at its current depth, is rejected.
- [x] **Q-2. Which surfaces follow the hover-only rule.** Tore chose option A on 2026-11-25: pinned
  rows and tiles, Favorites folder rows and Favorites link rows all show the minus only on hover.
  Option B, keeping the current-tab visibility of a pinned row or tile, is rejected.

## References

- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md): the open-link
  dot this spec removes and the rows the minus sits on.
- [061 Pinned minus UI](../061-pinned-minus-ui/spec.md): the badge, the visibility and the press
  this spec refines.
- [029 Arc Light theme](../029-arc-light-theme/spec.md) and
  [051 More Arc themes](../051-more-themes/spec.md): the theme colors.
- [058 Pinned tabs on Vivaldi 8.3](../058-pinned-tabs-83/spec.md): the pinned-group layout.
- Code: `src/styles/_minus.scss`, `src/styles/pinned.scss`, `src/styles/favorites.scss`,
  `src/styles/folders.scss`, `src/styles/_tokens.scss`, `src/modules/folders/view/FolderRows.ts`,
  `src/modules/folders/view/FolderRowElement.ts`.
- Screenshots by Tore, 2026-11-25: the Arc sidebar with the folder and link rows, the minus badge
  under the pointer, and the white dot to be removed.
