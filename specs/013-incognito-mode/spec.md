# 013 Incognito mode

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-10-30 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc an incognito window has a bare sidebar: no space, no Favorites, no pinned tabs and no folders.
It shows a `New Tab` row on top, the list `Incognito Tabs` with a `Clear` button, the Library button
at the bottom left and the `+` button at the bottom right. Tore's screenshot of 2026-10-29 shows it.
This spec gives Vivaldi's private windows the same tab bar, and makes sure no VivArcDi module keeps
anything from a private window.

## User stories

- **US-1.** As a user, I want a private window to show only its own tabs, so that my spaces, Favorites
  and folders never appear while I browse privately, as in Arc.
- **US-2.** As a user, I want a `New Tab` row on top of the private tab list, so that I open a tab with
  one click.
- **US-3.** As a user, I want a `Clear` button on the private tab list, so that I close all private
  tabs at once.
- **US-4.** As a user, I want the Library button at the bottom left and the `+` button at the bottom
  right, so that the private window keeps Arc's layout.
- **US-5.** As a user, I want VivArcDi to store nothing from a private window, so that private
  browsing leaves no trace.

## Expected behavior

Seen in Arc (screenshot by Tore, 2026-10-29): a dark sidebar with the window buttons on top, then the
title `Incognito Tabs` with `Clear` on its right, a `+ New Tab` row, the open private tabs (the active
one highlighted), empty space, and at the bottom the Library icon on the left and `+` on the right.

In VivArcDi, in a private window of Vivaldi, the tab bar shows from top to bottom:

1. The title `Incognito Tabs`. Resting the pointer on it shows `Clear` on its right, like the Today
   divider of [004](../004-today-tabs-and-keyboard/spec.md).
2. A `New Tab` row with a `+` icon. A click opens a blank tab in the private window and puts the
   cursor in the address field with its text selected, so typing searches or opens a site, as Vivaldi's
   own new tab button does.
3. Vivaldi's own private tabs, as Vivaldi draws them.
4. A bottom bar with the Library button on the left and the `+` button on the right.

The following are not drawn in a private window: the Favorites grid (001, 003), the space header
(011), the folders section and the folder preview (008, 009, 010, 012), the pinned tab marks and the
reset button (003), the Today divider and the archive button (004). Vivaldi's own new tab button and
workspace switcher in the tab bar are hidden, since `New Tab` and the bottom bar replace them.

`Clear` closes every tab of the private window except the active one. Nothing goes to the archive of
004: a private tab is closed, not archived. Arc does the same: private tabs are never kept.

The Library button opens Vivaldi's Downloads panel. Arc's Library collects downloads, captures, easels
and spaces; Vivaldi has no single equivalent, and downloads are what a private window produces. See
the open questions.

The `+` button does the same as `New Tab`: a blank tab and the cursor in the address field, whose
suggestions list tabs, bookmarks and history. Tore's screen recording of 2026-10-31 shows this
behavior on Vivaldi's own new tab button. A mod cannot open Quick Commands (probe of 2026-10-31), so
the button cannot do that; Cmd/Ctrl+T keeps opening Quick Commands natively, also in a private window,
as set by [014](../014-arc-shortcuts/spec.md).

Peek (002) and copy URL (004) keep working in a private window: they only act on the window's own
tabs and store nothing.

Normal windows open at the same time do not change: each window decides on its own.

Deliberate differences from Arc: the private tab bar keeps Vivaldi's own tab rows, styled by
Vivaldi; and Vivaldi's private window keeps its own dark theme instead of Arc's.

## Requirements

### Functional

- **FR-1.** A new module `incognito` detects whether the window is a private window, once at
  start-up, from the `incognito` flag of `chrome.windows.getCurrent`.
- **FR-2.** In a private window, the modules `favorites-grid`, `space-header`, `bookmark-folders`,
  `folder-preview`, `pinned-tabs`, `reopen-pinned` and `today-archive` do not start.
- **FR-3.** In a private window, the module draws the title `Incognito Tabs` with `Clear`, the
  `New Tab` row and the bottom bar with Library and `+`.
- **FR-4.** `Clear` closes all tabs of the private window except the active one, without archiving.
- **FR-5.** `New Tab` opens a blank tab in the private window and focuses the address field with its
  text selected.
- **FR-6.** The Library button opens Vivaldi's Downloads panel by a click on Vivaldi's own Downloads
  button of the panel bar.
- **FR-7.** The `+` button does what `New Tab` does.
- **FR-8.** In a private window, Vivaldi's own new tab button and workspace switcher in the tab bar
  are hidden.
- **FR-9.** The module is enabled by default and disabled with `"incognito": false` in `config.json`;
  then a private window looks like plain Vivaldi, with no VivArcDi section at all.

### Non-functional

- **NFR-1.** No VivArcDi module writes data about a private window or its tabs to
  `chrome.storage.local`, to bookmarks or to tab data, whether `incognito` is enabled or not.
