# 055 Open a tile as a web panel

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | Tore, 2026-11-21 (revised after the probes, approved again 2026-11-21) |

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
- **US-2.** As a user, I want a tile that is already a web panel to bring that panel up from the same
  menu, without a second copy.

## Expected behavior

Right-click on a tile opens VivArcDi's menu (031 FR-4). It gains **Open as web panel**, next to
**Untile tab** and **Pin tab**.

- Choosing it does what the user does by hand: it uses Vivaldi's own **Add web panel** form with the
  tile's address. Vivaldi creates the panel, reads its title and icon from the page and opens the side
  panel on it. The tile stays in the grid and in every workspace.
- A tile whose page is already a web panel shows **Show web panel** in place of the command; it brings
  up the panel that exists, and adds nothing.
- Removing a panel stays with Vivaldi: its own panel bar and menu.
- The panel is Vivaldi's own: its width, position and mobile layout are Vivaldi's, and nothing is
  drawn by VivArcDi inside it.
- Pages that are not web pages (`vivaldi://`, `file://`) do not get the command.
- Arc has no web panels; this is a deliberate addition that uses a Vivaldi feature.

## Requirements

### Functional

- **FR-1.** The menu of a tile has **Open as web panel** when its page is an `http` or `https` URL
  that is not yet a web panel.
- **FR-2.** The command fills Vivaldi's **Add web panel** form with the tile's URL and submits it, so
  Vivaldi creates the panel (title, icon, mobile mode) and opens the side panel on it.
- **FR-3.** When the tile's URL already is a web panel, the menu shows **Show web panel**, which
  brings up that panel by its button in the panel bar.
- **FR-4.** The tile is never changed, moved or removed by these commands.
- **FR-5.** The commands never change or remove a web panel; they only add one or show one.

### Non-functional

- **NFR-1.** IF the **Add web panel** form or the panel bar is not found on a Vivaldi version, THEN
  the command is not shown and the reason is logged; nothing else in the menu changes.
- **NFR-2.** Works on Vivaldi 8.1 and 8.2, on macOS and Debian; texts in English.
- **NFR-3.** The panel is created through Vivaldi's own interface, never by writing its preference
  (Vivaldi does not show a panel written that way) or editing profile files. The elements it needs are
  named in the selector catalog like the others, so a version that moves them is a catalog change.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the menu of a tile with an `https` page is opened, THE menu SHALL show **Open as web panel**. | auto: `offers open as web panel on a tile` |
| AC-2 | WHEN the page of a tile is not `http` or `https`, THE menu SHALL NOT show the command. | auto: `hides open as web panel for other schemes` |
| AC-3 | WHEN **Open as web panel** is chosen, THE module SHALL fill Vivaldi's **Add web panel** form with the tile's URL and submit it. | auto: `adds a web panel for a tile` |
| AC-4 | WHEN the tile's URL already is a web panel, THE menu SHALL show **Show web panel** instead. | auto: `offers show web panel when the tile is a panel` |
| AC-5 | WHEN **Show web panel** is chosen, THE module SHALL bring up the existing panel and add none. | auto: `shows the panel of the tile without adding one` |
| AC-6 | WHEN a command is chosen, THE tile and the other web panels SHALL stay as they were. | auto: `leaves the tile and other panels untouched` |
| AC-7 | IF the **Add web panel** form or the panel bar is not found, THEN THE menu SHALL NOT show the commands. | auto: `hides the web panel commands when the form is missing` |
| AC-8 | WHEN a web panel is added, THE panel SHALL exist in Vivaldi's panel list of a lab Vivaldi. | manual |
| AC-9 | WHEN Tore chooses **Open as web panel** on a tile, THE side panel SHALL open on that site in its mobile layout, and **Show web panel** SHALL bring it up again. | manual |

## Out of scope

- Web panels for rows of today's tabs and link rows (a later spec, if wanted).
- A click or Cmd/Ctrl+click on a tile opening the panel.
- Removing or hiding a web panel, its width, position, reordering and the panel bar: Vivaldi's own.
- Tab tiling (split view): [022](../022-split-from-drag/spec.md).

## Open questions

- [x] **1. How does code add a web panel?** Probed on a lab Vivaldi 8.3 (2026-11-21). Vivaldi keeps
  the panels in the preference `vivaldi.panels.web.elements`. Writing the array with `vivaldi.prefs.set`
  persists the value, but the panel never appears in the panel bar while Vivaldi runs (5 s, with and
  without an icon), and the window cannot be reloaded from code, so the write is discarded. The
  interface works: a click on the panel bar's add button opens a form (an address field and a submit
  button), and submitting it makes Vivaldi create the panel, read its title and icon from the page and
  open the side panel on it. Decided by Tore, 2026-11-21: drive that form, with its elements named in
  the selector catalog.
- [x] **4. Can the command close a panel?** The panel bar's **Customize** popup only toggles a panel's
  visibility; its only delete control is for separators, and the panel button's context menu is
  native, so code cannot reach it. The side panel's own close button only hides the panel. Proposed:
  no close command; the already-a-panel menu item **Show web panel** replaces **Close web panel**, and
  removal stays with Vivaldi (this revision). Accepted by Tore, 2026-11-21.
- [x] **2. Which URL identifies "already a panel"?** The stored URLs differ in form (`https://social.vivaldi.net/`
  and `https://wikipedia.org`), so a trailing slash cannot decide. Accepted by Tore, 2026-11-21: the
  same URL after dropping the fragment and a trailing slash.
- [x] **3. Which text?** **Open as web panel**, Vivaldi's own words (Tore, 2026-11-21).

## References

- [Vivaldi web panels for web developers](https://help.vivaldi.com/developers/web/vivaldi-web-panels-for-web-developers/)
  (mobile user agent, narrow viewport, shared context with tabs; panels cannot request new permissions).
- Specs [031](../031-pin-and-tile-commands/spec.md) (tile menu), [020](../020-drag-tab-to-favorites/spec.md), [001](../001-favorites-grid/spec.md).
