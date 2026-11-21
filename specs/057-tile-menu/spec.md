# 057 Menu of a Favorites tile

| | |
|---|---|
| Status | Draft |
| Phase | 1 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

[056](../056-saved-tab-menu/spec.md) gives the saved tabs of a workspace the menu of Arc: Copy Link,
Duplicate, Move to, Edit Pinned Page and Open in Split View. The tiles of the Favorites grid have only
Untile tab and Pin tab ([031](../031-pin-and-tile-commands/spec.md)) and Rename and Change icon
([027](../027-rename-pinned-tabs/spec.md)). Tore asked for the same items on a tile as a separate spec
(2026-11-21). Tore confirmed on 2026-11-21 that Arc shows these items on a tile, without Move to.

## User stories

- **US-1.** As a user, I want to copy the link of a tile, so that I can paste it elsewhere.
- **US-2.** As a user, I want to change the address a tile opens first, by typing it or by taking the page I am on.
- **US-3.** As a user, I want to open a tile beside the page I am viewing in a split view.
- **US-4.** As a user, I want to duplicate a tile.

## Expected behavior

The menu of a tile gains, with the behavior of 056 and Arc's order, split by separator lines: `Copy
Link`; `Edit Pinned Page ▸` (`Replace Pinned URL with Current`, `Edit…`); `Open in Split View`,
`Duplicate`. The tiles are the same in every workspace, so there is no `Move to ▸`: moving a tile to a
workspace is `Pin tab` of 031. `Duplicate` adds a copy of the tile right after it in the grid. The
dialog, the disabled states and the address bar of an empty selection are those of 056.

## Requirements

### Functional

- **FR-1.** The menu of a tile gains Copy Link, Edit Pinned Page ▸, Open in Split View and Duplicate.
- **FR-2.** Each item does what it does on a saved tab (056 FR-2, FR-3, FR-6 to FR-9), on the tile's bookmark in the grid.
- **FR-3.** A change of address, a copy or a rename of a tile shows in every workspace.

### Non-functional

- **NFR-1.** Same as 056 NFR-1 to NFR-3.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN Copy Link is chosen on a tile, THE module SHALL copy its saved URL and show the toast. | auto: `copies the saved link of a tile` |
| AC-2 | WHEN Duplicate is chosen on a tile, THE module SHALL add a copy right after it in the grid. | auto: `duplicates a tile right after it` |
| AC-3 | WHEN `Edit…` is saved with a valid URL on a tile, THE URL SHALL change in every workspace and the name and icon SHALL stay. | auto: `edits the pinned url of a tile` |
| AC-4 | WHEN `Replace Pinned URL with Current` is chosen on a tile, THE URL SHALL become the URL of the open tab. | auto: `replaces the pinned url of a tile with the current one` |
| AC-5 | WHEN `Open in Split View` is chosen on a tile, THE page of the tile and the selected tab SHALL be tiled side by side. | manual |
| AC-6 | WHEN Tore uses the new items on a tile, THE results SHALL be those of the saved tabs and show in every workspace. | manual |

AC-5 becomes the `live:` scenario `opens a tile in split view` with the design, together with the
scenario itself; until then it is `manual`, because the check of 046 fails on a `live:` name without a
scenario.

## Out of scope

- `Move to ▸`: a tile belongs to every workspace.
- `Share`, `Mute`, Archive, as in 056.

## Open questions

- [x] **Q-1. Does Arc show these items on a Favorites tile?** Yes, minus Move to (Tore, 2026-11-21).
- [x] **Q-2. Duplicate of a tile.** Right after the tile, closed (Tore, 2026-11-21).
