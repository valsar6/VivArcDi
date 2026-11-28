# 076 Compact Breaking wave: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Approved | Tore, 2026-11-28 (in chat) |

## Approach

The spec is style first. A new stylesheet, `compact-breaking-wave.scss`, holds every rule under one
selector, built from tokens:

```scss
#{$breaking-wave}:has(#{$trash-button}):has(#{$workspace-button}):has(#{$new-tab-button})
```

Each `:has()` names one button, so the guard of Q-4 holds: with a button missing, nothing applies and
Vivaldi's layout stays.
The attribute is the one `toolbar-waves` sets on `body` ([074](../074-toolbar-waves/spec.md) FR-13,
AC-22); this spec only reads it. Still water and a manual edit remove or change it (074 FR-7), so
the compact form leaves with no code here (AC-12). The stylesheet is added last in `styles` of
`src/config.json`, after `compact-tab-bar.css`.

Nothing is written to Vivaldi, to preferences or to storage (AC-4). The three buttons stay Vivaldi's
own elements: restyled, never copied (FR-4, FR-5).

### The three attempts

The spike measured a column toolbar with the trash inside `.tabbar-nested-buttons` and the workspace and
`NewTab` rows as siblings of that group. The attempts are tried in order; the next one is written only
when the live scenarios of the previous one fail, and each is judged by the same scenarios (Tore looks at
each CSS attempt himself in this prototype phase, before the next one is written).

| Attempt | Rule | Judged by |
|---|---|---|
| 1 | The after toolbar becomes `flex-direction: row; justify-content: space-between`; `.tabbar-nested-buttons` gets `display: contents`, so its buttons join the toolbar's row; the flexible spacers are `display: none`; the workspace button and `NewTab` shrink to the icon button size with their labels at `font-size: 0` | AC-5, AC-6, then AC-7 to AC-11 |
| 2 | The after toolbar becomes a grid of three columns, `grid-template-columns: 1fr auto 1fr`, with the trash `justify-self: start`, the workspace button in the middle and `NewTab` `justify-self: end`; the group is `display: contents` | the same, with AC-11 the one most likely to differ |
| 3 | A helper `BreakingWaveRow` re-homes nothing: it adds one `[data-vivarcdi-bottom-row]` container with `KeptElement`/`TabBarAnchor` and moves the three buttons into it through one frame task, then puts them back when the attribute leaves | the same, plus AC-12 on the way back |

Order of the three rows is Vivaldi's order in the list (trash, workspace, `NewTab`), so no `order`
property is needed. `display: contents` on a group drops that element's own box, so a
Vivaldi rule that sizes `.tabbar-nested-buttons` stops applying; that is wanted. What it may also drop is an
accessibility role, which AC-10 reads from the three buttons themselves.

Attempt 3 is the only one with a script. It is allowed only if scenario 1 of the verification plan fails
twice, and it takes a new design amendment before code: moving Vivaldi's buttons risks losing them when
Vivaldi rebuilds the toolbar.

### Sizes and narrow widths

Each icon button is `$compact-bar-button-size` (32 px, as `$bar-button-size`) square; the workspace button
keeps its icon and hides its text (`font-size: 0`, the label stays for screen readers like the New Tab row
of 032). Colors use the tab bar variables of `sidebar-look.scss`, so the light and dark themes follow.

Three 32 px buttons need 96 px. The spike measured the tab bar between its narrowest (42 px) and 348 px.
Under `$compact-wrap-width` the row wraps (`flex-wrap: wrap`) so the three icons stack in a column instead of
shrinking below `$compact-bar-button-min` (24 px, Q-6). The break point is measured by AC-11 and AC-13 and
recorded here after the first scenario run.

### Rejected

- A copy of the three buttons drawn by VivArcDi: their actions, popups and tooltips would be reimplemented.
- Reading `vivaldi.toolbars.*` in the styles module: the attribute of 074 says the same.
- A `ResizeObserver` for the wrap: a flex wrap needs none.

## Components

