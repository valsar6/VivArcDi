# 007 Reopen pinned tabs instead of duplicating them

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-10-26 |

## Summary

In Arc, opening from a new tab a site that is already a Favorite or a pinned tab does not create a
second tab: Arc switches to the existing one, loading it if it was unloaded, and when it sits in a
closed folder it peeks out below the folder. Pinned tabs become the place where a site lives, not a
bookmark next to a pile of duplicates. VivArcDi also remembers when each one was last opened.

## User stories

- **US-1.** As a user, I want Cmd/Ctrl+T followed by the address of a Favorite or pinned tab to bring
  me to that tab, so that I never end up with the same site open twice.
- **US-2.** As a user, I want the reused tab to be loaded again if it was unloaded, and to show below
  its closed folder without opening the folder.
- **US-3.** As a user, I want VivArcDi to remember when I last opened each Favorite and pinned tab,
  so that the ones I use most stay easy to reach.

## Expected behavior

Seen in Arc (video by Tore, 2026-10-26): with Mahjong Soul pinned inside the closed "Hobbies"
folder, Cmd+T opens the command bar, which already suggests "Mahjong Soul · Switch to Tab". Typing
`ma` completes to `mahjongsoul.game.yo-star.com` with the same suggestion. Enter closes the command
bar, the pinned tab becomes active and appears indented right below "Hobbies", which stays closed. No
new tab appears in the tab list. Its "—" button later puts it back inside the folder.

In VivArcDi: the user presses Cmd/Ctrl+T and opens an address, typed or picked from Vivaldi's
suggestions. If that address matches a Favorite or a pinned tab of the current workspace, VivArcDi
closes the new tab, activates the matching tab and loads it again if it was unloaded. The match uses
the page the pinned tab shows now and the page it was pinned with (see [003](../003-pinned-tabs-and-folders/spec.md)).
When the matching tab is inside a closed folder, it peeks out below the folder as in 009/AC-13.

Arc and VivArcDi differ on purpose: Arc offers "Switch to Tab" as a suggestion before the user
presses Enter. Vivaldi's address bar suggestions cannot be extended safely by a mod, so VivArcDi acts
after Enter, when the new tab starts loading. The user sees the new tab for a moment, then lands on
the pinned tab.

Each time a Favorite or pinned tab becomes active, by any route, VivArcDi records the date and time.

## Requirements

### Functional

- **FR-1.** WHEN a tab opened with Cmd/Ctrl+T, or with the "+" button, starts its first navigation,
  the module compares its address with every Favorite and pinned tab of the current workspace.
- **FR-2.** Two addresses match when they have the same host, ignoring `www.`, and the same path,
  ignoring a trailing `/`, the query string and the fragment.
- **FR-3.** On a match, the module activates the matching tab, loads it if it is unloaded, and closes
  the new tab. The pinned tab keeps its own page: it is not navigated to the typed address.
- **FR-4.** If several tabs match, the most recently opened one wins.
- **FR-5.** Only new, empty tabs are redirected. Links clicked in pages, tabs opened by other
  extensions, Peek ([002](../002-peek/spec.md)) and session restore are left alone.
- **FR-6.** The module records the last-opened date of every Favorite and pinned tab each time it
  becomes active, and keeps it across restarts.
- **FR-7.** Options in `config.json`: `enabled` (true).

### Non-functional

- **NFR-1.** The switch happens within 300 ms of the new tab's first navigation.
- **NFR-2.** IF the tabs API is missing or the switch fails, THEN the new tab stays open with the
  typed address, as in plain Vivaldi, and the error is logged.
- **NFR-3.** Stopping the module removes every listener; the stored dates may stay.
- **NFR-4.** Works on Vivaldi 8.1 and 8.2, on macOS and Debian.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE matcher SHALL treat two addresses with the same host without `www.` and the same path without trailing `/`, query and fragment as the same. | auto: `matches addresses that differ only by www, slash, query or fragment` |
| AC-2 | THE matcher SHALL treat addresses with different hosts or paths as different. | auto: `does not match different hosts or paths` |
| AC-3 | WHEN a new tab navigates to the address of a pinned tab, THE module SHALL activate the pinned tab and close the new tab. | auto: `switches to the pinned tab and closes the new tab` |
| AC-4 | WHEN the matching pinned tab is unloaded, THE module SHALL load it again. | auto: `reloads an unloaded pinned tab when switching` |
| AC-5 | WHEN several pinned tabs match, THE module SHALL pick the most recently opened one. | auto: `picks the most recently opened match` |
| AC-6 | WHEN a tab that was not opened empty navigates to a pinned address, THE module SHALL leave it alone. | auto: `ignores tabs that did not start empty` |
| AC-7 | IF the switch fails, THEN THE new tab SHALL stay open on the typed address. | auto: `keeps the new tab when the switch fails` |
| AC-8 | WHEN a Favorite or pinned tab becomes active, THE module SHALL store the current date for it. | auto: `records the last opened date on activation` |
| AC-9 | WHEN Tore opens the address of a Favorite from Cmd/Ctrl+T, THE Favorite SHALL become active and no new tab SHALL remain. | manual |
| AC-10 | WHEN Tore opens the address of a pinned tab inside a closed folder, THE tab SHALL become active and show below the closed folder. Checked once 009 is implemented. | manual |
| AC-11 | WHEN Vivaldi restarts, THE last-opened dates SHALL be kept. | manual |

## Out of scope

- A "Switch to tab" suggestion inside Vivaldi's address bar before Enter.
- Doing the same for ordinary, unpinned tabs.
- Showing the last-opened dates: [008](../008-folder-hover-preview/spec.md).
- Ordering or archiving tabs by their last-opened date ([004](../004-today-tabs-and-keyboard/spec.md)
  may use the dates later).

## Open questions

- [x] Which tabs does it apply to? Only Favorites and pinned tabs (Tore, 2026-10-26).
- [x] How strict is the match? Same host and path, as in FR-2 (Tore, 2026-10-26).
- [x] A Favorite or pinned tab in another workspace? Ignored: a new tab opens as usual
  (Tore, 2026-10-26).
- [x] Where does the last-opened date show? In a list shown on hover over a folder, as in Arc. That
  is its own feature, [008](../008-folder-hover-preview/spec.md); this spec only records the dates
  (Tore, 2026-10-26).
- [x] Address bar suggestions: the switch after Enter works whether or not Vivaldi suggests open tabs,
  so it does not depend on them. If Vivaldi suggests the open tab and the user picks it, Vivaldi
  switches by itself and this module does nothing.
- [x] Ship before 003? Yes: Favorites and pinned tabs outside folders first; the peek-out below a
  closed folder (AC-10) follows 009, which took folders over from 003 (Tore, 2026-10-26).

## References

- [003 Pinned tabs](../003-pinned-tabs-and-folders/spec.md) for the saved page of a pinned tab.
- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md), AC-6 and AC-13
  for the peek-out below a closed folder.
- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section "Spaces, Pinned tabs e
  cartelle".
