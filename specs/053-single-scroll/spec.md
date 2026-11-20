# 053 Single scroll

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | Tore, 2026-11-20 (the proposed answers to Q-1 to Q-5; Q-1 to Q-3 are checked by the probes of task T1 before any code) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc the Favorites stay fixed at the top of the sidebar and everything below them (pinned links,
folders, Today's tabs) scrolls as one list with one scroll bar. In VivArcDi the column has two
scrollers: the folder section scrolls inside itself, up to 60% of the window, and Vivaldi scrolls its
own tab list in whatever room is left. With a large folder open the tab list shrinks to a sliver and
two scroll bars appear. This spec makes the column scroll as one, as [009](../009-bookmark-folders-in-tab-bar/spec.md)
FR-11 asked and its first version postponed.

## User stories

- **US-1.** As a user, I want one scroll bar for everything under the Favorites, so that I move through
  folders and Today's tabs the way I do in Arc.
- **US-2.** As a user, I want a large open folder never to squeeze Today's tabs, so that they stay
  reachable by scrolling the same list.
- **US-3.** As a user, I want the Favorites tiles and the Archive footer to stay in place while the list
  scrolls.
- **US-4.** As a user, I want the active tab to scroll into view and dragging tabs to keep working as in
  Vivaldi.

## Expected behavior

The tab column is one list: the New Tab row, the space header, the folder section and Today's tabs
follow one another and the whole list scrolls together, with the thin scroll bar of
[028](../028-arc-sidebar-look/spec.md) FR-7. The Favorites tiles stay above the scrolling area and the
Archive footer stays below it. A folder that is open and long grows to its full height; it no longer
has a scroll of its own and no longer takes a share of the window.

On a window tall enough for the whole list nothing scrolls and nothing looks different. Arc and
VivArcDi differ in one point only: in Vivaldi the list stays a mix of VivArcDi's sections and
Vivaldi's own tab list, so the join is made with styles and not with a single element.

What a probe on the lab copy (Vivaldi 8.2, 2026-11-20, vertical tab bar) showed, and the design builds
on: the column `#tabs-container` is a flex column with no scroll; VivArcDi's host, the folder section
and the `.resize` that wraps Vivaldi's `.tab-strip` are its children; `.tab-strip` has
`overflow: hidden` and the height of its whole content, and `.resize` has an inline `max-height` equal
to that content and shrinks to the room left. The only scroller in the bar is the folder section.
Vivaldi scrolls its strip from code, not with the browser's own scroll, so how it behaves when
`.resize` stops shrinking is not known yet: see Q-2 and Q-3.

## Requirements

### Functional

- **FR-1.** The column below the Favorites tiles SHALL have one scroller; the folder section and
  Vivaldi's tab strip SHALL have none of their own.
- **FR-2.** The folder section SHALL take the height of its content, with no maximum.
- **FR-3.** Vivaldi's `.resize` that wraps the tab strip SHALL take the full height of its content and
  SHALL NOT shrink for the room left.
- **FR-4.** The Favorites tiles SHALL stay outside the scrolling area, and the Archive footer SHALL
  stay at the bottom of the column.
- **FR-5.** WHEN Vivaldi activates a tab that is out of view, THEN the list SHALL scroll to show it.
- **FR-6.** Dragging, dropping and reordering tabs SHALL keep working, including the scroll of the list
  while the pointer is near its edge.
- **FR-7.** The scroll bar of the column SHALL keep the look of 028 FR-7: 6 px wide, visible only while
  scrolling.
- **FR-8.** The option `maxHeightPercent` of [009](../009-bookmark-folders-in-tab-bar/spec.md) FR-10
  SHALL be removed from `config.json` and from the module's options, since nothing reads it.
- **FR-10.** Vivaldi caps the frame of the tab strip at the room left and the slots are absolutely
  placed, so styles alone cannot grow it: the module SHALL measure how far the tabs overflow the
  strip and give that height to the column as a CSS variable, which the stylesheet reserves under
  the frame (AC-14, AC-15).
- **FR-9.** The corrections of [050](../050-tab-strip-gap/spec.md) SHALL keep working: the strip's
  height is its visible slots, and `.resize` follows it.

### Non-functional

- **NFR-1.** The change is made with styles, plus at most one small observer that reuses `FrameTask`;
  no Vivaldi element is moved, wrapped or removed.
- **NFR-2.** A Vivaldi version whose column does not match the selectors leaves the column as Vivaldi
  draws it, with a warning in the log, and never blocks the window.
- **NFR-3.** Same behavior on macOS and Debian, with the tab bar on the left or on the right.
- **NFR-4.** Selectors go in `src/selectors/<version>.json`, none inline.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHILE the single scroll is on THE folder section SHALL have no maximum height and no scroll of its own | auto: `lets the folder section grow to its content` |
| AC-2 | WHILE the single scroll is on THE tab strip frame SHALL NOT shrink for the room left | auto: `keeps the tab strip frame at the height of its content` |
| AC-3 | WHEN the column is taller than the room it has THE column SHALL scroll as one, with exactly one element that scrolls | live: `one scroller for the whole column` |
| AC-4 | WHEN a folder with many links is open THE tab list below it SHALL be reached by scrolling the same list | live: `a long folder does not squeeze Today's tabs` |
| AC-5 | WHILE the column scrolls THE Favorites tiles and the Archive footer SHALL stay in place | live: `favorites and footer stay fixed while the column scrolls` |
| AC-6 | WHEN a tab that is out of view becomes the active tab THE column SHALL scroll to show it | live: `the active tab scrolls into view` |
| AC-7 | WHEN I drag a Today tab near the edge of the column THE column SHALL scroll and the drop SHALL change the order as in Vivaldi | manual |
| AC-8 | WHEN the whole list fits in the window THE column SHALL NOT scroll and SHALL look as before | live: `no scroll when the list fits` |
| AC-9 | WHEN a link tab is hidden THE gap closed by 050 SHALL stay closed with the single scroll on | live: `no gap above the first Today tab with the single scroll` |
| AC-10 | WHEN the column scrolls THE scroll bar SHALL be thin and show only while scrolling | manual |
| AC-11 | IF the column does not match the selectors THEN THE module SHALL leave it untouched and log a warning | auto: `leaves the column untouched when the selectors do not match` |
| AC-12 | THE folders options SHALL NOT include `maxHeightPercent` | auto: `has no maxHeightPercent option` |
| AC-13 | WHEN the tab bar is on the right THE column SHALL scroll the same way | manual |
| AC-14 | WHILE the single scroll is on THE column SHALL reserve below the tab strip frame the height of the tabs that overflow it, and THE tab strip SHALL NOT scroll | auto: `sets the strip height on the column` |
| AC-15 | WHEN tabs are added, removed, hidden or reordered THE reserved height SHALL follow, and SHALL be removed when the module stops | auto: `updates the strip height when the tabs change` |

## Out of scope

- Changing which tabs or folders are shown, or the look of the rows ([028](../028-arc-sidebar-look/spec.md)).
- Moving the Favorites tiles into the scrolling area; they stay fixed as in Arc.
- Horizontal tab bars. The single scroll applies to the vertical tab bar only.
- Replacing Vivaldi's tab strip, or its absolute layout of slots, with something else.

## Open questions

- [x] **Q-1.** The Favorites tiles are Vivaldi's pinned group, drawn as a grid. Decided: the
  tiles stay where they are, above the scroller. To check on the lab copy with pinned tabs, because the
  probe profile had none.
- [x] **Q-2.** Does Vivaldi keep `.resize` at the content height, or write a smaller `max-height` again
  when the room changes? Decided: a scenario with many tabs answers it before any code (T1); if it
  rewrites the value, a style with `!important` or the observer of 050 overrides it.
- [x] **Q-3.** How does Vivaldi scroll to the active tab and while dragging, now that the strip has
  `overflow: hidden`? Decided: read Vivaldi's bundle as for 050 (T1) and probe a drag; if it
  moves `scrollTop` of the strip, the design forwards that to the column scroller.
- [x] **Q-4.** Which element is the scroller: `#tabs-container` itself, or a new wrapper? Decided: `#tabs-container`, because a wrapper would put a VivArcDi element around Vivaldi's list, which
  [009](../009-bookmark-folders-in-tab-bar/spec.md) rules out.
- [x] **Q-5.** Should the old limit stay as an option for people who prefer two scrolls? Decided: no; one behavior, `maxHeightPercent` is removed (FR-8).

## References

- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md) FR-11, AC-16 and
  `design.md` point 7, the compromise this spec replaces.
- [050 Tab strip gap](../050-tab-strip-gap/spec.md), the strip's height and offsets.
- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md) FR-7, the scroll bar.
- `src/styles/folders.scss`, `src/core/dom/TabBarAnchor.ts`.
