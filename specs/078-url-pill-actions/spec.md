# 078 Address field actions

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | |
| Implemented | |
| Extends | [074](../074-toolbar-waves/spec.md): the `AddressField` that lives in the tab bar. Reuses the `CopyUrl` module (`src/modules/copyurl`). |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc, the address "pill" at the top of the sidebar shows a few small icons at its right: the lightning
bolt of a pinned extension, a copy-link icon and a site-controls (sliders) icon. Tore decided on
2026-11-28 to have the same in VivArcDi's sidebar, in the address field that lives in the tab bar
(`AddressField`, with the Back, Forward and Reload row above it, see [074](../074-toolbar-waves/spec.md)).
If Vivaldi's preferences cannot give them, a new spec builds them: this is that spec.

Measured on the lab (Vivaldi 8.3.4191.47, 2026-11-28), Vivaldi cannot give them:

- Inside the tab bar `AddressField` there is only `.toolbar-insideinput` with `SiteInfoButton` (22x22,
  title "Informazioni sul sito", the native site-info popup) and the input. No button for extensions,
  copy link or QR is visible.
- `vivaldi.address_bar.show_qr_generator` (default false, "visibility of QR button") turned on added
  nothing on a `file://` tab. Not verified on an `http(s)` page.
- `prefs_definitions.json` has no `copy` or `page_actions` key under `vivaldi.address_bar`. Related
  keys: `extensions.render_in_dropdown` (false), `hidden_extensions` (ids whose button is hidden),
  `show_all_toggle`, `show_hidden_toggle`, `show_pwa_install` (true), `show_full_url`, `cutcopy_encoded`.
- The `Extensions` toolbar button renders a `.toolbar-extensions` container (empty in the lab, which has
  no extension). The waves of 074 drop it, so extensions have no toolbar access in the sidebar.

What the code does today:

- `CopyUrl` (`src/modules/copyurl/CopyUrl.ts`) copies the address of the active tab on
  Cmd/Ctrl+Shift+C, through `UrlCopier.copyActive()` and a `Toast` ("Copied" / "Copy failed"). It has
  no button.
- Nothing in `src/` calls `chrome.management` or `chrome.action`: `ModuleContext` offers `tabs`,
  `bookmarks`, `runtime` (messages and windows) and `windows`, no extension API. Whether
  `chrome.management` and `chrome.action` are reachable from `window.html` is not known (Q-2).
- The selector catalog (`src/selectors/8.1.json`) has `addressField` (`input.UrlBar-UrlField`) but no
  selector for `.toolbar-insideinput` or `SiteInfoButton`.

## User stories

- **US-1.** As a user, I want a copy-link icon in the address field, so that I copy the address of the
  tab with one click, as in Arc.
- **US-2.** As a user, I want a site-controls icon in the address field, so that I open the permissions
  and settings of the site from where the address is.
- **US-3.** As a user, I want a shortcut to one extension in the address field, so that I use it
  without a toolbar that the sidebar no longer has.

## Expected behavior

At the right of the address field of the tab bar, VivArcDi draws up to three small icon buttons, in
this order: extension shortcut, copy link, site controls. Each is independent: one that cannot work in
this window is not drawn, and the others stay. The buttons do not change the size of the field, appear
again if Vivaldi rebuilds the field, and are drawn in the colors of the theme, light or dark.

- Copy link copies the address of the active tab and confirms it briefly.
- Site controls opens Vivaldi's own site-info popup of the active tab.
- Extension shortcut runs the action of one extension (part C, optional, see Q-1 and Q-2).

## Requirements

### Functional

- **FR-1.** WHILE `AddressField` is in the tab bar, THE module SHALL draw the buttons of this spec at
  the right of the field, inside `.toolbar-insideinput` or next to it, each as a `button` element.
