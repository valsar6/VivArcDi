# 022 Split from a dragged tab

| | |
|---|---|
| Status | Draft |
| Phase | 2 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Five of the videos show Arc's split view: the user drags a tab onto another tab, or onto the edge of the page, and the two pages sit side by side; a divider sets their widths; up to four or five panes work; the combination can be pinned and given a name and an icon (Arc 101 student video 08:14-09:30; the Vivaldi user's review at 01:02). Vivaldi has tab tiling already, so the work is the gesture and the saved combination.

## User stories

- **US-1.** As a user, I want to drag a tab onto the page to see both side by side, so that I do not open a window.
- **US-2.** As a user, I want to keep a pair of pages as one pinned entry with a name and icon, so that I can reopen the pair.

## Expected behavior

The user drags a tab from the list onto the left or right edge of the page. A drop zone shows which side, and on release Vivaldi tiles the two tabs. Dragging onto the top or bottom edge stacks them. The pair appears in the tab list as one row. A menu item "Pin split" moves it to the pinned area, where it can be renamed and given an icon like any pinned tab (027); clicking it reopens both pages tiled.

## Requirements

### Functional

- **FR-1.** Edge drop zones on the page area while a tab is dragged.
- **FR-2.** A drop tiles the dragged tab with the active one through Vivaldi's tile command.
- **FR-3.** A tiled pair is one row in the list; "Pin split" stores both URLs and the layout.
- **FR-4.** A pinned split reopens both pages and the layout.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a tab is dropped on the left or right edge of the page, THE two tabs SHALL be tiled side by side. | manual |
| AC-2 | WHEN a tab is dropped on the top or bottom edge, THE two tabs SHALL be tiled stacked. | manual |
| AC-3 | WHEN the user pins a split, THE module SHALL store both URLs and the layout. | auto: `stores a split with its layout` |
| AC-4 | WHEN the user clicks a pinned split, THE module SHALL reopen both pages tiled. | manual |

## Out of scope

- More than four panes.
- Split of the same tab twice.

## Open questions

- [ ] Which Vivaldi command or API tiles two given tabs from a mod? Probe requested.
- [ ] Where is a pinned split shown: with the Favorites row or with pinned tabs?

## References

- Arc 101 student video 08:14-09:30; Project files: `video-arc/gap-list-arc-consolidata.md` (G3).
