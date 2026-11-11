# 031 Pin and tile commands, and the look of a dragged tab

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Tore checked 0.36.3 on 2026-11-11: dragging works, but nothing shows which tab is being dragged, and a
tab can only change place by dragging. In Arc the dragged row lifts off the list and follows the
pointer, and the right-click menu has **Remove Pin** on a pinned row and **Remove Favorite** on a tile
(Tore's recordings `Registrazione schermo 2026-11-11 alle 09.52.37.mov` and `09.54.45.mov`). This spec
adds the look of a dragged tab and four menu commands that do by click what the drags of
[012](../012-editable-folders/spec.md) and [020](../020-drag-tab-to-favorites/spec.md) do: **Pin tab**,
**Remove pin**, **Tile tab** and **Untile tab**.

## User stories

- **US-1.** As a user, I want to see the tab I am dragging follow the pointer, so that I know what I
  am moving and where it will land.
- **US-2.** As a user, I want to pin a tab of today to my workspace from its menu, and to take it back
  with **Remove pin**, without dragging.
- **US-3.** As a user, I want to make a tab a tile shared by every workspace from its menu, and to take
  it back with **Untile tab**.

## Expected behavior

**While a tab is dragged.** Seen in Arc: the row under the pointer lifts as a white pill with a soft
shadow, its icon and title, and follows the pointer; its place in the list stays as a faded slot, and
a line marks where it will land. In VivArcDi the same happens for a tab of today, a link row of the
workspace and a tile, over the tab bar: a pill with the page's icon and title follows the pointer, the
row or tile it came from is faded, and the line of 012 or the gap of 020 shows the landing place.
Outside the tab bar the pill goes away and Vivaldi's own drag image, if any, is left as it is.

**The four commands.** They sit in the right-click menu of the row or tile, under the words Tore used:

| On | Command | What happens |
|---|---|---|
| a tab of today | **Pin tab** | The tab becomes a link at the end of the workspace favorites, as Cmd/Ctrl+D does (012). |
| a tab of today | **Tile tab** | The tab becomes a tile at the end of the Favorites grid, the same in every workspace, as a drop on the grid does (020). |
| a link row | **Remove pin** | The opposite of Pin tab: the link leaves the workspace favorites and its page goes back to today's tabs, at the top. |
| a link row | **Tile tab** | The link becomes a tile at the end of the grid and leaves the workspace favorites. |
| a tile | **Untile tab** | The opposite of Tile tab: the tile leaves the grid in every workspace and its page goes back to today's tabs, at the top. |
| a tile | **Pin tab** | The tile becomes a link at the end of the workspace favorites and leaves the grid. |

Remove pin and Untile tab keep the bookmark rule of 012: a bookmark that VivArcDi did not create stays,
and a toast says so. A link row that has no open tab, taken out with Remove pin, opens its page as a tab
of today, so the page is never lost. In Arc, Remove Pin and Remove Favorite close the page; VivArcDi
keeps it open, because Tore asked for the exact opposite of Pin tab and Tile tab (open question 1).

The menu of a link row and of a tile is VivArcDi's own, since those rows are VivArcDi's elements; it is
the menu where [027](../027-rename-pinned-tabs/spec.md) will add Rename and Change icon. The menu of a
tab of today is Vivaldi's own: the two commands are added to it, and Vivaldi's items stay as they are.

## Requirements

### Functional

- **FR-1.** While a tab of today, a link row or a tile is dragged over the tab bar, a pill with its icon
  and title follows the pointer and its row or tile is faded; the pill goes away when the drag ends or
  leaves the tab bar.
- **FR-2.** Vivaldi's menu of a tab of today gains **Pin tab** and **Tile tab**, for web pages that are
  not yet a link or a Favorite.
- **FR-3.** A right click on a link row opens VivArcDi's menu with **Remove pin** and **Tile tab**.
- **FR-4.** A right click on a tile opens VivArcDi's menu with **Untile tab** and **Pin tab**.
- **FR-5.** Pin tab adds the page at the end of the workspace favorites (012 FR-12); Tile tab at the end
  of the Favorites grid (020 FR-2); from a link or a tile, the page leaves where it was, as the drags of
  012 FR-16 and 020 FR-4/FR-5 do.
- **FR-6.** Remove pin and Untile tab put the page at the top of today's tabs, opening it if it has no
  tab, and remove the bookmark under the rule of 012 FR-12.
- **FR-7.** VivArcDi's menu closes on Escape, on a click elsewhere and after a command, and stays
  inside the window.

### Non-functional

- **NFR-1.** The pill and the menus are outside the window drag region (issue #30) and never block
  Vivaldi's own drag of tabs inside its list.
- **NFR-2.** IF Vivaldi's menu of a tab cannot be extended on a Vivaldi version, THEN Pin tab and Tile
  tab stay available through Cmd/Ctrl+D and the drags, and the reason is logged.
- **NFR-3.** Works on Vivaldi 8.1 and 8.2, on macOS and Debian; texts in English, as the rest of the
  interface of VivArcDi.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHILE a link row or a tile is dragged, THE module SHALL show a pill with its title and fade the source. | auto: `shows a drag pill for a dragged row` |
| AC-2 | WHEN the drag ends, THE pill SHALL go away and the source SHALL be restored. | auto: `removes the drag pill when the drag ends` |
| AC-3 | WHEN Pin tab is chosen on a tab of today, THE tab SHALL become a link at the end of the workspace favorites. | auto: `pins a tab of today from the menu` |
| AC-4 | WHEN Tile tab is chosen on a tab of today, THE tab SHALL become a tile at the end of the grid. | auto: `tiles a tab of today from the menu` |
| AC-5 | WHEN Remove pin is chosen on a link row, THE page SHALL become the first tab of today and THE link SHALL leave the area. | auto: `removes the pin of a link from the menu` |
| AC-6 | WHEN Untile tab is chosen on a tile, THE page SHALL become the first tab of today and THE tile SHALL leave the grid in every workspace. | auto: `untiles a favorite from the menu` |
| AC-7 | WHEN Tile tab is chosen on a link row or Pin tab on a tile, THE page SHALL move to the grid or to the workspace favorites and leave where it was. | auto: `moves a page between the grid and the workspace favorites from the menu` |
| AC-8 | WHEN Remove pin is chosen on a link that existed before, THE bookmark SHALL stay and a toast SHALL say so. | auto: `keeps a bookmark that existed before on remove pin` |
| AC-9 | WHEN Escape is pressed or the user clicks elsewhere, THE menu SHALL close without a command. | auto: `closes the menu without a command` |
| AC-10 | WHEN Tore drags a tab of today, a link row and a tile, THE pill SHALL follow the pointer and show what he is moving. | manual |
| AC-11 | WHEN Tore right-clicks a tab of today, THE menu SHALL show Pin tab and Tile tab next to Vivaldi's items, and both SHALL work. | manual |
| AC-12 | WHEN Tore uses Remove pin, Tile tab, Untile tab and Pin tab on rows and tiles, THE page SHALL move as in the table and never be lost. | manual |

## Out of scope

- Rename and Change icon in the same menus: [027](../027-rename-pinned-tabs/spec.md).
- The other items of Arc's menu (Copy Link, Share, Split View, Duplicate, Move to, Archive).
- Changing Vivaldi's own drag image inside its tab list.
- Keyboard shortcuts for Tile tab and Untile tab.

## Open questions

- [ ] **1. Remove pin and Untile tab: keep the page or close it?** Arc closes the page (both
  recordings). Proposed: keep it as the first tab of today, the exact opposite of Pin tab and Tile tab
  and the "never lost" rule of 012 and 020.
- [ ] **2. Can Vivaldi's tab menu be extended?** Vivaldi 8 builds its menus in the interface and shows
  them as native menus; the design needs a read-only probe before choosing how to add the two items
  (NFR-2 is the fallback).

## References

- Tore's recordings of Arc, 2026-11-11 09.52.37 (Remove Pin, drag into the pinned rows) and 09.54.45
  (Remove Favorite, drag into the grid).
- Specs 012 (FR-12, FR-16), 020 (FR-2, FR-4, FR-5), 027.
