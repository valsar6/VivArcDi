# 072 Call Picture in Picture with the participants: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was `Approved`. It says **how**; the spec says **what**. It builds on the page
script of [054](../054-call-pip/design.md): the shortcut, the tab switch, the closing rules and the
user-activation rule do not change.

## Approach

**Compose the call on a canvas and float that.** The page of a call holds one `<video>` per tile. The
page script draws them on one `<canvas>`, turns it into a stream with `captureStream()`, plays the
stream in a hidden `<video>` and floats that video with `requestPictureInPicture()`, the call 054
already makes. The window stays the browser's own PiP and the gesture path is the one 054 proved.

Four small pieces, each with one reason to change:

- **`CallTiles`** reads the page and returns the tiles in page order. A tile is a participant element
  found with the selector `callMeetTile`: its `<video>` when it has a live frame, else the avatar
  `<img>` found with `callMeetTileAvatar`. The user's own tile is a tile like the others (FR-1), so
  nothing tells it apart. No name, no text is read (NFR-2).
- **`TileLayout`** (Strategy) turns a list of tiles and a canvas size into rectangles:
  `SpotlightLayout` gives the primary tile about 70 % of the width and stacks the others in a column
  or grid beside it; `GridLayout` is the rows and columns that fit the count best. The **primary tile**
  is the tile whose video has at least twice the area of the next one: a shared screen, and also a
  pinned or spotlighted participant, which deserves the same place. With no such tile the layout is a
  grid (FR-2, FR-3, Q-5). This needs no marker of "presentation", which Meet gives only in a
  language-dependent label.
- **`TilePager`** keeps the page number. `maxTiles` counts the primary tile too, so a page holds the
  primary tile and up to `maxTiles - 1` others; without a primary tile it holds `maxTiles`. `next()` and
  `previous()` stop at the ends (AC-7d). It is rebuilt from `CallTiles` at each frame, so a participant
  who leaves cannot leave an empty page (FR-5, FR-9).
- **`PipPicture`** owns the canvas, the hidden `<video>`, the `Ticker` and the layout: `open()` builds
  them, draws a first frame synchronously, starts the stream and returns the video to float; `dispose()`
  stops the ticker and the tracks and removes the video. A `leavepictureinpicture` event on the video
  disposes it too, so a window closed with its own X leaves nothing behind.

