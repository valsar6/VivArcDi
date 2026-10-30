# 013 Incognito mode: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-10-30. It says **how**; the spec says **what**.

## Approach

Two separate things happen in a private window: most modules must not run (FR-2, NFR-1), and the
`incognito` module draws the Arc layout (FR-3 to FR-8). They are kept apart so that the first holds
even when `incognito` is disabled or fails.

1. **Is the window private.** `BrowserRuntime.isPrivateWindow()` reads `chrome.windows.getCurrent`
   and returns its `incognito` flag (Tore's probe, 2026-10-29). `VivArcDi.start` asks it once, before
   any module starts. An error is logged once and counts as a normal window (NFR-4, AC-11).
2. **Which modules run.** `Module` gets a static `privateWindows`, one of `never` (the default),
   `allowed` or `only`. `ModuleRegistry.createEnabled(settings, privateWindow)` skips the modules whose
   policy does not fit the window. A module added in the future therefore stays out of private
   windows until its author opts in. Policies: `activation-marker`, `peek` and `copy-url` are
   `allowed` (they store nothing and style or act on the window's own tabs); `incognito` is `only`;
   every other module keeps `never`, which is the list of FR-2. AC-3 and AC-10 are tests of the
   registry and of `VivArcDi` with a fake storage that fails on any write.
3. **The mark.** The `incognito` module sets `data-vivarcdi-private` on `#browser` (a data attribute,
   as `ActivationMarker`, since Vivaldi rewrites the classes). `styles/incognito.css` scopes every
   rule under it, so a disabled module leaves a plain private window (FR-9, AC-12).
4. **The rows.** `IncognitoHeader` is a `div` with the title `Incognito Tabs` and a `Clear` button
   shown on hover, and `NewTabRow` is a `button` with a `+` icon and the text `New Tab`. Both are
   anchored with `TabBarAnchor` at orders 10 and 12 (the sections that are not drawn in a private
   window have 10, 15 and 20, so there is no clash). Both carry `-webkit-app-region: no-drag` (NFR-2).
5. **The bottom bar.** `BottomBar` is a footer with two `BarButton`s, Library on the left and `+` on
   the right, kept at the end of `#tabs-container` by `KeptElement`, like the archive button of 004.
   `KeptElement` moves from `src/modules/today` to `src/core` since two modules use it. `BottomBar`
   takes a list of buttons, so the future bar of space icons (spaces B11) can use it.
6. **Clear.** `PrivateTabs.clear()` queries the tabs of the window (`chrome.tabs.query` with
   `currentWindow`), and removes all of them but the active one with `BrowserTabs.remove`. It does
   not touch the archive, which no module writes in a private window (AC-6).
7. **Opening Quick Commands, Downloads and the new tab.** `vivaldi.utilities` has no call that runs a
   command (probe, 2026-10-30), so `CommandShortcut` does what the spec decided:
   - `ShortcutLookup` reads `vivaldi.actions` through `BrowserPrefs` and returns the first keyboard
     shortcut of a command (`COMMAND_SHOW_QUICK_COMMANDS`, `COMMAND_SHOW_DOWNLOADS_PANEL`). Values
     that are not an array of strings (gestures) are ignored.
   - `ShortcutPlayer` plays the shortcut (`meta+t`, `alt+meta+l`) with
     `vivaldi.utilities.emulateUserInput`, or by a `keydown`/`keyup` pair on the document if task T1
     finds that Vivaldi accepts it. It is the only class that touches the API.
   - Library: if the shortcut is missing or cannot be played, `DownloadsButton` clicks Vivaldi's own
     `Trasferimenti` button of the panel bar. That bar may be hidden, so this is the fallback only.
   - `+`: plays the shortcut of Quick Commands as the user set it.
   - `New Tab`: plays Cmd/Ctrl+T (`meta+t` on macOS, `ctrl+t` elsewhere), so it does what the key does
     in that window, as Tore chose. If it cannot be played, it opens a blank tab with
     `BrowserTabs.create` in the window (AC-7).
8. **Hiding Vivaldi's own buttons.** In `incognito.css`, under the mark, the new tab button and the
   workspace button of the tab bar get `display: none` through selectors of the catalog
   (`newTabButton`, `workspaceButton`), not from the stylesheet text (FR-8). If a selector no longer
   matches in a future Vivaldi, the button just stays visible.

Rejected: reading the window type from a class of `#browser` (the probe found none); a `if (private)`
check inside every module (each new module would have to remember it, and a mistake would store
private data); sending the `+` to a URL such as `vivaldi://newtab` (not Quick Commands).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/BrowserRuntime.ts` | `isPrivateWindow()` | Facade |
| `src/core/Module.ts` | Static `privateWindows` policy | - |
| `src/core/ModuleRegistry.ts` | `createEnabled` filters by window kind | - |
| `src/core/VivArcDi.ts` | Detects the window once and passes it to the registry | - |
| `src/core/KeptElement.ts` | Moved from `src/modules/today`, unchanged | - |
| `src/modules/incognito/Incognito.ts` | The module: mark, rows, bottom bar, wiring | Mediator |
| `src/modules/incognito/IncognitoHeader.ts` | Title and `Clear` | - |
| `src/modules/incognito/NewTabRow.ts` | The `New Tab` row | - |
| `src/modules/incognito/BottomBar.ts` | Footer with `BarButton`s | Composite |
| `src/modules/incognito/PrivateTabs.ts` | `clear()` of the window's tabs | - |
| `src/modules/incognito/ShortcutLookup.ts` | Shortcut of a command from `vivaldi.actions` | - |
| `src/modules/incognito/ShortcutPlayer.ts` | Plays a shortcut | Adapter |
| `src/modules/incognito/CommandLauncher.ts` | Library, `+`, `New Tab` with their fallbacks | Strategy |
| `src/styles/incognito.scss` | Rows, bottom bar, hidden Vivaldi buttons, all under the mark | - |

Every class takes its dependencies in the constructor, so each is tested with fakes.

## Vivaldi interface

- `chrome.windows.getCurrent` (`incognito`), `chrome.tabs.query/remove/create`, as `BrowserTabs`
  already wraps them.
- `vivaldi.prefs` key `vivaldi.actions`, read only. Its shape was confirmed by the probe of 014:
  `vivaldi.actions[0].COMMAND_X.shortcuts`.
- `vivaldi.utilities.emulateUserInput`: its signature is not documented; T1 finds it.
- Selectors added to the catalog: `newTabButton` (`.button-toolbar.newtab`), `workspaceButton`
  (`.tabbar-workspace-button`), `downloadsButton` (a button of the panel bar titled
  `Trasferimenti`/`Downloads`; matched by the command's title attribute prefix).
- Marks: `data-vivarcdi-private`, `data-vivarcdi-incognito-header`, `data-vivarcdi-bottom-bar`.

## Configuration

```json
"incognito": {
  "enabled": true
}
```

and `styles/incognito.css` in the list of styles.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi ignores a shortcut played by a mod | T1 proves it on Tore's Vivaldi before any other code; the Downloads button is the fallback, Quick Commands has none, so the `+` would be hidden and the problem reported to Tore |
| The panel bar is hidden or the button has another title in another language | Fallback only; the title is matched by the command id first, then by the label of the user's language |
| The user changed Cmd+T to something else | `New Tab` plays Cmd/Ctrl+T as a key, which is what Tore asked; Quick Commands follows its own shortcut |
| `chrome.storage.local` is shared with normal windows | No module that stores data runs in a private window, proven by a test with a fake storage that fails on writes |
| Closing the active-window tabs by `currentWindow` hits a normal window | `PrivateTabs` passes the window id from `getCurrent`, not `currentWindow` |
| A future module forgets the policy | The default is `never` |
