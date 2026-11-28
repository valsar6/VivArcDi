# 076 Compact Breaking wave: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Approved | Tore, 2026-11-28 (in chat); revised 2026-11-28 (archive row); amended 2026-11-28 (sizes, anchoring) |

## Approach

The spec is style first. A new stylesheet, `compact-breaking-wave.scss`, holds every rule under one
selector, built from tokens:

```scss
#{$breaking-wave}:has(#{$archive-footer}):has(#{$workspace-button}):has(#{$new-tab-button})
```

Each `:has()` names one button, so the guard of FR-12 and AC-17 holds: with a button missing, nothing
applies and Vivaldi's layout stays. The attribute is the one `toolbar-waves` sets on `body`
([074](../074-toolbar-waves/spec.md) FR-13, AC-22); this spec only reads it. Still water and a manual edit
remove or change it (074 FR-7), so the compact form leaves with no code here (AC-12). The stylesheet is
added last in `styles` of `src/config.json`, after `compact-tab-bar.css`.

Nothing is written to Vivaldi, to preferences or to storage (AC-4). `WorkspaceButton` and `NewTab` stay
Vivaldi's own elements: restyled, never copied. The Archive button is the `today` footer of
[077](../077-archive-icon/spec.md), the icon-only `div[data-vivarcdi-archive-footer]`; this spec does not
draw or size its icon.

### The row, in two parts

The after-toolbar (`.toolbar-tabbar-after`) is a flex column; the Archive footer is not in it but in
`#tabs-container`, a scrolling column whose last child it is (`ArchiveButton`, `column-scroll.scss`). So
the row has two parts, each with its own attempts, each judged by the live scenarios.

**Part 1: `WorkspaceButton` and `NewTab` in one row.** Tried in order; the next only when the scenarios of
the previous fail.

| Attempt | Rule |
|---|---|
| 1 | The after-toolbar becomes `flex-direction: row; align-items: center`; `.tabbar-nested-buttons` gets `display: contents`; the flexible spacers are `display: none`; the workspace button takes `flex: 1` centered, `NewTab` is a `$compact-bar-button-size` (28 px) square at the end; a `::before` of the toolbar is an empty slot of `$compact-bar-button-size` at the start, so the workspace button is centered between two slots of equal width |
| 2 | The same as a grid: `grid-template-columns: $compact-bar-button-size 1fr $compact-bar-button-size`, the group `display: contents` |

**The label of the workspace button (FR-10, AC-15, AC-16).** Vivaldi shows the name or not by the option
`vivaldi.workspaces.button.show_name`; the compact row must not depend on it and does not read it. Under the
attribute, the label child of `#{$workspace-button}` is hidden by style: `display: none` on the text element
(`span.button-title` inside `button[data-name="WorkspaceButton"]`, measured; the catalog key `workspaceButtonName` is added to `src/selectors/8.1.json`, the token `$workspace-label` holds it for the styles; `NewTab` has no label), with `font-size: 0` on the button as a
second line for a label that is a bare text node. The icon child keeps its size. The accessible name and the
tooltip are not touched (AC-10). Both values of the option are tried in AC-16.

**Part 2: the Archive footer in the left slot.**

| Attempt | Rule |
|---|---|
| (a) style only | Measured on 2026-11-28: the footer and `.toolbar-tabbar-after` are siblings inside `#tabs-container`, which is already `position: relative`, not of `#tabs-tabbar-container`; so the anchor and the containing block are `#tabs-container` and no `position` is added elsewhere. The footer leaves the flow with `position: absolute`. The after-toolbar is 540 px tall and the footer overlaps it by a few px, so the footer is placed on the toolbar's bottom row, not on its middle. Horizontally it sits at the start inset of the slot; vertically it is anchored to the toolbar: `anchor-name: --vivarcdi-after-bar` on `.toolbar-tabbar-after`, `position-anchor` on the footer, `inset-block-end: anchor(end)` and a centering `align-self`; anchor positioning is supported by the bundled Chromium (measured), so no offset is needed (Q-9). |
| (b) helper | `ArchiveButton` takes a second parent function: while the attribute is `breaking-wave` and `.toolbar-tabbar-after` exists, the `KeptElement` parent is the toolbar and the footer is placed as its first child (`order: -1`); otherwise it is `#tabs-container`, as today. The watched root includes `body` with `data-vivarcdi-wave` in the attribute filter (`watchSubtree(['data-vivarcdi-wave'])`), so the footer moves when the wave changes. One frame task, no polling (NFR-1). |

