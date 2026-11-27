# 072 Call Picture in Picture with the participants

| | |
|---|---|
| Status | Draft |
| Phase | 5 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

The call Picture in Picture of [054](../054-call-pip/spec.md) floats one video: the largest live one.
While someone shares a presentation, that is the shared screen, so the PiP window shows the slides
and none of the people in the call. This spec makes the window carry the whole call: the shared
screen, when there is one, and the cameras of the participants.

## User stories

- **US-1.** As a user in a Meet call where someone presents, I want the floating window to show the
  slides and the faces of the participants, so that I see the reactions while I work in another tab.
- **US-2.** As a user in a call without a presentation, I want the floating window to show the
  participants together and not only one of them.
- **US-3.** As a user, I want the window to follow the call: when someone joins, leaves, starts or
  stops presenting, I do not have to close and reopen it.

## Expected behavior

Today the shortcut, or a tab switch after a recent click, floats the largest playing video. In a
Meet call with a presentation, the page holds one large video (the shared screen, for example 670 by
436 pixels) and one small video per participant (about 324 by 182 pixels each, cropped to the tile),
and only the first is floated.

With this spec the window shows all of them in one picture. With a presentation, the shared screen
takes most of the window and the cameras sit beside it in a column or a grid, as in the call page.
Without a presentation, the cameras are laid out in a grid. A participant whose camera is off, and so
has no live video, takes no space. The picture updates while the window is open: a participant who
joins or leaves, a presentation that starts or stops, and a camera that turns on or off change the
layout without closing the window.

Everything else of 054 stays: the shortcut, the opening on a tab switch with its user-activation
limit, the closing on return to the call tab or at the end of the call, the sites and the options.
This spec replaces what the window shows, not when it opens.

The window stays the browser's own Picture in Picture, so it floats above other windows and can be
moved and resized. The call itself, its audio and its page are untouched; the window is a picture of
the videos and has no controls of the call.

## Requirements

### Functional

- **FR-1.** WHEN the PiP window opens, it SHALL show every playing video with a live video track in
  the call page, not only the largest one.
- **FR-2.** WHILE the call shows a shared screen, the window SHALL give it the larger part of the
  picture and place the cameras beside it.
- **FR-3.** WHILE the call shows no shared screen, the window SHALL lay the cameras out in a grid.
- **FR-4.** A video without a live track SHALL take no space in the picture.
- **FR-5.** WHILE the window is open, the picture SHALL follow the videos of the page: a video that
  appears, disappears or changes size SHALL change the layout without closing the window.
- **FR-6.** IF the picture cannot be built on a page, THEN the module SHALL float the largest live
  video as 054 does, and log one warning.
- **FR-7.** WHERE the call has more videos than fit legibly, the window SHALL show the shared screen
  first, then the cameras in the order of the page, up to a limit set by the option `maxTiles`.
- **FR-8.** The module SHALL keep the triggers, the closing rules, the sites and the shortcut of 054
  unchanged (054 FR-2 to FR-12).

### Non-functional

- **NFR-1.** The module SHALL never block the window or the call: a page that does not match what the
  module expects keeps the behavior of 054.
- **NFR-2.** The module SHALL NOT read, store or send participant names, chat or call content; it only
  composes the video that the page already shows to the user.
- **NFR-3.** The picture SHALL NOT rely on the class names of the call site: only on its `<video>`
  elements and on the in-call selector of 054 (NFR-4 of 054: selectors in `src/selectors/`).
- **NFR-4.** The window SHALL keep updating while the call tab is hidden, which is its main use; if the
  browser throttles the page, the picture SHALL still refresh at least once per second.
