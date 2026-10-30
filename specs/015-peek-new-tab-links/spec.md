# 015 Peek for new-tab links

| | |
|---|---|
| Status | Draft |
| Phase | 2 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

In Arc, a link that asks for a new window (`target="_blank"`) clicked in a pinned page opens in
Peek, over the pinned page, even when the link stays on the same site. This spec extends the Peek
module of [002](../002-peek/spec.md) with that trigger and with the Arc layout of the Peek buttons.
It is an extension, not a new feature: the panel, Expand, Split, Close and the keys already exist in
002, and 002 stays Approved as it is.

## User stories

- **US-1.** As a user, I want a `target="_blank"` link in a Favorite or pinned tab to open in Peek,
  so that the pinned page keeps its place, even when the link stays on the same site (for example
  `reddit.com` to `reddit.com/r/ItalyInformatica`).
- **US-2.** As a user, I want to dismiss, keep or tile that page from three buttons next to the Peek,
  as in Arc.

## Expected behavior

Observed in an Arc recording (2026-10-30): in a pinned Reddit tab, the link to `r/ItalyInformatica`
has `target="_blank"`. Clicking it shows the page as a large panel over the pinned page, which stays
visible and dimmed behind it. Three round buttons sit in a column outside the panel, at its top right:
**Close** (same as Cmd/Ctrl+W), **Expand** (same as Cmd/Ctrl+O), which turns it into a real tab that
then appears in the tab list, and **Create split view**, which has no shortcut and opens the page
side by side with the pinned one. Expand shows a tooltip with its shortcut.

What 002 does not cover:

- 002 opens Peek from a pinned tab only for links to another site. A same-site link with
  `target="_blank"` there opens a new tab in Vivaldi. With this spec it opens in Peek.
- 002 puts the buttons inside the panel, in the order Expand, Split, Close. Arc puts them in a column
  outside it, in the order Close, Expand, Split.

Everything else is 002 unchanged: one Peek at a time, links followed inside the panel stay there,
Esc, a click on the dimmed area and Cmd/Ctrl+W close it, Cmd/Ctrl+O expands it, switching tab closes
it. Plain clicks on links without `target="_blank"` in the same site keep navigating the tab.

Shortcuts of [014](../014-arc-shortcuts/spec.md) are not affected: 014 changes neither Cmd/Ctrl+W
nor Cmd/Ctrl+O, and Peek only takes them while it is open.

## Requirements

### Functional

- **FR-1.** A new trigger `pinnedNewTab` opens in Peek a left click, without Cmd/Ctrl/Alt, on a link
  with `target="_blank"` in a Favorite or pinned tab, whatever the site of the link.
- **FR-2.** A new trigger `anyNewTab`, off by default, does the same in every other tab.
- **FR-3.** The three buttons sit in a column outside the panel, next to its top right corner, in the
  order Close, Expand, Split. Each has a tooltip; Close and Expand show Cmd/Ctrl+W and Cmd/Ctrl+O.
- **FR-4.** The default panel size is as large as Arc's: `widthPercent` and `heightPercent` stay
  options; the defaults move to 90 and 94 so that the pinned page shows only as a border.
- **FR-5.** Options in `config.json` under `peek`: `pinnedNewTab` (true), `anyNewTab` (false).

### Non-functional

- **NFR-1.** IF Peek cannot open, THEN the link opens as Vivaldi would have opened it (a new tab), as
  in 002/NFR-2.
- **NFR-2.** The module classifies the click synchronously, as in 002; no extra permissions.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user clicks a `target="_blank"` link in a Favorite or pinned tab, THE module SHALL open it in Peek, also when it stays on the same site. | manual |
| AC-2 | WHEN the user clicks a link without `target="_blank"` to the same site in a pinned tab, THE tab SHALL navigate as usual. | manual |
| AC-3 | WHEN the user presses Expand, THE Peek page SHALL appear as a tab in the tab list. | manual |
| AC-4 | WHEN the user presses Create split view, THE module SHALL tile the Peek page with the pinned page. | manual |
| AC-5 | THE buttons SHALL appear in a column outside the panel, in the order Close, Expand, Split. | manual |
| AC-6 | WHERE `pinnedNewTab` is off, THE module SHALL leave `target="_blank"` links in pinned tabs to Vivaldi. | auto: `link classifier ignores disabled new-tab trigger` |
| AC-7 | THE classifier SHALL open a same-site `target="_blank"` link of a pinned tab in Peek. | auto: `link classifier peeks same-site blank links in pinned tabs` |
| AC-8 | WHERE `anyNewTab` is off, THE classifier SHALL leave `target="_blank"` links in ordinary tabs to Vivaldi. | auto: `link classifier leaves blank links in ordinary tabs by default` |
| AC-9 | THE classifier SHALL leave same-site links without `target="_blank"` in pinned tabs to Vivaldi. | auto: `link classifier leaves same-site plain links in pinned tabs` |

## Out of scope

- `window.open()` calls from scripts, with no clicked link: not seen by the page click listener. See
  open questions.
- A shortcut for Create split view: Arc has none.
- Everything already in 002.

## Open questions

- [ ] **Scripted windows.** Many sites open pages with `window.open` rather than a link. Proposed:
  leave them to a later spec; this one covers clicked links only.
- [ ] **Layout.** Proposed: buttons outside the panel as in Arc, size 90% by 94%. The alternative
  is to keep 002's buttons inside the panel.
- [ ] **Ordinary tabs.** Proposed: `anyNewTab` off by default, as 002's `anyCrossSite`.
- [ ] **Cmd+O.** Vivaldi binds Cmd+O to Open File. Proposed: Peek takes it only while open, as in
  002; no change to 014.

## References

- [002 Peek](../002-peek/spec.md), [014 Arc shortcuts](../014-arc-shortcuts/spec.md).
- Screen recording 2026-10-30 (project files).
