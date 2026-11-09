# 020 Drag a tab into the Favorites

| | |
|---|---|
| Status | Draft |
| Phase | 1 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc the user adds a Favorite by dragging a tab from the tab list into the Favorites row at the top (Quick Tour 2:24; the Arc 101 student video 01:27). VivArcDi today manages Favorites only from the Bookmarks panel; [001](../001-favorites-grid/spec.md) and [003](../003-pinned-tabs-and-folders/spec.md) leave the drag out of scope. This spec adds it.

## User stories

- **US-1.** As a user, I want to drag a tab onto the Favorites grid, so that the page becomes a Favorite without opening the Bookmarks panel.
- **US-2.** As a user, I want to drop it between two tiles, so that I choose its position.

## Expected behavior

The user takes a tab from the tab list or a pinned row and releases it over the Favorites grid. A new tile appears at the drop position with the page's icon, and the tab stays open. Releasing it on an existing tile leaves the grid unchanged. Dragging a tile out of the grid and releasing it over the tab list removes the Favorite and keeps the page open as a Today tab. Tiles can be reordered by dragging, which 001 AC-14 already expects.

## Requirements

### Functional

- **FR-1.** The grid accepts a dragged tab as a drop target and shows an insertion mark between tiles.
- **FR-2.** A drop adds a Favorite bookmark in the Favorites folder at the drop position, with the tab's title, URL and icon.
- **FR-3.** A drop of a page already in the Favorites moves no tile and shows no duplicate.
- **FR-4.** Dragging a tile out of the grid onto the tab list removes the bookmark only.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a tab is released over the grid, THE module SHALL add a tile at the drop position. | manual |
| AC-2 | WHEN the page is already a Favorite, THE module SHALL add no second tile. | auto: `ignores a page that is already a favorite` |
| AC-3 | WHEN a tile is released over the tab list, THE bookmark SHALL be removed and the page SHALL stay open. | manual |
| AC-4 | THE new Favorite SHALL keep the tab's title and URL. | auto: `creates a favorite from a tab` |

## Out of scope

- Reordering tiles: 001 AC-14.
- Favorites shared by all workspaces: already so in 003.

## Open questions

- [x] Does Vivaldi's tab drag expose the dragged tab to a mod? Partly. Probe on Vivaldi 8.2 macOS (Tore, 2026-11-09):
  dragging a tab of the list produces no HTML5 drag event (`dragstart`, `dragover`, `drop` stay at zero), but `mousemove`
  events with the button down reach the Vivaldi window for the whole path, `document.elementFromPoint` returns the mod's
  elements under the pointer (the tiles inside the Favorites grid included), and the final `mouseup` has the Favorites
  tile as target. The drop on the grid is therefore detected by a hit test on the pointer, the way 012 does it; the tiles
  and the grid do not yet carry the drop mark. The dragged tab is the one under the first `mousedown`.
- [ ] What does Vivaldi itself do when a tab is released on the Favorites grid (pin it, move it, nothing), and does the
  module have to stop that? Probe requested from Tore.
- [ ] Vivaldi stores Favorites as bookmarks; confirm which folder 001 uses before the design.

## References

- Quick Tour 2:24; Project files: `video-arc/gap-list-arc-consolidata.md` (G8).
- Specs 001 AC-14, 003, 018.