| File | Responsibility |
|---|---|
| `src/styles/_tokens.scss` | `$breaking-wave` (`body[data-vivarcdi-wave="breaking-wave"]`), `$after-toolbar`, `$nested-buttons`, `$trash-button`, `$workspace-button`, `$new-tab-button`, `$compact-bar-button-size`, `$compact-bar-button-min`, `$compact-wrap-width` |
| `src/styles/compact-breaking-wave.scss` | All compact rules of the attempt that passes |
| `src/config.json` | Adds `styles/compact-breaking-wave.css` to `styles`, last |
| `src/selectors/8.1.json` | No change: `toolbarAfter`, `nestedButtons` and `trashButton` come from [074](../074-toolbar-waves/design.md) (selectors section, 074 T6), `workspaceButton`, `workspaceMenuButton` and `newTabButton` are already there |
| `tests/styles/CompactBreakingWave.test.ts` | AC-1 to AC-3 on the compiled CSS |
| `tests/modules/toolbarwaves/` or the nearest suite | AC-4, the one test that watches for a write |
| `tests/live/scenarios/*.live.ts` | One file per `live:` criterion, nine in all |

The stylesheet cannot read the catalog, so the selectors live twice: in `8.1.json` for scripts and the
live scenarios, in `_tokens.scss` for the styles, as sidebar-look does today. The scenarios read the
selectors through the catalog, so a rename shows as one red scenario. The trash button selector is
074's `trashButton` (`:is(.toolbar-tabbar-before, .toolbar-tabbar-after) [data-name="TabsTrash"]`).

The attempt 3 helper, if ever written, is `src/modules/toolbarwaves/BreakingWaveRow.ts` or a `src/shared/`
class, with its own design amendment.

## Tests

| Test | How |
|---|---|
| `compact rules apply only under the breaking wave attribute` | Every selector of the compiled CSS starts with `body[data-vivarcdi-wave="breaking-wave"]` |
| `without the breaking wave attribute the bottom bar is unchanged` | The stylesheet has no rule outside that selector and the compiled output of the other stylesheets is unchanged |
| `compact breaking wave uses tokens` | The tokens exist, are used in the stylesheet, their values are not repeated there |
| `compact breaking wave never writes preferences` | The sources of the stylesheet's module and any helper hold no `prefs.set` and no use of `PrefsApi` write |
| `the compact breaking wave puts three buttons on one row` | Lab: Breaking wave lists, attribute set; the three buttons have the same vertical middle, left to right in order |
| `the compact breaking wave row has the height of an icon button` | Lab: each button is square, at most 36 px high; the row's top equals the first button's top |
| `the compact new-tab button opens a tab` | Lab: click, then one more tab than before |
| `the compact workspace button opens its popup in place` | Lab: click, `.WorkspacePopup` is inside the window and below the row |
| `the compact trash button opens its list` | Lab: click, the closed tabs list is in the DOM |
| `the compact buttons keep their labels` | Lab: title and `aria-label` of each button are equal with and without the attribute |
| `the compact breaking wave row survives a resize` | Lab: the bar at its narrowest and widest width; the three stay inside the bar, in a row where they fit and in a column below the threshold |
| `the compact form switches off with the breaking wave` | Lab: the attribute set to `still-water`, then the rows are Vivaldi's again with no reload |
| `the compact breaking wave stacks in the narrow tab bar` | Lab: with the 032 narrow bar the three are stacked in a column, inside the bar, each at least 24 px |

Live scenarios follow `tests/live/scenarios/` (`name`, `spec: '076'`, `run`) and are written first, red.

## Risks

- **Selectors from 074.** `toolbarAfter`, `nestedButtons` and `trashButton` exist only after 074 T6 adds
  them to `src/selectors/8.1.json`; 076 reads them through the `SelectorCatalog` and adds none.

- **074 not in main.** The scenarios need the Breaking wave lists and `data-vivarcdi-wave` from
  [074](../074-toolbar-waves/spec.md) FR-13. Every task is blocked by it; until then a scenario may set
  the attribute and the lists by hand.
- **CSS cannot join the group and the rows.** The unproven point of the spec; the attempts exist for it.
- **Popup anchors.** Vivaldi anchors the workspace popup to the button's rectangle; a shrunk or
  re-parented button may place it wrongly (AC-8).
- **Resize.** The spike measured one width; wrap and break point are unmeasured (AC-11, AC-13).
- **Narrow bar.** At 42 px three icons of 24 px or more do not fit one row; AC-13 asks for the column of Q-6
  there, and the break point is recorded after the first run.
- **Vivaldi renames a toolbar class.** The look falls back to Vivaldi's own layout, never broken.
