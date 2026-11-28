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
Breaking wave a compact form that shows the Archive button of VivArcDi, `WorkspaceButton` and `NewTab` as
three icon buttons on one row, by style where it can, without changing the lists that 074 writes.

A live spike of 2026-11-28 (lab profile, Vivaldi 8.3.4191.47, payload active, the sidebar-look hiding of
`NewTab` and the spacers lifted as 074 decided) measured the Breaking wave as it was then, with `TabsTrash` still in the preset. Each toolbar is
`display: flex; flex-direction: column; justify-content: center`. The large buttons (`WorkspaceButton`,
`NewTab`) are full-width rows, 348 px wide and 30 to 37 px high. The small buttons (`TabsTrash` 42x28,
`SyncedTabs` and `TabButton` 30x30, `Spacer`, `FlexibleSpacer`) are grouped by Vivaldi in a horizontal
`.tabbar-nested-buttons` row, and a large button breaks the group; a flexible spacer alone is a vertical
spacer and inside a group it grows horizontally. The bottom area therefore reads, top to bottom: a
vertical spacer, a group with the trash and a spacer on the left, the workspace row, a 30 px gap, the
`NewTab` row.

Mockup: [Toolbar waves](https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG), section "Cavallone compatto,
proposta" (no measurements for the compact form).

This spec cannot ship before 074: it needs the Breaking wave, its preset without `TabsTrash`, and the
attribute that 074 puts on `body` (FR-13). It also needs [077](../077-archive-icon/spec.md), which makes the
Archive footer an icon-only button. 074, 075 and 077 are sibling specs.

### Revision of 2026-11-28 (Tore, after looking at Arc's bottom bar)

The first form of this spec put the trash, the workspace button and `NewTab` on the row. Tore looked at
Arc, whose bar holds the archive at the left, one small space switcher in the middle and the "+" at the
right, and decided: the three buttons are the **Archive** button of VivArcDi (the `today` footer
`data-vivarcdi-archive-footer`, an icon since 077), `WorkspaceButton` and `NewTab`; `TabsTrash` is not part
of the Breaking wave any more, and 074 drops it from the preset. This reverses the answer to Q-3 of the
first form ("the compact form does not include the archive footer"): the footer is now the left button of
the row. The workspace button shows only its icon, hidden by style in the compact row whatever the option
`vivaldi.workspaces.button.show_name` says ([075](../075-settings-page/spec.md) owns that option).

## User stories

- **US-1.** As a user who chose the Breaking wave to look like Arc, I want the bottom of the tab bar to be
  one row of three icons (archive, workspace, new tab), so that it matches Arc's bar and wastes no height.
- **US-2.** As that user, I want the three icons to do what the real buttons do, with the same tooltips
  and the same keyboard access, so that nothing is lost by the compact look.
- **US-3.** As a user who leaves the Breaking wave, or edits the toolbar by hand, I want Vivaldi's own
  layout back at once.

## Expected behavior

### Today

