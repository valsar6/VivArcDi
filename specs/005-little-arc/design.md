# 005 Little Arc: design

| | |
|---|---|
| Status | Approved |
| Change request | 2026-11-09, the look of the window (section Look): Approved 2026-11-09 |
| Change request | 2026-11-10, the command bar (section Opening: the command bar): Draft, written for Tore to read with the spec; nothing here is built until the spec is approved |
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

Opening from the shortcut shows the command bar (change request of 2026-11-10, below); with
`commandBar` off it creates an empty popup and focuses the bar's field, as in version 1. Opening from an
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
| `src/modules/littlearc/LittleArcLauncher.ts` | Creation of the popup (empty, with an address, or with a tab), registration of the mark | |
| `src/modules/littlearc/LittleArcRegistry.ts` | Marks window ids as Little Arc in the shared store (`chrome.storage.local`) | Repository |
| `src/modules/littlearc/AddressResolver.ts` | Turns typed text into a URL or a search | |
| `src/modules/littlearc/LittleArcBar.ts` | The compact bar: window-button space, back, address pill, Open in button | |
| `src/modules/littlearc/AddressDisplay.ts` | The text of the pill at rest: the host without `www.`, or nothing | |
| `src/modules/littlearc/BackButtonState.ts` | Counts navigations of the window's tab and says when back shows | State |
| `src/modules/littlearc/KeepLabel.ts` | "Open in" text from the workspace name and the platform | |
| `src/modules/littlearc/IdleTimer.ts` | Closes the window after `idleCloseHours` of no interaction | |
| `src/modules/littlearc/WorkspaceAdopter.ts` | In the main window: receives the move request, picks the destination, moves the tab | Command |
| `src/core/BrowserWindows.ts` | Promise wrapper for `chrome.windows`: `create` with `tabId` and `type`, `getLastFocused`, `onFocusChanged`, `getCurrent`, `remove`, `update` | Adapter |
| `src/core/WindowKeys.ts` | Key interception shared with Peek | |
| `src/core/ShortcutKeys.ts` | `isCommandOption(event, code)`: Cmd+Opt or Ctrl+Alt plus a physical key | |
| `src/styles/little-arc.scss` | The bar, the page frame, the hidden Vivaldi header of the popup | |
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

## Look (change request 2026-11-09)

The bar keeps its mount point and its role; only its content and its style change. Pure logic goes in
three small classes so it can be tested by name, the rest is CSS.

**Layout.** `vivarcdi-little-arc-bar` becomes a flex row of `$little-arc-bar-height` (40 px):

| Part | Element | Notes |
|---|---|---|
| Window-button space | empty `<span>`, `$little-arc-lights-inset` wide (78 px on macOS) | On Debian its width and side follow where Vivaldi draws its buttons (T15) |
| Back | `<button aria-label="Back">` with an inline SVG chevron | `hidden` until `BackButtonState.visible` |
| Address pill | `<label>` with a search icon and the `<input>` | Flexes to fill; text centred at rest, left-aligned while focused |
| Open in | `<button>` with "Open in", `<strong>` name, `<kbd>` shortcut | Text from `KeepLabel` |

The bar has `-webkit-app-region: drag`; buttons and the pill have `no-drag`, so the empty parts move the
window (AC-17). Vivaldi's own header of the popup (title and extension row) is hidden with
`display: none` on the selectors T15 finds; they go in `SelectorCatalog` as `popupHeader`. If T15 shows
that the header cannot be hidden, the bar sits under it and AC-15 is reported as not met.

**Address pill.** At rest the input shows `AddressDisplay.of(url)`; on `focus` it switches to the full
URL and selects it; on `blur` or Esc with text it goes back to the host (Esc with an empty field still
closes, FR-7). The placeholder is "Search or Enter URL…". `AddressDisplay.of` returns the host for an
`http(s)` URL with one leading `www.` removed, and `''` for anything else (`about:blank`, the new tab
page, invalid text).

**Back.** `BackButtonState` starts hidden, and counts `tabs.onUpdated` changes of `url` for the
window's tab after the first one; from the second address on it is visible. A page that was moved in
from the main window with history of its own shows back from its first navigation in the window, a
small difference accepted here. The reload button is removed; Cmd/Ctrl+R is Vivaldi's own reload
(checked in T15).

**Open in.** `KeepLabel.of(name, platform)` returns `{ prefix: 'Open in', name, shortcut }`, with
`name` = `'workspace'` when it is empty or unknown and `shortcut` = `⌘O` on macOS, `Ctrl+O` otherwise.
The name comes from the adopter: when the bar mounts it sends the existing `vivarcdi-little-arc` message with `action: 'destination'`, and the adopter replies with `action: 'destination-answer'`;
the adopter of the most recently focused normal window answers with the name of the workspace that
FR-6 would pick (from `WorkspaceNames`) and the colors of 019 for that workspace, if any. No answer
within 1 s leaves "Open in workspace" and the default palette.

