# 073 Today titles aligned like the folder rows

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-27 (PR #314); amendment approved 2026-11-27 |
| Implemented | 2026-11-27 |
| Amends | [028](../028-arc-sidebar-look/spec.md): the title of the row of a Today tab (its position next to the icon). |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Tore noticed on 2026-11-27 that the title of a Today tab looks different from the title of a link or
folder in the Favorites area under the pinned tiles. This spec makes the two look the same. It is a
visual change only: no behavior, markup or selector changes. Tore also showed on 2026-11-27 that a
Today title is not aligned like a link title: it sits about 4 px above the center of its icon and
about 3 px closer to the icon (screenshot compared "Amazon Luna" in a folder with "Rame Membership"
in Today).

What the code does today:

- In the Arc look, `sidebar-look.scss` gives the Favorites list and the Today titles the same font
  size (`$row-font-size`, 14 px), weight (`$row-font-weight`, 500) and color (`--vivarcdi-ink`). The
  13 px, regular weight and `--colorFg` of `folders.scss` are the base style, which the Arc look
  overrides. The first draft of this spec took the base style for the look; the probe of
  2026-11-27 showed that it is not, so font size, weight and color already match and are only
  guarded.
- A Today row title (`span.title` of `div.tab-header`) is a block with `height: 30px`,
  `line-height: normal`, `padding-inline-start: 4px`, next to a favicon of 18 px (16 px image and
  1 px padding): the text sits at the top of the tall box and starts 4 px from the icon, where a
  link row has `$gap` (8 px).

## User stories

- **US-1.** As a user, I want a Today tab title to look like a link title of the Favorites area, so
  that the sidebar reads as one list.

## Expected behavior

The title of a Today tab has the same font size, weight and color as the title of a link row of the
Favorites area, is centered vertically on its icon, and starts as far from the icon as a link title
does. Ellipsis on overflow, the room kept for the minus badge on hover and the height of the row stay
as 028, 062 and 067 define them. Folder titles, pinned and tile titles are not touched.

## Requirements

### Functional

- **FR-1.** THE title of a Today row SHALL have the font size, the font weight and the color of the
  title of a link row of the Favorites area.
- **FR-2.** THE title of a Today row SHALL be centered vertically on its icon and start at the same
  distance from the icon as the title of a link row of the Favorites area.
- **FR-3.** THE change SHALL NOT alter the markup, the height or the behavior of any row.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE title of a Today row SHALL have the same computed font size, font weight and color as the title of a link row of the Favorites area. | live: `today title matches link title` |
| AC-2 | THE vertical center of a Today title SHALL be within 1 px of the center of its icon, and the distance from icon to title SHALL equal that of a link row. | live: `today title aligns with its icon` |
| AC-5 | THE title of a Today row SHALL stay ellipsized on overflow and keep the hover room of the minus badge. | live: `today title keeps layout` |
| AC-4 | THE Today list SHALL look like the link rows of the Favorites area in the title. | manual |

## Out of scope

- Row height, the icon itself, hover and active-pill colors, and the titles of pinned tabs and tiles.
- Any change of behavior of Today, Clear or the Favorites area.

## Open questions

- [x] Weight of the Today title: Tore decided on 2026-11-27 on the regular weight of a link row for
  all Today titles, the active one included. The probe then showed that in the Arc look the link
  weight is already the one of the Today title (500), so nothing changes: Tore approved the
  amendment on 2026-11-27 that drops the shared tokens and keeps the guard of AC-1.

- [x] Cause of the misalignment, probed on a lab Vivaldi (2026-11-27): the Today `.title` is a
  30 px tall block (`height: 30px`, `line-height: normal`, `padding-inline-start: 4px`) next to an
  18 px favicon. The box is centered, but the text sits at the top of the box, so it looks higher
  than the icon, and the gap from icon to text is 4 px, where a link row uses `$gap` (8 px). The
  `display: block` is not the cause, the height of the box and the 4 px padding are.

## References

- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md), [067 Clear line and centered titles](../067-clear-line-and-titles/spec.md)
