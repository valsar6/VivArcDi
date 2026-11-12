# 020 Drag a tab into the Favorites

| | |
|---|---|
| Status | Approved |
| Phase | 1 |
| Owner | Tore |
| Approved | Tore, 2026-11-09 (PR #119) |
| Revision | Approved, 2026-11-12 (PR #154): reordering tiles by drag (US-3, FR-8, FR-9, AC-9 to AC-12) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc the user adds a Favorite by dragging a tab from the tab list into the Favorites row at the top (Quick Tour 2:24; the Arc 101 student video 01:27). VivArcDi today manages Favorites only from the Bookmarks panel; [001](../001-favorites-grid/spec.md) and [003](../003-pinned-tabs-and-folders/spec.md) leave the drag out of scope. This spec adds it.

## User stories

- **US-1.** As a user, I want to drag a tab onto the Favorites grid, so that the page becomes a Favorite without opening the Bookmarks panel.
- **US-2.** As a user, I want to drop it between two tiles, so that I choose its position.
- **US-3.** As a user, I want to drag a tile to another place of the grid, so that I put my Favorites in the order I like.

## Expected behavior

The user takes a tab from the tab list or a pinned row and releases it over the Favorites grid. While the tab is over the grid, the tiles move apart to leave a gap where it will land. A new tile appears at the drop position with the page's icon, the same in every workspace, and the tab stays open as the tab of that Favorite. Releasing it on an existing tile leaves the grid unchanged.

**Reordering (revision of 2026-11-12).** Seen in Arc (Tore's recording `Registrazione schermo 2026-11-12 alle 12.30.02.mov`): the user takes a tile and moves it inside the grid. The tile follows the pointer, its old place closes, and the other tiles move apart to leave a gap where it will land, row by row as the grid of 001 lays them out (1, 2, 3, 2+2, 3+2 …). Released there, the tile takes that place, in every workspace, and the page and its tab stay as they were. Released where it started, nothing changes.

Dragging a tile out of the grid removes the Favorite and keeps the page open, as in Arc. Where the tile lands decides what the page becomes:

- below the separator line: a Today tab, at the drop position;
- onto a folder, between the rows of the folders or onto the space header: a link of the workspace, as a tab dropped there in [012](../012-editable-folders/spec.md).

The page is never lost: it always ends in the Favorites, the folders or today's tabs (Tore, 2026-11-09, after the 0.29.0 recording where a tile dragged onto the folders vanished with its tab).

## Requirements

### Functional

- **FR-1.** The grid accepts a dragged tab as a drop target and shows an insertion mark between tiles.
- **FR-2.** A drop adds a Favorite bookmark in the Favorites folder at the drop position, with the tab's title, URL and icon.
- **FR-3.** A drop of a page already in the Favorites moves no tile and shows no duplicate.
- **FR-4.** Dragging a tile out of the grid onto the tab list removes the Favorite bookmark and leaves the page open as a Today tab at the drop position.
- **FR-5.** Dragging a tile onto a folder, between folder rows or onto the space header removes the Favorite bookmark and adds the page as a link of the workspace there, as 012 does for a dropped tab.
- **FR-6.** While a tab is dragged over the grid, the tiles leave a gap at the drop position.
- **FR-7.** A Favorite added by drag is shared by every workspace, like every Favorite of 003.
- **FR-8.** While a tile is dragged over the grid, its own place is left out and the other tiles leave a gap at the drop position, as in FR-6.
- **FR-9.** A tile released over the grid moves its Favorite bookmark to the drop position inside the Favorites folder; its tabs, its link and its page are unchanged. Released at its own place, nothing is written.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a tab is released over the grid, THE module SHALL add a tile at the drop position. | manual |
| AC-2 | WHEN the page is already a Favorite, THE module SHALL add no second tile. | auto: `ignores a page that is already a favorite` |
| AC-3 | WHEN a tile is released over the tab list, THE bookmark SHALL be removed and the page SHALL stay open. | manual |
| AC-4 | THE new Favorite SHALL keep the tab's title and URL. | auto: `creates a favorite from a tab` |
| AC-5 | WHEN a tile is released onto a folder, THE bookmark SHALL be removed and the page SHALL become a link of that folder. | auto: `moves a dropped tile into a folder` |
| AC-6 | WHEN a tile is released anywhere out of the grid, THE page SHALL stay in the tab bar as a tile, a link or a Today tab. | auto: `never loses the page of a dragged tile` |
| AC-7 | WHEN Tore drags a Today tab into the grid and switches workspace, THE new tile SHALL show in the other workspace too. | manual |
| AC-8 | WHEN Tore drags a tile below the separator, THE page SHALL show as a Today tab and the tile SHALL be gone in every workspace. | manual |
| AC-9 | WHEN a tile is released before another tile of the grid, THE Favorite SHALL move before it in the Favorites folder. | auto: `moves a dropped tile before another tile` |
| AC-10 | WHEN a tile is released at the end of the grid, THE Favorite SHALL move to the end of the folder. | auto: `moves a dropped tile to the end of the grid` |
| AC-11 | WHEN a tile is released at its own place, THE module SHALL write nothing. | auto: `leaves a tile released at its own place` |
| AC-12 | WHEN Tore drags a tile to another place of the grid, THE tiles SHALL open a gap there, and on release the tile SHALL stay there in every workspace and after a restart. | manual |

## Out of scope

- Favorites shared by all workspaces: already so in 003.

## Open questions

- [x] Does Vivaldi's tab drag expose the dragged tab to a mod? Partly. Probe on Vivaldi 8.2 macOS (Tore, 2026-11-09):
  dragging a tab of the list produces no HTML5 drag event (`dragstart`, `dragover`, `drop` stay at zero), but `mousemove`
  events with the button down reach the Vivaldi window for the whole path, `document.elementFromPoint` returns the mod's
  elements under the pointer (the tiles inside the Favorites grid included), and the final `mouseup` has the Favorites
  tile as target. The drop on the grid is therefore detected by a hit test on the pointer, the way 012 does it; the tiles
  and the grid do not yet carry the drop mark. The dragged tab is the one under the first `mousedown`.
  A second probe of the same day (`pinned-regression/diagnostica-trascina-riquadro.md`) also saw, once, an HTML5 `drop` on
  a VivArcDi tile with the types `vivaldi/x-tab-entries` and `text/uri-list`; the design treats it as a second way in and
  relies on the hit test.
- [x] What does Vivaldi itself do when a tab is released on the Favorites grid? Nothing (probe, Tore, 2026-11-09): the
  tab was released over the area and stayed as it was, so the module does not have to stop a native action. The tile seen
  in the 0.29.0 recording came from Vivaldi's own reordering: a tab moved among the pinned positions of the list is pinned
  by Vivaldi in the current workspace only, so it was not shared and could get lost.
- [x] Vivaldi stores Favorites as bookmarks; the folder is the `Favorites` folder of 003 (option `folder`).
- [x] Dragging into the grid is how a tab becomes a tile, and the grid is shared by every workspace (Tore, 2026-11-09).
- [x] Dragging a tile out: below the line a Today tab, onto the folders a link (Tore, 2026-11-09).
- [x] Reordering tiles inside the grid, as in Arc (Tore, 2026-11-12, recording 12.30.02). It replaces 001 AC-14, which was about Vivaldi's own pinned tabs before the tiles came from the Favorites folder.

## References

- Quick Tour 2:24; Project files: `video-arc/gap-list-arc-consolidata.md` (G8).
- Specs 001 AC-14, 003, 018.
