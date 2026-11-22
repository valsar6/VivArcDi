# 027 Rename and re-icon pinned tabs

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-08; revision 2026-11-22 |
| Revision | Approved by Tore on 2026-11-22, answers to Q-2 to Q-4 included: the menu of 056 and 057, in-place rename, and the picker with Emoji and Icons tabs of Tore's recording of 2026-11-21 (AC-5 to AC-11) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc lets the user rename a pinned tab and change its icon, so that a long page title becomes a short label (1cQ at 3:33; the split view that gets a name and an icon in the Vivaldi user's review). VivArcDi's pinned rows and Favorites show the page title and favicon, which on many sites is long or generic.

**Revision of 2026-11-22.** Tore's recording of 2026-11-21 (`Registrazione schermo 2026-11-21 alle 14.40.03.mov`, 56 s) shows Arc's menu of a saved tab with `Change Icon…` and `Rename…`, and the two things they do: `Rename…` puts the title in edit mode in place, selected; `Change Icon…` opens a popover with two tabs, `Emoji` and `Icons`, and a search field with the cursor in it, over a scrolling grid of emoji with category buttons at the bottom. The menus of [056](../056-saved-tab-menu/spec.md) (saved tabs) and [057](../057-tile-menu/spec.md) (tiles) have no slot for the two items yet. Tore chose (2026-11-22): the picker with emoji, search and the Icons tab; the items on saved tabs and on tiles. The `Icons` tab is the set of 24 symbols of [033](../033-folder-menu/spec.md) FR-9, which will reuse this picker for folders.

## User stories

- **US-1.** As a user, I want to give a pinned tab a short name, so that the row is readable.
- **US-2.** As a user, I want to pick an icon for it, so that I recognize it.
- **US-3.** As a user, I want to find an emoji by typing, so that I do not scroll a long grid.
- **US-4.** As a user, I want the two commands in the menu of a saved tab and of a tile, where Arc has them.

## Expected behavior

A right click on a saved row or a Favorite tile shows "Change Icon…" and "Rename…" in the menu of 056 and 057, in Arc's place: right after the first group (Copy Link, Share) and before Edit Pinned Page. Rename edits the label in place: the row title becomes a field with the text selected; Enter saves, Esc cancels, and saving an empty name brings back the page title. Change Icon opens a popover beside the row with two tabs. `Emoji` has a search field (focused, with the cursor in it), a scrolling grid of emoji and the category buttons at the bottom; typing filters the grid. `Icons` has the 24 line symbols of 033 FR-9. The chosen symbol replaces the favicon. A reset button in the popover brings back the page title and favicon together with an empty name. The name and icon belong to the bookmark, so they follow it between sessions, and a tile shows them in every workspace.

## Requirements

### Functional

- **FR-1.** Name and icon are stored with the bookmark, next to the other VivArcDi data of that link (the design chooses the place after a probe: the `vivExtData` of the bookmark, or VivArcDi's storage keyed by bookmark id), so that they follow it across restarts and Vivaldi Sync.
- **FR-2.** Rows and tiles show the stored values when present.
- **FR-3.** Rename never changes the bookmark's URL or title; Vivaldi's own panel keeps the original title.
- **FR-4.** The menus of saved tabs (056) and of tiles (057) gain `Change Icon…` and `Rename…`, in Arc's order.
- **FR-5.** `Rename…` edits the label in place: Enter saves, Esc cancels, an empty name resets.
- **FR-6.** `Change Icon…` opens the picker with `Emoji` and `Icons`; the emoji tab has a search field that filters the grid; the icons tab has the 24 symbols of 033 FR-9; a reset button brings back title and favicon.
- **FR-7.** The picker and the edit field are outside the window drag region and close on Esc and on a click elsewhere.
- **FR-8.** A stored name and icon show in rows and in tiles (in every workspace for a tile).

### Non-functional

- **NFR-1.** Every write goes through the services of 041 and 042 and never blocks Vivaldi; a failed write shows an error toast.
- **NFR-2.** Works on Vivaldi 8.1 and 8.2 (and 8.3), macOS and Debian; texts in English.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user renames a pinned row, THE row SHALL show the new name after a restart. | manual |
| AC-2 | WHEN the user chooses an emoji, THE row or tile SHALL show it instead of the favicon. | manual |
| AC-3 | WHEN the user resets, THE title and favicon SHALL return. | auto: `resets name and icon` |
| AC-4 | THE stored name SHALL not change the bookmark's URL. | auto: `rename keeps the url` |
| AC-5 | WHEN `Rename…` is chosen, THE row title SHALL become a field with the text selected; Enter SHALL save the name, Esc SHALL cancel, and an empty name SHALL bring back the page title. | auto: `renames a saved tab in place` |
| AC-6 | WHEN `Change Icon…` is chosen, THE module SHALL open a picker with an `Emoji` tab, a focused search field and an `Icons` tab. | auto: `opens the icon picker with emoji and icons` |
| AC-7 | WHEN text is typed in the search field, THE emoji grid SHALL show only the emoji that match. | auto: `filters the emoji by the search text` |
| AC-8 | WHEN a symbol of the `Icons` tab is chosen, THE row or tile SHALL show it instead of the favicon. | auto: `shows the chosen symbol of a saved tab` |
| AC-9 | THE menus of a saved row and of a tile SHALL show `Change Icon…` and `Rename…` after the first group. | auto: `adds rename and change icon to the menus of a row and a tile` |
| AC-10 | WHEN a tile is renamed or re-iconed, THE new name and icon SHALL show in every workspace. | auto: `shows the name and icon of a tile in every workspace` |
| AC-11 | WHEN Tore renames a row, picks an emoji by search and an icon, and resets, THE picker and the field SHALL look and work like the recording on macOS and Debian. | manual |

## Out of scope

- Renaming ordinary Today tabs.
- Custom image icons.
- The `Share` and `Mute` items of Arc's menu (056 and 057).
- Folder rows and folder icons: [033](../033-folder-menu/spec.md), which reuses the picker.

## Open questions

- [x] Show the stored name in Vivaldi's own bookmarks panel too, or only in VivArcDi rows?
- [x] **Q-2. Where the name and icon are stored.** Proposal: a probe of the design finds whether the bookmark can carry a `vivExtData` through the Vivaldi API; if not, VivArcDi's own storage keyed by bookmark id (037), synced with 030. Either way FR-1 holds. Answered (Tore, 2026-11-22): confirmed, with a probe in the design to check it.
- [x] **Q-3. The emoji list.** Proposal: a bundled list with a name and keywords in English for the search, grouped in the categories of the recording (faces, nature, food, activities, travel, objects, symbols, flags), no network. Answered (Tore, 2026-11-22): confirmed.
- [x] **Q-4. Reset.** Proposal: a reset button in the picker and an empty name, not a menu item, as the recording's menu has none. Answered (Tore, 2026-11-22): confirmed.

## References

- 1cQ review 3:33; Project files: `video-arc/gap-list-arc-consolidata.md` (G15).
