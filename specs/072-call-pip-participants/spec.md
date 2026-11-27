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
screen, when there is one, and the tiles of every participant, yours included.

## User stories

- **US-1.** As a user in a Meet call where someone presents, I want the floating window to show the
  slides and the faces of the participants, so that I see the reactions while I work in another tab.
- **US-2.** As a user in a call without a presentation, I want the floating window to show the
  participants together and not only one of them.
- **US-3.** As a user, I want the window to follow the call: when someone joins, leaves, starts or
  stops presenting, I do not have to close and reopen it.
- **US-4.** As a user, I want to see my own tile like the others, and an avatar for whoever has the
  camera off, so that I can tell at a glance whether my camera is on.
- **US-5.** As a user in a large call, I want to scroll through the participants with the left and
  right arrows when they do not all fit.

## Expected behavior

Today the shortcut, or a tab switch after a recent click, floats the largest playing video. In a
Meet call with a presentation, the page holds one large video (the shared screen, for example 670 by
436 pixels) and one small video per participant (about 324 by 182 pixels each, cropped to the tile),
and only the first is floated.

With this spec the window shows all of them in one picture. With a presentation, the shared screen
takes most of the window and the cameras sit beside it in a column or a grid, as in the call page.
Without a presentation, the cameras are laid out in a grid. Your own tile is
there like the others. A participant whose camera is off shows their avatar, the same picture the
call page shows, so a tile without a face tells you the camera is off, yours included. When the call
has more tiles than `maxTiles`, the window shows a page of them and the left and right arrows move
to the previous and the next page. The picture updates while the window is open: a participant who
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

- **FR-1.** WHEN the PiP window opens, it SHALL show a tile for every participant of the call page,
  the user included, and the shared screen, not only the largest video.
- **FR-2.** WHILE the call shows a shared screen, the window SHALL give it the larger part of the
  picture and place the cameras beside it.
- **FR-3.** WHILE the call shows no shared screen, the window SHALL lay the cameras out in a grid.
- **FR-4.** A participant without a live video track SHALL be shown as a tile with their avatar,
  as the call page shows it.
- **FR-5.** WHILE the window is open, the picture SHALL follow the videos of the page: a video that
  appears, disappears or changes size SHALL change the layout without closing the window.
- **FR-6.** IF the picture cannot be built on a page, THEN the module SHALL float the largest live
  video as 054 does, and log one warning.
- **FR-7.** WHERE the call has more tiles than `maxTiles` (default 9), the window SHALL show the shared
  screen first, then the tiles in the order of the page, `maxTiles` at a time, and the right and left
  arrows SHALL show the next and the previous page.
- **FR-9.** WHILE the shared screen is present it SHALL stay on every page, the arrows scrolling only
  the participants.
- **FR-8.** The module SHALL keep the triggers, the closing rules, the sites and the shortcut of 054
  unchanged (054 FR-2 to FR-12).

### Non-functional

- **NFR-1.** The module SHALL never block the window or the call: a page that does not match what the
  module expects keeps the behavior of 054.
- **NFR-2.** The module SHALL NOT read, store or send participant names, chat or call content; it only
  composes the videos and avatar pictures that the page already shows to the user, and the picture
  never leaves the browser.
- **NFR-3.** The picture SHALL NOT rely on the class names of the call site: only on its `<video>`
  elements, on the participant tile and avatar selectors and on the in-call selector, all in
  `src/selectors/` (NFR-4 of 054).
- **NFR-4.** The window SHALL keep updating while the call tab is hidden, which is its main use; if the
  browser throttles the page, the picture SHALL still refresh at least once per second.
