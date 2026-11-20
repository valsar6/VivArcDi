# 055 Open a tile as a web panel

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Vivaldi shows a page in its side panel as a [web panel](https://help.vivaldi.com/developers/web/vivaldi-web-panels-for-web-developers/):
a narrow column beside the page, loaded with a mobile user agent, that stays while the user changes tab.
No spec uses it for the tiles of the Favorites grid. This spec adds a **Open as web panel** command to
the menu of a tile ([031](../031-pin-and-tile-commands/spec.md)), so a favorite site such as a chat, a
calendar or a music player can sit beside any page without taking a tab.

## User stories

- **US-1.** As a user, I want to open a tile as a web panel from its menu, so that I keep that site
  beside the page I am reading.
- **US-2.** As a user, I want to see that a tile is already a web panel, and to close the panel from
  the same menu.

## Expected behavior

Right-click on a tile opens VivArcDi's menu (031 FR-4). It gains **Open as web panel**, next to
**Untile tab** and **Pin tab**.

- Choosing it adds the tile's page to Vivaldi's web panels and opens the side panel on it. The tile
  stays in the grid and in every workspace.
- A tile whose page is already a web panel shows **Close web panel** in place of the command; it
  closes the panel and removes it from Vivaldi's panel bar, and the tile stays.
- The panel is Vivaldi's own: its width, position and mobile layout are Vivaldi's, and nothing is
  drawn by VivArcDi inside it.
- Pages that are not web pages (`vivaldi://`, `file://`) do not get the command.
- Arc has no web panels; this is a deliberate addition that uses a Vivaldi feature.

## Requirements

### Functional

- **FR-1.** The menu of a tile has **Open as web panel** when its page is an `http` or `https` URL
  that is not yet a web panel.
- **FR-2.** The command adds a web panel for the tile's URL, with the tile's title and icon, and shows
  the side panel on it.
- **FR-3.** When the tile's URL already is a web panel, the menu shows **Close web panel**, which
  removes that panel.
- **FR-4.** The tile is never changed, moved or removed by these commands.
- **FR-5.** Panels the user made in Vivaldi are never changed or removed, except the one this command
  removes by FR-3.

### Non-functional

- **NFR-1.** IF Vivaldi's web panels cannot be written on a Vivaldi version, THEN the command is not
  shown and the reason is logged; nothing else in the menu changes.
- **NFR-2.** Works on Vivaldi 8.1 and 8.2, on macOS and Debian; texts in English.
- **NFR-3.** The panel is created through Vivaldi's own preference or API, never by editing profile files.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the menu of a tile with an `https` page is opened, THE menu SHALL show **Open as web panel**. | auto: `offers open as web panel on a tile` |
| AC-2 | WHEN the page of a tile is not `http` or `https`, THE menu SHALL NOT show the command. | auto: `hides open as web panel for other schemes` |
| AC-3 | WHEN **Open as web panel** is chosen, THE module SHALL add a web panel with the tile's URL, title and icon. | auto: `adds a web panel for a tile` |
| AC-4 | WHEN the tile's URL already is a web panel, THE menu SHALL show **Close web panel** instead. | auto: `offers close web panel when the tile is a panel` |
| AC-5 | WHEN **Close web panel** is chosen, THE module SHALL remove only that panel. | auto: `closes only the panel of the tile` |
| AC-6 | WHEN a command is chosen, THE tile and the other web panels SHALL stay as they were. | auto: `leaves the tile and other panels untouched` |
| AC-7 | IF web panels cannot be written, THEN THE menu SHALL NOT show the command. | auto: `hides open as web panel when panels are not writable` |
| AC-8 | WHEN a web panel is added, THE panel SHALL exist in Vivaldi's panel list of a lab Vivaldi. | live: `tile-web-panel-added` |
| AC-9 | WHEN Tore chooses **Open as web panel** on a tile, THE side panel SHALL open on that site in its mobile layout, and **Close web panel** SHALL close it. | manual |

## Out of scope

- Web panels for rows of today's tabs and link rows (a later spec, if wanted).
- A click or Cmd/Ctrl+click on a tile opening the panel.
- Panel width, position, reordering and the panel bar: Vivaldi's own.
- Tab tiling (split view): [022](../022-split-from-drag/spec.md).

## Open questions

- [ ] **1. How does code add a web panel?** Vivaldi stores them in its preferences (a list of panel
  elements with URL, title and icon); the exact key and whether it can be written from the window need
  a read-only probe (`npm run live -- --probe <file>`) before the design. Proposed: task T1 is that
  probe, and NFR-1 is the fallback.
- [ ] **2. Which URL identifies "already a panel"?** Proposed: the same URL after dropping the fragment
  and a trailing slash.
- [ ] **3. Which text, "Open as web panel" or "Add as panel"?** Proposed: **Open as web
  panel**, Vivaldi's own words.

## References

- [Vivaldi web panels for web developers](https://help.vivaldi.com/developers/web/vivaldi-web-panels-for-web-developers/)
  (mobile user agent, narrow viewport, shared context with tabs; panels cannot request new permissions).
- Specs [031](../031-pin-and-tile-commands/spec.md) (tile menu), [020](../020-drag-tab-to-favorites/spec.md), [001](../001-favorites-grid/spec.md).
