# 054 Call Picture in Picture: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was `Approved`. It says **how**; the spec says **what**.

## Approach

Two halves, the same split as [copy-url](../038-page-scripts/design.md): a page script that knows
about the call, and an interface module that knows about tabs.

**The page script reports and obeys.** `call-pip` is injected only into tabs whose address matches an
enabled site. It watches the page for a call in progress (a live video track plus the in-call view of
that site) and tells the interface when that changes. It also answers two commands: open the PiP
window of the call, and close it. It reports when the PiP window was closed by the user, because
FR-7 needs to tell that apart from a close the module asked for.

**The interface module decides.** `CallPip` listens to `chrome.tabs.onActivated` of its own window.
When the tab that was left is a call tab, it sends `open` to that tab; when the tab shown is a call
tab with an open window, it sends `close`. It keeps, per tab, three facts in memory: in a call, PiP
open, closed by the user. Nothing is stored (NFR-2), so the module needs no storage and keeps the
default of `privateWindows = 'never'` (NFR-5).

**How the window opens (Q-1, Q-2) is one decision with a probe behind it.** Browsers open PiP
without a click only through the media session action `enterpictureinpicture`, which Chromium invokes
itself when the tab is left and the site has the permission. A page script cannot ask for PiP from a
command, because `requestPictureInPicture()` needs a user gesture. So the page script has two ways to
open, tried in this order by the `PipOpener` of the page:

1. **Hand the browser the action.** The script registers `enterpictureinpicture` on
   `navigator.mediaSession` for sites that did not (Zoom, Discord) and leaves the site's own handler
   alone on sites that did (Meet, Teams). Chromium then opens PiP on tab switch by itself, and the
   interface sends no `open`.
2. **Ask from the interface.** If the probe of T1 shows that Vivaldi does not call the action, the
   interface sends `open` on the tab switch and the script calls `requestPictureInPicture()` on the
   call `<video>`; if Vivaldi refuses without a gesture, that site is dropped from this spec and moved
   to a follow-up (the decision of Q-2).

T1 answers which way each site goes, before any code. The components below are the same in both
ways; only `PipOpener.open` changes.

```text
page (call-pip.ts)                                    interface (CallPip)
CallDetector ── inCall changed ──▶ CallMessage ──────▶ CallRegistry (per tab: inCall, open, byUser)
PipOpener  ◀── open / close ◀───── PageScriptInjector.send ◀── CallController ◀── tabs.onActivated
PipOpener ── pip closed by user ──▶ CallMessage ──────▶ CallRegistry
```

### Probe results (T1, lab Vivaldi 8.1, 2026-11-20)

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

### Rejected alternatives

- **A browser extension API that opens PiP for a tab.** None exists for extensions in Vivaldi 8.1;
  checked in T1 and kept as the fallback only if the probe finds one.
- **Opening PiP on every `visibilitychange` from the page.** The page cannot tell a tab switch from a
  minimized window (Q-4 wants tab switch only) and has no user gesture.
- **One page script per site.** Four bundles that differ in a selector. One script reads a
  `CallSite` description instead.
- **Detecting a call by the page address** (`/meet/abc-defg-hij`). The lobby shares it with the call.
  A live track plus the in-call view tells them apart (Q-3).
- **Storing the last PiP state per tab.** It survives nothing useful: a restart ends the call.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/callpip/CallPip.ts` | The `Module`: starts the injector and the controller, stops both | Facade |
| `src/modules/callpip/CallPipOptions.ts` | Options: one `enabled` flag per site | – |
| `src/modules/callpip/CallSites.ts` | The four sites: id, address patterns, selector key of the in-call view; `siteFor(url, options)` | Registry |
| `src/modules/callpip/CallMessage.ts` | Message of the page script (`call-state`, `pip-closed`) and its parser, as `CopyMessage` | – |
| `src/modules/callpip/CallRegistry.ts` | Per tab: in call, PiP open, closed by the user; forgets a tab on removal or navigation | – |
| `src/modules/callpip/CallController.ts` | Reads `onActivated`, `onRemoved`, `onUpdated`; decides open and close from the registry | Observer |
| `src/page/call-pip.ts` | Page script: `install`, `uninstall`; detects the call and opens or closes PiP | – |
| `src/page/lib/CallDetector.ts` | Finds a live video track plus the in-call selector, with a `MutationObserver` and media events, coalesced | Observer |
| `src/page/lib/PipOpener.ts` | Registers the media session action when needed, opens and closes the PiP window, reports a close by the user | Strategy |
| `src/core/browser/PageScriptInjector.ts` | Gains `send(tabId, code)`: runs code in the webview of a tab already tracked | – |

Collaborators and their signatures:

```ts
export interface CallSite {
  id: 'meet' | 'zoom' | 'discord' | 'teams';
  hosts: readonly string[];
  pathPrefix: string;
  inCallSelector: string;
}

export function siteFor(url: string, options: CallPipOptions, selectors: SelectorCatalog): CallSite | null;