(a) is safe when Vivaldi rebuilds the toolbars because the footer stays where `KeptElement` keeps it today
(the end of `#tabs-container`) and only a style rule pulls it over a slot of a toolbar that the style
itself keeps; if Vivaldi replaces `.toolbar-tabbar-after`, the anchor and the slot come back with the new
node and the rule needs nothing. (b) puts a foreign child into a toolbar that Vivaldi's own UI renders, so
Vivaldi may remove it on a re-render; `KeptElement` puts it back in one frame, and the scenarios of AC-12
and AC-16 prove it. (b) is allowed only after a design amendment and Tore's approval. After the first CSS
attempt of Part 2 Tore looks himself in this prototype phase, before (b) is written.

Known limit of (a) (spec FR-5): the footer follows the toolbar in the DOM, so the visual order is Archive,
workspace, new tab while the DOM and tab order is workspace, new tab, Archive. It is accepted for the
prototype and recorded; if it matters, it is the trigger for (b), which puts the footer first in the DOM.

### Sizes and narrow widths

All three buttons are `$compact-bar-button-size` (28 px), never below `$compact-bar-button-min` (24 px), with
a glyph of about 13 px; the gap is `$compact-bar-gap` (8 px) and the bar's padding 8 px. This replaces 32 px
everywhere; the Archive button takes the same size (077's `$archive-button-size` is overridden here by
the token). Arc's reference (about 1.75 px per pt): sidebar about 215 px, side margin about 7 px, bottom
bar 24 to 28 px high, archive and plus about 7 px from the edges, workspace icon centered. The toolbar may
start up to 8 px above the first button (AC-6). Colors use the tab bar variables of
`sidebar-look.scss`, so the light and dark themes follow.

Three buttons need 116 px: 3 x 28 + 2 x 8 gap + 2 x 8 padding, the token `$compact-wrap-width`. The spike
measured the tab bar between its narrowest (42 px) and 348 px. Under it the row wraps (`flex-wrap: wrap`) and the three stack in a column, none below
`$compact-bar-button-min` (24 px, Q-6). The slot and the footer follow the wrap: in the column the footer
moves with the first row, which is part of what AC-11 and AC-13 measure. The tests keep asserting a row from 200 px and a column at 42 px; the exact break point is confirmed here
after the first scenario run.

### Rejected

- A copy of the buttons drawn by VivArcDi: their actions, popups and tooltips would be reimplemented.
- Reading `vivaldi.prefs` for the wave or for `show_name`: the attribute says the first, and the label
  rule does not need the second.
- `display: contents` on `#tabs-container`: it would break the column scroll of 053.
- A fixed pixel offset for the footer's vertical position.

## Components

| File | Responsibility |
|---|---|
| `src/styles/_tokens.scss` | `$breaking-wave`, `$workspace-label`, `$workspace-button` (`.tabbar-workspace-button`), `$new-tab-button` (`.button-toolbar.newtab`), `$compact-bar-gap` (8px), `$compact-bar-button-size` (28px), `$compact-bar-button-min` (24px), `$compact-wrap-width` (116px); the other selectors it holds are reused |
| `src/styles/compact-breaking-wave.scss` | All compact rules of the attempts that pass |
| `src/config.json` | Adds `styles/compact-breaking-wave.css` to `styles`, last |
| `src/selectors/8.1.json` | Adds `workspaceButtonName` (`button[data-name="WorkspaceButton"] span.button-title`); `toolbarAfter` and `nestedButtons` come from [074](../074-toolbar-waves/design.md) (074 T6); `workspaceButton`, `workspaceMenuButton` and `newTabButton` are already there |
| `src/modules/today/ArchiveButton.ts` | Only in attempt (b): the second parent and the wider watcher |
| `tests/styles/CompactBreakingWave.test.ts` | AC-1 to AC-3 and AC-17 on the compiled CSS |
| `tests/modules/toolbarwaves/` or the nearest suite | AC-4, the one test that watches for a write |
| `tests/live/scenarios/*.live.ts` | One file per `live:` criterion, eleven in all |

