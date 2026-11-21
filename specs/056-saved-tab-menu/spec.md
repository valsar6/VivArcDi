# 056 Menu of a saved tab

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | Tore, 2026-11-21 (pull request #241) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc the right-click menu of a saved tab (a pin of the space) has Copy Link, Duplicate, Move to, Edit
Pinned Page and Open in Split View besides Rename and Change Icon. VivArcDi's link rows
([012](../012-editable-folders/spec.md)) have only Remove pin and Tile tab ([031](../031-pin-and-tile-commands/spec.md)),
and Rename and Change icon of [027](../027-rename-pinned-tabs/spec.md). Tore's recording of 2026-11-21
(`Registrazione schermo 2026-11-21 alle 14.40.03.mov`, 56 s) shows Arc's menu; this spec adds the items
031 left out of scope that VivArcDi can reproduce.

## User stories

- **US-1.** As a user, I want to copy the link of a saved tab from its menu, so that I can paste it elsewhere.
- **US-2.** As a user, I want to duplicate a saved tab, so that I keep one page twice, for instance to rename it differently.
- **US-3.** As a user, I want to move a saved tab to another space, or to a new one, so that I reorganize without the Bookmarks panel.
- **US-4.** As a user, I want to change the address a saved tab opens first, by typing it or by taking the page I am on.
- **US-5.** As a user, I want to open a saved tab beside the page I am viewing in a split view.

## Expected behavior

Seen in Arc. A right click on a saved row opens a menu with, in order and split by separator lines: `Copy
Link`, `Share ▸`; `Change Icon…`, `Rename…`, `Mute`, `Edit Pinned Page ▸`; `Open in Split View`,
`Duplicate`, `Move to ▸`; `Remove Pin`. VivArcDi's menu of a link row keeps this order, with the
items of 031 (Remove pin, Tile tab) and 027 (Rename, Change icon) where they are or will be, and shows
each new item from the release that implements it. `Share` and `Mute` are not reproduced (see Out of scope).

- **Copy Link** copies the saved address of the row, as the copy of 004 does, with its toast.
- **Duplicate** adds a copy of the bookmark with the same name, icon and address right below the row.
  In the recording the copy appears as a second `Rame Hetzner`.
- **Move to ▸** lists the workspaces by name with a check on the current one, then `New Space…`. Choosing
  another workspace moves the bookmark to the end of that workspace's root and moves its open tab there.
  Only the tab the command is run on moves, never others. A toast says `Tab moved! Click to go there.` and a click on it switches
  to that workspace. `New Space…` asks for a name, creates the workspace and moves the tab into it.
- **Edit Pinned Page ▸** has two items. `Replace Pinned URL with Current` takes the address of the open
  tab as the new saved address; it is disabled while the two are the same. `Edit…` opens a small dialog
  titled `Edit Pinned URL`, with the text "This is what opens first when you click this tab or its
  favicon.", the address field already selected, `Cancel` (Esc) and `Save` (Enter); it saves an
  address that is a valid URL and keeps the name and icon.
- **Open in Split View** opens the page of the row beside the tab that is selected, in Vivaldi's tab
  tiling, as the selected tab and the row's page side by side. If the row has no open tab, it opens one.
  Where no tab is selected, the item stays enabled. Seen in Arc (`Registrazione schermo 2026-11-21 alle
  15.10.39.mov`, 12 s): the split appears at once, with the page of the row on the left and an empty
  pane titled `Search or Enter URL…` on the right, and the search palette opens over it; what the user
  picks loads in the empty pane.

## Requirements

### Functional

- **FR-1.** The menu of a link row gains Copy Link, Edit Pinned Page ▸, Open in Split View, Duplicate and Move to ▸, in Arc's order.
- **FR-2.** Copy Link copies the saved URL and shows the toast of 004.
- **FR-3.** Duplicate creates a bookmark with the same title, URL, icon and `vivExtData`, right below the row, closed.
- **FR-4.** Move to ▸ lists the workspaces with the current one checked; choosing one moves the bookmark and its open tab (033 FR-7) and shows the toast; clicking the toast switches to that workspace.
- **FR-5.** `New Space…` in Move to creates a workspace with the name typed and moves the tab into it; an empty name or Esc creates nothing.
- **FR-6.** `Edit…` saves a valid URL into the bookmark; an invalid one keeps the dialog open with the field marked. Name and icon (027) stay.
- **FR-7.** `Replace Pinned URL with Current` sets the bookmark URL to the URL of the open tab and is disabled when equal or when the row has no open tab.
- **FR-8.** Open in Split View tiles the page of the row with the selected tab; if they are already tiled together, or the row is the selected tab, the item is disabled.
- **FR-9.** WHERE no tab is selected, Open in Split View tiles the page of the row (left) with a new empty tab (right) at once and opens the address bar on it; the page the user chooses loads in that tab. IF the user closes the address bar without choosing, THEN the empty tab is closed and the split is undone.

### Non-functional

- **NFR-1.** Every write goes through the services of 041 and 042 and never blocks Vivaldi on failure; a failed write shows a toast.
- **NFR-2.** IF Vivaldi's tiling cannot be driven on a version, THEN `Open in Split View` is not shown and the reason is logged.
- **NFR-3.** Works on Vivaldi 8.1 and 8.2, macOS and Debian; texts in English.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN Copy Link is chosen on a link row, THE module SHALL copy its saved URL and show the toast. | auto: `copies the saved link of a row` |
| AC-2 | WHEN Duplicate is chosen, THE module SHALL add a closed copy with the same title, URL and icon right below the row. | auto: `duplicates a saved tab right below it` |
| AC-3 | WHEN another workspace is chosen in Move to, THE module SHALL move the bookmark to the end of that root and its open tab there, and show the toast. | auto: `moves a saved tab to another workspace` |
| AC-4 | WHILE Move to is open, THE current workspace SHALL be checked. | auto: `checks the current workspace in move to of a saved tab` |
| AC-5 | WHEN the toast of a move is clicked, THE module SHALL switch to the target workspace. | auto: `switches to the workspace from the move toast` |
| AC-6 | WHEN `New Space…` is confirmed with a name, THE module SHALL create the workspace and move the tab into it; WHEN the name is empty or Esc is pressed, THE module SHALL create nothing. | auto: `moves a saved tab to a new space` |
| AC-7 | WHEN `Edit…` is saved with a valid URL, THE bookmark URL SHALL change and its name and icon SHALL stay; WHEN the URL is invalid, THE dialog SHALL stay open. | auto: `edits the pinned url of a saved tab` |
| AC-8 | WHEN `Replace Pinned URL with Current` is chosen, THE bookmark URL SHALL become the URL of the open tab. | auto: `replaces the pinned url with the current one` |
| AC-9 | WHILE the open tab has the saved URL or there is no open tab, THE item `Replace Pinned URL with Current` SHALL be disabled. | auto: `disables replace pinned url when equal` |
| AC-10 | WHEN `Open in Split View` is chosen, THE page of the row and the selected tab SHALL be tiled side by side. | manual |
| AC-11 | WHEN no tab is selected and `Open in Split View` is chosen, THE module SHALL tile the page of the row with a new empty tab and open the address bar on it, and the page chosen SHALL load in that tab. | manual |
| AC-12 | WHEN Tore uses Copy Link, Duplicate and Move to on a saved tab, THE results SHALL be those of the recording. | manual |
| AC-13 | WHEN Tore edits the pinned URL and clicks the row, THE new address SHALL open first, also after a restart. | manual |
| AC-14 | THE menu, its submenus and the dialog SHALL look and work like the recording on macOS and Debian. | manual |

AC-10 and AC-11 read from the DOM and `chrome.tabs`, so the design turns them into `live:` scenarios
(`opens a saved tab in split view`, `opens a saved tab in split view with a new tab`) with the
scenarios themselves; until then they are `manual`, because the check of 046 fails on a `live:` name
without a scenario. The task that writes the scenarios changes AC-10 and AC-11 to `live:` in the same
pull request ([tasks.md](tasks.md) T8).

## Out of scope

- `Share ▸`: its content is not in the recording and Vivaldi has no account to share through (as 033 Q-7).
- `Mute`: grey in the recording; Vivaldi's own tab menu already mutes.
- `Rename…` and `Change Icon…`: [027](../027-rename-pinned-tabs/spec.md).
- The menu of tiles and of folders: [031](../031-pin-and-tile-commands/spec.md), [033](../033-folder-menu/spec.md).
- Archive.
- The same items on a Favorites tile: [057](../057-tile-menu/spec.md).

## Open questions

- [x] **Q-1. Move to and the open tab.** Only the tab the command is run on moves (Tore, 2026-11-21); the toast lets the user follow it. Answered (Tore, 2026-11-21).
- [x] **Q-2. Split View with nothing selected.** Not disabled: the address bar opens and the new tab is tiled with the row (Tore, 2026-11-21, FR-9). Answered (Tore, 2026-11-21).
- [x] **Q-5. Closing the address bar without a choice.** The empty tab closes and the split is undone (Tore, 2026-11-21). Answered (Tore, 2026-11-21).
- [x] **Q-3. Duplicate and the open tab.** The copy is closed. Answered (Tore, 2026-11-21).
- [x] **Q-4. The tiles.** A separate spec, [057](../057-tile-menu/spec.md). Answered (Tore, 2026-11-21).

## References

- Tore's recording `Registrazione schermo 2026-11-21 alle 14.40.03.mov`.
- [031 Pin and tile commands](../031-pin-and-tile-commands/spec.md), [033 Folder menu](../033-folder-menu/spec.md), [027 Rename and re-icon pinned tabs](../027-rename-pinned-tabs/spec.md).
