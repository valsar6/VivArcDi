# 023 Command panel with tab actions: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-08. It says **how**; the spec says **what**.

## Approach

A `command-panel` module draws a centered overlay with a field and a list, using the overlay and keyboard code
of the folder preview (008) and the archive panel (004). Three kinds of rows come from three **providers** behind one
interface, so a feature adds a provider and not a branch in the panel.

1. **Shortcut.** Vivaldi handles keys before the page, but a key that Vivaldi does not use reaches `window.html`.
   Cmd/Ctrl+Shift+K is not bound in Vivaldi 8.2 (to confirm in T1 with the shortcut probe). `PanelKey` listens for it on the
   document in the capture phase through `ShortcutKeys`, which also gives the Debian `ctrl` choice.
2. **Providers.** `ActionProvider` lists registered actions (Pin tab, Unpin tab, Favorite, Pin to folder, Archive tab, Copy URL,
   Copy as Markdown link). Modules register actions in an `ActionRegistry` in `src/core`; the panel does not import them.
   `TabProvider` reads open tabs with `BrowserTabs.query`, rows "Switch to Tab" (`tabs.update` with `active`).
   `BookmarkProvider` and `HistoryProvider` read `chrome.bookmarks.search` and `chrome.history.search` with a limit of 5 each.
   Order: actions, tabs, bookmarks, history (spec).
3. **Matching.** `Matcher` ranks by prefix, then word start, then substring, case-insensitive; it is a pure function (AC-2).
4. **Site search (FR-4, AC-4).** `SiteSearch` holds the `search-sites` map (nickname to URL template with `%s`). Typing a nickname and
   Tab shows a chip with the site; Enter then opens the template with the query in a new tab (`BrowserTabs.create`).
   The map starts from Vivaldi's search engine nicknames read through `BrowserSearch` and `BrowserPrefs`, merged with `config.json`.
5. **Keyboard.** Arrows move, Enter runs, Esc closes and changes nothing (AC-5). Focus returns to the page on close.
6. **Private windows.** `privateWindows` is `never`: history and bookmarks must not show in a private window.

Rejected: opening or extending Quick Commands (impossible, probe of 2026-10-31); rewriting Cmd/Ctrl+T.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/ActionRegistry.ts` | Actions registered by modules | Registry |
| `src/modules/commandpanel/CommandPanel.ts` | Module wiring | Module |
| `.../PanelView.ts` | Overlay, field, list, focus | View |
| `.../PanelKey.ts` | Open shortcut | |
| `.../Matcher.ts` | Ranking | Pure function |
| `.../providers/*.ts` | Actions, tabs, bookmarks, history | Strategy |
| `.../SiteSearch.ts` | Nickname map and URL building | |

## Vivaldi interface

No selector except the `#browser` host for the overlay. APIs: `chrome.tabs`, `chrome.bookmarks`, `chrome.history` (permission check in T1;
the provider hides itself when the API is missing). Marks: `data-vivarcdi-panel` on the overlay.

## Configuration

`command-panel`: `enabled` true, `shortcut` `mod+shift+k`, `maxRows` 12, `search-sites` map.

## Risks

| Risk | Mitigation |
|---|---|
| The key is taken by Vivaldi on a build | T1 probe; the shortcut is a setting |
| `chrome.history` is not exposed to mods | The provider is optional; the panel still works |
| Typing in the overlay triggers Vivaldi keys | The overlay stops propagation and uses `-webkit-app-region: no-drag` |
