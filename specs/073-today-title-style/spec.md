# 073 Today titles styled like the folder rows

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-27 (PR #314) |
| Amends | [028](../028-arc-sidebar-look/spec.md): the title of the row of a Today tab (font size, weight and color). |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Tore noticed on 2026-11-27 that the title of a Today tab looks different from the title of a link or
folder in the Favorites area under the pinned tiles. This spec makes the two look the same. It is a
visual change only: no behavior, markup or selector changes. Tore also showed on 2026-11-27 that a
Today title is not aligned like a link title: it sits about 4 px above the center of its icon and
about 3 px closer to the icon (screenshot compared "Amazon Luna" in a folder with "Rame Membership"
in Today). So the spec covers the alignment of the title next to its icon too.

What the code does today:

- A folder or link row (`span.vivarcdi-folders-title`, `src/styles/folders.scss`) is 13 px, in the
  regular weight and in the color of the sidebar text (`--colorFg`); folders alone are bold (600).
- A Today row title (`span.title` of `div.tab-header`, `src/styles/sidebar-look.scss`) is
  `$row-font-size` (14 px), `$row-font-weight` (500) and `--vivarcdi-ink`.

## User stories

- **US-1.** As a user, I want a Today tab title to look like a link title of the Favorites area, so
  that the sidebar reads as one list.

## Expected behavior

The title of a Today tab uses the same font size, weight and color as the title of a link row of the
Favorites area. Ellipsis on overflow, centering, the room kept for the minus badge on hover and the
height of the row stay as 028, 062 and 067 define them. Folder titles keep their bold weight and
pinned or tile titles are not touched.

## Requirements

### Functional

- **FR-1.** THE title of a Today row SHALL have the font size, the font weight and the color of the
  title of a link row of the Favorites area.
- **FR-2.** THE title of a Today row SHALL be centered vertically on its icon and start at the same
  distance from the icon as the title of a link row of the Favorites area.
- **FR-3.** THE change SHALL NOT alter the markup, the height or the behavior of any row.

### Non-functional

- **NFR-1.** The values come from one set of tokens shared by both title styles (DRY), not from two
  copies of the same numbers.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE title of a Today row SHALL have the same computed font size, font weight and color as the title of a link row of the Favorites area. | live: `today title matches link title` |
| AC-2 | THE vertical center of a Today title SHALL be within 1 px of the center of its icon, and the distance from icon to title SHALL equal that of a link row. | live: `today title aligns with its icon` |
| AC-5 | THE title of a Today row SHALL stay ellipsized on overflow and keep the hover room of the minus badge. | live: `today title keeps layout` |
| AC-3 | THE two title styles SHALL read their font size, weight and color from the same tokens. | auto: `title style tokens are shared` |
| AC-4 | THE Today list SHALL look like the link rows of the Favorites area in the title. | manual |

## Out of scope

- Row height, the icon itself, hover and active-pill colors, and the titles of pinned tabs and tiles.
- Any change of behavior of Today, Clear or the Favorites area.

## Open questions

- [x] Weight of the Today title: Tore decided on 2026-11-27 that all Today titles, the active one
  included, take the regular weight (400) of a link row.

- [x] Cause of the misalignment, probed on a lab Vivaldi (2026-11-27): the Today `.title` is a
  30 px tall block (`height: 30px`, `line-height: normal`, `padding-inline-start: 4px`) next to an
  18 px favicon. The box is centered, but the text sits at the top of the box, so it looks higher
  than the icon, and the gap from icon to text is 4 px, where a link row uses `$gap` (8 px). The
  `display: block` is not the cause, the height of the box and the 4 px padding are.

## References

- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md), [067 Clear line and centered titles](../067-clear-line-and-titles/spec.md)
