# 076 Compact Breaking wave

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | Tore, 2026-11-28 (in chat) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

The Breaking wave (Cavallone) of [074](../074-toolbar-waves/spec.md) moves every button below the tab
strip, but Vivaldi lays them out as it lays out any toolbar: the trash in a small row, the workspace
button and `New Tab` as two full-width rows. Arc's bottom bar is different: icons only, on one row, with
the archive on the left, the space switcher in the middle and the "+" on the right. This spec gives the
Breaking wave a compact form that shows `TabsTrash`, `WorkspaceButton` and `NewTab` as three icon
buttons on one row, by style, without changing the lists that 074 writes.

A live spike of 2026-11-28 (lab profile, Vivaldi 8.3.4191.47, payload active, the sidebar-look hiding of
`NewTab` and the spacers lifted as 074 decided) measured the Breaking wave as it is. Each toolbar is
`display: flex; flex-direction: column; justify-content: center`. The large buttons (`WorkspaceButton`,
`NewTab`) are full-width rows, 348 px wide and 30 to 37 px high. The small buttons (`TabsTrash` 42x28,
`SyncedTabs` and `TabButton` 30x30, `Spacer`, `FlexibleSpacer`) are grouped by Vivaldi in a horizontal
`.tabbar-nested-buttons` row, and a large button breaks the group; a flexible spacer alone is a vertical
spacer and inside a group it grows horizontally. The bottom area therefore reads, top to bottom: a
vertical spacer, a group with the trash and a spacer on the left, the workspace row, a 30 px gap, the
`NewTab` row.

Mockup: [Toolbar waves](https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG), section "Cavallone compatto,
proposta" (no measurements for the compact form).

This spec cannot ship before 074: it needs the Breaking wave and the attribute that 074 puts on `body` (FR-13).
074 and [075](../075-settings-page/spec.md) are sibling specs, approved together with this one.

## User stories

- **US-1.** As a user who chose the Breaking wave to look like Arc, I want the bottom of the tab bar to be
  one row of three icons, so that it matches Arc's bar and wastes no height.
- **US-2.** As that user, I want the three icons to do what the real buttons do, with the same tooltips
  and the same keyboard access, so that nothing is lost by the compact look.
- **US-3.** As a user who leaves the Breaking wave, or edits the toolbar by hand, I want Vivaldi's own
  layout back at once.

## Expected behavior

### Today

| Case | What happens | Where |
|---|---|---|
| Breaking wave lists | Written by `toolbar-waves`: before `Spacer`; after `FlexibleSpacer`, `TabsTrash`, `FlexibleSpacer`, `WorkspaceButton`, `FlexibleSpacer`, `NewTab` | [074](../074-toolbar-waves/spec.md) |
| Bottom area with the wave | Vertical spacer, a left group with the trash and a spacer, the workspace row, a 30 px gap, the `NewTab` row | spike of 2026-11-28 |
| Compact forms of VivArcDi rows | Under `#tabs-tabbar-container.narrow`, "New Tab" is a centered `+` and the archive footer an icon, by CSS only | [032](../032-compact-tab-bar/spec.md), `src/styles/_tokens.scss` `$narrow-tab-bar` |
| Sidebar look in the tab bar | Hides `NewTab`, flexible spacers and a nested row of spacers only; 074 lifts this while a wave is active | `src/styles/sidebar-look.scss` lines 37-43 |

### After

While the Breaking wave is the chosen wave, the bottom bar of the tab strip is one row:

| Left | Center | Right |
|---|---|---|
| `TabsTrash` icon | `WorkspaceButton` icon | `NewTab` icon |

- Each is a square icon button of the size of Vivaldi's small toolbar buttons. The workspace button shows
  the icon of the current workspace and no name; `NewTab` shows only a `+`. The trash keeps its own icon.
- The buttons are the real Vivaldi buttons restyled, not copies: the click, the popup of the workspace
  button, the list of the trash, the tooltips, the focus ring and the accessible names are Vivaldi's own.
- The vertical spacer above, the group's spacer and the 30 px gap are gone; the row is as high as an icon
  button plus the padding of the bar.
- When the Breaking wave stops being the chosen wave, or the lists no longer match it, the layout is
  Vivaldi's again, with no residue.
- Colors follow the theme through the same variables as the rest of the tab bar, in the light and dark
  themes.

