# 054 Call Picture in Picture: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was `Approved`. It says **how**; the spec says **what**. The first design (PiP
opened by the interface on tab switch) was withdrawn on 2026-11-20 with the first version of the spec;
the probes that closed it are kept below.

## Approach

**One page script does the work; the interface decides when.** The page of a call is the only place
that has a user gesture, and it knows when the tab is shown or hidden and when the call ends. So the
behavior lives in `call-pip`, modeled on `copy-keys`, as two commands (Command pattern):

- `OpenPipCommand` floats the largest live video with `video.requestPictureInPicture()`; it does
  nothing if a window is already open, if no call is in progress, or if its `allowed` check fails.
- `ClosePipCommand` calls `document.exitPictureInPicture()` when a window is open.

Three invokers run them:

- **The shortcut** (page): a capture-phase `keydown` listener answers Cmd/Ctrl+Shift+*letter*. Pressed
  while a window is open it runs `ClosePipCommand`; otherwise `OpenPipCommand` with `allowed = true`,
  because the key press is the gesture. The command's result decides whether the key is consumed, so
  a page without a call keeps its key (FR-6). A key that repeats (`event.repeat`) acts once: it is
  consumed while a call is in progress or a window is open and does nothing else (FR-11).
- **The tab switch** (interface): `CallPip` follows `chrome.tabs.onActivated` and remembers the active
  tab of each window. On a change it runs `VivArcDiCallPip?.open()` in the tab that was left, when the
  option `openOnTabSwitch` is on, and `VivArcDiCallPip?.close()` in the tab shown (FR-9, FR-4). The
  page runs `OpenPipCommand` with `allowed = navigator.userActivation.isActive`: the browser honors
  `requestPictureInPicture()` for about five seconds after the user's last click or key in that page,
  even when the page is already hidden (probes below). Without it the command returns false and says
  nothing (AC-17).
- **The page itself**: `visibilitychange` to visible, and the end of the call seen by `CallDetector`,
  run `ClosePipCommand` (FR-4, FR-5).

**The interface** `CallPip` also builds a `PageScriptInjector` like `CopyUrl`: `scriptFor(tabId)`
reads the tab's address with `tabs.get`, asks `siteFor` for an enabled site, and returns the script
plus `VivArcDiCallPip.install({ token, tabId, letter, inCallSelector })`, or `null` for any other page
(FR-7, FR-8). The page's `call-warning` message is logged with the logger.

**Installing again does not close the window.** `PageScriptInjector` re-injects on every top-level
`loadcommit`, which also fires for same-document navigations. `PageInstall.replace` detaches the old
hook, and `detach()` no longer closes the window; only `uninstall()` does (FR-12).

```text
interface (CallPip)                          page (call-pip.ts)
siteFor(url, options) ─ scriptFor ─▶ install({token, tabId, letter, inCallSelector})
onActivated ─ left tab ─▶ run('…open()') ──▶ OpenPipCommand (needs user activation)
            └ shown tab ─▶ run('…close()') ─▶ ClosePipCommand
                                              keydown ─▶ OpenPipCommand | ClosePipCommand
                                              visibilitychange, call end ─▶ ClosePipCommand
logger.warn ◀── call-warning message ◀── unexpected page, refused request
```

### Tab switch and user activation (lab Vivaldi 8.3, 2026-11-20)

A trusted click in the interface does not lend a gesture to a page: `webview.executeScript` and
`chrome.scripting.executeScript` right after it, and 0.3, 2 and 6 seconds after it, all fail with
`NotAllowedError`. A trusted click **in the page** does: with the tab switched away right after, a
request made from the interface 0.3, 2 and 4 seconds later opens PiP on the hidden page, and one made
6 seconds later is refused (the transient user activation of about five seconds). End to end with the
built payload in the lab: install the page script, click in the page, switch tab, and with no other
call the module's `onActivated` listener opens the window; without the click nothing opens; returning
to the tab closes it.

Tore's 0.62.0 run (a recording and two probes) also showed three things the design follows: the
window of the shortcut is a separate OS window that a one-window recording does not capture; a key held
down repeats and toggles the window (FR-11); and re-injection closed the window (FR-12).

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

- **A registry of which tabs have calls, kept in the interface.** The page already knows, and the
  commands check it, so the interface only remembers the active tab of each window.
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
| `src/modules/callpip/CallSites.ts` | The supported sites (Meet now): id, hosts, selector key of the in-call view; `siteFor(url, options, selectors)` | Registry |
| `src/modules/callpip/CallMessage.ts` | The `call-warning` message and its parser, as `CopyMessage` | – |
| `src/page/call-pip.ts` | Page script: `install`, `uninstall`, `open`, `close` | Facade |
| `src/page/lib/PipCommand.ts` | `PipCommand`, `OpenPipCommand`, `ClosePipCommand` | Command |
| `src/page/lib/CallPipHook.ts` | Wires the commands to the shortcut, `visibilitychange` and the call end | Invoker |
| `src/page/lib/CallDetector.ts` | Tells whether a call is in progress: a playing `<video>` with a live video track and the site's in-call selector; reports changes, coalesced to 250 ms | Observer |
| `src/page/lib/CallVideo.ts` | Picks the largest playing video with a live track; clears `disablePictureInPicture` on it before the request | – |

```ts
export interface CallSite {
  id: 'meet' | 'zoom' | 'discord' | 'teams';
  hosts: readonly string[];
  selectorKey: string;
}

export function siteFor(url: string | undefined, options: CallPipOptions, selectors: SelectorCatalog): { site: CallSite; inCallSelector: string } | null;

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
| `callMeetInCall` | In-call view of Meet: the leave button, found in T1 (the lobby has none) | `button[jsname="CQylAd"]` |
| `callZoomInCall` | In-call view of Zoom web | `#wc-container-left, .meeting-client-inner` |
| `callDiscordInCall` | Voice or video call panel | `[class*="callContainer"], [class*="wrapper"][class*="video"]` |
| `callTeamsInCall` | In-call view of Teams | `[data-tid="calling-screen"], #calling-unified-bar` |

Selectors of Meet's page are not Vivaldi's: `tests/live/selector-states.json` marks `callMeetInCall` as not checked by the live selector check. The class names of Discord and Teams change often: the values above are the first to try, and T1
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

