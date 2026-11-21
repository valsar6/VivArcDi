# 055 Open a tile as a web panel: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-21 and revised the same day after the probes of task T1. It says **how**; the spec says **what**. It builds
on the tile menu of [031](../031-pin-and-tile-commands/design.md) (`TileMenu`, `ContextMenu`).

## Approach

### What the probes showed

Vivaldi keeps its web panels in the preference `vivaldi.panels.web.elements`, but a write of that
array does not take effect: the value persists and the panel bar does not change (5 s, with and
without an icon), and the window cannot be reloaded from code. The interface does it: the panel bar's
add button opens a form, and submitting it makes Vivaldi create the element itself (with `origin`,
`faviconUrlValid`, `resizable` and `width` fields a hand-made element would lack), read the title
and icon from the page and open the side panel. The probes are kept outside the repository. So the
feature drives Vivaldi's own form, the way the rest of VivArcDi drives Vivaldi's DOM.

### Driving the form (FR-2, NFR-1, NFR-3)

**`WebPanelForm`** in `src/shared/panels` has one method, `add(url)`:

1. click the add button of the panel bar;
2. wait for the form, set the address field with the native `value` setter and dispatch an `input`
   event (a React field ignores a plain assignment), then click the submit button;
3. resolve when the new panel's button is in the bar, or reject after a short time.

If any element is missing it throws a typed error; the caller hides the commands (NFR-1) and logs the
reason once. The elements are read through `context.selectors` (below), so a Vivaldi version that
moves them is a catalog change.

### Reading and showing the panels (FR-1, FR-3, FR-5)

**`WebPanelList`** in `src/shared/panels` reads `vivaldi.panels.web.elements` through
`BrowserPrefs.get` (read-only, as it stays) and keeps the rule of what counts as the same page:
`sameAddress(a, b)` drops the fragment and a trailing slash (question 2). It exposes `find(url)`,
which returns the id of the panel, and `show(id)`, which clicks the panel's button in the bar
(`[data-name="WEBPANEL_<uuid>"]`) and so brings up the side panel. It writes nothing and never
touches a panel.

### The menu (FR-1, FR-3, FR-4)

`TileMenu` gains a `panels` dependency (`WebPanelList`, `WebPanelForm` and the tile's page, read from
the bookmark of the tile id as the other tile commands do). On a right click it asks `panels.find(url)`:

| Tile page | Extra item |
|---|---|
| `http` or `https`, not a panel | **Open as web panel** |
| `http` or `https`, already a panel | **Show web panel** |
| other scheme | none |

The items come after **Pin tab**. Neither item touches the tile (FR-4). IF the form or the panel bar
is not found, `TileMenu` gets no `panels` and shows no extra item (NFR-1).

## Selectors

New names in `src/selectors/<version>.json`, found by the probes on Vivaldi 8.3 and checked by the
selector check of `npm run live` (spec 047):

| Name | Selector | Is |
|---|---|---|
| `panelAddButton` | `#panels button[data-name="PanelWeb"]` | the button that opens the form (titled "Customize panel") |
| `panelAddressField` | `.CustomizePanelPopup input.address` | the address field |
| `panelAddSubmit` | `.CustomizePanelPopup button.FormButton` | the submit button |
| `webPanelButton` | `#panels button[data-name^="WEBPANEL_"]` | one button per web panel; the id is in `data-name` |

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/shared/panels/WebPanelForm.ts` | Opens Vivaldi's add form, fills and submits it; waits for the new button | - |
| `src/shared/panels/WebPanelList.ts` | Reads the list; `find`, `show`; same-address rule | - |
| `src/modules/favorites/TileMenu.ts` | The two items, chosen from the tile's page and the list | - |
| `src/modules/favorites/GridDragging.ts` | Builds the panel collaborators and passes them to `TileMenu` | - |
| `src/shared/tabs/CommandLabels.ts` | `OPEN_WEB_PANEL_LABEL`, `SHOW_WEB_PANEL_LABEL` | - |
| `src/selectors/8.1.json` and the selector check | The four names above | - |
| `tests/live/scenarios/a-tile-becomes-a-web-panel-in-the-panel-list.live.ts` | AC-8 | - |

## Configuration

None: the items are part of the Favorites module and follow it.

## Risks

- Vivaldi may restyle the form or the panel bar in a later version; the catalog and the selector
  check turn that into one named failure, and NFR-1 hides the commands meanwhile.
- The form closes or moves while it is being driven; the wait in step 3 has a timeout and leaves no
  half-filled form open (the popup is closed with its own close button on failure).
- A tile whose address Vivaldi rewrites on submit (a redirect, a trailing slash) is found again by
  the same-address rule, so it is not added twice.
- Removing a panel is not offered (question 4); a user who removes one by hand sees **Open as web
  panel** again.
