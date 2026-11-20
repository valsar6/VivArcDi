# 052 Title bar

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

On macOS the bar at the top of the window, with the traffic lights and the page title ("Inspect with
Chrome Developer Tools"), keeps its default color whatever the Arc theme, and clicking it does nothing.
This spec gives that bar the colors of the active Arc theme and makes a click on it open the address
bar, as the title strip does in Arc.

## User stories

- **US-1.** As a user, I want the top bar of the window to take the color of my theme, so that the window looks like one piece.
- **US-2.** As a user, I want to click the title at the top to type a new address, so that I do not have to reach for the sidebar.

## Expected behavior

**What the probe found** (2026-11-20, Tore's real profile, Vivaldi 8.3 on macOS, pasted in DevTools):
the bar is part of Vivaldi's `window.html`. It is `#titlebar` (class `tabless`, 32 px high, at the top
of `#header`) and holds `#pagetitle` with the title in a `span`. The window is as tall as the page, so
nothing is drawn by the operating system. `Preferences` has `vivaldi.appearance.disable_title_bar` on
and `vivaldi.address_bar.visible` off, and `#browser` carries `address-top-off`: the address bar is not
shown, and the address field Tore sees lives in the sidebar. An earlier probe on the lab profile
suggested a native bar; the real profile shows it is not.

**Color.** `#titlebar` takes the palette of the current theme: the same gradient or flat color as the
window and the tab bar, so that the strip and the sidebar read as one surface, and the title in the
ink of the palette. It follows theme changes as the tab bar does ([051](../051-more-themes/spec.md)),
and stays colored with Automatically hide UI on.

**Click.** A click on `#titlebar`, outside the window controls, opens the address bar (Tore,
2026-11-20): the address field takes focus with its text selected, and it is shown first if Vivaldi
hides it. The design finds how Vivaldi shows its hidden address bar.

Arc shows the address of the page in that strip; VivArcDi keeps Vivaldi's title and its own address
field.

## Requirements

### Functional

- **FR-1.** `#titlebar` and its title use the palette of the current theme and follow its changes.
- **FR-2.** The colors hold with Automatically hide UI on.
- **FR-3.** A click on the title bar, outside its controls, opens the address bar with the text selected, showing it first when it is hidden.
- **FR-4.** The behavior is a module option in `config.json` and does nothing where `#titlebar` is absent.

### Non-functional

- **NFR-1.** The module never blocks Vivaldi: if the address field is not found, a click does nothing.
- **NFR-2.** Text keeps a contrast of at least 4.5:1 on every palette.
- **NFR-3.** macOS and Debian; the traffic lights and the window controls keep working, and the window can still be dragged by the bar.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE title bar SHALL take the background and ink of the palette of the current theme. | auto: `title bar takes the theme palette` |
| AC-2 | WHEN the theme changes, THE title bar SHALL take the palette of the new theme. | auto: `title bar follows the theme palette` |
| AC-3 | WHEN the title bar is clicked, THE module SHALL open the address bar and select its text. | auto: `title bar click opens the address bar` |
| AC-4 | WHILE the address bar is hidden, WHEN the title bar is clicked, THE module SHALL show it first. | auto: `title bar click shows the hidden address bar` |
| AC-5 | IF the address field is not found, THEN a click on the title bar SHALL do nothing and log a warning. | auto: `title bar click without address field does nothing` |
| AC-6 | WHERE the option is off, THE module SHALL change nothing. | auto: `title bar option off changes nothing` |
| AC-7 | THE title bar of a lab Vivaldi SHALL show the palette color of its theme. | live: `title bar shows the theme color` |
| AC-8 | WHEN Tore uses each theme on macOS, THE top of the window SHALL look like one piece with the sidebar, with no default-colored band, also with Automatically hide UI. | manual |
| AC-9 | WHEN Tore clicks the title at the top, THE address bar SHALL open ready to type, and the window SHALL still drag by the bar. | manual |

## Out of scope

- Showing the page address in the title bar instead of the title.
- Buttons in the title bar (back, forward, reload).
- Changing the window controls or the traffic lights.

## Open questions

- [ ] How the payload shows Vivaldi's hidden address bar (the design finds the command or the setting, and checks it with a probe).
- [ ] Which element carries the drag of the window, so that the click does not break it: the design checks `#titlebar` against its children.
- [x] A click opens the address bar, not an inline text field (Tore, 2026-11-20).
- [x] The bar is in the DOM, so no strip of VivArcDi is needed (probe of 2026-11-20, real profile).

## References

- [051 More Arc themes](../051-more-themes/spec.md), [028 Arc sidebar look](../028-arc-sidebar-look/spec.md).
- Probe of 2026-11-20 on the real profile: `#titlebar.tabless` 32 px, `#pagetitle` inside `#header`, `#browser` classes `mac maximized theme-id-vivarcdi-dark … address-top-off … macos26`.
