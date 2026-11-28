# 077 Archive button as an icon

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Decision | Tore, 2026-11-28 (from testing on his own Vivaldi) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

The Archive footer that the `today` module draws at the bottom of the tab bar is a full-width row:
an icon, the word "Archive" and a padded button, on a row of its own. Tore finds that it takes too much
space. This spec makes it an icon and nothing else, always: one small square button with the archive
drawing, no text, at every width of the tab bar. The tooltip "Archive (Cmd/Ctrl+Shift+A)", the click and
the shortcut do what they do today.

"Icon only" is the whole decision. A choice among several icons and a setting for where the button sits
are not part of it (see [Out of scope](#out-of-scope)).

The footer already has an icon: [032](../032-compact-tab-bar/spec.md) draws a CSS mask glyph before the
label, and keeps the label for screen readers by setting `font-size: 0` in the narrow bar. 077 removes
the label at every width, so the narrow-bar special case disappears (Q-2), and draws the icon as an inline
SVG like the wave icons of [074](../074-toolbar-waves/spec.md) (Q-1).

## User stories

- **US-1.** As a user, I want the Archive button to be a small icon, so that the bottom of the tab bar
  does not waste a row on a word I already know.
- **US-2.** As that user, I want the icon to open the archive as the button does now, with the same
  tooltip and the same shortcut, so that nothing is lost.
- **US-3.** As a user of a screen reader, I want the icon to have a name, so that I still know what it is.
- **US-4.** As a user of the light and dark themes, I want the icon to follow the theme colors.

## Expected behavior

### Today

| Case | What happens | Where |
|---|---|---|
| Footer markup | `div[data-vivarcdi-archive-footer]` with `button[type=button][title="Archive (Cmd/Ctrl+Shift+A)"]` whose text is "Archive" | `src/modules/today/ArchiveButton.ts` lines 18-25; attribute `ARCHIVE_FOOTER_ATTRIBUTE` in `src/modules/today/ArchivePanelView.ts` line 12 |
| Icon | CSS `::before`, 18 px, `mask` of `$archive-glyph`, `background-color: currentcolor` | `src/styles/today.scss` lines 216-249, `src/styles/_tokens.scss` lines 108-109 |
| Row | Footer `width: 100%` with padding; button `width: 100%`, flex row with a gap, 12 px label, opacity 0.7, 1 on hover | `src/styles/today.scss` lines 216-255 |
| Narrow bar | Under `#tabs-tabbar-container.narrow` the button is centered and its text hidden with `font-size: 0` | `src/styles/compact-tab-bar.scss` lines 42-50; [032](../032-compact-tab-bar/spec.md) FR-4, FR-8 |
| Scrolling column | The footer is `position: sticky; bottom: 0` | `src/styles/column-scroll.scss` lines 20-24; [053](../053-single-scroll/spec.md) |
| Click and shortcut | The click calls `onOpen`; Cmd/Ctrl+Shift+A opens the same panel | `ArchiveButton.ts` line 26; [004](../004-today-tabs-and-keyboard/spec.md) FR-4 |

### After

| Case | What happens |
|---|---|
| Footer markup | Same `div[data-vivarcdi-archive-footer]` and one `button[type=button]` holding one inline `svg` and no text node. The button has `aria-label="Archive"` and `title="Archive (Cmd/Ctrl+Shift+A)"`; the `svg` has `aria-hidden="true"` and `focusable="false"` |
| Icon | Inline SVG, 16 x 16 `viewBox`, stroke only, `fill="none"`, `stroke="currentColor"`: an archive box (lid, body, handle slot) with a small four-point sparkle above its right corner, like Arc's |
| Size | The button is a square of `$archive-button-size` (28 px, a token); the icon inside is `$archive-icon-size` (18 px). The footer is as high as the button plus the padding of the footer, and no wider than the button |
| Alignment | The button sits at the start (left) edge of the footer at every width, as in Arc, with the same side padding as the rows above; the narrow bar does not center it |
| Narrow bar | No rule of its own: the same icon button, left aligned, at every width, so 032's narrow-bar rules for the footer go (Q-2) |
| Colors | The icon follows the tab bar text color through `currentColor`, at opacity 0.7 and 1 on hover and on focus, in the light and dark themes |
| Click, shortcut, tooltip | Unchanged: the same action, Cmd/Ctrl+Shift+A, and the same tooltip text on macOS and Debian |
| Scrolling column | Unchanged: the footer stays sticky at the bottom |

The tooltip is Vivaldi's: its delay and look are the browser's own (Q-4).

## Requirements

### Functional

- **FR-1.** The Archive button SHALL show an inline SVG icon and no text, at every width of the tab bar.
- **FR-2.** The button SHALL keep the tooltip `Archive (Cmd/Ctrl+Shift+A)` as its `title`, and SHALL
  have the accessible name `Archive` through `aria-label`.
- **FR-3.** The icon SHALL be an inline SVG with a 16 x 16 `viewBox`, stroke only, colored with
  `currentColor`, hidden from assistive technology (`aria-hidden="true"`).
- **FR-4.** A click SHALL call the same handler as today and open the archive panel; the shortcut and the
  panel are not changed.
- **FR-5.** The button SHALL be a square of `$archive-button-size`, the icon `$archive-icon-size`, both
  tokens in `_tokens.scss`, and the footer SHALL no longer stretch the button to the full width of the bar.
- **FR-6.** The stylesheet SHALL no longer draw the icon with a `::before` mask nor hide a label with
  `font-size: 0`; `$archive-glyph` SHALL be removed from `_tokens.scss` if nothing else uses it.
- **FR-7.** The icon SHALL be the approved drawing: an archive box (lid, body, handle slot) with a small
  four-point sparkle above the right corner of the lid, stroke 1.3 px with round joins and caps on the
  16 x 16 grid (Q-1).
- **FR-8.** The button SHALL be aligned to the start (left) edge of the footer at every width of the tab bar (Q-5).
- **FR-9.** The button SHALL show a visible focus ring and the hover state of the other icon buttons of
  the tab bar, in the light and dark themes.

### Non-functional

- **NFR-1.** Same markup, size and behavior on macOS and Debian.
- **NFR-2.** The drawing is built with `createElementNS`, not `innerHTML`, as the wave icons are, and
  adds no script work beyond building the footer once.
- **NFR-3.** The `today` module keeps its other behavior; `KeptElement` still puts the footer back when
  Vivaldi rebuilds the tab bar.
- **NFR-4.** Ships on a `features/` branch with a minor version change.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names a test, `live` a scenario of
[046](../046-live-verification/spec.md), `manual` a step Tore performs. Implementation is test-first: each
criterion has a named check, and the check is written and run red before any code or style changes.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE Archive button SHALL contain one inline `svg` and no text node | auto: `archive button holds an icon and no text` |
| AC-2 | THE Archive button SHALL have `aria-label` `Archive` and `title` `Archive (Cmd/Ctrl+Shift+A)` | auto: `archive button keeps its tooltip and gets an accessible name` |
| AC-3 | THE icon SHALL have a 16 x 16 `viewBox`, `fill` none, `stroke` `currentColor`, `aria-hidden` true and `focusable` false | auto: `archive icon is a stroke svg colored with currentColor` |
| AC-4 | WHEN the button is clicked, THE footer SHALL call its open handler once | auto: `archive icon button opens the archive on click` |
| AC-5 | THE stylesheet SHALL size the button and the icon with `$archive-button-size` and `$archive-icon-size` and SHALL define both in `_tokens.scss` | auto: `archive icon button uses size tokens` |
| AC-6 | THE stylesheet SHALL draw no `::before` mask, no label hiding by `font-size: 0` and no full-width button for the archive footer, at any width | auto: `archive footer has no label rules` |
| AC-7 | WHILE the tab bar is narrow, THE archive footer SHALL have no rule of its own in the compact tab bar stylesheet | auto: `compact tab bar leaves the archive footer alone` |
| AC-8 | THE button SHALL define hover and focus states with theme variables and no fixed color | auto: `archive icon button follows the theme` |
| AC-12 | THE stylesheet SHALL align the archive button to the start of the footer, with no centering rule at any width | auto: `archive icon button is aligned to the start` |
| AC-13 | THE icon SHALL have a 1.3 stroke width with round joins and caps, and its drawing SHALL be the archive box with the sparkle | auto: `archive icon draws the box with the sparkle` |
| AC-9 | WHEN a lab Vivaldi runs with the payload, THE archive footer SHALL be at most 36 px wide and 36 px high at the full and at the narrow width of the tab bar, and its left edge SHALL be at the same distance from the bar's left edge in both | live: `the archive footer is only an icon` |
| AC-10 | WHEN a script clicks the archive icon in a lab Vivaldi, THE archive panel SHALL open | live: `the archive icon opens the archive panel` |
| AC-11 | WHEN Tore looks at the icon in the light and dark themes on macOS and Debian, THE icon SHALL be legible and in the colors of the tab bar | manual |

AC-11 is the only `manual` criterion and checks legibility only; the drawing and the alignment are settled by FR-7, FR-8, AC-12 and AC-13. The accessible name, the tooltip text and the absence of text are
read from the DOM (AC-1, AC-2) and are not asked of Tore. The check for 032 and 053 that the footer stays
sticky is kept by `favorites and footer stay fixed while the column scrolls`, which must still pass.

## Effect on other specs

| Spec | What 077 changes |
|---|---|
| [032](../032-compact-tab-bar/spec.md) | FR-4 (centered icon in the narrow bar) and FR-8 (icon before the label) are replaced by FR-1 here; AC-12 (`archive footer shows the archive icon beside its label`) is replaced by AC-6 here; AC-5 (`compact tab bar uses tokens`) no longer lists `$archive-glyph`; AC-9 and AC-11 (archive part) stay true in meaning. See Q-2 |
| [053](../053-single-scroll/spec.md) | None: the footer stays sticky |
| [076](../076-compact-breaking-wave/spec.md) | 076 builds the compact bottom row of the Breaking wave and moves the archive element into it, under the Breaking wave marker: archive icon at the left, one small workspace icon in the middle, the new-tab plus at the right (Q-3). 077 defines only the icon-only button and must not break that move: the footer element keeps `data-vivarcdi-archive-footer`, the button keeps its own size token (`$archive-button-size`), and no rule or script assumes the footer is a full-width block or a child of `#tabs-container`. Where 076 places it, 076 owns the layout |
| [004](../004-today-tabs-and-keyboard/spec.md) | None: FR-4 and AC-10 hold |

## Out of scope

- A choice among several icons, or a setting to show the label again.
- A setting for where the button sits. Its place in the compact row of the Breaking wave is built by
  [076](../076-compact-breaking-wave/spec.md), not here.
- A change to the archive panel, its entries, the shortcut or the `today` options.
- A new tooltip drawn by VivArcDi, or a different tooltip delay: the tooltip is Vivaldi's.
- A count or badge on the icon.

## Open questions

- [x] **Q-1. The drawing.** Proposed: a stroke icon on a 16 x 16 grid, 1.3 px stroke, round joins and
  caps, like the wave icons of 074 and the 032 glyph: a wide lid (rounded rectangle), a body below it
  with rounded bottom corners, a short horizontal handle slot in the middle, and a small four-point
  sparkle above the right corner of the lid, as in Arc's archive. The exact path goes in the design.
  Resolved: the drawing with the sparkle (Tore, 2026-11-28); now FR-7 and AC-13.
- [ ] **Q-2. What happens to 032's narrow-bar rules.** 032 is `Implemented`. Recommended: do not mark 032
  `Superseded` as a whole, since its space header and New Tab rows are unchanged. Add an `Amended by` row
  to 032's header, as 004 has for 071, naming FR-4, FR-8 and AC-12 as replaced by 077, and delete the
  footer block of `compact-tab-bar.scss`, the `$archive-glyph` token and the test `archive footer shows
  the archive icon beside its label`, whose job AC-6 and AC-7 take over. The edit of 032 is done with the
  implementation, in the docs task owned by the lead.
- [x] **Q-3. 076's compact row.** Resolved (Tore, 2026-11-28): the archive icon joins the compact bottom
  row of the Breaking wave, as in Arc's bottom bar (archive icon at the left, one small workspace icon in
  the middle, the new-tab plus at the right). 076 builds that row and places the element; 077 keeps the
  icon-only button, which must not depend on being a full-width footer (see the table above).
- [ ] **Q-4. Tooltip.** The `title` is shown by Vivaldi after its own hover delay. Recommended: keep it as
  it is; VivArcDi does not draw a tooltip of its own.
- [x] **Q-5. Alignment of the icon in the footer.** Resolved: aligned left at every width, as in Arc
  (Tore, 2026-11-28); now FR-8 and AC-12.

## References

- Decision of Tore, 2026-11-28.
- [004 Today tabs and keyboard](../004-today-tabs-and-keyboard/spec.md): the archive, its button and shortcut.
- [032 Compact tab bar](../032-compact-tab-bar/spec.md): the glyph and the narrow-bar footer.
- [053 Single scroll](../053-single-scroll/spec.md): the sticky footer.
- [074 Toolbar waves](../074-toolbar-waves/spec.md): icon conventions (inline SVG, 16 px grid, stroke,
  `currentColor`).
- [076 Compact Breaking wave](../076-compact-breaking-wave/spec.md): the bottom toolbar row.
- Code: `src/modules/today/ArchiveButton.ts`, `src/modules/today/ArchivePanelView.ts`,
  `src/styles/today.scss`, `src/styles/compact-tab-bar.scss`, `src/styles/column-scroll.scss`,
  `src/styles/_tokens.scss`; tests `tests/modules/today/TodayParts.test.ts`,
  `tests/styles/CompactTabBar.test.ts`.
