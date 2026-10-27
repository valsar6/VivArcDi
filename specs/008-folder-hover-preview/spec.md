# 008 Folder hover preview

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-10-26 |

## Summary

In Arc, resting the pointer on a folder in the sidebar opens a panel next to it with a search field
and the folder's pinned tabs, each with the time since it was last opened. The user finds and opens
a tab without expanding the folder, and sees at a glance which ones are used and which are forgotten.
This spec brings that panel to the bookmark folders shown in the tab bar (see
[009](../009-bookmark-folders-in-tab-bar/spec.md)), using the last-opened dates recorded by [007](../007-reopen-pinned-tabs/spec.md).

## User stories

- **US-1.** As a user, I want to see what a folder holds by resting the pointer on it, without
  opening it.
- **US-2.** As a user, I want each entry to say when I last opened it, so that I see which tabs I use.
- **US-3.** As a user, I want to type to filter the entries and open one with a click or Enter.

## Expected behavior

Seen in Arc (screenshot by Tore, 2026-10-26): with the pointer on the "Hobbies" folder, a rounded
panel opens to the right of the sidebar. At the top, a field "Search Hobbies…" has the focus. Below
it, one row per tab: favicon, title, and under the title the time since it was last opened in the
interface language ("23 minuti fa", "1 mese fa", "5 mesi fa"). The most recently opened is on top and
highlighted.

In VivArcDi the panel opens after the pointer rests on a folder for a short delay and closes when the
pointer leaves both the folder and the panel, or with Esc. Typing filters the rows by title and
address. Arrow keys move the highlight; Enter or a click activates the tab, which then peeks out
below the closed folder (009/AC-13) and becomes the most recent. A tab never opened since VivArcDi
started recording shows "never opened" and sits at the bottom.

## Requirements

### Functional

- **FR-1.** Resting the pointer on the title of a closed folder for `hoverDelayMs` opens the panel
  next to the sidebar, aligned with the folder. Expanded folders never open it.
- **FR-2.** One row per tab of the folder: favicon, title, and the time since its last opening from
  the 007 records, as relative time in the interface language.
- **FR-3.** Rows are sorted by last opening, most recent first; tabs without a record come last, in
  folder order.
- **FR-4.** The search field filters rows by title or address, ignoring case.
- **FR-5.** Up and Down move the highlight, Enter or a click activates the highlighted tab and closes
  the panel, Esc closes the panel.
- **FR-6.** The panel closes when the pointer leaves both the folder and the panel, after the same
  delay, and when the folder is expanded.
- **FR-7.** Options in `config.json`: `enabled` (true), `hoverDelayMs` (400).

### Non-functional

- **NFR-1.** The panel follows Vivaldi's theme colors and the rounded style of the Favorites grid.
- **NFR-2.** IF the folder's tabs cannot be read, THEN no panel opens and the error is logged.
- **NFR-3.** Stopping the module removes the panel, its styles and every listener.
- **NFR-4.** Works on Vivaldi 8.1 and 8.2, on macOS and Debian, with auto-hide on or off.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE relative time SHALL read as minutes, hours, days, months or years ago in the interface language. | auto: `formats the time since last opening in the interface language` |
| AC-2 | THE rows SHALL be sorted by last opening, most recent first, with unrecorded tabs last in folder order. | auto: `sorts rows by last opening with unrecorded tabs last` |
| AC-3 | WHEN the user types in the search field, THE panel SHALL show only rows whose title or address contains the text, ignoring case. | auto: `filters rows by title or address ignoring case` |
| AC-4 | WHEN the user presses Enter, THE module SHALL activate the highlighted tab and close the panel. | auto: `activates the highlighted tab on Enter` |
| AC-5 | WHEN the pointer rests on a closed folder title for the delay, THE panel SHALL open next to the sidebar with the folder's tabs. | manual |
| AC-8 | WHILE a folder is expanded, THE panel SHALL NOT open on hover. | manual |
| AC-6 | WHEN the pointer leaves the folder and the panel, THE panel SHALL close. | manual |
| AC-7 | WHEN Tore picks a tab in the panel, THE tab SHALL become active and show below the closed folder. | manual |

## Out of scope

- Editing the folder from the panel (rename, move, remove tabs).
- A panel for Favorites or for tabs outside folders, and the last-opened time on single tabs.

## Open questions

- [x] Should the last-opened time also show on a single pinned tab? No, only in the folder panel
  (Tore, 2026-10-26).
- [x] Closed folders only? Yes (Tore, 2026-10-26).
- [x] Delay before opening? 400 ms (Tore, 2026-10-26).

## References

- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md): folders are Vivaldi
  bookmark folders shown in the tab bar.
- [007 Reopen pinned tabs](../007-reopen-pinned-tabs/spec.md), FR-6: the last-opened records.
- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section "Spaces, Pinned tabs e
  cartelle".
