# 020 Drag a tab into the Favorites

| | |
|---|---|
| Status | Draft (no open questions, awaiting Tore's approval) |
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

The user takes a tab from the tab list or a pinned row and releases it over the Favorites grid. While the tab is over the grid, the tiles move apart to leave a gap where it will land. A new tile appears at the drop position with the page's icon, the same in every workspace, and the tab stays open as the tab of that Favorite. Releasing it on an existing tile leaves the grid unchanged. Tiles can be reordered by dragging, which 001 AC-14 already expects.

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

## Out of scope

- Reordering tiles: 001 AC-14.
- Favorites shared by all workspaces: already so in 003.

## Open questions

- [x] Does Vivaldi's tab drag expose the dragged tab to a mod? Yes (probe of 2026-11-09): a tab dragged out of the list onto the grid fires an HTML5 `drop` on VivArcDi's tile with the types `vivaldi/x-tab-entries` and `text/uri-list`; today VivArcDi ignores it, so nothing happens. The tile seen in the 0.29.0 recording came from Vivaldi's own reordering: a tab moved among the pinned positions is pinned by Vivaldi in the current workspace only, which is why it was not shared and could get lost.
- [x] Vivaldi stores Favorites as bookmarks; the folder is the `Favorites` folder of 003 (option `folder`).
- [x] Dragging into the grid is how a tab becomes a tile, and the grid is shared by every workspace (Tore, 2026-11-09).
- [x] Dragging a tile out: below the line a Today tab, onto the folders a link (Tore, 2026-11-09).

## References

- Quick Tour 2:24; Project files: `video-arc/gap-list-arc-consolidata.md` (G8).
- Specs 001 AC-14, 003, 018.
