# 054 Call Picture in Picture

| | |
|---|---|
| Status | Draft |
| Phase | 5 |
| Owner | Tore |
| Approved | – (first version approved 2026-11-20 and withdrawn the same day: Vivaldi cannot open PiP on tab switch; this version follows Tore's choice of the shortcut, option A) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc, joining a Google Meet call and then switching to another tab minimizes the call into a
floating Picture in Picture (PiP) window that can be dragged and resized
([Arc: Google Meet integration](https://arc.net/integrations/google-meet)). Vivaldi cannot do this on
its own: it never invokes the page's PiP action when a tab is left, even with "Automatic
Picture-in-picture" allowed for the site, and a page cannot open PiP without a user gesture (probes of
2026-11-20, see [design.md](design.md)). This spec gets as close as a gesture allows: a shortcut,
pressed in the call page, floats the call over the other tabs, on Google Meet, Zoom, Discord and
Microsoft Teams.

## User stories

- **US-1.** As a user in a video call, I want one shortcut that floats the call over my other tabs,
  so that I can read or take notes while I keep seeing the people I talk to.
- **US-2.** As a user, I want the floating window to go away when I come back to the call tab, so that
  I never see the same call twice.
- **US-3.** As a user, I want the same shortcut on Meet, Zoom, Discord and Teams.
- **US-4.** As a user, I want to turn it off, for all sites or for one, and to choose the key.

## Expected behavior

In a tab with a call in progress, Cmd/Ctrl+Shift+P opens a PiP window with the call video; the same
shortcut, pressed again in the call tab, closes it. The window floats above every other window, can
be moved and resized, and is the browser's own PiP. Then the user switches tab as usual and the call
stays visible. Switching back to the call tab closes the window. Leaving the call, or closing the
tab, closes it too.

On a supported page without a call (a Meet landing page, a Zoom sign-in, a Discord text channel) the
shortcut does nothing and is not consumed, so the key keeps whatever meaning it has there. When a
call shows several videos, the largest playing video with a live track is floated.

Where Arc and VivArcDi deliberately differ: Arc floats the call on its own when the tab is left; here
the user presses a key first, because Vivaldi gives a page no other way to open PiP. The shortcut
works while the focus is in the call page; with the focus in Vivaldi's own interface the key is not
seen by the page and nothing happens. The four sites share one module and one list in `config.json`.

## Requirements

### Functional

- **FR-1.** The module SHALL support Google Meet (`meet.google.com`), Zoom web client
  (`app.zoom.us` and `*.zoom.us/wc`), Discord (`discord.com/channels`) and Microsoft Teams
  (`teams.microsoft.com`, `teams.live.com`, `teams.cloud.microsoft`).
- **FR-2.** WHEN the shortcut is pressed in a tab with a call in progress and no PiP window, the
  module SHALL open the PiP window with the call video.
- **FR-3.** WHEN the shortcut is pressed while that tab's PiP window is open, the module SHALL close
  it.
- **FR-4.** WHEN the call tab becomes the active tab again, the module SHALL close the PiP window it
  opened.
- **FR-5.** WHEN the call ends or its tab closes, the module SHALL close the PiP window.
- **FR-6.** A page on a supported site with no call in progress SHALL NOT open a PiP window and SHALL
  NOT have the shortcut consumed.
- **FR-7.** The sites SHALL be options of the module in `config.json`, each with an `enabled` flag, and
  the shortcut letter SHALL be an option, default `p`; the modifiers are Cmd/Ctrl+Shift as in the
  other shortcuts of VivArcDi. A disabled site SHALL behave as if it were not supported.
- **FR-8.** Page code SHALL run as a page script built as an IIFE bundle, as described in
  [038](../038-page-scripts/spec.md), and SHALL be injected only on the enabled sites.

### Non-functional

- **NFR-1.** The module SHALL never block the window or the call: a site whose page does not match
  what the module expects is left as it is, with a warning in the log.
- **NFR-2.** The module SHALL NOT read, store or send call content, participant names or chat; it only
  floats the video.
- **NFR-3.** Same behavior on macOS and Debian.
- **NFR-4.** Selectors for call detection go in `src/selectors/<version>.json`, none inline.
- **NFR-5.** The module SHALL NOT run in private windows ([013](../013-incognito-mode/spec.md)).

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the shortcut is pressed in a call tab THE page script SHALL open the PiP window with the call video | auto: `opens the call PiP on the shortcut` |
| AC-2 | WHEN the shortcut is pressed while the PiP window is open THE page script SHALL close it | auto: `closes the call PiP on the shortcut` |
| AC-3 | WHEN the call tab becomes active again THE module SHALL close the PiP window | auto: `closes the call PiP when the tab is shown again` |
| AC-4 | WHEN the call ends or the tab closes THE module SHALL close the PiP window | auto: `closes the call PiP when the call ends` |
| AC-5 | WHEN a supported page has no call in progress THE page script SHALL NOT open PiP and SHALL NOT consume the shortcut | auto: `ignores the shortcut without a call` |
| AC-6 | WHEN a call shows several videos THE page script SHALL float the largest playing one with a live track | auto: `floats the largest live video` |
| AC-7 | WHEN a site is disabled in the options THE module SHALL NOT inject its page script | auto: `skips a disabled site` |
| AC-8 | THE page script SHALL be injected on Meet, Zoom, Discord and Teams pages only | auto: `injects the call script on the four sites only` |
| AC-9 | WHEN the shortcut letter option changes THE page script SHALL answer the new letter only | auto: `uses the configured shortcut letter` |
| AC-10 | IF the page does not match what the module expects THEN THE module SHALL leave the page untouched and log a warning | auto: `leaves an unexpected call page untouched` |
| AC-11 | THE module SHALL NOT start in a private window | auto: `does not run in private windows` |
| AC-12 | WHEN I join a Google Meet call and press the shortcut THE call SHALL float in a PiP window that I can drag and resize, and stay visible when I switch tab | manual |
| AC-13 | WHEN I do the same on Zoom, Discord and Teams THE call SHALL float the same way | manual |
| AC-14 | WHEN I come back to the call tab THE PiP window SHALL close | manual |

## Out of scope

- Opening PiP by itself when the tab is left: Vivaldi gives no way (probes in `design.md`). If a
  future Vivaldi invokes the page's `enterpictureinpicture` action, a new spec can use it.
- A shortcut or command panel entry used while the focus is in Vivaldi's interface; the page sees no
  key then.
- Calls in native apps (Zoom, Teams and Discord desktop clients); only the web versions in a tab.
- Screen-sharing windows and chat in the PiP window, beyond what the browser's PiP shows.
- PiP for ordinary videos: Vivaldi already has its own button for them.
- Sites other than the four listed.

## Open questions

- [ ] **Q-1.** Is Cmd/Ctrl+Shift+P free in the four sites and in Vivaldi? Proposed: yes by default,
  and the letter is an option (FR-7) so a clash is a configuration change; Tore confirms in the manual
  check.
- [ ] **Q-2.** What is "a call in progress" on each site? Proposed: a live video track in a playing
  `<video>` plus a per-site selector for the in-call view, verified in a real call (T1 of the
  design).
- [ ] **Q-3.** Should the page script also register the `enterpictureinpicture` media session action,
  so that a future Vivaldi opens PiP on tab switch by itself? Proposed: no, nothing to prove it works
  and it would hide the day Vivaldi does it on its own.
- [ ] **Q-4.** Default state: on for all four sites? Proposed: yes, each can be disabled.

## References

- [Arc: Google Meet integration](https://arc.net/integrations/google-meet): "When you switch to
  another tab, your meeting will automatically minimize into PiP mode. You can also drag the window
  around and re-size it."
- [038 Page scripts](../038-page-scripts/spec.md), how page code is built and injected.
- [013 Incognito mode](../013-incognito-mode/spec.md), private windows.
- [014 Arc shortcuts](../014-arc-shortcuts/spec.md), the shortcut conventions.
- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr)
