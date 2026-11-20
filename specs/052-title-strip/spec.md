# 052 Title strip

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

On macOS the bar at the top of the window, with the traffic lights and the page title ("Inspect with
Chrome Developer Tools"), is white whatever the theme, and clicking it does nothing. This spec gives
that bar the colors of the active Arc theme and makes a click on it open the address bar, as the title
strip does in Arc.

## User stories

- **US-1.** As a user, I want the top bar of the window to take the color of my theme, so that the window looks like one piece.
- **US-2.** As a user, I want to click the title at the top to type a new address, so that I do not have to reach for the sidebar.

## Expected behavior

**What the probe found** (2026-11-20, lab Vivaldi 8.3 on macOS, `npm run live -- --probe`): the bar is
not in Vivaldi's `window.html`. `#browser` starts at the top of the page, there is no title bar element
and the window is about 35 px taller than the page, so the bar is the native macOS window title bar.
The payload cannot color or click what the operating system draws; the colors of the theme reach it
only through Vivaldi's own settings, if it has any.

**Proposal.** VivArcDi draws its own thin strip at the top of the page, in the palette of the active
theme (the same gradient or flat color, the same ink as the tab bar), and shows the title of the active
tab in it, centered. The native title is then hidden or made to blend with the strip, by the Vivaldi
setting that the design finds. A click on the strip opens the address bar: the address field takes
focus with its text selected, and it is revealed first if the UI is hidden (Automatically hide UI). The
strip follows the theme the same way the tab bar does ([051](../051-more-themes/spec.md)).

Arc shows the address of the page in that strip; VivArcDi shows the title and opens the field of
Vivaldi on click, so that the address field keeps being Vivaldi's own.

## Requirements

### Functional

- **FR-1.** A strip at the top of the page shows the title of the active tab, centered.
- **FR-2.** The strip uses the palette of the current theme and follows its changes.
- **FR-3.** A click on the strip focuses the address field and selects its text; with the UI hidden it shows the address bar first.
- **FR-4.** The strip does not appear where the native bar is not drawn (Debian, native window off), and a `strip` option in `config.json` turns it off.

### Non-functional

- **NFR-1.** The strip never blocks Vivaldi: if the address field is not found, a click does nothing.
- **NFR-2.** Text keeps a contrast of at least 4.5:1 on every palette.
- **NFR-3.** macOS 26 and later; Debian is unaffected.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE strip SHALL show the title of the active tab and follow its changes. | auto: `strip shows the active tab title` |
| AC-2 | WHEN the theme changes, THE strip SHALL take the palette of the new theme. | auto: `strip follows the theme palette` |
| AC-3 | WHEN the strip is clicked, THE module SHALL focus the address field and select its text. | auto: `strip click opens the address bar` |
| AC-4 | WHILE Automatically hide UI is on, WHEN the strip is clicked, THE module SHALL reveal the address bar first. | auto: `strip click reveals the hidden address bar` |
| AC-5 | IF the address field is not found, THEN a click on the strip SHALL do nothing and log a warning. | auto: `strip click without address field does nothing` |
| AC-6 | WHERE the option `strip` is false, THE module SHALL add nothing to the page. | auto: `strip option off adds nothing` |
| AC-7 | THE strip SHALL start on a lab Vivaldi without errors. | live: `strip boots` |
| AC-8 | WHEN Tore uses each theme on macOS, THE top of the window SHALL look like one piece with the tab bar, with no white band. | manual |
| AC-9 | WHEN Tore clicks the title at the top, THE address bar SHALL open ready to type. | manual |

## Out of scope

- Coloring the native macOS title bar itself from the payload: not possible from a web page.
- Showing the page address in the strip instead of the title.
- Buttons in the strip (back, forward, reload).

## Open questions

- [ ] How the native bar is hidden or blended: a Vivaldi setting, or a `Preferences` key written by the installer? The design finds it with a probe on Tore's real profile (the lab profile has `disable-titlebar` on, which his window does not seem to have).
- [ ] If Vivaldi offers no way to hide the native bar, is a colored strip under it still wanted, or is the spec dropped?
- [x] A click opens the address bar, not an inline text field (Tore, 2026-11-20).

## References

- [051 More Arc themes](../051-more-themes/spec.md), [028 Arc sidebar look](../028-arc-sidebar-look/spec.md).
- Probe of 2026-11-20: `#browser` classes `mac … disable-titlebar … macos26`, `#browser` top 0, window about 35 px taller than the page.