export class CallRegistry {
  public setInCall(tabId: number, inCall: boolean): void;
  public setOpen(tabId: number, open: boolean, byUser: boolean): void;
  public shouldOpen(tabId: number): boolean;
  public shouldClose(tabId: number): boolean;
  public forget(tabId: number): void;
}
```

- `shouldOpen(tabId)` is true when the tab is in a call, no window is open and the user did not close
  one since the tab was last shown (FR-5 to FR-7, AC-4 to AC-6). A tab shown again clears the
  by-user flag, which is what lets the next departure open again.
- `CallController` ignores `onActivated` events of other windows, comparing `windowId` with
  `tabs.ownWindowId()`, so a call in a Little Arc window is not touched by tab switches in the main
  one.
- `CallPip.start` builds `PageScriptInjector` as `CopyUrl` does. `scriptFor(tabId)` reads the tab
  with `tabs.get`, calls `siteFor`, and returns the script plus
  `VivArcDiCallPip.install({ token, tabId, site })`, or `null` for any other page (AC-7, AC-8). The
  token is a `crypto.randomUUID()` per start; a message with another token is dropped.
- Commands are `injector.send(tabId, 'VivArcDiCallPip.open();')` and `'VivArcDiCallPip.close();'`.
  `send` goes through the same `ScriptRunner`, so failures are logged once and a closed tab is a
  debug line.
- `CallDetector` reports `inCall` when a `video` element holds a `MediaStream` with a track of kind
  video in state `live` **and** the site's in-call selector matches. It reports on change only and no
  more than once per animation frame, reusing `FrameTask` semantics with a `setTimeout` of 250 ms
  since the page has no `requestAnimationFrame` while hidden.
- `PipOpener.close` calls `document.exitPictureInPicture()` and, where `documentPictureInPicture`
  exists and has a window, closes that window. It marks the close as requested before it calls, so
  the `leavepictureinpicture` event that follows is not reported as a close by the user (FR-7).
- A page that does not match what is expected (no `navigator.mediaSession`, no `video` once the
  in-call selector matched) logs one warning through the console prefix of the message and does
  nothing else (AC-9, NFR-1).

Registration: add `CallPip` to `src/modules/index.ts`; add it to `src/config.json`; add
`call-pip` to the page script entries of the build, as `copy-keys` is.

## Vivaldi interface

Selectors added to `src/selectors/8.1.json`, read through `context.selectors` (NFR-4):

| Key | Purpose | Initial value, to confirm in T1 |
|---|---|---|
| `callMeetInCall` | In-call view of Meet | `[data-call-ended="false"], [data-meeting-title]` |
| `callZoomInCall` | In-call view of Zoom web | `#wc-container-left, .meeting-client-inner` |
| `callDiscordInCall` | Voice or video call panel | `[class*="callContainer"], [class*="wrapper"][class*="video"]` |
| `callTeamsInCall` | In-call view of Teams | `[data-tid="calling-screen"], #calling-unified-bar` |

The class names of Discord and Teams change often: the values above are the ones to try first, and
T1 replaces them with what a real call shows. They are the part of this module most likely to break
on a site update (see Risks).

Private APIs: `webview.executeScript` (already used), `chrome.tabs.onActivated`, `onRemoved`,
`onUpdated`, `chrome.runtime.onMessage` or the console line fallback of `PageChannel`. The page side
uses `navigator.mediaSession.setActionHandler('enterpictureinpicture')`,
`HTMLVideoElement.requestPictureInPicture`, `document.exitPictureInPicture` and
`documentPictureInPicture`, each checked for existence before use. When `tabs.onActivated` is missing
the module stays off with a warning, as `CopyUrl` does without `chrome.tabs`.

## Configuration

`src/config.json`:

```json
"call-pip": {
  "enabled": true,
  "meet": true,
  "zoom": true,
  "discord": true,
  "teams": true
}
```

All four are `Option.boolean(true)` in `CallPipOptions.ts`. A site set to `false` gets no page
script (FR-6, AC-7). No new stylesheet: the PiP window is the browser's.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi does not invoke `enterpictureinpicture` on tab switch | T1 probes it first; the interface-driven way is the fallback, and a site that needs a gesture moves to a follow-up spec (Q-2) |
| `executeScript` runs in an isolated world, so a media session handler registered there is not the site's | The handler registered by the script only calls `requestPictureInPicture` on a `video` element, which is shared across worlds; T1 checks it on the lab copy |
| Discord and Teams change class names | Selectors are data in `8.1.json`; a mismatch means no PiP and one warning, never a broken page (NFR-1) |
| A lobby or a meeting list opens PiP | A live video track and the in-call selector must both be true (AC-4) |
| Two PiP windows for one call, or a window closed by the user reopened at once | The registry holds open and by-user per tab (AC-5, AC-6) |
| The call is in a Little Arc or second window | `CallController` compares `windowId` with its own window |
| Page scripts break an unexpected page | `scriptFor` returns `null` for every address that is not an enabled site, and `uninstall` removes every hook |