- **NFR-2.** The title, row and bottom bar are outside the window drag region, so clicks and hover
  reach them on macOS.
- **NFR-3.** They follow Vivaldi's theme colors of the private window and the style of the rows of 009.
- **NFR-4.** IF the window type cannot be read, the window is treated as a normal window and the
  problem is logged once; Vivaldi keeps working.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the window is a private window, THE module SHALL report it as private. | auto: `detects a private window` |
| AC-2 | WHEN the window is a normal window, THE module SHALL report it as normal and draw nothing. | auto: `draws nothing in a normal window` |
| AC-3 | WHILE the window is private, THE modules listed in FR-2 SHALL not start. | auto: `skips spaces, favorites and folders in a private window` |
| AC-4 | WHILE the window is private, THE module SHALL draw the title, the `New Tab` row and the bottom bar. | auto: `draws the private tab bar` |
| AC-5 | WHEN `Clear` is clicked, THE module SHALL close every tab of the window except the active one. | auto: `clear closes all private tabs but the active one` |
| AC-6 | WHEN `Clear` is clicked, THE module SHALL add nothing to the archive. | auto: `clear archives nothing` |
| AC-7 | WHEN `New Tab` is clicked, THE module SHALL open a blank tab in the private window and focus the address field. | auto: `new tab row opens a blank tab and focuses the address field` |
| AC-8 | WHEN the Library button is clicked, THE module SHALL click Vivaldi's Downloads button. | auto: `library clicks the downloads button` |
| AC-9 | WHEN the `+` button is clicked, THE module SHALL open a blank tab and focus the address field. | auto: `plus opens a blank tab and focuses the address field` |
| AC-10 | WHILE the window is private, THE modules SHALL write nothing to storage, bookmarks or tab data. | auto: `stores nothing from a private window` |
| AC-11 | IF the window type cannot be read, THEN THE module SHALL treat the window as normal and log once. | auto: `treats an unreadable window as normal` |
| AC-12 | WHERE `incognito` is disabled, THE module SHALL draw nothing and the private window SHALL show no VivArcDi section. | auto: `disabled module leaves private windows plain` |
| AC-13 | WHEN Tore opens a private window, THE tab bar SHALL show only `Incognito Tabs`, `New Tab`, the private tabs and the bottom bar. | manual |
| AC-14 | WHEN Tore clicks `Clear` with three private tabs, ONLY the active tab SHALL stay, and the archive (Cmd/Ctrl+Shift+A in a normal window) SHALL not list the others. | manual |
| AC-15 | WHEN Tore clicks `New Tab`, Library and `+` on macOS, `New Tab` and `+` SHALL open a blank private tab with the cursor in the address field, and Library SHALL open the Downloads panel. | manual |
| AC-16 | WHILE a private window is open, THE normal window SHALL keep its Favorites, space header, folders and pinned tabs. | manual |

## Out of scope

- A full Arc Library (captures, easels, spaces); only the Downloads panel is opened.
- Arc's command bar. A command panel of VivArcDi (tabs, bookmarks, history) would be its own spec;
  Quick Commands stays on Cmd/Ctrl+T.
- Restyling Vivaldi's private tab rows or theme like Arc's.
- Turning a private tab into a normal one ("move to a normal window").
- The bottom bar of space icons for normal windows (Spaces analysis, B11): this spec's bottom bar is
  only for private windows, though its design should allow reuse.

## Open questions

- [x] **How is a private window recognized in `window.html`?** `chrome.windows.getCurrent` returns
  `incognito: true` in a private window; `#browser` has no private class (Tore's probe on Vivaldi 8.2,
  2026-10-29).
- [x] **What does the Library open?** Vivaldi's Downloads panel (Tore, 2026-10-30).
- [x] **What does `Clear` close?** All tabs except the active one (Tore, 2026-10-30).
- [x] **What does `New Tab` do?** A blank tab with the cursor in the address field, like Vivaldi's own
  new tab button; Cmd/Ctrl+T stays Quick Commands natively (Tore, 2026-10-31, replaces the answer of
  2026-10-30).
- [x] **Peek in a private window?** Kept (Tore, 2026-10-30).
- [x] **Can a mod open Quick Commands and the Downloads panel?** Not Quick Commands: `emulateUserInput`
  takes only a window id, a played Cmd+T changes nothing in the page, and no API runs a command
  (probes of Tore on Vivaldi 8.2, 2026-10-30 and 2026-10-31). The panel bar has a Downloads button
  that the module clicks. Decided: the `+` focuses the address field of a new blank tab (Tore,
  2026-10-31).

## References

- Tore's screenshot of Arc incognito, 2026-10-29 (thread "Definire la modalità Incognito come Arc").
- [004 Today tabs and keyboard](../004-today-tabs-and-keyboard/spec.md), Clear and archive.
- [011 Space header](../011-space-header/spec.md), FR-7 (module switch in `config.json`).
- `/mnt/project-files/spaces/analisi-spaces-arc.md` (project files), B11 bottom bar.
- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr).
