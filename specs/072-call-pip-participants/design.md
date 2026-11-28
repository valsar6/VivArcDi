# 072 Call Picture in Picture with the participants: design

| | |
|---|---|
| Status | Approved |
| Approved | Tore, 2026-11-27 |
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
  is the tile whose video has at least one and a half times the area of the next one: a shared screen, and also a
  pinned or spotlighted participant, which deserves the same place. With no such tile the layout is a
  grid (FR-2, FR-3, Q-5). This needs no marker of "presentation", which Meet gives only in a
  language-dependent label.
- **`TilePager`** keeps the page number. `maxTiles` counts the primary tile too, so a page holds the
  primary tile and up to `maxTiles - 1` others; without a primary tile it holds `maxTiles`. `next()` and
  `previous()` stop at the ends (AC-7d). It is rebuilt from `CallTiles` at each frame, so a participant
  who leaves cannot leave an empty page (FR-5, FR-9).
- **`PipPicture`** owns the canvas, the hidden `<video>`, the 66 ms interval and the layout: `open()` builds
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

**The picture keeps moving in a hidden tab (NFR-4).** A plain `setInterval` of 66 ms (about 15
pictures per second) draws the canvas. The page of a call is hidden while the window is open, and
Chromium clamps the timers of a hidden page to one per second and stops `requestAnimationFrame`; but the
lab probe of 2026-11-27 shows that a page with a floating PiP window is not throttled at all, so the
interval keeps its rate (see the results below). A worker would add a `Blob` and a Trusted Types policy
for nothing and is dropped. If a real Meet call shows the picture freezing, the design escalates to a
worker ticker, or to `MediaStreamTrackProcessor`, as a new decision.

```text
page (call-pip.ts)
CallPipHook ─ shortcut / tab switch ─▶ OpenPipCommand(source, allowed)
                                          ├─ ComposedPipSource ─▶ PipPicture(CallTiles, TileLayout, TilePager)
                                          └─ LargestVideoSource (fallback, 054)
            ─ on open ─▶ CallControls (Media Session actions, state observer) + arrow keys
            ─ on close / leavepictureinpicture ─▶ PipPicture.dispose, CallControls.release
```

### Avatar and the canvas (Q-6)

A canvas that has drawn an image without CORS approval is tainted for good, and `captureStream()` on it
throws `SecurityError: Canvas is not origin-clean` (seen in the lab). The avatar `<img>` that Meet shows
at full size has no `crossorigin` attribute, so drawing it would taint the canvas. The Google avatar host
answers with `access-control-allow-origin: https://meet.google.com` and
`access-control-allow-credentials: true` (curl, 2026-11-27, on the default avatar), so the same picture
loaded with `crossOrigin = 'use-credentials'` is clean. `CredentialedAvatars` therefore never draws the
page's own image:

- `CredentialedAvatars` loads its own copy of the largest avatar of the tile with
  `crossOrigin = 'use-credentials'`, caches it by address and draws it once loaded;
- the silhouette, a neutral shape on a flat color, is drawn while the copy loads and whenever it fails.

