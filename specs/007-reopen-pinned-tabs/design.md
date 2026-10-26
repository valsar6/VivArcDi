# 007 Reopen pinned tabs: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

Everything happens in Vivaldi's interface document through `chrome.tabs`; no page script is needed.

1. **Spot the new, empty tab.** `tabs.onCreated` reports every new tab. A tab counts as new and empty
   when it has no opener and its URL is Vivaldi's start page or blank. Tabs opened from links carry an
   `openerTabId` or a real URL, and tabs restored from a session carry their URL, so they are never
   watched (FR-5). Peek creates its tabs with a URL, so they are left alone too.
2. **Catch its first navigation.** `tabs.onUpdated` reports the first `url` change of a watched tab
   to a web address (`http`, `https`). The tab is then unwatched, whatever happens next, so a tab is
   redirected at most once.
3. **Find the pinned tab.** The module queries the pinned tabs of the same window, keeps those in
   the same workspace as the new tab (FR-1), and compares their address key with the new tab's
   (FR-2). When several match, the most recently opened one wins (FR-4).
4. **Switch.** It activates the pinned tab, reloads it if it is still unloaded, then removes the new
   tab. If the activation fails, the new tab is left untouched (NFR-2).

Separately, `tabs.onActivated` records the date each time a pinned tab becomes active, by any route
(FR-6).

Rejected alternatives:

- **"Switch to tab" suggestions in the address bar**: Vivaldi's address bar dropdown is rendered by
  its own React code and has no extension point; changing it would break on every update. Tore
  checked that Vivaldi 8.2 does not suggest open tabs there.
- **Catching Enter in the address field**: misses suggestions picked with the mouse and pages opened
  from the start page's search; the first navigation covers all of them.
- **Navigating the pinned tab to the typed address**: the spec keeps the pinned tab's own page (FR-3).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/reopen/ReopenPinned.ts` | Module: reads options, wires the parts, stops cleanly | Facade |
| `src/modules/reopen/AddressKey.ts` | Turns a URL into its match key: host without `www.`, path without trailing `/`, no query or fragment (FR-2) | Value object |
| `src/modules/reopen/NewTabWatcher.ts` | Watches tabs created empty and reports their first web navigation once (FR-1, FR-5) | Observer |
| `src/modules/reopen/Workspace.ts` | Reads a tab's workspace from `vivExtData` | Adapter |
| `src/modules/reopen/PinnedTabFinder.ts` | Pinned tabs of the window and workspace with the same key, most recently opened first (FR-1, FR-4) | |
| `src/modules/reopen/TabSwitcher.ts` | Activates, reloads if unloaded, removes the new tab; keeps it on failure (FR-3, NFR-2) | |
| `src/modules/reopen/LastOpenedStore.ts` | Last-opened dates by address key, saved across restarts (FR-6, NFR-2 of 003) | Repository |
| `src/modules/reopen/ActivationRecorder.ts` | On `tabs.onActivated`, records the date of pinned tabs in the store (FR-6) | Observer |
| `src/core/BrowserTabs.ts` | Gains `remove`, `reload` and `onCreated` | |

`LastOpenedStore` is the piece [008](../008-folder-hover-preview/spec.md) will read, so its interface
(`get(key)`, `record(key, date)`) is public and documented.

## Vivaldi interface

No selectors and no DOM marks: the module only uses tab data.

| API | Use | IF missing or failing |
|---|---|---|
| `chrome.tabs.onCreated`, `onUpdated`, `onActivated` | Watch new tabs and activations | Module does not start, logged; Vivaldi behaves as usual |
| `chrome.tabs.query`, `update`, `reload`, `remove` | Find, activate, reload, close | The new tab stays open, logged (AC-7) |
| `vivExtData.workspaceId` on tabs | Same-workspace filter | A tab without it belongs to no workspace; Favorites pinned in all workspaces are kept as candidates everywhere |
| `localStorage` of the interface document | Last-opened dates | Dates are kept for the session only, logged once |

The start page is recognised by a short list of addresses (`chrome://vivaldi-webui/startpage`,
`vivaldi://startpage`, `about:blank`, empty), kept in `NewTabWatcher` and covered by its tests.

## Keys of the last-opened dates

Tab ids change when Vivaldi restarts, so dates are stored by the pinned tab's address key at the
moment it becomes active. A pinned tab that stays on its site keeps its history. When 003 adds the
saved pinned URL, the key moves to that URL; the store does not change. Entries older than one year
are dropped when the store is loaded, so it cannot grow forever.

## Configuration

```json
"reopen-pinned": {
  "enabled": true
}
```

## Folders

The peek-out below a closed folder (AC-10) is drawn by 003. This module only activates the tab, so
nothing changes here when 003 lands; AC-10 stays in the manual checklist and is checked then.

## Risks

| Risk | Mitigation |
|---|---|
| The new tab shows for a moment before the switch | Accepted by the spec; the switch runs on the first `onUpdated`, before the page finishes loading |
| Vivaldi 8.2 uses another start page address | Address list in one place, logged when a new tab is ignored for an unknown URL; manual check AC-9 |
| `vivExtData` has no `workspaceId` for Favorites pinned in all workspaces | Treated as global, as above; manual check AC-9 with two workspaces |
| Closing the new tab activates another tab before ours | Activate first, remove second |
| Activating a discarded tab does not reload it in Vivaldi | Explicit `tabs.reload` when the activated tab is still unloaded (AC-4) |
