# 073 Today titles styled like the folder rows

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |
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

- [ ] Should the Today title take the regular weight of a link (400) or keep a slightly heavier one
  for the active tab? This draft uses the regular weight for all.

- [ ] The cause is not verified yet. `display: block !important` on the title (`sidebar-look.scss`)
  is a suspect but a flex item is blockified anyway, so Vivaldi's own margin, padding or line-height
  on `.title` and `.favicon` is likelier. A probe of the computed styles on a lab Vivaldi (needs
  Tore's agreement to run `npm run live`) settles it before the design.

## References

- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md), [067 Clear line and centered titles](../067-clear-line-and-titles/spec.md)
