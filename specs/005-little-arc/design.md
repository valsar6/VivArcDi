# 005 Little Arc: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

One module, `little-arc`, with two roles that run in two kinds of Vivaldi interface document. VivArcDi
already loads in every `window.html`, and the probe of 2026-11-08 showed that the popup window
has its own `window.html` with the VivArcDi styles.

- **In a normal window** the module is the *launcher*: it takes the shortcut, recognizes links from
  other apps and creates Little Arc windows. It also *adopts* pages: it moves a Little Arc tab into
  itself when the popup asks.
- **In a Little Arc window** the module is the *bar*: it draws the compact bar, resolves what is
  typed, closes the window on Esc or Cmd/Ctrl+W, and runs the idle timer.

A window knows which role it has from the window type (`popup`) and from a mark that the launcher
writes in the shared store before it creates the window, so a popup opened by a website with
`window.open` is left alone.

Opening from a shortcut creates an empty popup and focuses the bar's field. Opening from an
external link takes the tab Vivaldi already created and moves it into a new popup with
`chrome.windows.create({ tabId, type: 'popup' })`, so the page is loaded once and keeps its
history. The tab shows in the main window for a moment first (spec, open questions).

Reused from Peek ([002](../002-peek/design.md)): the key interception of `PeekKeys` becomes a
shared `WindowKeys` class that both modules configure with their own commands (DRY); the Cmd/Ctrl
label per platform comes from the same `PeekKeyMap`.

Rejected alternatives:

- **A normal window with the interface hidden by CSS as the main path**: needs a rule for every
  Vivaldi layout change. Kept only as the fallback of NFR-2.
- **An extension or native messaging host to see other apps' links**: the probe shows the tab
  event is enough, and NFR-4 asks for no extra process.
- **Cancelling the new tab before it renders**: Vivaldi gives no hook before the tab exists.

## Components

| Class or file | Role | Pattern |
|---|---|---|
| `src/modules/littlearc/LittleArc.ts` | The module; starts the launcher or the bar by window type | Facade |
| `src/modules/littlearc/ExternalLinkDetector.ts` | Decides whether a created tab is a link from another app, from the tab, the focus history and the time | Strategy: the rule is replaceable |
| `src/modules/littlearc/FocusHistory.ts` | Remembers the last window focus events, with times, from `chrome.windows.onFocusChanged` | Observer |
| `src/modules/littlearc/LittleArcLauncher.ts` | Shortcut, creation of the popup, registration of the mark | |
| `src/modules/littlearc/LittleArcRegistry.ts` | Marks window ids as Little Arc in the shared store (`chrome.storage.local`) | Repository |
| `src/modules/littlearc/AddressResolver.ts` | Turns typed text into a URL or a search | |
| `src/modules/littlearc/LittleArcBar.ts` | The compact bar: back, reload, address field, Move to workspace | |
| `src/modules/littlearc/IdleTimer.ts` | Closes the window after `idleCloseHours` of no interaction | |
| `src/modules/littlearc/WorkspaceAdopter.ts` | In the main window: receives the move request, picks the destination, moves the tab | Command |
| `src/core/BrowserWindows.ts` | Promise wrapper for `chrome.windows`: `create` with `tabId` and `type`, `getLastFocused`, `onFocusChanged`, `getCurrent`, `remove`, `update` | Adapter |
| `src/core/WindowKeys.ts` | Key interception shared with Peek | |
| `src/core/ShortcutKeys.ts` | `isCommandOption(event, code)`: Cmd+Opt or Ctrl+Alt plus a physical key | |
| `src/styles/little-arc.scss` | The bar, its fit in the popup | |
| `src/config.json` | `little-arc` options | |

## Detection rule

`ExternalLinkDetector.accepts(tab, history, now)` is true when all of these hold:

1. the tab has no `openerTabId` and is active;
2. its `pendingUrl` or `url` starts with `http://` or `https://`;
3. the window of the tab is a normal window, not a Little Arc window;
4. `history` shows a focus event on a window at most 100 ms before `now`, and the event before it
   was "no window" (`windowId === -1`), which means the application was in the background.

Seen in the probe of 2026-11-08: four links from other apps, each with `-1`, a focus event and the
tab 2 to 41 ms later; links opened inside Vivaldi had an opener and were inactive. Every window
that receives `tabs.onCreated` checks that `tab.windowId` is its own, so only one window acts.

## Vivaldi interface

- **Shortcut.** `keydown` on `Cmd+Opt+N` (`event.code === 'KeyN'`, because Option changes
  `event.key` on macOS) or `Ctrl+Alt+N`, in the capture phase like `PeekKeys`, so Vivaldi does not
  also handle it. Handled only by the window that has the focus.
- **Popup.** `chrome.windows.create({ type: 'popup', width, height, left, top })`, sizes from
  `widthPercent` and `heightPercent` of `screen.availWidth` and `screen.availHeight`, centred.
- **Bar.** A fixed element at the top of `#browser` in the popup, `vivarcdi-little-arc-bar`. The
  address field is the module's own `<input>`, because the popup has none. Back and reload call
  `chrome.tabs.goBack` and `chrome.tabs.reload`; the title bar and the extension icons row stay as
  Vivaldi draws them.
- **Move to workspace.** The bar sends `{ type: 'little-arc:adopt', tabId }` with
  `chrome.runtime.sendMessage`. The adopter of the most recently focused normal window answers by
  moving the tab with `chrome.tabs.move`, writing the workspace in `vivExtData` through
  `TabDataWriter`, activating it, and removing the popup window. The workspace is
  `ActiveWorkspace.current` of that window, or the one asked by the picker.
- **No main window.** The bar sends the same message; if nobody answers within 1 s, the bar creates
  a normal window with `chrome.windows.create({ tabId })` and the tab ends up in it with no
  workspace.

No new selectors are expected. The bar's mount point is the popup's `#browser`; it is added to
`SelectorCatalog` as `littleArcMount`.

## Configuration

```json
"little-arc": {
  "enabled": true,
  "externalLinks": true,
  "askWorkspace": false,
  "idleCloseHours": 6,
  "widthPercent": 34,
  "heightPercent": 60
}
```

Percentages are clamped to 20-100. `idleCloseHours` below 0 is read as 0.

## Risks

| Risk | Mitigation |
|---|---|
| Cmd+Opt+N may already be a Vivaldi command | The capture-phase handler takes it first; the verification checks that the original command is gone only in the active window |
| `chrome.runtime.sendMessage` between two `window.html` documents may not arrive | Probe it in T1; fallback is a key in `chrome.storage.local` watched with `onChanged` |
| `chrome.search` may be missing from the interface | `AddressResolver` asks Vivaldi's default engine when `chrome.search.query` exists; otherwise it uses the default engine address stored in Vivaldi's prefs; T1 finds out which |
| The tab flashes in the main window before moving | Accepted in version 1, measured in the manual check |
| A legitimate tab with no opener and an `http(s)` address appears right after the app regains focus (for example a bookmark clicked in the first 100 ms) | The user would get a Little Arc window instead; `externalLinks` turns it off |
| A website popup opened with `window.open` gets the bar | The mark in the registry decides, not the window type alone |
| Idle timer closes a page the user is reading | Any key, pointer move or scroll in the bar or the page resets it; six hours is the Tore-approved default |

## Questions for Tore

- **Search engine.** If Vivaldi's interface offers no search API, is it acceptable to use Vivaldi's
  default search engine address from its preferences, and fall back to a plain web search address
  only when that cannot be read?
