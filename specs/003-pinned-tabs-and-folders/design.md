# 003 Pinned tabs: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

## Approach

A new module, `pinned-tabs`, works in Vivaldi's interface document through `chrome.tabs`, plus small
marks on the tab bar like the Favorites grid. The grid of 001 changes which tabs it turns into tiles.

1. **Favorites (FR-1).** Vivaldi stores a `workspaceId` in the `vivExtData` of every tab that belongs
   to a workspace, and none for a tab pinned in all workspaces (probe, 2026-10-27). The grid keeps the
   set of pinned tabs without `workspaceId`, like it already keeps the set of unloaded tabs, and marks
   only those as tiles. Tiles get CSS `order: 0` and every other slot `order: 1`, so tiles stay at the
   top of the grid even when Vivaldi lists a workspace pinned tab between them. Without `chrome.tabs`
   the grid falls back to the rule of 001, the first pinned tabs.
2. **Saved address (FR-2, NFR-2).** Stored as `{"vivarcdi": {"pinnedUrl": "…"}}` inside the tab's own
   `vivExtData`, which Vivaldi saves with the session and keeps across restarts (probe, 2026-10-27).
   On start the module saves the current address of every pinned tab that has none. Then
   `tabs.onUpdated` reports `pinned: true` (save the current address) and `pinned: false` (remove the
   key). Every write reads the tab again first and changes only the `vivarcdi` key, so Vivaldi's own
   keys are kept as they are.
3. **Reset button (FR-3).** The module keeps, for each pinned tab, its address and its saved one. When
   their address keys differ (`AddressKey` of 007, same host and path), the tab's slot gets
   `data-vivarcdi-away`. The stylesheet draws a small "back" arrow over the favicon of marked rows. A
   click on the favicon of a marked row loads the saved address with `tabs.update`. A tile is only a
   favicon, so for tiles the reset is a click on the tile that is already active, as in Arc.
4. **Closing (FR-4).** A keydown listener in the capture phase of the interface document catches
   Cmd/Ctrl+W when the active tab is pinned, stops the event and unloads the tab with the unloader of
   001, which first activates the last used tab. For focus inside the page, a small script injected into
   pinned tabs' pages forwards Cmd/Ctrl+W to the interface, as Peek already does for its own panel. A
   click listener in the capture phase catches the close button of pinned slots. Ordinary tabs are left
   to Vivaldi (AC-8).

Rejected alternatives:

- **Recreating a pinned tab after `tabs.onRemoved`**: the tab would lose its history and its id, and
  the user would see it disappear and come back.
- **Saved addresses in `localStorage`**: tab ids change at every restart, so the key would have to be
  guessed from position and workspace. `vivExtData` follows the tab instead.
- **Vivaldi's "lock to domain"**: keeps the tab on one site but has no way back to the saved page
  (spec, open questions).
- **Reset from a keyboard shortcut or menu item**: out of scope in the spec.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/TabData.ts` | Reads and writes Vivaldi's `vivExtData`: workspace id, VivArcDi's own key, everything else untouched | Adapter |
| `src/core/AddressKey.ts` | Moved from `reopen/`, now shared by 007 and 003 | Value object |
| `src/core/TabUnloader.ts` | Moved from `favorites/TileUnloader.ts`: activates the last used tab, then unloads | |
| `src/core/PageScriptInjector.ts` | Moved from `peek/` and made generic: keeps a script in tab pages, chosen per tab by a function | |
| `src/modules/favorites/GlobalPinnedTabs.ts` | Set of pinned tabs without `workspaceId`, kept up to date from `tabs.onUpdated` (FR-1) | Observer |
| `src/modules/favorites/FavoriteTagger.ts` | Marks as tiles only the slots of global pinned tabs; first pinned tabs without `chrome.tabs` | |
| `src/modules/pinned/SavedAddresses.ts` | Saves, reads and forgets the saved address of a tab in `vivExtData` (FR-2) | Repository |
| `src/modules/pinned/PinWatcher.ts` | Saves on start and on pin, forgets on unpin (AC-2, AC-3, AC-4) | Observer |
| `src/modules/pinned/AwayTabs.ts` | Which pinned tabs show another page than their saved address (AC-5) | |
| `src/modules/pinned/PinnedSlotMarker.ts` | Puts `data-vivarcdi-away` on the slots of away tabs, from a `FrameTask` after tab bar mutations | |
| `src/modules/pinned/ResetClick.ts` | Click on the favicon of an away row, or on the active away tile, loads the saved address (AC-6) | |
| `src/modules/pinned/CloseShortcut.ts` | Cmd/Ctrl+W and the close button on pinned tabs unload them; others pass through (AC-7, AC-8) | |
| `src/modules/pinned/PinnedMessage.ts` | Message sent by the page script, with a token as in Peek | |
| `src/page/pinned-keys.ts` | Page script: forwards Cmd/Ctrl+W of a pinned tab's page to the interface | |
| `src/modules/pinned/PinnedTabs.ts` | Module: reads options, wires the parts, stops cleanly | Facade |
| `src/styles/pinned.scss` | Reset arrow over the favicon of away rows, separator after the pinned rows | |

The `peek` and `reopen-pinned` modules switch to the moved classes in `src/core/`; their behavior and
tests stay the same. As 007's design announced, 007 then also matches a new tab against a pinned
tab's saved address, and keys its last-opened dates by it when the tab has one.

## Vivaldi interface

| What | Use | IF missing or failing |
|---|---|---|
| `vivExtData.workspaceId` | Tells Favorites from workspace pinned tabs | Grid falls back to the first pinned tabs, logged |
| `vivExtData.vivarcdi.pinnedUrl` | Saved address, written by VivArcDi | Not saved, no reset button, logged once |
| `chrome.tabs.onUpdated`, `query`, `get`, `update`, `discard` | Pin changes, addresses, reset, unload | Module does not start, logged; Vivaldi behaves as usual (NFR-3) |
| `webview.executeScript` | Page script for Cmd/Ctrl+W with focus in the page | Only Cmd/Ctrl+W with focus in the interface is caught, logged once |
| Selector `tabClose` (`.tab-header .close`), new in `src/selectors/8.1.json` | Close button of a tab | Close button closes as in Vivaldi |
| Selector `tabFavicon` (`.tab-header .favicon`), new | Reset target in rows | No reset by click |
| Marks `data-vivarcdi-away`, `data-vivarcdi-pinned-last` on tab slots | Styles | |

Uninstalling VivArcDi leaves only the `vivarcdi` key in `vivExtData`, which plain Vivaldi ignores
(NFR-1, AC-13).

## Configuration

```json
"pinned-tabs": {
  "enabled": true,
  "resetButton": true,
  "unloadOnClose": true
}
```

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi rewrites `vivExtData` without our key, for example when a tab moves to another workspace | Read again before each write; a tab that loses its key gets its current address again on the next start; manual check AC-12 |
| A write races with Vivaldi changing `vivExtData` at the same moment | Read, change one key, write at once; accepted |
| Vivaldi handles Cmd/Ctrl+W before the page or interface sees it | Capture phase in both places; manual check AC-11 with focus in the page and in the address bar |
| Vivaldi lists workspace pinned tabs between Favorites | CSS `order` keeps tiles first; manual check AC-9 |
| The close button is not in the DOM on pinned rows | Then only Cmd/Ctrl+W is caught; selector logged when missing |
