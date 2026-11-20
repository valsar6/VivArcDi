# 054 Call Picture in Picture: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was `Approved`. It says **how**; the spec says **what**. The first design (PiP
opened by the interface on tab switch) was withdrawn on 2026-11-20 with the first version of the spec;
the probes that closed it are kept below.

## Approach

**One page script does everything; the interface only injects it.** The page of a call is the only
place that has a user gesture, and it also knows when the tab is shown or hidden and when the call
ends. So the whole behavior lives in `call-pip`, modeled on `copy-keys`:

- A capture-phase `keydown` listener answers Cmd/Ctrl+Shift+*letter* (`ShortcutKeys.isCommandShift`).
  When a call is in progress it consumes the key and calls `video.requestPictureInPicture()` on the
  call video inside the listener, so the browser sees the gesture (FR-2). When PiP is open it calls
  `document.exitPictureInPicture()` (FR-3). With no call it does not touch the event (FR-6).
- A `visibilitychange` listener closes the PiP window when the document becomes visible again, which is
  the call tab being activated again (FR-4). Closing needs no gesture.
- A `CallDetector` closes the window when the call ends, and the page unloading with the tab ends it
  too (FR-5).

**The interface module** `CallPip` builds a `PageScriptInjector` like `CopyUrl`: `scriptFor(tabId)`
reads the tab's address with `tabs.get`, asks `siteFor` for an enabled site, and returns the script
plus `VivArcDiCallPip.install({ token, tabId, site, letter })`, or `null` for any other page
(FR-7, FR-8). A message from the page (`call-warning`) is logged once with the logger.

```text
interface (CallPip)                          page (call-pip.ts)
siteFor(url, options) ─ scriptFor ─▶ install({token, tabId, site, letter})
                                              ├─ keydown ─▶ CallVideo.pick() ─▶ requestPictureInPicture()
                                              ├─ visibilitychange (visible) ─▶ exitPictureInPicture()
                                              └─ CallDetector ─ call ended ─▶ exitPictureInPicture()
logger.warn ◀── call-warning message ◀── unexpected page
```

### T1 results, Google Meet (Tore, real call, 2026-11-20)

- One `<video>` in the call: 782 x 441, playing, a `MediaStream` with one live video track,
  `disablePictureInPicture` false and no attribute, so no `<canvas>` and no clearing needed on Meet.
  `document.pictureInPictureEnabled` is true; `documentPictureInPicture` exists.
- Neither candidate selector of Meet matches (`[data-call-ended="false"]`, `[data-meeting-title]`:
  0). The leave button has `aria-label="Esci dalla chiamata"`, which depends on the language, and
  obfuscated classes. A live video alone is not a call: the lobby preview is a live, playing video
  too, so the in-call selector must tell them apart without relying on the language. Open until the
  attributes of the leave button are read (`t1-meet-attributes.js`).
- The page receives Cmd+Shift+P with `key` `p` and not handled (`defaultPrevented` false). Cmd+Option+P
  arrives with `key` `π` on macOS, because Option changes the character; a Cmd+Option shortcut must
  match `code` `KeyP`, as `ShortcutKeys.isCommandOption` does. Whether Vivaldi reacts to the keys is
  not visible from the page; Tore saw nothing happen.

### Rejected alternatives

- **Interface-side registry of tabs with calls, `onActivated` and `send(tabId, code)`.** The first
  design needed it to open PiP from outside. Now the page closes its own window on `visibilitychange`,
  so the interface keeps no state and `PageScriptInjector` stays as it is.
- **Registering `enterpictureinpicture` as well**: Q-3, nothing proves Vivaldi would honor it.
- **A button injected into the call page**: option B of the decision, rejected for the fragility of
  every site's DOM.
- **Detecting a call by the page address.** The lobby shares it with the call; a live track plus the
  in-call view tells them apart (Q-2).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/callpip/CallPip.ts` | The `Module`: builds the injector, logs warnings, stops | Facade |
| `src/modules/callpip/CallPipOptions.ts` | Options: `meet`, `zoom`, `discord`, `teams` (boolean), `shortcutLetter` (text, one letter) | – |
| `src/modules/callpip/CallSites.ts` | The four sites: id, hosts, path prefix, selector key of the in-call view; `siteFor(url, options)` | Registry |
| `src/modules/callpip/CallMessage.ts` | The `call-warning` message and its parser, as `CopyMessage` | – |
| `src/page/call-pip.ts` | Page script: `install`, `uninstall`; the three listeners above | – |
| `src/page/lib/CallDetector.ts` | Tells whether a call is in progress: a playing `<video>` with a live video track and the site's in-call selector; reports changes, coalesced to 250 ms | Observer |
| `src/page/lib/CallVideo.ts` | Picks the largest playing video with a live track; clears `disablePictureInPicture` on it before the request | – |

```ts
export interface CallSite {
  id: 'meet' | 'zoom' | 'discord' | 'teams';
  hosts: readonly string[];
  pathPrefix: string;
  inCallSelector: string;
}

export function siteFor(url: string, options: CallPipOptions, selectors: SelectorCatalog): CallSite | null;

