# 028 Arc sidebar look

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | Tore, 2026-11-08; revision 2026-11-08 (default palette `arclight` of 029) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

The modules of VivArcDi give Vivaldi Arc's behavior, but the vertical tab bar still looks like
Vivaldi's: each tab is a filled card, the active Favorites tile takes the accent color, the order of the
sections differs and Vivaldi's panel bar sits beside it. This spec makes the tab bar look like Arc's:
same order of sections, rows without a background at rest, a light pill for the active tab, the same
sizes and the same hover and drag states. It is a visual spec: it adds no new feature.

## User stories

- **US-1.** As a user coming from Arc, I want the tab bar to look like Arc's, so that I find things where my eyes expect them.
- **US-2.** As a user, I want only the active tab to stand out, so that I see at once where I am.
- **US-3.** As a user, I want the look to follow the color of the workspace ([019](../019-space-theme-color/spec.md)), in light and dark.

## Expected behavior

Seen in Tore's recording `Registrazione schermo 2026-11-08 alle 17.25.22.mov` (68 seconds, Arc on
macOS, space "Riposino") and compared with Tore's screenshot of VivArcDi 0.20.0 of the same day. Sizes
are read from Retina frames (1 CSS px = 2 video px). Frames and the comparison canvas are in the
project files under `design-sidebar/`.

From top to bottom the Arc tab bar shows:

1. **Header**: one row, window buttons on the left, back, forward and a menu on the right.
2. **Address field**: a compact pill on a light veil, the domain on the first line and the page title
   in grey on the second, three small icons on the right.
3. **Favorites**: three columns of tiles about 44 px high, radius about 12 px, on a light veil of the
   space color. The active tile turns almost white. No accent color.
4. **Space name**: icon and name in grey, 13 px, above the pinned tabs.
5. **Pinned tabs and folders**: rows with a pitch of 41 px, no background at rest, text 14 px with
   medium weight, almost black, favicon or outline folder icon of 16 px.
6. **Separator**: a thin line with "↓ Clear" on the right; with many tabs "Tidy" appears beside it.
7. **New Tab**: a grey "+ New Tab" row; a new tab appears just below it, so today's tabs run from the
   newest down.
8. **Today's tabs**: same rows as the pinned tabs.
9. **Bottom bar**: archive icon on the left, one icon per space in the middle, "+" on the right.

States of a row: at rest it has no background; on hover it gets a light veil pill and a "×" on the
right (a "−" for an opened pinned tab, which returns it to its pinned link); the active tab is an
almost white pill (about `#e9eff3` on a `#a3cee0` space) with a faint shadow. While a tab is dragged
its place stays as an empty slot, a darker shade of the space color, that moves with the pointer. The
scroll bar is thin and shows only while scrolling. The page sits inside a frame of the space color of
about 8 px, with rounded corners on every side.

In VivArcDi today (screenshot): Vivaldi's panel bar is on the left of the tab bar; the header holds the
"Aree di lavoro" selector, a row of extension icons and the navigation buttons on separate lines; the
address field spans the whole width; a "Tabs" heading sits above the pinned tabs; the grid of tiles is
below the pinned tabs and folders; today's tabs are dark cards about 46 px high with 10 px between
them; the active tile is filled with a purple accent; "+" is centered below the list; the bottom shows
an avatar, "VPN" and "Archive"; the scroll bar is wide and always visible.

VivArcDi changes the look with its stylesheet only, on top of the variables of 019: rows of 36 px with
2 px between them, radius 8 px, no background at rest, veil of white at 35% on hover (12% in dark mode),
white at 88% with a 1 px shadow for the active tab (18% in dark mode), Favorites tiles on a 22% veil.
Where the only way is a Vivaldi setting (toolbar content), the installer guide tells the user which
setting to change. Vivaldi's panel bar stays as it is for now (Tore, 2026-11-08).

**Favorites grid.** The tiles of the grid are Arc's small tiled tabs: at most three per row, as in Arc,
whatever the width of the tab bar (Tore, 2026-11-08). In the screenshot four tiles sit in one row: this
spec makes that impossible. The dashed "Drag a tab here to pin it" box is not part of Arc's tab bar and
goes away (change request to [012](../012-editable-folders/spec.md) FR-15).

**Default color.** Right after VivArcDi is installed, a workspace without a color of its own uses the
`arclight` gradient of [029](../029-arc-light-theme/spec.md) (revised by Tore, 2026-11-08; it was Arc's
light blue `#a3cee0`). Next to it VivArcDi offers six palettes close to that
blue, which the picker of [019](../019-space-theme-color/spec.md) shows as its first row of presets:

| Palette | Space color | Active pill | Text |
|---|---|---|---|
| Sky (default) | `#a3cee0` | `#e9f3f7` | `#0f2129` |
| Ice | `#b8dbe8` | `#eef6f9` | `#0f2129` |
| Powder | `#9fc2dd` | `#e7eff6` | `#0f1f2c` |
| Aqua | `#9fd6d2` | `#e8f5f4` | `#0e2423` |
| Mist | `#b3c7d6` | `#edf2f6` | `#141f28` |
| Lagoon | `#8ec5cf` | `#e4f1f4` | `#0c2126` |

