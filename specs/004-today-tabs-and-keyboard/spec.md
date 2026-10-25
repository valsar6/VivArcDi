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

Pinned tabs, Favorites and tabs in folders are separated from Today tabs by a line. A Today tab
that has not been active for the configured time (12 hours by default) is closed and added to the
archive. Viewing a tab resets its timer.

The archive lists closed tabs by date with title, URL and workspace; choosing one reopens it in its
workspace. A "Clear" action on the separator archives every Today tab of the workspace.

Cmd/Ctrl+Shift+C copies the current URL and shows a small "Copied" toast. Command Bar and Ctrl+Tab
use Vivaldi's Quick Commands and tab cycling, documented in the native settings guide; VivArcDi only
adds what they lack.

## Requirements

### Functional

- **FR-1.** An `auto-archive` module closes unpinned, ungrouped tabs inactive for `archiveAfterHours`
  (default 12), never the active tab, never a tab playing audio.
- **FR-2.** Archived tabs are kept with title, URL, favicon, workspace and archive time, up to
  `archiveLimit` entries.
- **FR-3.** The archive is reachable from Quick Commands and restores a tab in its workspace.
- **FR-4.** A separator between pinned and Today tabs offers "archive all Today tabs".
- **FR-5.** Cmd/Ctrl+Shift+C copies the URL and shows a toast for about two seconds.

### Non-functional

- **NFR-1.** The archive survives restarts and stays on the user's machine.
- **NFR-2.** WHERE `auto-archive` is disabled, no tab is ever closed by VivArcDi.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a Today tab has been inactive for `archiveAfterHours`, THE module SHALL close it and add it to the archive. | auto |
| AC-2 | THE module SHALL never archive a pinned tab, a Favorite, a tab in a folder, the active tab or a tab playing audio. | auto |
| AC-3 | WHEN a tab becomes active, THE module SHALL reset its timer. | auto |
| AC-4 | WHEN the user restores an archived tab, THE tab SHALL reopen in its workspace with its URL. | manual |
| AC-5 | WHEN the user archives all Today tabs, THE workspace SHALL keep only pinned tabs, Favorites and folders. | manual |
| AC-6 | WHEN Vivaldi restarts, THE archive SHALL still list earlier entries. | manual |
| AC-7 | WHEN the user presses Cmd/Ctrl+Shift+C, THE URL SHALL be on the clipboard and a toast SHALL appear. | manual |

## Out of scope

- Tidy Tabs and other AI features.
- Syncing the archive between devices.
- A full replacement of Quick Commands as Arc's Command Bar.

## Open questions

- [ ] Is Vivaldi's tab hibernation plus "recently closed" enough for an MVP, with the archive as a
  view over closed tabs?
- [ ] Where does the archive live: `chrome.storage.local`, or Vivaldi's own session history?
- [ ] Can a command be added to Quick Commands, or does the archive need its own panel?
- [ ] Does Vivaldi already offer copy URL with a confirmation, making FR-5 unnecessary?

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), sections "Today tabs e
  archivio" and "Altre feature distintive".
- [docs/native-settings.md](../../docs/native-settings.md#keyboard)
