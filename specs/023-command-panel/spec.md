# 023 Command panel with tab actions

| | |
|---|---|
| Status | Approved |
| Phase | 5 |
| Owner | Tore |
| Approved | 2026-11-08 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc's Command Bar (Cmd+T) is a search box and an action list in one. Typing `pin` offers Pin, Favorite Tab and Pin to a folder for the current tab (Quick Tour 2:42); the list also shows open tabs with "Switch to Tab", and a site name followed by a search (`youtube` then the query) searches that site (0f2 review). Vivaldi's Quick Commands cannot be extended and a mod cannot open it (probe of 2026-10-31), so [004](../004-today-tabs-and-keyboard/spec.md), [013](../013-incognito-mode/spec.md) and [014](../014-arc-shortcuts/spec.md) leave it native. This spec adds a VivArcDi panel on another key.

## User stories

- **US-1.** As a user, I want to type an action such as "pin" and apply it to the current tab, so that I do not use the mouse.
- **US-2.** As a user, I want to switch to an open tab by typing part of its title.
- **US-3.** As a user, I want to search a site by typing its name.

## Expected behavior

A shortcut (default Cmd/Ctrl+Shift+K) opens a centered panel like Arc's. The field takes text; the list below shows, in this order: actions that match (Pin tab, Unpin tab, Favorite, Pin to folder, Archive tab, Copy URL, Copy as Markdown link), open tabs that match with "Switch to Tab", bookmarks and history that match. Arrow keys choose, Enter runs, Esc closes. A site name from the user's `search-sites` map followed by Tab searches that site: `youtube` Tab `lofi` opens the YouTube results. Quick Commands stays on Cmd/Ctrl+T.

## Requirements

### Functional

- **FR-1.** A `command-panel` module draws the panel, built on the panel code of 008.
- **FR-2.** Actions are registered by modules; today pin, favorite, pin to folder, archive and copy.
- **FR-3.** Open tabs, bookmarks and history are read with the extension APIs Vivaldi gives mods.
- **FR-4.** The `search-sites` map in `config.json` starts with Vivaldi's own search engine nicknames.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user presses the shortcut, THE panel SHALL open with the field focused. | manual |
| AC-2 | WHEN the user types `pin`, THE list SHALL show the pin actions for the active tab. | auto: `lists pin actions for the typed text` |
| AC-3 | WHEN the user picks an open tab, THE tab SHALL become active. | manual |
| AC-4 | WHEN the user types a site name and Tab, THE next Enter SHALL search that site. | auto: `searches the named site` |
| AC-5 | WHEN Esc is pressed, THE panel SHALL close and change nothing. | manual |

## Out of scope

- Replacing Quick Commands on Cmd/Ctrl+T.
- AI actions ("ask a question", summaries).
- Easel and other Arc-only items.

## Open questions

- [x] Which default shortcut? Cmd/Ctrl+Shift+K (Tore, 2026-11-08).
- [x] Include history and bookmarks in the first version, or only actions and tabs? Actions, tabs, bookmarks and history, as in the expected behavior (Tore approved the spec as written, 2026-11-08).

## References

- Quick Tour 2:35-3:02; 0f2 review; Project files: `video-arc/gap-list-arc-consolidata.md` (G9, G10).
