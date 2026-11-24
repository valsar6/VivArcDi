# 061 Pinned minus UI: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after Tore approved the spec and answered Q-1 with option A on 2026-11-24. It says **how**;
the spec says **what**. It builds on the VivArcDi minus of
[059](../059-pinned-tabs-arc/design.md) and [060](../060-clear-bar-and-pinned-unload/spec.md)
and on the folder rows of [009](../009-bookmark-folders-in-tab-bar/design.md).

## Approach

One badge look is shared by the two existing buttons and by the two new row buttons. The unload
path stays the one `TabUnloader` already provides; nothing is removed from the bookmarks.

| Area | What changes | Where |
|---|---|---|
| Badge | Tokens and one SCSS mixin draw the light rounded badge and the dark dash on rows and tiles | `styles/_tokens.scss`, `styles/_minus.scss`, `styles/pinned.scss`, `styles/favorites.scss` |
| Press | The row minus swallows `pointerdown` as the tile minus does; labels stay `Unload tab` | `modules/pinned/PinnedMinus.ts`, `modules/favorites/PinnedTileMinus.ts` |
| Folder rows | A minus replaces the link row's close `×`; folder rows get one while they own open link tabs | `modules/folders/view/`, `modules/folders/FolderSection.ts`, `styles/folders.scss` |
| Docs | 009's close affordance, the manual and the README name the new minus | `specs/009`, `docs/manual/tab-bar.md`, `README.md` |

The pinned page, the Clear control, the bookmark grid tiles and the theme palettes do not change.

### The badge

`_tokens.scss` keeps `$minus-glyph` and adds:

```scss
$minus-badge-size: 21px;
$minus-badge-radius: 5px;
$minus-badge-tint: 14%;
$minus-offset: 6px;
$minus-size: 16px;
```

The glyph path spans 11 of its 16 units, so at a 16 px mask the dash is 11 px wide and 1.5 px high:
the recording's 11×2 px dash within a 21 px badge. `$minus-badge-tint` mixes `--colorFg` with
transparency, so the badge is light on a dark row and dark on a light one; the dash uses
`currentcolor`. No color from the recording is hardcoded.

A new partial `styles/_minus.scss` holds one `@mixin minus-badge` used by `pinned.scss` and
`favorites.scss`. The mixin styles the button as a square badge with a radius, no border, no default
appearance and a short opacity transition, and styles its `::before` as the masked dash:

```scss
background-color: color-mix(in srgb, var(--colorFg, #fff) $minus-badge-tint, transparent);
border-radius: $minus-badge-radius;
&::before {
  background-color: currentcolor;
  mask: $minus-glyph center / contain no-repeat;
}
```

The button no longer carries the mask itself: a mask on the button would clip its badge. The
`opacity: 0`, `pointer-events: none` and the hover/current rules keep their selectors and their
meaning. The style tests change from checking `mask` on the button to checking the badge properties
and the dash on `::before`, with the verbatim names of AC-1 to AC-4.

### The press

`PinnedMinus` already swallows `mousedown` and `click`; it adds `pointerdown` so a press on the minus
cannot start Vivaldi's drag of the row. `PinnedTileMinus` already swallows all three, so it only
keeps its behavior and its tests. Both buttons keep `aria-label="Unload tab"`, and the click path
still ends in `TabUnloader.unload`, which discards without closing. No tooltip is added.

### Folder and link rows

The folder section draws its own rows; `PinnedMinus` never sees them. `FolderRowElement` gains:

- on an open link row, a `span[role=button][data-vivarcdi-link-minus]` labelled `Unload tab` in place
  of today's `data-vivarcdi-link-close` span;
- on a folder row, the same badge with `data-vivarcdi-folder-minus` labelled `Unload tabs` when the
  folder has at least one open link row below it.

Visibility uses the row's existing state: `.vivarcdi-folders-link:hover` and
`[data-vivarcdi-link-active]` show a link's minus; `.vivarcdi-folders-folder:hover` and
`[data-vivarcdi-open]` show a folder's. `folders.scss` applies the same `minus-badge` mixin, so the
three surfaces look identical.

`FolderSectionView` routes a press on either button to a new `onUnload` handler instead of `#open`
or `#close`. It swallows `pointerdown`, `mousedown` and `click` before the row's own click listener
can toggle the folder or open the link, and it reads the tab ids from its `#links` map. For a folder
it collects the tab ids of the link rows whose depth is greater than the folder's, up to the next
folder at the same or a lower depth. The rows already carry `data-vivarcdi-depth`, so no bookmark
walk is needed. Rows with virtual links keep their current behavior: they have no real tab id and
are skipped by the unload.

`FolderSection` wires `onUnload` to one `TabUnloader` built from the context's `tabs` API. The old
`onClose` handler and `activator.close` stay for the other close routes of 009/FR-15; the spec's
Supersedes note records that the hover `×` is replaced. `stop()` removes no extra listener: the
section's single delegated listener and its removal already cover the new buttons.

### Live scenario

`tests/live/scenarios/the-pinned-minus-is-a-badge-on-the-tile-of-a-pinned-tab.live.ts` opens a pinned
tab with the default Favorites grid and reads the tile minus's box, radius and position, as the
existing live scenarios read their elements. It is added when AC-14 becomes a live check; until
then the spec keeps its `manual; becomes live:` note and the Draft convention of `a987dbd8`.

## Files

| File | Role |
|---|---|
| `src/styles/_tokens.scss` | Badge sizes, tint and offset |
| `src/styles/_minus.scss` | The shared badge mixin |
| `src/styles/pinned.scss`, `src/styles/favorites.scss` | Use the mixin on the two existing buttons |
| `src/styles/folders.scss` | Use the mixin on link and folder rows |
| `src/modules/pinned/PinnedMinus.ts` | Swallow `pointerdown` |
| `src/modules/folders/view/FolderRowElement.ts` | Draw the new buttons |
| `src/modules/folders/view/FolderSectionView.ts` | Route presses, collect folder tab ids |
| `src/modules/folders/FolderSection.ts` | Wire `onUnload` to `TabUnloader` |
| `tests/styles/Pinned.test.ts`, `tests/styles/Favorites.test.ts`, `tests/styles/Folders.test.ts` | AC-1 to AC-4 and AC-13 |
| `tests/modules/pinned/PinnedTabs.test.ts`, `tests/modules/favorites/PinnedFavorites.test.ts` | AC-5 to AC-9 |
| `tests/modules/folders/FolderRowElement.test.ts`, `tests/modules/folders/FolderSectionView.test.ts`, `tests/modules/folders/FolderSection.test.ts` | AC-10 to AC-12 |
| `tests/live/scenarios/` | AC-14's scenario |

## Risks

| Risk | Answer |
|---|---|
| A mask on the button hides the badge | The `::before` carries the mask; the button carries the background |
| A press on a folder minus toggles the folder | The delegated listener checks the minus before `#open` and swallows the event |
| Two minuses on a link row | The close span is replaced, not added to |
| A virtual link has no tab | Its tab id is undefined and the unload skips it |
| Theme contrast | Both colors come from `--colorFg`; the manual check covers every palette |
| The badge shifts the row or tile | The button keeps `position: absolute` and zero flow size |
