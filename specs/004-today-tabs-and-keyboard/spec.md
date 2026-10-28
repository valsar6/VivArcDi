# 004 Today tabs and keyboard

| | |
|---|---|
| Status | Draft |
| Phase | 4 |
| Owner | Tore |
| Approved | – |

## Summary

Arc keeps the sidebar clean by archiving unpinned ("Today") tabs that were not viewed for a while,
and it has a few shortcuts that define how it feels. This spec covers the archive and the shortcuts
that Vivaldi's native settings do not already give.

## User stories

- **US-1.** As a user, I want unpinned tabs I have not looked at for a while to be closed and kept in
  an archive, so that my tab bar stays short without losing anything.
- **US-2.** As a user, I want to find and restore an archived tab.
- **US-3.** As a user, I want to archive all Today tabs of a workspace at once.
- **US-4.** As a user, I want Arc's shortcuts: Command Bar on Cmd/Ctrl+T, Ctrl+Tab in recent order,
  Cmd/Ctrl+Shift+C to copy the URL with a short confirmation.

## Expected behavior

A **Today tab** is a tab that is not pinned, not a Favorite and not in a tab stack. A tab opened from a
bookmark folder of [009](../009-bookmark-folders-in-tab-bar/spec.md) is a Today tab too: its link stays
in the folder, so archiving it loses nothing.

A thin divider separates the pinned tabs from the Today tabs of the workspace, as in Arc. Resting the
pointer on the divider shows a "Clear" button; a click archives every Today tab of the workspace except
the active one.

VivArcDi remembers when each tab was last active. A Today tab that has not been active for
`archiveAfterHours` (12 by default, as in Arc) is closed and added to the archive. The time counts while
Vivaldi is closed too, so a tab left from yesterday is archived shortly after the next start. Viewing a
tab resets its timer. A tab that plays audio, or that is the active tab of any window, is never archived.

The archive is VivArcDi's own list, kept in the shared `chrome.storage.local` store: title, URL,
favicon, workspace and archive time of each tab, newest first, up to `archiveLimit` entries (500 by
default). Vivaldi's "recently closed" list stays as it is and is not used, because it does not keep the
workspace and mixes in tabs the user closed by hand.

The archive opens in a panel drawn by VivArcDi, from an archive button at the bottom of the tab bar and
from Cmd/Ctrl+Shift+A. The panel looks like the folder panel of
[008](../008-folder-hover-preview/spec.md): a search field on top, then the entries grouped by day
("Today", "Yesterday", dates), each with favicon, title, host and time. Choosing an entry reopens the
tab in its workspace, makes it active and removes it from the archive. Quick Commands cannot be extended
by a mod, so the archive is not listed there.

Cmd/Ctrl+Shift+C copies the address of the active tab and shows a small "Copied" toast at the bottom of
the window for about two seconds. VivArcDi handles the shortcut itself, also while the page has focus,
and so replaces Vivaldi's binding for it if one exists.

Command Bar and Ctrl+Tab in recent order stay native: Quick Commands on Cmd/Ctrl+T and Tab Cycling in
recently used order, documented in [docs/native-settings.md](../../docs/native-settings.md#keyboard).

## Requirements

### Functional

- **FR-1.** A `today-archive` module records, for each tab, the last time it was active, and keeps the
  times across restarts.
- **FR-2.** Once a minute and at start, the module closes every Today tab inactive for
  `archiveAfterHours`, except the active tab of any window and tabs playing audio.
- **FR-3.** A closed tab goes to the archive with title, URL, favicon, workspace and archive time; past
  `archiveLimit` entries, the oldest are dropped.
- **FR-4.** An archive panel, opened from a tab bar button and Cmd/Ctrl+Shift+A, lists entries by day
  with search; choosing one reopens it in its workspace and removes it from the archive.
- **FR-5.** A divider between pinned and Today tabs shows a "Clear" button on hover, which archives
  every Today tab of the workspace except the active one.
- **FR-6.** A `copy-url` module copies the active tab's address on Cmd/Ctrl+Shift+C and shows a toast
  for about two seconds.

### Non-functional

- **NFR-1.** The archive survives restarts and stays on the user's machine.
- **NFR-2.** WHERE `today-archive` is disabled, no tab is ever closed by VivArcDi.
- **NFR-3.** Injected buttons in the tab bar are outside the window drag region, so clicks reach them
  on macOS.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a Today tab has been inactive for `archiveAfterHours`, THE module SHALL close it and add it to the archive. | auto: archives a Today tab inactive past the limit |
| AC-2 | THE module SHALL never archive a pinned tab, a Favorite, a tab in a stack, the active tab or a tab playing audio. | auto: never archives protected tabs |
| AC-3 | WHEN a tab becomes active, THE module SHALL reset its timer. | auto: activation resets the timer |
| AC-4 | WHEN Vivaldi starts, THE module SHALL count the time the tab was inactive before the restart. | auto: counts inactivity across restarts |
| AC-5 | WHEN the archive holds more than `archiveLimit` entries, THE oldest SHALL be dropped. | auto: drops the oldest entries past the limit |
| AC-6 | WHEN the user restores an archived tab, THE tab SHALL reopen in its workspace with its URL and leave the archive. | manual |
| AC-7 | WHEN the user clicks "Clear", THE workspace SHALL keep only pinned tabs, Favorites, stacks and the active tab. | manual |
| AC-8 | WHEN Vivaldi restarts, THE archive SHALL still list earlier entries. | manual |
| AC-9 | WHEN the user types in the archive search, THE panel SHALL show only entries whose title or URL contains the text. | auto: archive search matches title and URL |
| AC-10 | WHEN the user presses Cmd/Ctrl+Shift+A or clicks the archive button, THE archive panel SHALL open. | manual |
| AC-11 | WHEN the user presses Cmd/Ctrl+Shift+C, also with focus in the page, THE URL SHALL be on the clipboard and a toast SHALL appear. | manual |
| AC-12 | WHERE `today-archive` is disabled, THE module SHALL close no tab. | auto: disabled module closes nothing |

## Out of scope

- Tidy Tabs and other AI features.
- Syncing the archive between devices.
- A full replacement of Quick Commands as Arc's Command Bar.
- Listing the archive in Quick Commands.

## Open questions

Proposed answers are already written above; Tore confirms or changes them.

- [ ] Own archive in `chrome.storage.local` instead of Vivaldi's "recently closed"? Proposed: yes.
- [ ] Tabs opened from a bookmark folder (009) are archived like any Today tab? Proposed: yes.
- [ ] Archive in its own panel, button at the bottom of the tab bar and Cmd/Ctrl+Shift+A? Proposed: yes.
- [ ] VivArcDi handles Cmd/Ctrl+Shift+C with a toast, overriding Vivaldi's binding? Proposed: yes.
- [ ] Defaults 12 hours and 500 entries? Proposed: yes.

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), sections "Today tabs e
  archivio" and "Altre feature distintive".
- [docs/native-settings.md](../../docs/native-settings.md#keyboard)
