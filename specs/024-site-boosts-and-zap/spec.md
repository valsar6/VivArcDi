# 024 Site boosts and zap

| | |
|---|---|
| Status | Approved |
| Phase | 5 |
| Owner | Tore |
| Approved | 2026-11-08 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc's Boosts let the user change a site: colors, a font, and "Zap", which hides an element the user clicks (the Shorts shelf on YouTube is the example in the student video, 05:49-06:55). Three of the reviews cite it. Vivaldi has user CSS and web panels, but nothing per site with a picker. This spec adds a light version: a per-site style and a click-to-hide.

## User stories

- **US-1.** As a user, I want to hide an element of a site by clicking it, so that the page is calmer.
- **US-2.** As a user, I want to set a font and colors for a site, so that it fits my taste.

## Expected behavior

On a page, a menu item "Boost this site" (and the shortcut Cmd/Ctrl+Shift+B) opens a small panel with a font list, two color fields (background and text) and a "Zap" button. Zap turns the pointer into a picker: the element under the pointer is outlined and a click hides it. Zapped elements and styles belong to the site's host name and apply on every page of it, also after a restart. The panel lists the zapped elements and each one has an undo button.

## Requirements

### Functional

- **FR-1.** Styles and zapped selectors are stored per host in `chrome.storage.local`.
- **FR-2.** A content script applies them at document start.
- **FR-3.** A zap stores the shortest stable CSS selector of the element.
- **FR-4.** A "Reset site" button removes the whole boost.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user zaps an element, THE element SHALL be hidden and stay hidden after reload. | manual |
| AC-2 | WHEN the user undoes a zap, THE element SHALL show again. | manual |
| AC-3 | THE module SHALL store boosts per host name. | auto: `stores boosts per host` |
| AC-4 | THE selector of a zap SHALL match only the clicked element on the page. | auto: `builds a selector that matches one element` |

## Out of scope

- Sharing boosts, AI-written boosts, custom JavaScript.
- Changing site layout beyond hide, font and colors.

## Open questions

- [x] A site that changes its markup breaks the selector: accept and let the user re-zap?
- [x] Apply to subdomains or only the exact host?

## References

- Student video 05:49-06:55; Project files: `video-arc/gap-list-arc-consolidata.md` (G2).