| Case | What happens | Where |
|---|---|---|
| Breaking wave lists | Written by `toolbar-waves`: before `Spacer`; after, `WorkspaceButton` and `NewTab` between flexible spacers, no `TabsTrash` (074 drops it; the exact list is 074's) | [074](../074-toolbar-waves/spec.md) |
| Bottom area with the wave | Vertical spacer, a group of spacers, the workspace row, a 30 px gap, the `NewTab` row; the Archive footer is elsewhere, at the end of the tab list | spike of 2026-11-28 |
| Archive footer | `div[data-vivarcdi-archive-footer]`, last child of `#tabs-container`, sticky at the bottom of the scrolling column; an icon button after 077 | `src/modules/today/ArchiveButton.ts`, `src/styles/column-scroll.scss` lines 20-24, [077](../077-archive-icon/spec.md) |
| Workspace button label | Shows the workspace name or not by Vivaldi's option `vivaldi.workspaces.button.show_name` | Vivaldi, [075](../075-settings-page/spec.md) |
| Compact forms of VivArcDi rows | Under `#tabs-tabbar-container.narrow`, "New Tab" is a centered `+` and the archive footer an icon, by CSS only | [032](../032-compact-tab-bar/spec.md), `src/styles/_tokens.scss` `$narrow-tab-bar` |
| Sidebar look in the tab bar | Hides `NewTab`, flexible spacers and a nested row of spacers only; 074 lifts this while a wave is active | `src/styles/sidebar-look.scss` lines 37-43 |

### After

While the Breaking wave is the chosen wave, the bottom bar of the tab strip is one row:

| Left | Center | Right |
|---|---|---|
| Archive icon | `WorkspaceButton` icon | `NewTab` icon |

- Each is a square icon button of the size of Vivaldi's small toolbar buttons. The workspace button shows
  the icon of the current workspace and no name; `NewTab` shows only a `+`; the Archive button keeps the icon of 077.
- The buttons are the real buttons restyled, not copies: Vivaldi's `WorkspaceButton` and `NewTab` and
  VivArcDi's own Archive footer keep their click, the popup of the workspace button, the tooltips, the
  focus ring and the accessible names.
- The vertical spacer above, the group's spacers and the 30 px gap are gone; the row is as high as an icon
  button plus the padding of the bar.
- When the Breaking wave stops being the chosen wave, or the lists no longer match it, the layout is
  Vivaldi's again, with no residue, and the Archive footer is back at the end of the tab list.
- Colors follow the theme through the same variables as the rest of the tab bar, in the light and dark
  themes.

What is not proven yet, and is settled by `live:` scenarios written red first (see the
[verification plan](#verification-plan)): that style alone can put the Archive footer, which lives in
the tab list's container, on the same row as the two buttons of Vivaldi's after-toolbar; the vertical
position of the row; that Vivaldi's popup anchors still work when the workspace button is shrunk; and how
the row reacts when the window or the bar is resized.

## Requirements

### Functional

- **FR-1.** The compact form applies only while `body` matches `body[data-vivarcdi-wave="breaking-wave"]`, the attribute that
  `toolbar-waves` sets (074 FR-13, Q-2), and only in the tab bar after-toolbar.
- **FR-2.** In the compact form the Archive button, `WorkspaceButton` and `NewTab` sit on one row, in that order,
  left, center and right, at every width that fits them; below the threshold of Q-6 they stack in a column, none smaller than 24 px.
- **FR-3.** The compact form never changes the two lists, never calls `vivaldi.prefs.set` and never moves
  Vivaldi's buttons to another parent. It moves VivArcDi's own Archive footer into the row only if style
  alone cannot reach the result (Q-1, Q-8).
- **FR-4.** The three buttons keep Vivaldi's behavior: `NewTab` opens a tab, `WorkspaceButton` opens its
  popup anchored to the button, the Archive button opens the archive panel.
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
- **FR-10.** In the compact row the workspace button shows only its icon: the style hides its label under
  `body[data-vivarcdi-wave="breaking-wave"]`, whatever the value of `vivaldi.workspaces.button.show_name`;
  the compact row neither reads nor writes that option.
- **FR-11.** The Archive button of the row is the footer of the `today` module in its icon form of
  [077](../077-archive-icon/spec.md); outside the compact form the footer stays where it is today. The
  compact form never shows two Archive buttons.
- **FR-12.** The style applies only when the Archive footer, `WorkspaceButton` and `NewTab` are all present.

### Non-functional

- **NFR-1.** No script work for the compact state if style is enough: no polling, no observer. A helper,
  if Q-1 requires one, uses `KeptElement` and `TabBarAnchor` and one frame task.
- **NFR-2.** Same behavior on macOS and Debian.
- **NFR-3.** With 074 disabled, or any wave other than the Breaking wave chosen, the tab bar looks as it
  does without this spec.
- **NFR-4.** Ships on a `features/` branch with a minor version change, after 074 and 077.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names a test, `live` a scenario of
[046](../046-live-verification/spec.md), `manual` a step Tore performs.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE compact rules of the stylesheet SHALL apply only under `body[data-vivarcdi-wave="breaking-wave"]` | auto: `compact rules apply only under the breaking wave attribute` |
| AC-2 | WHILE `data-vivarcdi-wave` is absent or names another wave, THE stylesheet SHALL leave the tab bar rows as they are | auto: `without the breaking wave attribute the bottom bar is unchanged` |
| AC-3 | THE stylesheet SHALL define the attribute selector, the button size and the row gap as tokens | auto: `compact breaking wave uses tokens` |
| AC-4 | THE compact form SHALL NOT call `vivaldi.prefs.set` nor change the two lists | auto: `compact breaking wave never writes preferences` |
| AC-5 | WHEN a lab Vivaldi receives the Breaking wave lists with the attribute set, THE archive, the workspace and the new-tab buttons SHALL share one row, in that order, left to right | live: `the compact breaking wave puts three buttons on one row` |
| AC-6 | WHILE the compact form is on, THE three buttons SHALL be square and at most 36 px high, and the row SHALL start no higher than the first button's top | live: `the compact breaking wave row has the height of an icon button` |
| AC-7 | WHEN the compact form is on and a script clicks `NewTab`, THE browser SHALL open a new tab | live: `the compact new-tab button opens a tab` |
| AC-8 | WHEN the compact form is on and a script clicks the workspace button, THE workspace popup SHALL open anchored inside the window and under the button's row | live: `the compact workspace button opens its popup in place` |
| AC-9 | WHEN the compact form is on and a script clicks the Archive button, THE archive panel SHALL open | live: `the compact archive button opens the archive panel` |
| AC-10 | WHILE the compact form is on, THE three buttons SHALL keep the tooltip and the accessible name they have without it | live: `the compact buttons keep their labels` |
| AC-11 | WHEN the tab bar is resized between its narrowest and widest widths, THE three buttons SHALL stay inside the bar, on one row where they fit and in a column below the threshold | live: `the compact breaking wave row survives a resize` |
| AC-12 | WHEN the lists are replaced by Still water or by a manual edit, THE bottom bar SHALL return to Vivaldi's rows and THE Archive footer to the end of the tab list, without a reload | live: `the compact form switches off with the breaking wave` |
| AC-13 | WHILE the compact tab bar of 032 is on, THE three buttons SHALL stack in a column inside the narrow bar, each at least 24 px | live: `the compact breaking wave stacks in the narrow tab bar` |
| AC-14 | WHEN Tore looks at the bottom bar in the light and dark themes on macOS and Debian, THE row SHALL look like Arc's bottom bar: the archive icon at the left, one small workspace icon in the middle, the plus at the right | manual |
| AC-15 | WHILE the compact form is on, THE workspace button SHALL show only its icon, with no visible label | live: `the compact workspace button shows only its icon` |
| AC-16 | WHILE the compact form is on and `vivaldi.workspaces.button.show_name` is on, THE workspace button SHALL still show only its icon | live: `the compact row hides the workspace name whatever the option says` |
| AC-17 | THE compact rules SHALL apply only when the Archive footer, `WorkspaceButton` and `NewTab` are all present | auto: `compact breaking wave needs the archive, workspace and new-tab buttons` |

AC-14 is the only `manual` criterion; tab order and focus (FR-5) are read from the DOM in AC-10 and
are not asked of Tore. Not proven yet: that style can put the Archive footer on the row, the vertical
position of the row, and the resize behavior.

## Verification plan

Tore wants the work test-first. Before any style or code, these scenarios are written and run red on a
lab profile with the Breaking wave lists and the attribute; each proves a fact this spec only assumes, and its
result goes in the design:

1. AC-5 and AC-6: can style alone bring the two buttons of the after-toolbar onto one line (a row with
   `display: contents` on the group, then a grid)?
2. AC-5, AC-6 and AC-15: can style alone put the Archive footer, which sits in `#tabs-container`, in the
   left slot of that row (attempt (a) of the design), or is the footer moved into the row by a helper
   (attempt (b), Q-8)? Where is the row vertically?
3. AC-7 to AC-9: the three actions, with the workspace button shrunk, so that the popup anchor of
   Vivaldi still works.
4. AC-16: the label stays hidden with the Vivaldi option on and off.
5. AC-11 and AC-13: a resize of the bar, and the narrow bar of 032.
6. AC-12: the attribute leaving removes every trace.

If scenarios 1 and 2 show that style cannot do it, the design is amended for the helper (Q-1, Q-8) before any code is written.

## Out of scope

- The lists themselves and the choice of a wave: [074](../074-toolbar-waves/spec.md).
- The settings page and its cards: [075](../075-settings-page/spec.md).
- Compact forms of Ripple and Swell, and of Still water.
- The icon of the Archive button and its alignment inside the footer: [077](../077-archive-icon/spec.md).
- The option `vivaldi.workspaces.button.show_name` and its control: [075](../075-settings-page/spec.md).
- `TabsTrash` in the Breaking wave (074 drops it from the preset).
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
  Resolved: the recommendation, approved with the spec (Tore, 2026-11-28). Revised the same day: the
  first answer also said that the compact form does not include the archive footer; Tore reversed that
  after looking at Arc, and the Archive button is now the left button of the row (see the revision above).
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

- [ ] **Q-8. Where does the Archive footer live in the row?** The footer is a VivArcDi element, the last
  child of `#tabs-container` (a scrolling, sticky column); the other two buttons are children of Vivaldi's
  `.toolbar-tabbar-after`. Recommended: attempt (a), style only: the toolbar keeps a left slot and the
  footer is positioned over it from their common parent; attempt (b), a helper that keeps the footer as
  the first child of the after-toolbar with `KeptElement`, only if (a) fails the live scenarios.
- [ ] **Q-9. Vertical position and height of the row.** The row is the after-toolbar's; the footer must sit
  on its middle line, not on the bottom of the column. Recommended: anchor the footer to the toolbar
  (CSS anchor positioning if Vivaldi's Chromium has it, else a measured offset) and let scenario AC-6
  read the result; a fixed pixel offset is rejected.
- [ ] **Q-10. Order of the specs.** Recommended: 076 ships after 074 (marker, preset without `TabsTrash`)
  and 077 (the icon-only Archive); until both are in `main`, the scenarios may set the attribute, the lists
  and the footer by hand.

## References

- Live spike of 2026-11-28, lab Vivaldi 8.3.4191.47, measured with `npm run live -- --probe`.
- [Toolbar waves mockups](https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG), section "Cavallone
  compatto, proposta".
- [074 Toolbar waves](../074-toolbar-waves/spec.md) and [075 Settings page](../075-settings-page/spec.md):
  sibling specs; 076 depends on 074.
- [077 Archive button as an icon](../077-archive-icon/spec.md): the icon-only Archive button; 076 depends on it.
- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md), [032 Compact tab bar](../032-compact-tab-bar/spec.md),
  [046 Live verification](../046-live-verification/spec.md).