The stylesheet cannot read the catalog, so the selectors live twice: in `8.1.json` for scripts and the live
scenarios, in `_tokens.scss` for the styles, as sidebar-look does today. The scenarios read them through
the catalog, so a rename shows as one red scenario.

## Tests

| Test | How |
|---|---|
| `compact rules apply only under the breaking wave attribute` | Every selector of the compiled CSS starts with `body[data-vivarcdi-wave="breaking-wave"]` |
| `without the breaking wave attribute the bottom bar is unchanged` | The stylesheet has no rule outside that selector and the compiled output of the other stylesheets is unchanged |
| `compact breaking wave uses tokens` | The tokens exist, are used in the stylesheet, their values are not repeated there |
| `compact breaking wave never writes preferences` | The sources of the stylesheet's module and any helper hold no `prefs.set` and no use of `PrefsApi` write |
| `compact breaking wave needs the archive, workspace and new-tab buttons` | The compiled CSS holds the three `:has()` guards in every selector |
| `the compact breaking wave puts three buttons on one row` | Lab: Breaking wave lists, attribute set; the archive footer, the workspace button and `NewTab` have the same vertical middle, left to right in order |
| `the compact breaking wave row has the height of an icon button` | Lab: each button is square, 28 px (at least 24, at most 36) high; the toolbar's top is at most 8 px above the first button's top |
| `the compact new-tab button opens a tab` | Lab: click, then one more tab than before |
| `the compact workspace button opens its popup in place` | Lab: click, `.WorkspacePopup` is inside the window, within 16 px of the button and centered on it (it opens above the bar) |
| `the compact archive button opens the archive panel` | Lab: click, the archive panel is in the DOM |
| `the compact buttons keep their labels` | Lab: title and `aria-label` of each button are equal with and without the attribute |
| `the compact breaking wave row survives a resize` | Lab: the bar at its narrowest and widest width; the three stay inside the bar, in a row from 200 px and in a column at 42 px (threshold 116 px) |
| `the compact form switches off with the breaking wave` | Lab: the attribute set to `still-water`, then the rows are Vivaldi's again and the footer is the last child of `#tabs-container`, with no reload |
| `the compact breaking wave stacks in the narrow tab bar` | Lab: with the 032 narrow bar the three are stacked in a column, inside the bar, each at least 24 px |
| `the compact workspace button shows only its icon` | Lab: the label element has no visible box; the icon has one |
| `the compact row hides the workspace name whatever the option says` | Lab: write `vivaldi.workspaces.button.show_name` true and false in the lab profile, the label stays hidden; the scenario restores the option; in the lab `show_name` false leaves the label visible in Vivaldi, so the false case does not discriminate and is only recorded |

Live scenarios follow `tests/live/scenarios/` (`name`, `spec: '076'`, `run`) and are written first, red.

## Risks

- **074 and 077 not in `main`.** The scenarios need the Breaking wave lists without `TabsTrash` and
  `data-vivarcdi-wave` from [074](../074-toolbar-waves/spec.md) FR-13, `toolbarAfter` and `nestedButtons`
  from 074 T6, and the icon-only footer of [077](../077-archive-icon/spec.md). Every task is blocked by
  them; until then a scenario may set the attribute, the lists and the footer by hand.
- **The footer on the row by style.** The parent and the anchor support are measured (see attempt (a)); the
  overlap of the footer with the 540 px toolbar and the placement on its bottom row are read by the scenarios
  before the rule is written.
- **DOM and tab order of attempt (a).** Workspace, new tab, Archive in the DOM against Archive, workspace,
  new tab on screen; the trigger for (b).
- **The vertical position of the row.** The toolbar's padding and the bar's height vary with the theme and
  with Vivaldi's density; AC-6 allows 8 px between the toolbar's top and the first button.
- **Resize.** Wrap and break point are unmeasured, and the footer sits outside the wrapping toolbar
  (AC-11, AC-13).
- **Popup anchors.** Vivaldi anchors the workspace popup to the button's rectangle; a shrunk button may
  place it wrongly (AC-8).
- **A helper in a foreign toolbar.** (b) lives in a node Vivaldi renders and may lose the footer on a
  re-render; AC-12 and AC-16 prove the way back.
- **Vivaldi renames a toolbar class.** The look falls back to Vivaldi's own layout, never broken.
