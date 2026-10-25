# 002 Peek: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

## Approach

Links are clicked inside web pages, which Vivaldi shows in one `<webview>` per tab. Vivaldi's
interface document never sees those clicks, so the module injects a small **page script** into each
tab's webview with `webview.executeScript`. The script listens to clicks in the capture phase, asks a
shared `LinkClassifier` whether the click is a Peek trigger and, if it is, cancels the default action
and sends the URL to the interface with `chrome.runtime.sendMessage`. The decision has to be taken
synchronously inside the page, because the default action cannot be cancelled later; so the
interface passes the page script everything it needs when it injects it: the enabled triggers and
whether the tab is pinned.

The interface opens the URL in a **panel**: a backdrop over `#webview-container` that dims the page,
and a rounded box holding its own `<webview>` with the real page. Links followed inside the panel
stay in it: no page script is injected there, and its `newwindow` events navigate the same webview.

Expand and Split create a real tab with `chrome.tabs.create` right after the current one, then close
the panel. Split also tiles the two tabs by writing Vivaldi's tiling data into `vivExtData`, the
same field Vivaldi uses when the user tiles tabs from the menu.

ArcPeek (VividPeek, GPL-3) was read for ideas only; no code is taken from it.

Rejected alternatives:

- **Vivaldi's Link Preview or Chromium's Link Preview**: not reachable from a mod, and neither
  supports Expand or Split.
- **Catching clicks in the interface document**: page clicks never reach it.
- **Opening a real tab and hiding it while it is a Peek** (as ArcPeek's "runtime tab"): keeps
  history on Expand, which the spec leaves out, at the cost of hiding tabs from Vivaldi's tab bar,
  session and history. Kept as a possible follow-up.
- **Deciding in the interface, asynchronously**: the page would already have navigated or opened a
  window by the time the answer arrives.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/peek/Peek.ts` | Module: reads options, wires the parts, stops cleanly | Facade |
| `src/modules/peek/SiteComparator.ts` | Registrable domain of a URL; same-site test (FR-3) | |
| `src/modules/peek/LinkClassifier.ts` | Turns a click (button, modifiers, link and page URLs, pinned flag) and the triggers into `peek` or `default` (FR-2) | Strategy, one rule per trigger |
| `src/page/peek-links.ts` | Page script: capture-phase click listener, uses `LinkClassifier`, cancels and messages; removes itself on request | |
| `src/modules/peek/PageScriptInjector.ts` | Finds tab webviews, injects the page script with the tab's policy on every `loadcommit`, removes it on stop | Observer |
| `src/modules/peek/PeekPanel.ts` | Builds and removes the backdrop, panel, webview and buttons; emits `expand`, `split`, `close` | |
| `src/modules/peek/PeekController.ts` | One Peek at a time: open, replace, close, expand, split; falls back when the panel fails (FR-4 to FR-7, NFR-2) | State |
| `src/modules/peek/PeekKeys.ts` | Esc, Cmd/Ctrl+W and Cmd/Ctrl+O while a Peek is open | |
| `src/modules/peek/TabTiler.ts` | Tiles two tabs through `vivExtData` | Adapter |
| `src/core/BrowserTabs.ts` | Gains `create`, `update` and `onActivated` | |
| `src/styles/peek.scss` | Backdrop, panel, buttons, open animation | |
| `scripts/build.mjs` | Bundles `src/page/*.ts` into one self-contained file each | |

The page script is bundled because it runs inside the web page, where the module URLs of the payload
cannot be imported. `PageScriptInjector` loads it once as text through `ResourceLoader` and prepends
the policy as JSON.

## Vivaldi interface

Selectors: `webviewContainer` (exists) and `tabWebview`, `#webview-container webview[tab_id]`, added
to `src/selectors/8.1.json`.

Marks:

| Name | On | Meaning |
|---|---|---|
| `data-vivarcdi-peek` | `#webview-container` | A Peek is open; the stylesheet dims the page |
| `.vivarcdi-peek-backdrop`, `.vivarcdi-peek-panel` | elements created by the module | Removed on close and stop |

Private APIs and fallbacks:

| API | Use | IF missing or failing |
|---|---|---|
| `webview.executeScript` | Inject the page script | Log once; no Peek for that tab, links behave as usual |
| `chrome.runtime.onMessage` | Receive Peek requests | Module does not start, logged |
| `chrome.tabs.create`, `update` | Expand, Split, fallback | Expand and Split buttons hidden |
| `vivExtData` tiling | Split | Split acts as Expand, logged |

When the panel cannot be created after the page has cancelled the click, `PeekController` performs
what Vivaldi would have done: a new window for Shift+click (`chrome.windows.create`), navigating the
tab for the other triggers (`chrome.tabs.update`). That is NFR-2 and AC-11.

## Keyboard

`PeekKeys` listens to `keydown` on the interface document in the capture phase while a Peek is open
and stops the event before Vivaldi's shortcuts see it. When the focus is inside the panel's webview,
keys go to the page first, so the panel webview also gets a key script that forwards Esc,
Cmd/Ctrl+W and Cmd/Ctrl+O. Switching tab (`tabs.onActivated`) closes the Peek.

## Configuration

```json
"peek": {
  "enabled": true,
  "shiftClick": true,
  "pinnedCrossSite": true,
  "anyCrossSite": false,
  "widthPercent": 80,
  "heightPercent": 90
}
```

Defaults live in `Peek.defaults`; sizes are clamped to 40-100.

## Site comparison

`SiteComparator` lowercases the host, drops a trailing dot, and keeps the last two labels, or the last
three when the last two form a known two-label public suffix (`co.uk`, `com.au`, `co.jp`, ...; a
short list in the class). IP addresses and single-label hosts such as `localhost` are kept whole.
The full Public Suffix List is not shipped: it is large and rarely matters for "leave the site of a
pinned tab".

## Risks

| Risk | Mitigation |
|---|---|
| The panel's `<webview>` does not share cookies with tabs, so sites appear logged out | Use the same `partition` attribute as Vivaldi's tab webviews; manual check in the checklist |
| `chrome.runtime.sendMessage` not available to scripts injected by `executeScript` | Fallback channel: the page script posts the URL through `console.log` with a prefix, read by the webview's `consolemessage` event |
| Cmd/Ctrl+W reaches Vivaldi and closes the tab behind | Capture-phase handler plus forwarded keys from the panel; manual check AC-5 |
| `vivExtData` tiling format changes between Vivaldi versions | `TabTiler` behind an interface, fallback to Expand; manual check AC-7 |
| Pages that stop click propagation hide clicks from the page script | Listener on `window` in the capture phase, before page handlers |
| Selectors change in Vivaldi 8.2 | Selector catalog per version, as for the Favorites grid |