**Frame and colors.** In the popup `#browser[data-vivarcdi-little-arc]` gets the background
`--vivarcdi-space`; the `webviewContainer` gets a padding of `$little-arc-frame` (6 px) on the left, right
and bottom and the page gets `border-radius: $little-arc-page-radius` (8 px) with `overflow: hidden`.
The bar writes `--vivarcdi-space`, `--vivarcdi-pill` and `--vivarcdi-ink` on its own `#browser`, copied from the answer (the colors the sidebar look put on the main window's `#browser`)
from the answer, so the same variables as 028 apply; without an answer they fall back to `arclight`. The
pill uses `--vivarcdi-veil`, the Open in button `--vivarcdi-pill`, text `--vivarcdi-ink`. In dark mode the
veil and the pill use the dark shares of 028 (white at 12% and 18%) over a dark shade of the space
color, with light text, the same rule the tab bar follows.

**Tokens** in `_tokens.scss`: `$little-arc-bar-height: 40px`, `$little-arc-lights-inset: 78px`,
`$little-arc-control-height: 28px`, `$little-arc-pill-radius: 8px`, `$little-arc-frame: 6px`,
`$little-arc-page-radius: 8px`.

Not reproducible in a Vivaldi popup, and what replaces it:

| Arc | VivArcDi |
|---|---|
| Floating command bar with suggestions before the window | The command bar of the change request of 2026-11-10, over the Vivaldi window in front |
| Window corners, shadow, opening animation | The system's, as for any Vivaldi window |
| Traffic lights placed inside Arc's own bar | Native buttons where macOS puts them; the bar keeps their space free |
| Link icon, Space picker arrow, profile label | Left out (spec, open questions) |


## Opening: the command bar (change request 2026-11-10)

The bar lives in the normal window's `window.html`, next to Peek's overlay. It is added by
`MainWindowRole`, which keeps the launcher, and removed on stop. The pure logic is in small classes with
`auto:` tests; the views are checked by hand.

| Class or file | Role | Pattern |
|---|---|---|
| `src/modules/littlearc/commandbar/Suggestion.ts` | Type: `{ url, title, host, source }`, `source` one of `tab`, `bookmark`, `history`, `top` | Value object |
| `.../SuggestionSource.ts` | Interface: `suggest(text, limit): Promise<Suggestion[]>`; `''` asks for the empty-field list | Strategy |
| `.../TabSuggestions.ts` | Reads `chrome.tabs.query({})` through `BrowserTabs`, leaves out Little Arc windows' tabs (registry) | Adapter |
| `.../BookmarkSuggestions.ts` | Reads `chrome.bookmarks` through `BrowserBookmarks` (tree walk, or `search` if T23 proves it) | Adapter |
| `.../HistorySuggestions.ts` | `chrome.history.search({ text, maxResults })` through a new `src/core/BrowserHistory.ts` | Adapter |
| `.../TopSiteSuggestions.ts` | `chrome.topSites.get` through a new `src/core/BrowserTopSites.ts` | Adapter |
| `.../SuggestionRanker.ts` | Pure: merges the sources' lists, drops non-web addresses, removes duplicates by normalized address, scores matches, sorts, cuts to the limit (FR-26, AC-28 to AC-31) | Strategy |
| `.../AddressKey.ts` use | Reuses `src/core/AddressKey.ts` for the normalized address if it fits; otherwise a small `normalizedAddress` function next to the ranker (DRY: one of the two) | |
| `.../SelectionCursor.ts` | Pure: index, `up()`, `down()`, `reset()`, wraps around (AC-32) | State |
| `.../SuggestionList.ts` | Collects the sources (failures skipped and logged once), calls the ranker, builds the rows: the typed text row first, then suggestions | Facade |
| `.../CommandBarController.ts` | Pure of the DOM: open or closed, the text, the list, the cursor; `submit()` asks the launcher to open the typed text or the selected row; `dismiss()` opens nothing (AC-34 to AC-36) | State, Command |
| `.../CommandBarView.ts` | The DOM: scrim, card, field row, divider, rows, × button; listens and calls the controller | Observer |
| `.../CommandBarMount.ts` | Adds the view to `#browser` and removes it; reports failure to `MainWindowRole`, which then opens the blank window | |
| `src/modules/littlearc/LittleArcLauncher.ts` | New `openAddress(url)` and `openSearch(text)`: `windows.create({ url, type: 'popup', ... })`, and for a search a blank popup then `BrowserSearch.run(text, tabId)` on its first tab, or `BrowserSearch.fallbackAddress` | |
| `src/styles/little-arc.scss` | The overlay: scrim, card, rows, selection (new block next to the bar's) | |

**Flow of Enter.** `CommandBarView` -> `CommandBarController.submit()` -> `AddressResolver.resolve`
(typed text row) or the row's url -> `LittleArcLauncher.openAddress` / `openSearch` -> the popup role
starts as for any Little Arc window. The controller closes the bar before it calls the launcher, so a
slow window creation never leaves the bar up; an error is logged and the bar stays closed (FR-23).

**Layout.** `#browser > .vivarcdi-command-bar-scrim` (fixed, covers the window, a click closes it) holds
`.vivarcdi-command-bar` (the card). Card, from top: `-field` row (search icon, `<input>`, × button),
a 1 px divider, a `role="listbox"` list of `role="option"` rows. The card is centered with
`left: 50%; transform: translateX(-50%)` and `top: $command-bar-top` (18vh), which puts it in the upper
third. The selected row has `aria-selected="true"`. The favicon is `chrome://favicon/size/16@2x/<url>`,
as `LinkIcon` does, with a lettered tile when it fails. Rows with a title longer than the row use
`text-overflow: ellipsis` on the title only, the host has `flex: none`.

**Focus.** The view stores `document.activeElement` when it shows and focuses it back when it closes,
or the active tab's webview if the stored element is gone (question 6 of the probe). The scrim handles
`pointerdown` to close; `keydown` for Up, Down, Enter and Esc is handled on the field, with `stopPropagation`
so the page and Vivaldi never see it. Keys are not given to `WindowKeys` while the bar is open, except
the shortcut itself, which toggles.

**Tokens** in `_tokens.scss`, sized from Tore's screenshot (a card of 980 by 656 px, scaled to 0.6):

| Token | Value | From the screenshot |
|---|---|---|
| `$command-bar-width` | `580px` (max `90vw`) | card 980 px wide |
| `$command-bar-top` | `18vh` | upper third |
| `$command-bar-radius` | `24px` | about 40 px corner |
| `$command-bar-row-height` | `54px` (pitch 60) | rows of 90 px, gap of 10 |
| `$command-bar-row-radius` | `12px` | selected row's corner |
| `$command-bar-inset` | `12px` | row inset from the card |
| `$command-bar-field-height` | `98px` | field row above the divider |
| `$command-bar-icon` | `24px` | favicon tile |
| `$command-bar-close-size` | `28px`, radius `8px` | × button, about 48 px |
| `$command-bar-field-font` | `20px` | placeholder |
| `$command-bar-row-font` | `15px` | row text |
| `$command-bar-card` | `#f9f9f9` | card |
| `$command-bar-divider` | `#e0e0e0` | divider |
| `$command-bar-close-fill` | `#e7e7e7` | × button |
| `$command-bar-selected` | `#9095fb` | selected row (FR-30) |
| `$command-bar-host` | `#a8a8a8`, and `rgba(255,255,255,.65)` on the selected row | host text |
| `$command-bar-scrim` | `rgba(0,0,0,.18)`, `blur(6px)` if T23 allows | dimmed page |
| `$command-bar-shadow` | `0 18px 50px rgba(0,0,0,.28)` | soft shadow |

Dark mode uses a dark card, light text and the same indigo, written next to the light values with the
same `prefers-color-scheme` rule the other overlays follow.

**Configuration.**

```json
"little-arc": {
  "enabled": true,
  "commandBar": true,
  "externalLinks": true,
  "askWorkspace": false,
  "idleCloseHours": 6,
  "widthPercent": 34,
  "heightPercent": 60
}
```

`commandBar` is read like the other booleans (`=== true`).

**Not reproducible, and what replaces it** (spec, "What cannot be reproduced"): Arc's bar floats over
any app; ours exists only inside a Vivaldi window that is in front. The closest alternative is the
follow-up global shortcut (an OS hook that raises Vivaldi, then this same bar).

### Risks of the command bar

| Risk | Mitigation |
|---|---|
| `chrome.history` or `chrome.topSites` is not defined in the interface document | T23 finds out; the source is skipped (FR-28) and the bar works with tabs and bookmarks |
| The overlay cannot take the keyboard focus from the page, or cannot give it back | T23, questions 6 and 7; fallback is to focus the active tab through `chrome.tabs.update` on close |
| A click on the scrim does not reach the document over a webview | The scrim sits in the window's DOM above the webview container; T23 question 7; fallback is Esc and × only, AC-25 is reported |
| `backdrop-filter` does not blur the page | Dim only; the blur is optional |
| A history of tens of thousands of pages makes the list slow | At most 20 results per source (NFR-7), ranking over the merged list; measured in the manual check |
| Favicons are slow or missing | A lettered tile; the list never waits for icons |
| The popup created with an address flashes empty | Accepted as for the external-link flow; measured in the manual check |

## Configuration

Before the change request of 2026-11-10:

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
| The popup header of Vivaldi cannot be hidden by CSS | T15 finds out; the bar then sits under it and AC-15 is reported |
| The traffic lights move with a Vivaldi or macOS update | The inset is one token; the manual check covers AC-16 |
| The webview does not accept a radius or padding in the popup | T15 checks the `webviewContainer` selector in the popup; without it the frame is a border of the bar's color |

## Questions for Tore

- **Search engine.** If Vivaldi's interface offers no search API, is it acceptable to use Vivaldi's
  default search engine address from its preferences, and fall back to a plain web search address
  only when that cannot be read?
