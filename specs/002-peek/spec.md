# 002 Peek

| | |
|---|---|
| Status | Draft |
| Phase | 2 |
| Owner | Tore |
| Approved | – |

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
- **US-4.** As a user, I want to dismiss a Peek by clicking outside it or with Cmd/Ctrl+W.

## Expected behavior

When Peek opens, a rounded panel slides in over the centre of the current page, smaller than the
window, with a shadow. The page behind stays visible and is dimmed. The panel loads the real link and
is fully usable: scrolling, typing, following further links inside it.

Three buttons sit at its top right: **Expand**, which turns the Peek into a normal tab next to the
current one (also Cmd/Ctrl+O); **Split**, which shows it side by side with the current page using
Vivaldi's tab tiling; and **Close**. Clicking the dimmed area, pressing Esc or Cmd/Ctrl+W closes it.
Closing discards the page; it does not appear in the tab bar.

Peek opens:

- on Shift+click on a link in any tab;
- automatically, for a link in a Favorite or a pinned tab whose domain differs from the tab's own.

Each trigger can be switched off in `config.json`.

## Requirements

### Functional

- **FR-1.** A `peek` module draws the panel inside Vivaldi's window, over the web view.
- **FR-2.** Triggers: Shift+click on a link; cross-domain link from a Favorite or pinned tab. Each
  trigger has its own option.
- **FR-3.** Expand turns the Peek into a tab placed right after the current tab, keeping its history.
- **FR-4.** Split shows the Peek page tiled with the current tab.
- **FR-5.** Close by button, click outside, Esc or Cmd/Ctrl+W, which then does not close the tab
  behind.
- **FR-6.** One Peek at a time: opening another replaces it.

### Non-functional

- **NFR-1.** The panel opens in under 200 ms after the click, before the page finishes loading.
- **NFR-2.** IF Peek cannot open (missing API, unknown interface), the link opens as Vivaldi would
  have opened it, and the error is logged.
- **NFR-3.** No code from ArcPeek or other mods is copied unless its license allows it and it is
  credited.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user Shift+clicks a link, THE module SHALL open it in Peek instead of a new window. | manual |
| AC-2 | WHEN the user clicks a link to another domain in a Favorite or pinned tab, THE module SHALL open it in Peek. | manual |
| AC-3 | WHEN the user clicks a link to the same domain in a Favorite or pinned tab, THE tab SHALL navigate as usual. | manual |
| AC-4 | WHILE a Peek is open, THE current page SHALL stay visible and dimmed behind it. | manual |
| AC-5 | WHEN the user clicks outside the panel or presses Esc or Cmd/Ctrl+W, THE module SHALL close the Peek and no tab. | manual |
| AC-6 | WHEN the user presses Expand or Cmd/Ctrl+O, THE module SHALL turn the Peek into a tab after the current one. | manual |
| AC-7 | WHEN the user presses Split, THE module SHALL tile the Peek page with the current tab. | manual |
| AC-8 | WHERE a trigger is disabled in `config.json`, THE module SHALL leave that kind of link to Vivaldi. | auto |
| AC-9 | IF the panel cannot be created, THEN THE link SHALL open as without VivArcDi. | auto |
| AC-10 | THE domain comparison SHALL treat `www.` and subdomains of the same site as the same domain. | auto |

## Out of scope

- AI summaries on hover.
- Peek for links coming from other apps: that is Little Arc, [005](../005-little-arc-and-extras/spec.md).
- More than one Peek at a time.

## Open questions

- [ ] Rendering: a `<webview>` element inside the interface (as ArcPeek does) or Vivaldi's own Link
  Preview where available? Decided in design after reading ArcPeek and its license.
- [ ] "Same site" rule: registrable domain (`mail.google.com` equals `docs.google.com`) or exact
  host? AC-10 assumes registrable domain.
- [ ] Should Peek also open for links in normal (Today) tabs on a plain click, as an option? Arc
  does not.
- [ ] Panel size: fixed ratio of the window (Arc uses about 80%) or configurable?

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section "Peek, Little Arc,
  anteprime e Split View".
- [Strategy and roadmap](https://claude.ai/artifact/4JHR28H3euKSPbQZPNhY38), section "Peek: rifarlo o
  partire da ArcPeek".