Veil and hover are white at 22% and 35% over the space color in every palette, so only the space color
changes.

## Requirements

### Functional

- **FR-1.** The sections of the tab bar appear in Arc's order: Favorites, space name, pinned tabs and
  folders, separator, New Tab, today's tabs.
- **FR-2.** Rows of pinned and today's tabs have no background at rest, 36 px height, 2 px gap, 8 px radius,
  14 px text with weight 500.
- **FR-3.** Hover shows a veil pill and the close button; the active tab shows the light pill with a
  shadow; the close button is hidden otherwise.
- **FR-4.** Favorites tiles use the veil at rest and the same light pill as the active tab when active;
  the accent color is no longer used.
- **FR-5.** The separator is a 1 px line with "Clear" on the right; the "Tabs" heading is hidden.
- **FR-6.** "+ New Tab" is a row at the top of today's tabs.
- **FR-7.** The scroll bar of the tab bar is 6 px wide and shows only while scrolling.
- **FR-8.** Veil, pill and text colors come from CSS variables: from the workspace color of 019 when set,
  from the default palette (`arclight`, 029) otherwise; dark mode uses the dark values.
- **FR-10.** The Favorites grid never shows more than three tiles per row.
- **FR-11.** The six palettes of the table above are defined once, as tokens, and 019 offers them as its
  first presets.
- **FR-9.** All sizes and colors live in `_tokens.scss`.

### Non-functional

- **NFR-1.** Text keeps a contrast of at least 4.5:1 on the space color, in light and dark mode.
- **NFR-2.** The style is off when `sidebar-look.enabled` is false in `config.json`; Vivaldi then looks as today.
- **NFR-3.** Same look on macOS and Debian.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHILE the tab bar is shown, THE sections SHALL appear in the order of FR-1. | manual |
| AC-2 | WHILE a tab is neither hovered nor active, THE row SHALL have no background. | manual |
| AC-3 | WHEN the pointer is on a row, THE row SHALL show the veil and the close button. | manual |
| AC-4 | WHILE a tab is active, THE row SHALL show the light pill with a shadow. | manual |
| AC-5 | WHILE a Favorites tile is active, THE tile SHALL use the light pill and no accent color. | manual |
| AC-6 | WHEN the workspace color changes, THE veil, pill and text SHALL follow it. | manual |
| AC-7 | THE stylesheet SHALL define the row height, gap, radius and veils as tokens. | auto: `sidebar look uses tokens` |
| AC-8 | WHERE `sidebar-look.enabled` is false, THE stylesheet SHALL not be applied. | auto: `disabled sidebar look changes nothing` |
| AC-9 | WHILE a workspace has no color of its own and no palette is configured, THE tab bar SHALL use the `arclight` palette. | auto: `uses the arclight palette by default` |
| AC-10 | THE grid SHALL use at most three columns for any width and any number of tiles. | auto: `never lays out more than three columns` |
| AC-11 | THE six palettes SHALL keep a text contrast of at least 4.5:1 on their space color and active pill. | auto: `palettes keep readable text` |
| AC-12 | WHEN Tore installs VivArcDi and opens a workspace without a color, THE tab bar SHALL show the coral-to-aqua gradient. | manual |
| AC-13 | WHILE Tore has four or more Favorites, THE grid SHALL show three tiles per row. | manual |

## Out of scope

- The two-line address field (domain above, page title below): it needs a module of its own; a separate
  spec if Tore wants it.
- Hiding Vivaldi's panel bar (Tore, 2026-11-08: leave it for now).
- The color picker and the page frame color: [019](../019-space-theme-color/spec.md).
- Auto-hide of the tab bar: [021](../021-auto-hide-tab-bar/spec.md).
- New behavior of Clear, Tidy or New Tab: [004](../004-today-tabs-and-keyboard/spec.md).

## Open questions

- [x] The dashed "Drag a tab here to pin it" box is not a pinned tab and goes away; the four tiles are the
      Favorites, at most three per row (Tore, 2026-11-08).
- [x] Vivaldi's own group of pinned tabs (`span.pinned-group`) must never show (Tore, 2026-11-08): every
      pinned tab that no Favorite stands for becomes a tile under the Favorites.
- [x] Panel bar: leave it for now (Tore, 2026-11-08).
- [x] Two-line address field: out of this spec.
- [x] Without a workspace color: Arc's light blue by default, with six close palettes (Tore, 2026-11-08).
- [x] Drag slot: whether Vivaldi 8.2 lets the dragged tab's place be styled is a risk for `design.md`,
      checked with a probe; if it cannot, Vivaldi's own indicator stays.

## References

- Comparison canvas: https://claude.ai/artifact/FkpMegMtUyB2MXpFy97vPg
- Project files: `design-sidebar/` (frames and screenshot), `video-arc/gap-list-arc-consolidata.md`.
- Specs [001](../001-favorites-grid/spec.md), [004](../004-today-tabs-and-keyboard/spec.md),
  [011](../011-space-header/spec.md), [013](../013-incognito-mode/spec.md), [019](../019-space-theme-color/spec.md).
