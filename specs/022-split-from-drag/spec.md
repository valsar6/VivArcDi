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
- **FR-2.** A drop on the page edge creates a stack of the dragged tab and the active one and tiles it, as the menu item "Tile" does on a stack (Vivaldi tiles in two steps today, see the open questions).
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

- [x] How does Vivaldi tile today? Probe and recording on Vivaldi 8.2 macOS (Tore, 2026-11-09): in two
  steps. (1) Dragging a tab onto another creates a stack and opens the "Edit stack" popup (name and nine colors).
  (2) A right click on the stack and the menu item "Tile" splits the page into two pages, each with its own
  title bar (`div.tiled.visible`). There is no drag to the edge of the page as in Arc, which is why it was hard
  to get. The drag uses mouse events, not HTML5 drag (78 `mousedown` and `mouseup` pairs). APIs found:
  `chrome.tabs.group`, `ungroup`, `SPLIT_VIEW_ID_NONE`, `vivaldi.tabsPrivate.getGroupExtId`,
  `setGroupProperties` and `unstack`; no setting key mentions tile, stack or split.
- [ ] How does code trigger "Tile" on a stack: an internal command or a field in the stack's `vivExtData`? A probe
  must read the `vivExtData` of the tabs before and after "Tile". Without it, FR-2 cannot be designed.
- [ ] Where is a pinned split shown: with the Favorites row or with pinned tabs?

## References

- Arc 101 student video 08:14-09:30; Project files: `video-arc/gap-list-arc-consolidata.md` (G3).