What is not proven yet, and is settled by `live:` scenarios written red first (see the
[verification plan](#verification-plan)): that style alone can place a nested group and two sibling rows
of a column on one line; that Vivaldi's popup anchors still work when the workspace button is shrunk;
and how the row reacts when the window or the bar is resized.

## Requirements

### Functional

- **FR-1.** The compact form applies only while `body` matches `body[data-vivarcdi-wave="breaking-wave"]`, the attribute that
  `toolbar-waves` sets (074 FR-13, Q-2), and only in the tab bar after-toolbar.
- **FR-2.** In the compact form `TabsTrash`, `WorkspaceButton` and `NewTab` sit on one row, in that order,
  left, center and right, at every width that fits them; below the threshold of Q-6 they stack in a column, none smaller than 24 px.
- **FR-3.** The compact form never changes the two lists, never calls `vivaldi.prefs.set` and never moves
  Vivaldi's buttons to another parent unless style alone cannot reach the result (Q-1).
- **FR-4.** The three buttons keep Vivaldi's behavior: `NewTab` opens a tab, `WorkspaceButton` opens its
  popup anchored to the button, `TabsTrash` opens its list.
- **FR-5.** Tooltips and accessible names are those of the real buttons; each icon button is reachable
  and operable with the keyboard, in the order of the row, with a visible focus ring (Q-3).
- **FR-6.** When the attribute is removed or changed to another wave, the lists change, or the module stops, the compact form is off at
  once and Vivaldi's layout is back (Q-4).
- **FR-7.** The compact form works in the light and dark themes, and with the compact tab bar of
  [032](../032-compact-tab-bar/spec.md) both on and off (Q-5).
- **FR-8.** The "+ New Tab" row of [028](../028-arc-sidebar-look/spec.md) is left as it is; the
  compact bar adds no second entry beyond what 074 already accepts (Q-5).
- **FR-9.** The selectors of the toolbar rows come from the selector catalog or one table beside the
  stylesheet, and the sizes and the attribute selector from `_tokens.scss`.

### Non-functional

- **NFR-1.** No script work for the compact state if style is enough: no polling, no observer. A helper,
  if Q-1 requires one, uses `KeptElement` and `TabBarAnchor` and one frame task.
- **NFR-2.** Same behavior on macOS and Debian.
- **NFR-3.** With 074 disabled, or any wave other than the Breaking wave chosen, the tab bar looks as it
  does without this spec.
- **NFR-4.** Ships on a `features/` branch with a minor version change, after 074.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names a test, `live` a scenario of
[046](../046-live-verification/spec.md), `manual` a step Tore performs.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE compact rules of the stylesheet SHALL apply only under `body[data-vivarcdi-wave="breaking-wave"]` | auto: `compact rules apply only under the breaking wave attribute` |
| AC-2 | WHILE `data-vivarcdi-wave` is absent or names another wave, THE stylesheet SHALL leave the tab bar rows as they are | auto: `without the breaking wave attribute the bottom bar is unchanged` |
| AC-3 | THE stylesheet SHALL define the attribute selector, the button size and the row gap as tokens | auto: `compact breaking wave uses tokens` |
| AC-4 | THE compact form SHALL NOT call `vivaldi.prefs.set` nor change the two lists | auto: `compact breaking wave never writes preferences` |
| AC-5 | WHEN a lab Vivaldi receives the Breaking wave lists with the attribute set, THE trash, the workspace and the new-tab buttons SHALL share one row, in that order, left to right | live: `the compact breaking wave puts three buttons on one row` |
| AC-6 | WHILE the compact form is on, THE three buttons SHALL be square and at most 36 px high, and the row SHALL start no higher than the first button's top | live: `the compact breaking wave row has the height of an icon button` |
| AC-7 | WHEN the compact form is on and a script clicks `NewTab`, THE browser SHALL open a new tab | live: `the compact new-tab button opens a tab` |
| AC-8 | WHEN the compact form is on and a script clicks the workspace button, THE workspace popup SHALL open anchored inside the window and under the button's row | live: `the compact workspace button opens its popup in place` |
| AC-9 | WHEN the compact form is on and a script clicks the trash button, THE list of closed tabs SHALL open | live: `the compact trash button opens its list` |
| AC-10 | WHILE the compact form is on, THE three buttons SHALL keep the tooltip and the accessible name they have without it | live: `the compact buttons keep their labels` |
| AC-11 | WHEN the tab bar is resized between its narrowest and widest widths, THE three buttons SHALL stay inside the bar, on one row where they fit and in a column below the threshold | live: `the compact breaking wave row survives a resize` |
| AC-12 | WHEN the lists are replaced by Still water or by a manual edit, THE bottom bar SHALL return to Vivaldi's rows without a reload | live: `the compact form switches off with the breaking wave` |
| AC-13 | WHILE the compact tab bar of 032 is on, THE three buttons SHALL stack in a column inside the narrow bar, each at least 24 px | live: `the compact breaking wave stacks in the narrow tab bar` |
| AC-14 | WHEN Tore looks at the bottom bar in the light and dark themes on macOS and Debian, THE row SHALL look like Arc's bottom bar: three clear icons, balanced left, center and right | manual |

AC-14 is the only `manual` criterion; tab order and focus (FR-5) are read from the DOM in AC-10 and
are not asked of Tore.

## Verification plan

Tore wants the work test-first. Before any style or code, these scenarios are written and run red on a
lab profile with the Breaking wave lists and the attribute; each proves a fact this spec only assumes, and its
result goes in the design:

1. AC-5 and AC-6: can style alone bring a nested group and two sibling rows of a column onto one line?
   The spike lists three approaches to try in this order: turn the toolbar into a wrapping row with
   `display: contents` on the group; turn it into a grid with named areas; give up and use the helper
   of Q-1.
2. AC-7 to AC-9: the three actions, with the workspace button shrunk, so that the popup anchor of
   Vivaldi still works.
3. AC-11 and AC-13: a resize of the bar, and the narrow bar of 032.
4. AC-12: the attribute leaving removes every trace.

If scenario 1 shows that style cannot do it, the spec returns to Q-1 before any code is written.

## Out of scope

- The lists themselves and the choice of a wave: [074](../074-toolbar-waves/spec.md).
- The settings page and its cards: [075](../075-settings-page/spec.md).
- Compact forms of Ripple and Swell, and of Still water.
- A bottom bar with one icon per space (028 section 9), and a new icon for the workspace button.
- Hiding Vivaldi's `NewTab` in favor of the "+ New Tab" row of 028.
- Writing preferences of any kind.

## Open questions

- [x] **Q-1. Style only, or a DOM helper?** The three buttons sit in two different parents (the nested
  group and two rows). Recommended: try style only (verification plan, scenario 1); a helper that
  re-parents Vivaldi's buttons risks losing them when Vivaldi rebuilds the toolbar, so it is allowed only
  if style fails, and then it follows `KeptElement` and `TabBarAnchor`.
  Resolved: the recommendation, approved with the spec (Tore, 2026-11-28).
- [x] **Q-2. How does 074 expose the active wave?** Resolved by 074 FR-13 and AC-22: `body` carries
  `data-vivarcdi-wave` with the wave id (`still-water`, `ripple`, `swell`, `breaking-wave`) while a wave
  is chosen, and the attribute is absent while none is. The compact form keys on
  `body[data-vivarcdi-wave="breaking-wave"]`; Still water is a chosen wave too and
  does not match.
- [x] **Q-3. Labels.** Recommended: icons only, as in Arc; the name is the tooltip and the accessible
  name Vivaldi already gives; no text is drawn beside the icon, not even on hover.
  Resolved: the recommendation, approved with the spec (Tore, 2026-11-28).
- [x] **Q-4. When the user's own lists replace the wave.** Recommended: the attribute is the only switch, and
  074 removes or changes it as soon as the lists no longer match the Breaking wave (074 FR-7), so a manual edit and
  Still water turn the compact form off with no code here. Should the style also check that the three
  buttons exist (`:has`), as a guard against a list that matches in name but lacks one?
  Recommended: yes, the style applies only when all three are present.
  Resolved: the recommendation, approved with the spec (Tore, 2026-11-28).
- [x] **Q-5. Interplay with 032 and 028.** Recommended: 032's narrow bar keeps its rules for the rows of
  VivArcDi and does not touch the toolbar buttons; the compact Breaking wave must fit the narrow width
  (AC-13), where the three icons stack in a column (Q-6). The "+ New Tab" row of 028 stays,
  so the tab bar has two new-tab entries, as 074 Q-9 decided.
  Resolved: the recommendation, approved with the spec (Tore, 2026-11-28).
- [x] **Q-6. Narrow widths.** At 42 px three 28 px icons do not fit one row. Recommended: below a width
  that fits them, the row wraps to a column of three icons rather than shrinking them below 24 px;
  AC-11 and AC-13 read accordingly and the verification plan records the break point.
  Resolved: the recommendation, approved with the spec (Tore, 2026-11-28).
- [x] **Q-7. Order and dependency on 074.** Recommended: 076 is written now as a Draft, linked to 074,
  but its design and tasks wait until 074 is Approved and `data-vivarcdi-wave` is in its design; implementation starts
  after 074 is implemented, because the live scenarios need the Breaking wave lists.
  Resolved: the recommendation, approved with the spec (Tore, 2026-11-28).

## References

- Live spike of 2026-11-28, lab Vivaldi 8.3.4191.47, measured with `npm run live -- --probe`.
- [Toolbar waves mockups](https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG), section "Cavallone
  compatto, proposta".
- [074 Toolbar waves](../074-toolbar-waves/spec.md) and [075 Settings page](../075-settings-page/spec.md):
  sibling specs; 076 depends on 074.
- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md), [032 Compact tab bar](../032-compact-tab-bar/spec.md),
  [046 Live verification](../046-live-verification/spec.md).