export interface CallPagePolicy {
  token: string;
  tabId: number;
  site: string;
  letter: string;
  inCallSelector: string;
}
```

- The page script keeps its state in a `PageInstall('vivarcdi.call.pip')`, as `copy-keys` does, so a
  second `install` replaces the first and `uninstall` removes every listener and closes an open
  window.
- `CallVideo.pick` compares `getBoundingClientRect` areas of the playing videos whose `srcObject` has
  a live video track, and returns null when there is none (AC-5, AC-6).
- Warnings: no `requestPictureInPicture` on `HTMLVideoElement`, or a call detected by the selector with
  no usable video, send one `call-warning` through `sendToInterface` with its console prefix (AC-10).
- Registration: add `CallPip` to `src/modules/index.ts`, add `call-pip` to `src/config.json`, add
  `call-pip` to the page script entries of the build as `copy-keys` is. `privateWindows` stays
  `'never'` (AC-11).

## Vivaldi interface

Selectors added to `src/selectors/8.1.json`, read through `context.selectors` (NFR-4):

| Key | Purpose | Initial value, to confirm in T1 |
|---|---|---|
| `callMeetInCall` | In-call view of Meet | `[data-call-ended="false"], [data-meeting-title]` |
| `callZoomInCall` | In-call view of Zoom web | `#wc-container-left, .meeting-client-inner` |
| `callDiscordInCall` | Voice or video call panel | `[class*="callContainer"], [class*="wrapper"][class*="video"]` |
| `callTeamsInCall` | In-call view of Teams | `[data-tid="calling-screen"], #calling-unified-bar` |

The class names of Discord and Teams change often: the values above are the first to try, and T1
replaces them with what a real call shows. No private Vivaldi API is used beyond what `CopyUrl`
already uses (`webview.executeScript`, `chrome.tabs.get`); the page side uses
`HTMLVideoElement.requestPictureInPicture`, `document.exitPictureInPicture` and `visibilitychange`,
each checked for existence.

## Configuration

`src/config.json`:

```json
"call-pip": {
  "enabled": true,
  "meet": true,
  "zoom": true,
  "discord": true,
  "teams": true,
  "shortcutLetter": "p"
}
```

A site set to `false` gets no page script (AC-7); changing the letter changes the only key the script
answers (AC-9). No stylesheet: the window is the browser's PiP.

## Risks

| Risk | Mitigation |
|---|---|
| Zoom web draws video on a `<canvas>`, so there is no `<video>` to float | T1 checks it in a real call; if so, Zoom leaves this spec and gets its own (canvas capture into a video) |
| The site sets `disablePictureInPicture` on its videos | `CallVideo` clears the attribute on the chosen video before the request |
| The shortcut clashes with a site or Vivaldi shortcut | The letter is an option; the check of 2026-11-20 found no clash, and the manual check confirms it |
| A page script shadows a key on a page that is not a call | It consumes the key only when a call is in progress (FR-6) |
| Discord and Teams change class names | Selectors are data in `8.1.json`; a mismatch means no PiP and one warning, never a broken page (NFR-1) |
| Returning to a tab restores focus and the window closes while the user wanted it open | The spec asks for it (FR-4); the user presses the shortcut again |

## Probe results (T1, lab Vivaldi 8.1, 2026-11-20)

Run on a page served from `127.0.0.1` (a secure context) with a live video track from a canvas.

- `requestPictureInPicture()` called from `executeScript` fails with `NotAllowedError: Must be handling
  a user gesture`. The interface-driven way (2) cannot open PiP by itself: it is closed.
- A handler for `enterpictureinpicture` registers without error, both from the page and from the
  `executeScript` world. Leaving the tab (`hidden` becomes `true`) did not open PiP, and returning
  left no window to close.
- That negative is not conclusive: Chromium opens automatic PiP only for a tab that captures camera or
  microphone (or shares the screen) and has the site permission. The probe's video came from a canvas,
  and the lab cannot grant camera access. Vivaldi exposes no `autoPictureInPicture` content setting
  (`chrome.contentSettings` has none) and no PiP key in `vivaldi.tabsPrivate`, so the module cannot
  grant the permission either.
- `chrome.settingsPrivate` and `vivaldi.prefs.getAll` are not available to the probe, so the site
  permission could not be read.

What this leaves: way (1) is the only way, and whether it works depends on Vivaldi honoring the action
for a call tab. The check that decides it is a real Meet call (task T1b). If Vivaldi does not open PiP
there, no gesture-less path exists and spec 054 has to change (a new decision for Tore), not the
design.

Follow-up, 2026-11-20:

- Tore joined a real Meet call in his Vivaldi and switched tab: no PiP opened. Way (1) does not work
  with the default settings.
- `chrome.scripting.executeScript`, in the isolated and in the main world, fails with the same
  `NotAllowedError`: the interface has no user gesture to lend to a page. Vivaldi itself uses it only
  to exit PiP (`exitPictureInPicture` in `bundle.js`, 8.3).
- Vivaldi 8.3's `bundle.js` has a per-site setting "Automatic Picture-in-picture"
  (`auto-picture-in-picture`) and a Vivaldi command `DOCUMENT_PICTURE_IN_PICTURE` that only works on
  videos. Neither is exposed to modules. What is open: whether that site setting, set to Allow for
  `meet.google.com`, makes Chromium invoke the action (T1b).

- Second real Meet check, 2026-11-20: with "Automatic Picture-in-picture" set to Allow for
  `meet.google.com`, switching tab still opens no PiP. Vivaldi does not invoke the media session action
  on tab switch. Way (1) is closed too; no gesture-less way to open PiP is left.
- `DOCUMENT_PICTURE_IN_PICTURE` is an item of the video context menu, run by the browser on the video
  under the right click; a module cannot call it.

