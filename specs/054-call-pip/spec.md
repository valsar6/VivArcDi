# 054 Call Picture in Picture

| | |
|---|---|
| Status | Draft |
| Phase | 5 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc, joining a Google Meet call and then switching to another tab minimizes the call into a
floating Picture in Picture (PiP) window that can be dragged and resized
([Arc: Google Meet integration](https://arc.net/integrations/google-meet)). This spec brings the same
behavior to Vivaldi for the four calling sites people use most: Google Meet, Zoom, Discord and
Microsoft Teams, so that leaving the call tab never means losing sight of the call.

## User stories

- **US-1.** As a user in a video call, I want the call to float over my other tabs when I switch away
  from it, so that I can read or take notes while I keep seeing the people I talk to.
- **US-2.** As a user, I want the floating window to go away when I come back to the call tab, so that
  I never see the same call twice.
- **US-3.** As a user, I want the same behavior on Meet, Zoom, Discord and Teams, so that I do not
  have to remember which site supports it.
- **US-4.** As a user, I want to turn it off, for all sites or for one, when I prefer the call to stay
  in its tab.

## Expected behavior

While a call is running in a tab, switching to another tab opens a PiP window with the call video.
The window floats above every other window, can be moved to any corner and resized, and shows the
participants as the site's own PiP does. Switching back to the call tab closes the window and the
call is in its tab again. Leaving the call, or closing the tab, closes the window too.

Nothing happens on pages that are not a call: a Meet landing page, a Zoom sign-in page or a Discord
text channel do not open a PiP window. A call tab that is already shown in PiP is not opened twice.

Where Arc and VivArcDi deliberately differ: Arc has a built-in integration for Meet only; here the
four sites share one module and one list of sites in `config.json`, so a fifth site is a line of
configuration plus its selectors, not new code.

What the call video is differs by site, and the design must probe it before any code (see Q-1 to
Q-3): the site's own media session handler, a page script that asks for PiP, or the Document
Picture-in-Picture window that Meet and Teams already use.

## Requirements

### Functional

- **FR-1.** The module SHALL support Google Meet (`meet.google.com`), Zoom web client
  (`app.zoom.us` and `*.zoom.us/wc`), Discord (`discord.com/channels`) and Microsoft Teams
  (`teams.microsoft.com`, `teams.live.com`, `teams.cloud.microsoft`).
- **FR-2.** WHEN the active tab changes away from a tab that has a call in progress, the module SHALL
  open the PiP window for that call.
- **FR-3.** WHEN the call tab becomes the active tab again, the module SHALL close the PiP window it
  opened.
- **FR-4.** WHEN the call ends or its tab closes, the module SHALL close the PiP window.
- **FR-5.** A page that is on a supported site but has no call in progress SHALL NOT open a PiP
  window.
- **FR-6.** The sites SHALL be listed in `config.json` as options of the module, each with an
  `enabled` flag, and a disabled site SHALL behave as if it were not supported.
- **FR-7.** The module SHALL NOT take the PiP window from a call that the user closed by hand: after
  the user closes it, it SHALL NOT reopen until the user leaves the call tab again.
- **FR-8.** Page code SHALL run as a page script built as an IIFE bundle, as described in
  [038](../038-page-scripts/spec.md), and SHALL be injected only on the listed sites.

### Non-functional

- **NFR-1.** The module SHALL never block the window or the call: a site whose page does not match
  what the module expects is left as it is, with a warning in the log.
- **NFR-2.** The module SHALL NOT read, store or send call content, participant names or chat; it only
  asks for the PiP window.
- **NFR-3.** Same behavior on macOS and Debian.
- **NFR-4.** Selectors for call detection go in `src/selectors/<version>.json` or in the per-site
  configuration, none inline in the code.
- **NFR-5.** The module SHALL NOT run in private windows, since it works on calls the user did not
  choose to share ([013](../013-incognito-mode/spec.md)).

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the active tab changes away from a call tab THE module SHALL ask the page to open the PiP window | auto: `opens the call PiP when the tab is left` |
| AC-2 | WHEN the call tab becomes active again THE module SHALL close the PiP window | auto: `closes the call PiP when the tab is shown again` |
| AC-3 | WHEN the call ends or the tab closes THE module SHALL close the PiP window | auto: `closes the call PiP when the call ends` |
| AC-4 | WHEN a supported page has no call in progress THE module SHALL NOT open a PiP window | auto: `does not open a PiP window without a call` |
| AC-5 | WHEN a call is already in PiP THE module SHALL NOT open a second window | auto: `does not open the call PiP twice` |
| AC-6 | WHEN the user closes the PiP window by hand THE module SHALL NOT reopen it until the user leaves the call tab again | auto: `does not reopen a PiP window closed by the user` |
| AC-7 | WHEN a site is disabled in the options THE module SHALL NOT inject its page script | auto: `skips a disabled site` |
| AC-8 | THE page script SHALL be injected on Meet, Zoom, Discord and Teams pages only | auto: `injects the call script on the four sites only` |
| AC-9 | IF the page does not match what the module expects THEN THE module SHALL leave the page untouched and log a warning | auto: `leaves an unexpected call page untouched` |
| AC-10 | THE module SHALL NOT start in a private window | auto: `does not run in private windows` |
| AC-11 | WHEN I join a Google Meet call and switch to another tab THE call SHALL float in a PiP window that I can drag and resize | manual |
| AC-12 | WHEN I do the same on Zoom, Discord and Teams THE call SHALL float the same way | manual |
| AC-13 | WHEN I come back to the call tab THE PiP window SHALL close | manual |

## Out of scope

- Calls in native apps (Zoom, Teams and Discord desktop clients); only the web versions in a tab.
- Screen-sharing windows and chat in the PiP window, beyond what the site's own PiP shows.
- PiP for ordinary videos (YouTube, Vimeo): Vivaldi already has its own button for them.
- Controls on the PiP window that the site does not provide, such as a mute button of our own.
- Sites other than the four listed; the configuration allows them later but this spec does not
  promise them.

## Open questions

- [ ] **Q-1.** How does PiP open on tab switch? Proposed: Chromium opens PiP by itself when a site
  registers the media session action `enterpictureinpicture` and the site has the permission
  "Automatic picture-in-picture"; Meet and Teams do register it. Probe on the lab copy (Vivaldi 8.2)
  whether Vivaldi honors it; if it does, the module only grants the permission on the four sites and
  no page script is needed for them.
- [ ] **Q-2.** Zoom web and Discord do not register that action, and a page cannot open PiP without a
  user gesture. Proposed: the page script registers `enterpictureinpicture` itself and hands the
  call `<video>` to PiP; if Vivaldi refuses without a gesture, fall back to the extension API that
  opens PiP for a tab, and if there is none, ship Meet and Teams first and mark Zoom and Discord as a
  follow-up spec.
- [ ] **Q-3.** What is "a call in progress" on each site? Proposed: a live `<video>` or
  `MediaStreamTrack` that is playing and not muted, plus a per-site selector for the in-call view,
  verified by a probe in a real call (T1 of the design).
- [ ] **Q-4.** Should PiP also open when I switch to another application, not only to another tab?
  Proposed: no, tab switch only, as in Arc.
- [ ] **Q-5.** Default state: on for all four sites? Proposed: yes, each site can be disabled
  (FR-6); no global shortcut.
- [ ] **Q-6.** Can the live check join a real call? Proposed: no; the lab Vivaldi cannot sign in, so
  AC-11 to AC-13 stay `manual` and the automated tests use a fake page that registers the media
  session action.

## References

- [Arc: Google Meet integration](https://arc.net/integrations/google-meet): "When you switch to
  another tab, your meeting will automatically minimize into PiP mode. You can also drag the window
  around and re-size it."
- [038 Page scripts](../038-page-scripts/spec.md), how page code is built and injected.
- [013 Incognito mode](../013-incognito-mode/spec.md), private windows.
- [Google Workspace Updates: picture-in-picture in Meet on tab switch](https://workspaceupdates.googleblog.com/2024/08/picture-in-picture-in-google-meet-will-open-when-switching-tabs.html)
- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr)