**`OpenPipCommand` takes a source.** Today it asks `CallVideo.pick`. It now asks a `PipSource`
(Strategy): `ComposedPipSource` (this spec) or `LargestVideoSource` (054's behavior, `CallVideo.pick`).
If composing fails (no `captureStream`, a tainted canvas that the silhouette fallback cannot fix, an
exception), the command warns once with `composition-failed` and uses `LargestVideoSource`: the user
gets the window of 054 and never nothing (FR-6, NFR-1).

**`CallControls`** (Command) registers the Media Session actions while the window is open and removes
them when it closes:

| Action | Command | Page control |
|---|---|---|
| `togglemicrophone` | `ClickCallControl('microphone')` | selector `callMeetMicrophone` |
| `togglecamera` | `ClickCallControl('camera')` | selector `callMeetCamera` |
| `hangup` | `ClickCallControl('leave')` | selector `callMeetInCall` (the leave button of 054) |
| `previoustrack`, `nexttrack` | `TilePager.previous`, `TilePager.next` | none |

A control that is not found sends one `call-warning` (`control-not-found`) and does nothing (AC-18).
The state of the two buttons comes from the page: a `MutationObserver` on the microphone and the
camera buttons reads `data-is-muted`, and calls `navigator.mediaSession.setMicrophoneActive` and
`setCameraActive`, so a change made in the page, with a key or with the mouse, reaches the window
(FR-11). A `MutationObserver` is not throttled in a hidden tab, unlike a timer.

**Keys.** While the window is open the call tab is hidden (054 FR-4 closes the window on return), so
the page cannot be the target of a key of the user, and a `keydown` of `ArrowLeft` or `ArrowRight`
that arrives then can only come from the window. The hook listens for exactly those two keys while the
window is open and pages. Nothing is listened for when the window is closed, so Meet keeps its arrows
(Q-7). If the probe of T1 shows the window turns the arrows into `seekbackward` and `seekforward`,
those two actions are mapped to paging too.

**The picture keeps moving in a hidden tab (NFR-4).** The page of a call is hidden while the window
is open, and Chromium clamps its timers to one per second and stops `requestAnimationFrame`. `Ticker`
(Strategy) hides the choice:

- `WorkerTicker` runs a tiny worker, built from a `Blob`, that posts a message every 66 ms; timers of
  a worker are not clamped. It needs the site's content security policy to allow `blob:` workers.
- `TimerTicker` uses `setInterval` at 1000 ms, the floor of NFR-4, and is the fallback when the worker
  cannot start.

Meet may also stop decoding the tiles it does not show. If T1 shows frozen sources in a hidden tab, the
design escalates to `MediaStreamTrackProcessor` in a worker, which reads the tracks, not the elements;
that is a new spec if it is needed.

```text
page (call-pip.ts)
CallPipHook ─ shortcut / tab switch ─▶ OpenPipCommand(source, allowed)
                                          ├─ ComposedPipSource ─▶ PipPicture(CallTiles, TileLayout, TilePager, Ticker)
                                          └─ LargestVideoSource (fallback, 054)
            ─ on open ─▶ CallControls (Media Session actions, state observer) + arrow keys
            ─ on close / leavepictureinpicture ─▶ PipPicture.dispose, CallControls.release
```

### Avatar and the canvas (Q-6)

The avatar is an `<img>` from the Google avatar host that the page loaded with `crossorigin=use-credentials`.
Drawing it on the canvas taints the canvas unless the host answers with CORS headers for the page's
origin; a tainted canvas makes `captureStream()` produce nothing. `AvatarSource` (Strategy) therefore
has two forms: `PageImageAvatar` draws the loaded image, and `SilhouetteAvatar` draws a neutral shape on
a flat color. `PipPicture` starts with the image, checks once by reading one pixel of the canvas whether
it is tainted (a `SecurityError`), and keeps the silhouette for the rest of the call if it is. Both tell
camera on from off, which is what US-4 asks. T1 decides which one a real call needs.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/page/lib/CallTiles.ts` | Reads the tiles of the page, in order, each as video or avatar | – |
| `src/page/lib/TileLayout.ts` | `TileLayout`, `SpotlightLayout`, `GridLayout`: tiles and size to rectangles | Strategy |
| `src/page/lib/TilePager.ts` | The page of tiles, `next`, `previous`, the primary tile on every page | – |
| `src/page/lib/Ticker.ts` | `Ticker`, `WorkerTicker`, `TimerTicker` | Strategy |
| `src/page/lib/AvatarSource.ts` | `PageImageAvatar`, `SilhouetteAvatar` | Strategy |
| `src/page/lib/PipPicture.ts` | Canvas, hidden video, ticker, layout; `open`, `dispose` | Facade |
| `src/page/lib/PipSource.ts` | `PipSource`, `ComposedPipSource`, `LargestVideoSource` | Strategy |
| `src/page/lib/CallControls.ts` | Media Session actions, button state observer, `ClickCallControl` | Command |
| `src/page/lib/PipCommand.ts` | `OpenPipCommand` takes a `PipSource` | Command |
| `src/page/lib/CallPipHook.ts` | Builds the source and the controls, listens for the two arrows while the window is open | Invoker |
| `src/modules/callpip/CallPipOptions.ts` | New option `maxTiles` | – |
| `src/modules/callpip/CallSites.ts` | A site carries its selector keys: in-call, tile, avatar, microphone, camera | Registry |
| `src/modules/callpip/CallMessage.ts` | `CallPagePolicy` gains the selectors and `maxTiles`; new reasons `composition-failed`, `control-not-found` | – |

```ts
export interface PipSource {
  /**
   * @returns The video to float, or null when the call has nothing to show.
   */
  prepare(): Promise<HTMLVideoElement | null>;
  release(): void;
}

export interface CallSelectors {
  inCall: string;
  tile: string;
  avatar: string;
  microphone: string;
  camera: string;
}

export interface CallPagePolicy {
  token: string;
  tabId: number;
  letter: string;
  maxTiles: number;
  selectors: CallSelectors;
}
```

The in-call selector moves into `selectors.inCall`; `CallDetector` and `CallPipHook` read it from there.
Nothing else in 054's public surface changes, so its tests stay as they are (AC-9).

## Vivaldi interface

No interface change beyond the policy. Selector keys added to `src/selectors/8.1.json` and read through
`context.selectors` (NFR-3):

| Key | Purpose | Initial value, to confirm in T1 |
|---|---|---|
| `callMeetTile` | A participant tile, the user's own included | `[data-participant-id]` |
| `callMeetTileAvatar` | The avatar picture inside a tile | `img[src*="googleusercontent.com"]` |
| `callMeetMicrophone` | The microphone button of the call bar | `button[data-is-muted][jsname="BOHaEe"]` |
| `callMeetCamera` | The camera button of the call bar | `button[data-is-muted][jsname="psRWwc"]` |

`callMeetInCall` stays the leave button. These selectors are Meet's, not Vivaldi's:
`tests/live/selector-states.json` marks them as not checked by the live selector check, as it does for
`callMeetInCall`. The values of the microphone and camera buttons are the first to try and T1 replaces
them with what a real call shows; none may depend on the language of the page.

## Configuration

`src/config.json`:

```json
"call-pip": {
  "enabled": true,
  "meet": true,
  "openOnTabSwitch": true,
  "shortcutLetter": "p",
  "maxTiles": 9
}
```

`maxTiles` is `Option.number(9, { min: 2, max: 25 })` (NFR-6).

## Risks

| Risk | Mitigation |
|---|---|
| Chromium shows the video-call actions (microphone, camera, hang up) and the track buttons only in part | FR-12: the three call actions win; paging falls back to the arrows; T1 records what the window shows |
| The window turns the arrow keys into nothing the page sees | T1 probes the keys and `seekbackward`/`seekforward`; with neither, the buttons are the only way and the spec says so in the manual check |
| A hidden tab freezes the picture | `WorkerTicker`, then `TimerTicker` at 1 s; T1 measures both and the decoding of Meet's hidden tiles |
| The page's content security policy blocks the `blob:` worker | `TimerTicker` fallback, never an error (NFR-1) |
| The avatar image taints the canvas | `SilhouetteAvatar`, decided by a one-pixel check at the first frame |
| Meet registers its own Media Session actions and ours replace them | Ours run the same clicks; on close they are removed, and T1 checks whether Meet's are lost, in which case they stay registered until `uninstall` |
| The primary-tile rule (twice the next area) picks a pinned participant | Acceptable by design: the page shows it large as well |
| Selectors of Meet change | Selectors are data; a mismatch means the fallback window of 054 and one warning, never a broken page (NFR-1) |

## Probes (T1, real Meet call, by Tore)

One probe script, run from `npm run live -- --probe` is not possible on a real call; it is pasted in the
DevTools console of the call page, as T1 of 054 was. It answers:

1. Which attribute of each tile marks it (`data-participant-id`), which `<img>` is the avatar, and how
   a tile with the camera off differs from one with it on (`track.muted`, `readyState`, `videoWidth`).
2. The attributes of the microphone, camera and leave buttons that do not depend on the language.
3. Whether the canvas is tainted after drawing the avatar.
4. With the window open and the tab hidden: do the source videos keep advancing frames (`currentTime`),
   and does a canvas drawn by `WorkerTicker` and by `TimerTicker` keep changing.
5. Which buttons the window shows for the three call actions with and without `previoustrack` and
   `nexttrack`, and which events the window's arrow keys produce.
6. Whether Meet registers its own Media Session actions.