- **NFR-5.** Same behavior on macOS and Debian.
- **NFR-6.** `maxTiles` and the layout SHALL be configured in `config.json` under `call-pip`.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the PiP window opens in a call with a shared screen and several participants THE page script SHALL put the shared screen and every participant tile, the user's own included, in the picture | auto: `floats the shared screen and the participants together` |
| AC-2 | WHILE a shared screen is present THE picture SHALL give it more area than any camera | auto: `gives the shared screen the larger area` |
| AC-3 | WHILE no shared screen is present THE picture SHALL lay the cameras out in a grid | auto: `lays the cameras out in a grid without a presentation` |
| AC-4 | WHEN a participant has no live video track THE picture SHALL show a tile with their avatar | auto: `shows the avatar of a participant without a live video` |
| AC-4b | WHEN the user's own camera is off THE picture SHALL show the user's avatar tile | auto: `shows the own tile with the camera off` |
| AC-5 | WHEN a participant joins, leaves or starts or stops presenting while the window is open THE picture SHALL change and the window SHALL stay open | auto: `updates the picture while the window is open` |
| AC-6 | IF the picture cannot be built THEN THE page script SHALL float the largest live video and send one `call-warning` | auto: `falls back to the largest video when the picture fails` |
| AC-7 | WHERE the call has more tiles than `maxTiles` THE picture SHALL hold the shared screen first and then the tiles in page order, up to `maxTiles` | auto: `limits the picture to the configured number of tiles` |
| AC-7b | WHEN the right or left arrow is pressed AND there are more tiles than fit THE picture SHALL show the next or the previous page, with the shared screen on every page | auto: `scrolls the tiles with the arrows` |
| AC-7c | WHEN the arrow is pressed on the first or last page THE picture SHALL stay as it is | auto: `stops the arrows at the first and last page` |
| AC-8 | WHEN the call tab is hidden THE picture SHALL refresh at least once per second | auto: `keeps refreshing the picture while the page is hidden` |
| AC-9 | THE triggers, closing rules and shortcut of 054 SHALL behave as before | auto: the tests of 054 AC-1 to AC-5 and AC-15 to AC-20, unchanged |
| AC-10 | WHEN I use the shortcut in a Meet call where someone presents THE window SHALL show the slides and the faces of the participants, and keep them moving after I switch tab | manual |
| AC-13 | WHEN my camera is off THE window SHALL show my avatar, and when I turn it on my face | manual |
| AC-14 | WHEN the call has more participants than `maxTiles` THE left and right arrows in the window SHALL scroll through them | manual |
| AC-11 | WHEN someone joins or leaves, or the presentation ends, THE window SHALL adapt without closing | manual |
| AC-12 | WHEN I stay on another tab for a minute THE faces in the window SHALL keep moving | manual |

## Out of scope

- Controls of the call in the window (mute, camera, hang up, chat), and the names of the participants:
  the window is a picture (NFR-2).
- Audio: the call keeps playing in its own tab.
- Calls in native apps and sites other than the four of 054.
- Choosing which participants appear, beyond the order of the page and `maxTiles`.
- The names of the participants under the tiles (NFR-2).
- Moving the call page itself into the window (Document Picture in Picture), see Q-1.

## Open questions

- [x] **Q-1.** How to build the picture. Decided by Tore: a `<canvas>` fed from the page's videos and
  `captureStream()`, floated with the existing `requestPictureInPicture()` and its user-activation
  rule; Document Picture in Picture is not used. Still to prove in a real call, as a task of the
  design: the canvas keeps refreshing while the tab is hidden (Chromium throttles timers and stops
  `requestAnimationFrame` in a hidden tab, and Meet may stop decoding tiles it does not show), see NFR-4.
- [x] **Q-2.** The user's own camera. Decided by Tore: it appears like the others.
- [x] **Q-3.** A participant with the camera off. Decided by Tore: their avatar appears, because it
  also tells the user whether their own camera is on.
- [x] **Q-4.** Default of `maxTiles`. Decided by Tore: 9, and the left and right arrows scroll through
  the rest (FR-7).
- [x] **Q-5.** Calls without a presentation. Decided by Tore: same behavior, the window always shows
  the call (FR-3).
- [ ] **Q-6.** The avatar picture. The call page shows it as an `<img>` from the Google avatar host,
  loaded with credentials. A canvas that draws a cross-origin image without CORS approval is tainted
  and `captureStream()` then fails. Proposed: draw the image the page already loaded; if a probe in a
  real call shows the canvas tainted, draw a neutral silhouette on a flat color instead, which still
  tells camera on from off. Which one ships depends on the probe.
- [ ] **Q-7.** How the arrows reach the page. The PiP window of a `<video>` belongs to the browser and
  forwards no key to the page. Proposed: register the Media Session actions `previoustrack` and
  `nexttrack`, which Chromium shows as buttons in the window, and check in a real Vivaldi whether the
  left and right arrow keys of the window trigger them (or `seekbackward` and `seekforward`). Plain
  arrows are never taken from the call page, where Meet uses them. Tore, is the buttons-in-the-window
  fallback acceptable if the keys cannot be reached?

## References

- [054 Call Picture in Picture](../054-call-pip/spec.md): the shortcut, the triggers and the
  probes this spec builds on. When 072 is implemented, 054 FR-2 and AC-6 are amended to point here.
- [038 Page scripts](../038-page-scripts/spec.md), how page code is built and injected.