- **NFR-5.** Same behavior on macOS and Debian.
- **NFR-6.** `maxTiles` and the layout SHALL be configured in `config.json` under `call-pip`.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the PiP window opens in a call with a shared screen and several cameras THE page script SHALL put the shared screen and every camera with a live track in the picture | auto: `floats the shared screen and the cameras together` |
| AC-2 | WHILE a shared screen is present THE picture SHALL give it more area than any camera | auto: `gives the shared screen the larger area` |
| AC-3 | WHILE no shared screen is present THE picture SHALL lay the cameras out in a grid | auto: `lays the cameras out in a grid without a presentation` |
| AC-4 | WHEN a video has no live track THE picture SHALL NOT reserve space for it | auto: `skips a video without a live track` |
| AC-5 | WHEN a participant joins, leaves or starts or stops presenting while the window is open THE picture SHALL change and the window SHALL stay open | auto: `updates the picture while the window is open` |
| AC-6 | IF the picture cannot be built THEN THE page script SHALL float the largest live video and send one `call-warning` | auto: `falls back to the largest video when the picture fails` |
| AC-7 | WHERE the call has more videos than `maxTiles` THE picture SHALL hold the shared screen first and then the cameras in page order, up to `maxTiles` | auto: `limits the picture to the configured number of tiles` |
| AC-8 | WHEN the call tab is hidden THE picture SHALL refresh at least once per second | auto: `keeps refreshing the picture while the page is hidden` |
| AC-9 | THE triggers, closing rules and shortcut of 054 SHALL behave as before | auto: the tests of 054 AC-1 to AC-5 and AC-15 to AC-20, unchanged |
| AC-10 | WHEN I use the shortcut in a Meet call where someone presents THE window SHALL show the slides and the faces of the participants, and keep them moving after I switch tab | manual |
| AC-11 | WHEN someone joins or leaves, or the presentation ends, THE window SHALL adapt without closing | manual |
| AC-12 | WHEN I stay on another tab for a minute THE faces in the window SHALL keep moving | manual |

## Out of scope

- Controls of the call in the window (mute, camera, hang up, chat), and the names of the participants:
  the window is a picture (NFR-2).
- Audio: the call keeps playing in its own tab.
- Calls in native apps and sites other than the four of 054.
- Choosing which participants appear, beyond the order of the page and `maxTiles`.
- Moving the call page itself into the window (Document Picture in Picture), see Q-1.

## Open questions

- [ ] **Q-1.** How to build the picture. Proposed: draw all live videos on one `<canvas>`, turn it into a
  video with `captureStream()` and float that video with the same `requestPictureInPicture()` and the same
  user-activation rule as today. It needs only `<video>` elements (NFR-3) and keeps the gesture path that
  054 proved. The alternative is Document Picture in Picture (`documentPictureInPicture` exists in Vivaldi 8.1),
  moving the call grid element of the page into the window: it keeps names and per-tile controls, but it
  depends on Meet's obfuscated classes and layout script, which compute positions from the container. Two
  probes in a real call decide: (a) a canvas fed from the page's videos keeps refreshing while the tab is
  hidden (Chromium throttles timers and stops `requestAnimationFrame` in a hidden tab, and Meet may stop
  decoding tiles it does not show); (b) the moved grid keeps working in the other window.
- [ ] **Q-2.** Does the user's own camera appear in the window? Proposed: no, as the window answers "who
  am I talking to"; the own tile is the one with the controls (the pasted markup shows a `frame_person`
  button on it) and can be told apart without class names only by its mirrored video.
- [ ] **Q-3.** A participant with the camera off shows an avatar in the page and has no live video.
  Proposed: they do not appear (FR-4). The alternative is a tile with the initial, which needs the
  participant name and so conflicts with NFR-2.
- [ ] **Q-4.** Default of `maxTiles`. Proposed: 9 (one shared screen and eight cameras, or a 3 by 3 grid).
- [ ] **Q-5.** Does the new picture replace the old behavior for calls without a presentation too?
  Proposed: yes (FR-3), so the window always shows the call and not one participant.

## References

- [054 Call Picture in Picture](../054-call-pip/spec.md): the shortcut, the triggers and the
  probes this spec builds on. When 072 is implemented, 054 FR-2 and AC-6 are amended to point here.
- [038 Page scripts](../038-page-scripts/spec.md), how page code is built and injected.