- **FR-2.** WHEN the copy-link button is clicked, THE module SHALL copy the address of the active tab
  with the `UrlCopier` of `CopyUrl`, and show the confirmation of `CopyUrl` ("Copied", or "Copy
  failed" with the error logged). It SHALL NOT copy in a second way.
- **FR-3.** WHEN the site-controls button is clicked, THE module SHALL open Vivaldi's site-info popup
  by forwarding the click to the native `SiteInfoButton`; it SHALL NOT build its own popup.
- **FR-4.** WHERE an extension shortcut is enabled and an extension is chosen, WHEN its button is
  clicked, THE module SHALL run the action of that extension on the active tab.
- **FR-5.** IF the native element a button depends on is missing, or the API it needs is not reachable,
  THEN THE module SHALL NOT draw that button, and SHALL log one warning naming the cause.
- **FR-6.** WHEN Vivaldi replaces the address field or its container, THE module SHALL draw the buttons
  again within one frame, with `KeptElement`, once per button.
- **FR-7.** WHILE the active tab has no copyable address (a new tab, an empty address), THE copy-link
  and site-controls buttons SHALL be disabled, not hidden, so that the field does not change.
- **FR-8.** Each button SHALL have an `aria-label` and a `title`, reachable by keyboard (Tab, Enter and
  Space), and SHALL show a visible focus ring.
- **FR-9.** Each button SHALL be enabled in the options of the module (`copyLink`, `siteControls`,
  `extensionShortcut`), by default as Q-1 recommends, and a disabled one is not drawn.

### Non-functional

- **NFR-1.** No button SHALL change the width or height of the address field or of the row it is in
  (the room for the buttons is taken from the input, which already grows).
- **NFR-2.** The buttons SHALL use the colors of the theme tokens (`--vivarcdi-*`), and be legible in the
  light and the dark theme.
- **NFR-3.** The module SHALL write nothing to storage, in any window; it has no stored data. It SHALL
  be allowed in private windows only where `CopyUrl` is (`privateWindows = 'allowed'`), and the
  extension shortcut SHALL NOT be drawn in a private window unless that extension is allowed
  in incognito.
- **NFR-4.** The module SHALL import `core/` and `shared/` only, take every selector from the
  catalog, and have a `src/styles` file listed in `src/config.json`.
- **NFR-5.** The code SHALL be written test-first: each `auto:` test of this spec is written and seen
  to fail before the code that makes it pass; a `live:` scenario is written before the feature it
  proves.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHILE `AddressField` is in the tab bar, THE module SHALL draw the copy-link and site-controls buttons at the right of the field. | auto: `address buttons are drawn at the right of the field` |
| AC-2 | WHEN the copy-link button is clicked, THE module SHALL copy the address of the active tab and show "Copied". | auto: `copy button copies the active address and confirms` |
| AC-3 | IF copying fails, THEN THE module SHALL show "Copy failed" and log the error. | auto: `copy button reports a failure` |
| AC-4 | WHEN the copy-link button is clicked on a lab Vivaldi, THE clipboard SHALL hold the address of the active tab. | live: `copy button puts the address in the clipboard` |
| AC-5 | WHEN the site-controls button is clicked, THE module SHALL forward the click to the native `SiteInfoButton`. | auto: `site controls forwards the click to the native button` |
| AC-6 | WHEN the site-controls button is clicked on a lab Vivaldi, THE site-info popup SHALL open. | live: `site controls opens the site info popup` |
| AC-7 | IF the native `SiteInfoButton` is missing, THEN THE site-controls button SHALL NOT be drawn and one warning SHALL be logged. | auto: `site controls is not drawn without the native button` |
| AC-8 | WHEN Vivaldi replaces the address field, THE buttons SHALL be drawn again within one frame, once each. | auto: `address buttons come back after a re-render` |
| AC-9 | WHEN Vivaldi rebuilds the toolbar on a lab Vivaldi (a wave of 074 is chosen), THE buttons SHALL be there, once each. | live: `address buttons survive a toolbar rebuild` |
| AC-10 | WHILE the active tab has no address, THE copy-link and site-controls buttons SHALL be disabled and stay in place. | auto: `address buttons are disabled without an address` |
| AC-11 | THE buttons SHALL NOT change the size of the address field. | live: `address buttons keep the field size` |
| AC-12 | EACH button SHALL have an `aria-label`, a `title` and be reachable and activated by keyboard. | auto: `address buttons are labelled and keyboard reachable` |
| AC-13 | A button turned off in the options SHALL NOT be drawn. | auto: `a disabled address button is not drawn` |
| AC-14 | THE module SHALL write nothing to storage. | auto: `address buttons write nothing to storage` |
| AC-15 | WHERE the extension shortcut is enabled and `chrome.management` is reachable, THE module SHALL draw the button of the chosen extension and run its action on a click. | auto: `extension shortcut runs the chosen action` |
| AC-16 | IF `chrome.management` or `chrome.action` is not reachable, THEN THE extension shortcut SHALL NOT be drawn and one warning SHALL be logged. | auto: `extension shortcut is not drawn without the extension API` |
| AC-17 | WHERE the lab Vivaldi has an extension installed, THE extension shortcut SHALL run its action. | live: `extension shortcut opens the extension action` |
| AC-18 | THE icons SHALL look like Arc's in the light and the dark theme, and sit well in the field. | manual |

AC-15 to AC-17 belong to part C and are in force only if Tore keeps part C in this spec (Q-1).

## Out of scope

- A settings page entry for the options: it belongs to [075](../075-settings-page/spec.md).
- A QR code button (Q-4), the PWA install button and the "show hidden extensions" toggles.
- Changing the Vivaldi popup of site info, or building a popup of VivArcDi's own.
- Showing every extension, or an extension menu: only one shortcut.
- The Back, Forward and Reload row and the waves ([074](../074-toolbar-waves/spec.md)).

## Open questions

- [ ] **Q-1.** Which of the three icons are in this spec? Recommendation: copy link and site controls
  (parts A and B) in, the extension shortcut (part C) as a second, optional step of this spec, started
  only when Q-2 is proven by a spike; if it is not, part C and AC-15 to AC-17 move to a spec of their
  own and nothing of A and B waits for it.
- [ ] **Q-2.** Is the extension shortcut feasible? `chrome.management` (list extensions) and
  `chrome.action` / `chrome.browserAction` (run an action) are not used anywhere in `src/` and the
  lab has no extension. Recommendation: a spike on a lab with one extension installed, to learn
  whether `window.html` reaches those APIs and whether an action can be run from there; its outcome
  is written in this spec before approval of part C. Which extension (the first one, or one chosen in
  the options) is decided then.
- [ ] **Q-3.** Icon drawings. Recommendation: draw them as inline SVG, 16 px, stroke only, as the other
  icons of the Arc look, and have Tore approve a screenshot of the three before the look is
  final (AC-18).
- [ ] **Q-4.** QR on `http(s)` pages. `show_qr_generator` showed nothing on a `file://` tab, not
  verified on a web page. Recommendation: out of this spec; check it once on a web page in the spike
  of Q-2, and give it a spec of its own only if it shows there.
- [ ] **Q-5.** Keep Vivaldi's `SiteInfoButton` or replace it? Recommendation: keep it for its popup and
  hide only its icon (visually, not `display: none`, so it stays clickable by the forwarded click),
  and show VivArcDi's sliders icon in its place, which keeps FR-3 simple and the popup native. The
  alternative, a second button next to the native one, shows two controls of the same kind.
- [ ] **Q-6.** Where do the buttons live: inside `.toolbar-insideinput` or after it? Recommendation:
  inside it, as the last children through `KeptElement`, because the field already reserves the room
  there; the spike of the implementation checks that Vivaldi does not clear that container.

## References

- [074 Toolbar waves](../074-toolbar-waves/spec.md)
- [075 VivArcDi Settings](../075-settings-page/spec.md)
- `src/modules/copyurl/CopyUrl.ts`, `src/modules/copyurl/UrlCopier.ts`
- `src/core/dom/KeptElement.ts`, `src/core/dom/TabBarAnchor.ts`
