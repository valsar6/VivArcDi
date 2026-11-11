# 032 Compact tab bar

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Vivaldi's setting "Expand Tab Bar on hover" (Settings > Tabs > Tab Bar, Italian "Espandi la Barra delle
schede al passaggio del mouse") keeps the vertical tab bar at its minimum width and widens it while the
pointer is over it. At that width the rows that VivArcDi adds are cut: the space header shows nothing,
"New Tab" and "Archive" are clipped to a few letters. This spec gives three of them a compact form that
fits the narrow bar, so the bar stays readable like a column of icons.

## User stories

- **US-1.** As a user who keeps the tab bar narrow, I want to see which space I am in and to collapse
  or expand it with one click, without widening the bar.
- **US-2.** As that user, I want to open a new tab and the archive from the narrow bar, through icons
  that are not cut.

## Expected behavior

Seen in Tore's recording `registrazione-2026-11-11-13.59.16.mov` (Vivaldi 8.2 on macOS, VivArcDi 0.40.2):
with the setting on, the narrow bar shows the folder icons, the favicons of the tabs and a "+", but the
space header row is empty and the footer reads "Arch". When the pointer is over the bar it widens and
every row looks as usual; when the pointer leaves it shrinks again.

While the tab bar is at its minimum width:

1. **Space header.** The row becomes a single centered button: the current space icon (emoji or letter,
   as in [011](../011-space-header/spec.md)) with a small chevron beside it. The chevron points up while
   the space is expanded and down while it is collapsed. A click collapses or expands the space, as a
   click on the full header does. The name and the "New folder" `+` are hidden; the tooltip still shows
   the space name.
2. **New Tab.** The row shows only a centered `+`, with the same tooltip "New Tab" and the same action.
3. **Archive.** The footer shows a centered archive icon instead of the word "Archive": an open box with
   two sheets of paper sticking out, drawn in line style like Tore's example image. The tooltip stays
   "Archive (Cmd/Ctrl+Shift+A)" and a click opens the archive as today.

When the bar widens on hover, the three rows go back to their full form at once, and they shrink again
when it narrows. With the setting off, nothing changes.

The icon is drawn by VivArcDi as a line glyph in the same style as its other icons; the example image
is a reference for the shape only and is not copied.

## Requirements

### Functional

- **FR-1.** VivArcDi detects that the tab bar is at its minimum width, whatever setting or drag caused it,
  and marks the compact state so that the stylesheet can switch the three rows.
- **FR-2.** In the compact state the space header shows the space icon and a chevron, centered; up when
  the space is expanded, down when it is collapsed; the name and the `+` are hidden.
- **FR-3.** In the compact state the New Tab row shows only the `+` glyph, centered.
- **FR-4.** In the compact state the archive footer shows the archive glyph, centered, instead of its label.
- **FR-5.** Tooltips, accessible names (`aria-label`, `aria-expanded`) and click actions are the same in
  both states.
- **FR-6.** The compact state follows the width live, also after a sidebar layout change, which makes
  Vivaldi build a new tab bar container (see [003](../003-pinned-tabs-and-folders/spec.md) AC-20 and
  AC-21).
- **FR-7.** The chevron and archive glyphs and the compact width threshold live in `_tokens.scss`.

### Non-functional

- **NFR-1.** No extra work while the width does not change: no polling.
- **NFR-2.** Same behavior on macOS and Debian.
- **NFR-3.** With the setting off or the tab bar at a normal width, the tab bar looks exactly as today.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHILE the tab bar is narrower than the compact threshold, THE tab bar SHALL be marked compact. | auto: `marks the tab bar compact below the threshold` |
| AC-2 | WHEN the tab bar becomes wider than the threshold, THE compact mark SHALL be removed. | auto: `removes the compact mark when the tab bar widens` |
| AC-3 | WHEN Vivaldi replaces the tab bar container, THE compact mark SHALL follow the new container. | auto: `follows a replaced tab bar container` |
| AC-4 | WHILE the space is expanded, THE compact header SHALL show the up chevron, and the down chevron while it is collapsed. | auto: `compact header chevron follows the collapsed state` |
| AC-5 | THE stylesheet SHALL define the chevron and archive glyphs and the threshold as tokens. | auto: `compact tab bar uses tokens` |
| AC-6 | WHEN Tore turns on "Expand Tab Bar on hover", THE space header SHALL show the space icon with a chevron, centered. | manual |
| AC-7 | WHEN Tore clicks the compact space header, THE space SHALL collapse or expand and the chevron SHALL turn. | manual |
| AC-8 | WHILE the bar is narrow, THE New Tab row SHALL show only `+`, and a click SHALL open a new tab. | manual |
| AC-9 | WHILE the bar is narrow, THE archive footer SHALL show the archive icon, and a click SHALL open the archive. | manual |
| AC-10 | WHEN the pointer is over the narrow bar and it widens, THE three rows SHALL show their full form. | manual |
| AC-11 | WHEN Tore turns the setting off, THE three rows SHALL look as before. | manual |

## Out of scope

- Compact forms of other rows (folders, tabs, Favorites tiles, Clear): Vivaldi and the current styles
  already reduce them to icons.
- Changing Vivaldi's minimum width or the hover delay.
- The bottom bar with one icon per space of Arc ([028](../028-arc-sidebar-look/spec.md) section 9).

## Open questions

- [ ] Chevron direction: up while the space is expanded (a click will close it), down while it is
      collapsed? Proposed: yes, as described above.
- [ ] How to detect the compact state: by the tab bar width (below a threshold of about 80 px) instead of
      reading Vivaldi's setting, so it works for every way the bar becomes narrow. Proposed: width, with a
      probe on Tore's Vivaldi to read the real minimum width and whether Vivaldi marks the state itself.
- [ ] While the bar is narrow the space header has no "New folder" `+`: folders are created from the
      widened bar. Proposed: yes.

## References

- Tore's request in the project thread, 2026-11-11, with the setting screenshot, the recording and the
  example archive icon.
- Specs [004](../004-today-tabs-and-keyboard/spec.md) (archive), [011](../011-space-header/spec.md),
  [021](../021-auto-hide-tab-bar/spec.md), [028](../028-arc-sidebar-look/spec.md).
- Incident record `docs/incidents/2026-11-11-sidebar-sections-lost.md`.
