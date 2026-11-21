# 055 Open a tile as a web panel: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-21. It says **how**; the spec says **what**. It builds
on the tile menu of [031](../031-pin-and-tile-commands/design.md) (`TileMenu`, `ContextMenu`).

## Approach

### What the probe showed

Vivaldi keeps its web panels in the preference `vivaldi.panels.web.elements`, an array of
`{ id: 'WEBPANEL_<uuid>', url, title, faviconUrl, mobileMode, zoom }` (probe of 2026-11-21, saved
outside the repository). `chrome.sidePanel` is not exposed to the window. So the feature is a write
of that array, plus a way to show the panel; both are proved by T1 before the rest is built.

### Reading and writing the panels (FR-1 to FR-5, NFR-3)

`BrowserPrefs` is read-only on purpose (it says so in its docstring). The write does not go into it:

- **`WebPanelList`** in `src/shared/panels` reads the array through `BrowserPrefs.get` and keeps the
  rule of what counts as the same page: `sameAddress(a, b)` drops the fragment and a trailing slash
  (question 2). It exposes `find(url)`, `add(page)` and `remove(id)`.
- **`PanelPrefsWriter`** in `src/core/browser` is the single place that calls `vivaldi.prefs.set`,
  with its own narrow interface (`set(key, value)`), so tests use a fake. `add` and `remove` read the
  current array, change one element and write the whole array back; no other element is rebuilt, so
  the panels of the user stay as they are (FR-5).
- A new element is `{ id: 'WEBPANEL_' + crypto.randomUUID(), url, title, faviconUrl, mobileMode: true, zoom: 1 }`.
  `faviconUrl` is a data URL in Vivaldi's own panels; the tile shows `chrome://favicon/...`, so the
  icon is read once into a data URL. IF that fails, the element is added without an icon and Vivaldi
  shows its default (T1 says whether the field may be empty).

### Showing the panel (FR-2)

How the side panel is brought up on a new element is not known; T1 probes the panel bar and the
preferences `vivaldi.panels.*` that change when a panel is opened by hand. The two candidates are a
second preference write (the active panel) and a click on the button of the panel in the bar. The
design takes the first that T1 shows to work; if neither does, the panel is only added and appears in
the panel bar, and the spec's AC-9 wording is revised before the code.

### The menu (FR-1, FR-3, FR-4)

`TileMenu` gains a `panels` dependency (`WebPanelList` plus the tile's page, read from the
bookmark of the tile id as the other tile commands do). On a right click it asks `panels.find(url)`:

| Tile page | Extra item |
|---|---|
| `http` or `https`, not a panel | **Open as web panel** |
| `http` or `https`, already a panel | **Close web panel** |
| other scheme | none |

The items come after **Pin tab**. Neither item touches the tile (FR-4). IF `PanelPrefsWriter` is not
available (`vivaldi.prefs.set` missing or the preference unreadable), `TileMenu` gets no `panels`
and shows no extra item; the reason is logged once (NFR-1).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/browser/PanelPrefsWriter.ts` | The only `vivaldi.prefs.set` call; writes the panel list | Adapter |
| `src/shared/panels/WebPanelList.ts` | Reads the list; `find`, `add`, `remove`; same-address rule | - |
| `src/modules/favorites/TileMenu.ts` | The two items, chosen from the tile's page and the list | - |
| `src/modules/favorites/GridDragging.ts` | Builds `WebPanelList` and passes it to `TileMenu` | - |
| `src/shared/tabs/CommandLabels.ts` | `OPEN_WEB_PANEL_LABEL`, `CLOSE_WEB_PANEL_LABEL` | - |
| `tests/live/scenarios/a-tile-becomes-a-web-panel-in-the-panel-list.live.ts` | AC-8 | - |

## Configuration

None: the items are part of the Favorites module and follow it.

## Risks

- A write may be ignored while Vivaldi runs, or overwritten by Vivaldi's own sync of panels; T1 checks
  both on the throwaway profile.
- Vivaldi may change the element format in a later version; `WebPanelList` ignores elements it cannot
  read and never rewrites them differently from how it found them.
- The side panel may not be openable from code; see "Showing the panel".