Both tell camera on from off, which is what US-4 asks. No pixel check is needed, since an image that is
not CORS-approved is never drawn.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/page/lib/CallTiles.ts` | Reads the tiles of the page, in order, each as video or avatar | – |
| `src/page/lib/TileLayout.ts` | `TileLayout`, `SpotlightLayout`, `GridLayout`: tiles and size to rectangles | Strategy |
| `src/page/lib/TilePager.ts` | The page of tiles, `next`, `previous`, the primary tile on every page | – |
| `src/page/lib/CredentialedAvatars.ts` | Loads each avatar again with credentials; the silhouette is drawn while it loads or when it fails | – |
| `src/page/lib/PipPicture.ts` | Canvas, hidden video, the 66 ms interval, layout; `open`, `dispose` | Facade |
| `src/page/lib/BrowserPicture.ts` | The canvas, video and images of the real page, and the `MutationObserver` of the muted attribute | Adapter |
| `src/page/lib/PipSource.ts` | `PipSource`, `ComposedPipSource`, `LargestVideoSource`, `PictureObserver` | Strategy, Observer |
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
| A hidden tab freezes the picture | The lab shows no throttling while the window is open; T1 confirms it in a real call, together with Meet's own decoding of hidden tiles |
| The avatar taints the canvas | Never draw the page's image: `CredentialedAvatars`, or the silhouette |
| Meet registers its own Media Session actions and ours replace them | Ours run the same clicks; on close they are removed, and T1 checks whether Meet's are lost, in which case they stay registered until `uninstall` |
| The primary-tile rule (twice the next area) picks a pinned participant | Acceptable by design: the page shows it large as well |
| Selectors of Meet change | Selectors are data; a mismatch means the fallback window of 054 and one warning, never a broken page (NFR-1) |

## Lab probe results (Vivaldi 8.3.4191.47, Chromium 156, 2026-11-27)

Run by the agent with Tore's approval, on a lab copy of Vivaldi with a throwaway profile, on a page served
from `127.0.0.1` with the content security policy of Meet (`require-trusted-types-for 'script'`, a nonce,
`strict-dynamic`, no `worker-src`), ten tiles (a shared screen drawn on a canvas, seven fake cameras, two
avatar-only tiles) and the probe of T1 driven over the debugging port with a user gesture.

| Question | Result |
|---|---|
| Is the composed canvas floatable? | Yes: `captureStream()` on the canvas, played in a hidden `<video>`, opens a PiP window of 336 x 189 for the 1280 x 720 canvas |
| Hidden tab, no PiP window | Timer of 66 ms: 1 per second. `requestAnimationFrame`: 0. A worker's timer: 15 per second |
| Hidden tab, PiP window open | Timer: 15 per second. `requestAnimationFrame`: about 120 per second. The picture was drawn 15.2 times per second with a plain interval or with a worker: no throttling |
| Do the source videos keep advancing while the tab is hidden? | Yes, 8 of 8 live videos (fake streams; Meet's own behavior is still open) |
| Taint | A cross-origin image without CORS made `captureStream()` throw; with the silhouette instead the canvas stayed clean |
| Blob worker under Meet's policy | Works with a Trusted Types policy (`createScriptURL`); without one `new Worker` would be refused; not needed after all |
| Media Session | `togglemicrophone`, `togglecamera`, `hangup`, `previoustrack`, `nexttrack`, `seekbackward`, `seekforward` register without error; `setMicrophoneActive` and `setCameraActive` exist |
| Google avatar host | `access-control-allow-origin: https://meet.google.com` and `access-control-allow-credentials: true` |

Meet's own policy has no `worker-src`, so it falls back to `script-src`, which is a nonce with
`strict-dynamic`.

### Real call probe (Meet, Vivaldi 8.3, 2026-11-27)

Run by Tore in a real call with a shared screen and two participants with the camera off.

| Question | Result |
|---|---|
| Tiles | `[data-participant-id]` finds one tile per participant and one for the shared screen; the shared screen has a `<video>` of 3000 x 1872, the camera-off tiles have no `<video>` at all and two avatar `<img>` (50 x 50 with `crossorigin=use-credentials`, 320 x 320 without) |
| Primary tile | The shared screen (710 x 443) is only 1.95 times the area of the others (364 x 443): the threshold of 2 would have missed it, so it is now 1.5 |
| Microphone button | `jsname="hw0c9"` while muted, not `BOHaEe`; the selector lists both names; the camera button is `psRWwc` and the leave button `CQylAd`, as expected |
| Muted state | `data-is-muted="true"` while the microphone and the camera are off, as the code reads it |
| Hidden tab, PiP window open | Timer of 66 ms: 15 per second; `requestAnimationFrame`: about 119 per second; the shared-screen video kept advancing; the picture was drawn 15 times per second |
| Avatar | No load error for the credentialed copy of the avatars, so the host accepted it; the first-frame taint check ran before the load and does not prove it |
| Media Session | `togglemicrophone`, `togglecamera`, `hangup`, `previoustrack` and `nexttrack` registered without error |

Still open: which buttons the window shows and whether its arrow keys reach the page, whether the
microphone button keeps `hw0c9` when the microphone is on, whether Meet decodes the camera tiles of a
hidden tab (this call had none), and whether Meet registers Media Session actions of its own.

## Probes (T1, real Meet call, by Tore)

One probe script, run from `npm run live -- --probe` is not possible on a real call; it is pasted in the
DevTools console of the call page, as T1 of 054 was. It answers:

1. Which attribute of each tile marks it (`data-participant-id`), which `<img>` is the avatar, and how
   a tile with the camera off differs from one with it on (`track.muted`, `readyState`, `videoWidth`).
2. The attributes of the microphone, camera and leave buttons that do not depend on the language.
3. Whether the canvas is tainted after drawing the avatar.
4. With the window open and the tab hidden: do the source videos keep advancing frames (`currentTime`),
   and does the canvas keep changing (answered in the lab, to confirm in Meet).
5. Which buttons the window shows for the three call actions with and without `previoustrack` and
   `nexttrack`, and which events the window's arrow keys produce.
6. Whether Meet registers its own Media Session actions.
