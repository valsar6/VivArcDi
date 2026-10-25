# 002 Peek

| | |
|---|---|
| Status | Approved |
| Phase | 2 |
| Owner | Tore |
| Approved | 2026-10-25 |

## Summary

Arc opens some links in Peek: a smaller floating page over the current one, which stays visible and
dimmed behind it. The user reads the link and dismisses it, or expands it into a tab, without
losing their place. This is the real page, not a text summary (decided with Tore on 2026-10-25).

## User stories

- **US-1.** As a user, I want Shift+click on a link to open it in Peek, so that I can glance at it
  without leaving the page.
- **US-2.** As a user, I want links that leave the site of a Favorite or a pinned tab to open in
  Peek, so that the tile keeps its page.
- **US-3.** As a user, I want to turn a Peek into a normal tab when I decide to keep it.
- **US-4.** As a user, I want to dismiss a Peek by clicking outside it or with Esc or Cmd/Ctrl+W.

## Expected behavior

When Peek opens, a rounded panel slides in over the centre of the current page, smaller than the
page area, with a shadow. The page behind stays visible and is dimmed. The panel loads the real link
and is fully usable: scrolling, typing, following further links inside it. Links followed inside
the panel stay in the panel; they never open a second Peek.

Three buttons sit at its top right: **Expand**, which turns the Peek into a normal tab right after
the current one (also Cmd/Ctrl+O); **Split**, which shows it side by side with the current page using
Vivaldi's tab tiling; and **Close**. Clicking the dimmed area, pressing Esc or Cmd/Ctrl+W closes it.
Closing discards the page; it does not appear in the tab bar and the tab behind stays open.

Peek opens:

- on Shift+click on a link in any tab, where Vivaldi would otherwise open a new window;
- automatically, for a link in a Favorite or a pinned tab that leads to another site. Subdomains of
  the same site count as the same site: from `mail.google.com`, a link to `docs.google.com` navigates
  the tab as usual, a link to `youtube.com` opens in Peek.

A plain click in an ordinary tab navigates as usual, like in Arc. An option, off by default, makes
plain clicks to another site open in Peek in every tab.

The panel is 80% of the page area wide and 90% high by default; both are options.

Every trigger and size is an option in `config.json`.

## Requirements

### Functional

- **FR-1.** A `peek` module draws the panel inside Vivaldi's window, over the page area of the active
  tab, with the real page loaded in it.
- **FR-2.** Triggers, each with its own option: Shift+click on a link (`shiftClick`); a link to
  another site in a Favorite or pinned tab (`pinnedCrossSite`); a link to another site in any other
  tab (`anyCrossSite`). Only links opened by a left click without Cmd/Ctrl/Alt are considered.
- **FR-3.** Two URLs are on the same site when their registrable domains are equal: the host without
  `www.` and subdomains, keeping public suffixes of two labels such as `co.uk` or `com.au`. IP
  addresses and `localhost` compare as exact hosts.
- **FR-4.** Expand opens the page currently shown in the Peek as a new tab right after the current
  tab, activates it and closes the Peek. Navigation history inside the Peek is not carried over.
- **FR-5.** Split opens the Peek page as in FR-4, then tiles it side by side with the current tab.
- **FR-6.** Close by button, click on the dimmed area, Esc or Cmd/Ctrl+W. While a Peek is open,
  Cmd/Ctrl+W closes the Peek and never the tab behind.
- **FR-7.** One Peek at a time: opening another replaces it. Switching tab closes the Peek.
- **FR-8.** Options in `config.json`: `shiftClick` (true), `pinnedCrossSite` (true), `anyCrossSite`
  (false), `widthPercent` (80), `heightPercent` (90).

### Non-functional

- **NFR-1.** The panel appears in under 200 ms after the click, before the page finishes loading.
- **NFR-2.** IF Peek cannot open (missing API, unknown interface), the link opens as Vivaldi would
  have opened it, and the error is logged.
- **NFR-3.** No code from ArcPeek (now VividPeek, GPL-3) or other mods is copied: VivArcDi is MIT.
  Their documentation may inspire the approach.
- **NFR-4.** Stopping the module removes the panel, its styles and every listener, and leaves pages
  as they were.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user Shift+clicks a link, THE module SHALL open it in Peek instead of a new window. | manual |
| AC-2 | WHEN the user clicks a link to another site in a Favorite or pinned tab, THE module SHALL open it in Peek. | manual |
| AC-3 | WHEN the user clicks a link to the same site in a Favorite or pinned tab, THE tab SHALL navigate as usual. | manual |
| AC-4 | WHILE a Peek is open, THE current page SHALL stay visible and dimmed behind it. | manual |
| AC-5 | WHEN the user clicks outside the panel or presses Esc or Cmd/Ctrl+W, THE module SHALL close the Peek and no tab. | manual |
| AC-6 | WHEN the user presses Expand or Cmd/Ctrl+O, THE module SHALL open the Peek page as a tab right after the current one. | manual |
| AC-7 | WHEN the user presses Split, THE module SHALL tile the Peek page with the current tab. | manual |
| AC-8 | WHEN the user follows a link inside the Peek, THE page SHALL load in the same Peek. | manual |
| AC-9 | WHERE a trigger is disabled in `config.json`, THE module SHALL leave that kind of link to Vivaldi. | auto: `link classifier ignores disabled triggers` |
| AC-10 | WHERE `anyCrossSite` is off, THE module SHALL leave plain clicks in ordinary tabs to Vivaldi. | auto: `link classifier leaves plain clicks in ordinary tabs by default` |
| AC-11 | IF the panel cannot be created, THEN THE link SHALL open as without VivArcDi. | auto: `peek falls back to the default action when the panel fails` |
| AC-12 | THE site comparison SHALL treat `www.` and subdomains of the same registrable domain as the same site. | auto: `site comparison matches subdomains of the same registrable domain` |
| AC-13 | THE site comparison SHALL keep two-label public suffixes such as `co.uk` apart. | auto: `site comparison keeps two-label public suffixes apart` |
| AC-14 | WHEN a second Peek opens, THE module SHALL replace the first. | auto: `peek controller replaces an open peek` |
| AC-15 | WHEN the module stops, THE module SHALL remove the panel and its listeners. | auto: `peek module cleans up on stop` |

## Out of scope

- AI summaries on hover.
- Peek for links coming from other apps: that is Little Arc, [005](../005-little-arc-and-extras/spec.md).
- More than one Peek at a time.
- Carrying the Peek's back and forward history into the expanded tab.
- Back, forward, reload, copy link and translate buttons on the panel.

## Open questions

- [x] Rendering: decided in design. Vivaldi has no Link Preview reachable from mods, so the panel
  hosts a `<webview>` in the interface, as ArcPeek does.
- [x] License of ArcPeek: GPL-3, incompatible with copying into MIT code; written from scratch.
- [x] "Same site" rule: registrable domain (FR-3).
- [x] Plain click in ordinary tabs: off by default, option `anyCrossSite`.
- [x] Panel size: 80% by 90% of the page area, configurable.

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section "Peek, Little Arc,
  anteprime e Split View".
- [Strategy and roadmap](https://claude.ai/artifact/4JHR28H3euKSPbQZPNhY38), section "Peek: rifarlo o
  partire da ArcPeek".
- [VividPeek design notes](https://github.com/PaRr0tBoY/Awesome-Vivaldi/blob/main/Doc/mod/VividPeek.md)
  (GPL-3, read for ideas only).
