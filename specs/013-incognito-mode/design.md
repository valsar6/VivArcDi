# 013 Incognito mode: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-10-30; design approved 2026-10-30. It says **how**; the spec says **what**.

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
7. **Library, `+` and `New Tab`.** A mod cannot run Vivaldi commands or press keys (probes of
   2026-10-30 and 2026-10-31), so `CommandLauncher` uses the interface itself:
   - `newTab()`: `BrowserTabs.create` opens a blank tab in the window (the id from `getCurrent`), then
     `AddressField.focus()` finds the address field with the `addressField` selector, focuses it and
     selects its text. The field may appear after the tab is created, so `AddressField` retries on the
     next frames for a short, fixed time and gives up silently. `New Tab` and `+` both call `newTab()`.
   - `openLibrary()`: `DownloadsButton.click()` clicks Vivaldi's Downloads button of the panel bar. The
     bar may be hidden by auto-hide; the click on a hidden button still reaches its handler, and the
     manual check AC-15 proves it.
   Cmd/Ctrl+T is not handled: it stays Quick Commands natively (014).
8. **Hiding Vivaldi's own buttons.** In `incognito.css`, under the mark, the new tab button and the
   workspace button of the tab bar get `display: none` through selectors of the catalog
   (`newTabButton`, `workspaceButton`), not from the stylesheet text (FR-8). If a selector no longer
   matches in a future Vivaldi, the button just stays visible.

Rejected: playing the shortcut of Quick Commands from the mod (probe: it does nothing); an own command panel (a spec of its own); reading the window type from a class of `#browser` (the probe found none); a `if (private)`
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
| `src/modules/incognito/AddressField.ts` | Finds, focuses and selects the address field | - |
| `src/modules/incognito/DownloadsButton.ts` | Clicks Vivaldi's Downloads button | - |
| `src/modules/incognito/CommandLauncher.ts` | `newTab()` and `openLibrary()` for the three buttons | Facade |
| `src/styles/incognito.scss` | Rows, bottom bar, hidden Vivaldi buttons, all under the mark | - |

Every class takes its dependencies in the constructor, so each is tested with fakes.

## Vivaldi interface

- `chrome.windows.getCurrent` (`incognito`), `chrome.tabs.query/remove/create`, as `BrowserTabs`
  already wraps them.
- Selectors added to the catalog (confirmed by Tore's probe on Vivaldi 8.2, 2026-10-31):
  `newTabButton` (`.button-toolbar.newtab`), `workspaceButton` (`.tabbar-workspace-button`),
  `addressField` (`input.UrlBar-UrlField`) and `downloadsButton` (a `button` of the panel bar whose
  `title` starts with `Trasferimenti` or `Downloads`, matched by `DownloadsButton` since the title
  follows the user's language).
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
| The address field appears late | `AddressField` retries for a short time and gives up silently, the blank tab still opens |
| The Downloads button is hidden with the panel bar, or titled in another language | The title is matched by the shortcut hint `(⌥⌘L)` and the label of the user's language; if the click does nothing, AC-15 fails and Tore decides |
| The user does not use Cmd+T for Quick Commands | Not our concern: the buttons do not depend on it |
| `chrome.storage.local` is shared with normal windows | No module that stores data runs in a private window, proven by a test with a fake storage that fails on writes |
| Closing the active-window tabs by `currentWindow` hits a normal window | `PrivateTabs` passes the window id from `getCurrent`, not `currentWindow` |
| A future module forgets the policy | The default is `never` |
