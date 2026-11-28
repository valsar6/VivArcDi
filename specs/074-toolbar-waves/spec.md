# 074 Toolbar waves

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Vivaldi's own toolbar editor only moves buttons between two lists around the tab strip, and its
default puts the workspace button on top and `New Tab` below the strip. Arc has a different shape:
the bottom of the column holds a new-tab button, the space switcher and a trash. This spec offers three
ready layouts of those two lists, named after waves, from a small control with one icon each:

| Name | Italian UI name | Closeness to Arc |
|---|---|---|
| Ripple | Increspatura | low: the bar stays one row above the strip |
| Swell | Flutto | medium: a thin top row, the actions below the strip |
| Breaking wave | Cavallone | high: nothing above the strip, everything below it |

A probe of 2026-11-28 (lab profile, Vivaldi 8.3.4191.47, read-only) found that the editor writes two
list preferences, `vivaldi.toolbars.tabbar_before` and `vivaldi.toolbars.tabbar_after`, so a layout is
a pair of lists. What the probe could not prove, and this spec must prove with a live scenario before
anything ships, is that a write through `vivaldi.prefs.set` updates the interface, survives a restart
and is accepted when a list is empty. Spec [055](../055-tile-web-panel/spec.md) found a preference
whose write persisted but never reached the interface.

Mockups: [Toolbar waves](https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG).

## User stories

- **US-1.** As a user who wants the tab bar to look like Arc, I want to choose one of three layouts in
  one click, so that I do not assemble it button by button in Vivaldi's editor.
- **US-2.** As a user, I want to see what each layout looks like from its icon, so that I can choose
  without trying all three.
- **US-3.** As a user who customized the toolbars, I want my own lists saved before VivArcDi changes
  them, and a way back, so that I never lose the layout I built.
- **US-4.** As a user who edits the toolbar by hand after choosing a wave, I want VivArcDi to leave my
  edit alone.

## Expected behavior

### Today

| Case | What happens | Where |
|---|---|---|
| The user wants another toolbar layout | Opens Vivaldi's toolbar editor and moves buttons by hand | Vivaldi |
| `vivaldi.prefs` | Read only: `get` and `onChanged`; no method writes | `src/core/browser/BrowserPrefs.ts` |
| `vivaldi.prefs` in the payload | Passed to `BrowserPrefs` as `PrefsApi`, which declares `get` and `onChanged` only | `src/core/boot/VivArcDi.ts` `#prefsApi` |
| Sidebar look in the tab bar | Hides `.button-toolbar.newtab`, flexible spacers, and a `.tabbar-nested-buttons` row with nothing else in it | `src/styles/sidebar-look.scss` lines 37-43 |
| Toolbar lists | Not read or written by any module | none |

### After

**Layouts.** A new module, `toolbar-waves`, writes one preset into the two lists. The button ids come
from Vivaldi's bundle: `WorkspaceButton`, `NewTab`, `SyncedTabs`, `TabsTrash`, `TabButton`, `Spacer`,
`FlexibleSpacer`, `PanelWidthSpacer`, `Divider`.

| Wave | `tabbar_before` | `tabbar_after` |
|---|---|---|
| Ripple | `WorkspaceButton`, `NewTab`, `FlexibleSpacer`, `TabsTrash`, `TabButton` | empty |
| Swell | `WorkspaceButton`, `FlexibleSpacer`, `SyncedTabs` | `FlexibleSpacer`, `TabsTrash`, `FlexibleSpacer`, `NewTab` |
| Breaking wave | empty | `FlexibleSpacer`, `TabsTrash`, `FlexibleSpacer`, `WorkspaceButton`, `FlexibleSpacer`, `NewTab` |

Vivaldi's defaults are `["WorkspaceButton"]` for `tabbar_before` and `["NewTab", "FlexibleSpacer",
"TabButton"]` for `tabbar_after`.

**Control.** Three buttons in a group, one per wave, each showing its icon and carrying the name as
tooltip and accessible label. The current wave is pressed. Where the group lives is Q-1.

**Icons.** Three inline SVG icons drawn in the payload, 16 px grid, stroke only, colored with
`currentColor` so they follow the theme:

| Wave | Drawing |
|---|---|
| Ripple | two low sine lines, one above the other |
| Swell | one rounded swell with a small curl at the crest |
| Breaking wave | a tall wave with a curling crest and a foam dot |

**Memory.** Before the first write, the module stores the user's current pair of lists in the module
storage, with the chosen wave. **Back to Vivaldi** writes the stored lists back and clears the choice.

**Following.** The module listens to both preferences. When they stop matching the chosen preset
because the user edited them, the module drops the choice, keeps the stored backup, and writes
nothing.

**Interaction with the sidebar look.** With `sidebar-look` enabled, its rules hide `NewTab` and every
flexible spacer in the tab bar, which defeats Swell and Breaking wave (their layout is made of
flexible spacers and `NewTab`). This spec lets `toolbar-waves` take over: the hiding rules apply only
while no wave is chosen (Q-6).

## Requirements

### Functional

- **FR-1.** The module reads both lists through `vivaldi.prefs.get` at start and on every change
  announced by `onChanged`.
- **FR-2.** `BrowserPrefs` gains a `set(key, value)` that resolves when the write is done and never
  rejects; it stays the only place that touches `vivaldi.prefs`.
- **FR-3.** Choosing a wave writes its two lists of the table in [After](#after), `before` first.
- **FR-4.** Before the first write of a session in which no wave is chosen, the module stores the
  current lists as the backup. It never overwrites a backup while a wave is chosen.
- **FR-5.** The choice is stored, so that the control shows the same wave after a restart.
- **FR-6.** **Back to Vivaldi** restores the backup lists and clears the choice; when there is no
  backup it writes Vivaldi's defaults.
- **FR-7.** When either list changes and the pair no longer equals the chosen preset, the module clears
  the choice and keeps the backup. It never writes in response to a change.
- **FR-8.** When the user's lists differ from every preset and from Vivaldi's defaults, a choice needs
  a confirmation (Q-2).
- **FR-9.** When `vivaldi.prefs` has no `set`, or a list is missing, the module does not start, and the
  boot logs one warning (Q-4).
- **FR-10.** The control shows the three icons of [After](#after), each with the wave name as tooltip
  and accessible label, the chosen one pressed.
- **FR-11.** The module keeps `privateWindows = 'never'`: it stores the backup and the choice, and the
  lists are profile-wide.
- **FR-12.** The sidebar look's rules for `NewTab` and flexible spacers in the tab bar apply only
  while no wave is chosen (Q-6).

### Non-functional

- **NFR-1.** Button ids are named once, in one table beside the module, not scattered in code.
- **NFR-2.** Stored values follow the versioned storage of [037](../037-versioned-storage/spec.md).
- **NFR-3.** With the module disabled, nothing changes in Vivaldi and nothing is written.
- **NFR-4.** The module reads only; it does not write while it starts.
- **NFR-5.** Ships on a `features/` branch with a minor version change.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names a test, `live` a scenario of
[046](../046-live-verification/spec.md), `manual` a step Tore performs.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE preference service SHALL write a value through `vivaldi.prefs.set` and resolve when it is done | auto: `writes a preference and resolves` |
| AC-2 | WHEN the module starts, THE module SHALL read both lists and show the wave they equal, or none | auto: `shows the wave the lists already equal` |
| AC-3 | WHEN the user chooses a wave, THE module SHALL write that wave's two lists | auto: `writes the lists of the chosen wave` |
| AC-4 | WHEN the user chooses a wave while none is chosen, THE module SHALL store the current lists first | auto: `stores the user's lists before the first write` |
| AC-5 | WHILE a wave is chosen, THE module SHALL keep the stored backup unchanged when another wave is chosen | auto: `keeps the first backup when waves change` |
| AC-6 | WHEN the user chooses Back to Vivaldi, THE module SHALL write the backup and clear the choice | auto: `restores the stored lists` |
| AC-7 | IF there is no backup, THEN Back to Vivaldi SHALL write Vivaldi's default lists | auto: `restores the defaults without a backup` |
| AC-8 | WHEN the user edits a list so that the pair no longer equals the chosen preset, THE module SHALL clear the choice, keep the backup and write nothing | auto: `drops the choice after a manual edit` |
| AC-9 | WHEN the lists differ from every preset and from the defaults, THE module SHALL ask for a confirmation before the first write | auto: `asks before replacing custom lists` |
| AC-10 | IF `vivaldi.prefs.set` or a list is missing, THEN THE module SHALL not start and SHALL log one warning | auto: `does not start without writable toolbar lists` |
| AC-11 | THE module SHALL NOT start in a private window | auto: `stays out of private windows` |
| AC-12 | THE control SHALL show three buttons, each with its name as label, the chosen one pressed | auto: `shows three wave buttons with the chosen one pressed` |
| AC-13 | THE three icons SHALL be inline SVG colored by `currentColor` | auto: `draws the wave icons with currentColor` |
| AC-14 | WHILE a wave is chosen, THE sidebar look SHALL NOT hide `NewTab` or flexible spacers in the tab bar | auto: `lets a chosen wave keep the new-tab button and spacers` |
| AC-15 | WHEN a lab Vivaldi receives the Ripple lists, THE tab bar SHALL show `NewTab` and `TabButton` in `.toolbar-tabbar-before` and no `.toolbar-tabbar-after` buttons | live: `the ripple wave puts the buttons above the strip` |
| AC-16 | WHEN a lab Vivaldi receives the Swell lists, THE tab bar SHALL show `SyncedTabs` above the strip and `TabsTrash` and `NewTab` in `.toolbar-tabbar-after` | live: `the swell wave splits the buttons around the strip` |
| AC-17 | WHEN a lab Vivaldi receives the Breaking wave lists, THE tab bar SHALL show no buttons in `.toolbar-tabbar-before` and the trash, the workspace button and `NewTab` in order in `.toolbar-tabbar-after` | live: `the breaking wave puts every button below the strip` |
| AC-18 | WHEN the lists are written in a lab Vivaldi, THE interface SHALL update without a reload and the preference SHALL still hold the written lists after reading it again | live: `a written toolbar list shows without a reload` |
| AC-19 | WHEN Back to Vivaldi runs after a wave, THE lab tab bar SHALL show Vivaldi's lists as before | live: `back to vivaldi restores the toolbar` |
| AC-20 | WHEN Tore looks at the three icons in the light and dark themes on macOS and Debian, THE icons SHALL be told apart and legible | manual |

AC-18 decides whether the whole feature is possible (Q-5). A restart and a sync of the lists cannot be
proven on the throwaway profile, and they are the one thing Tore checks on his own profile together
with AC-20.

## Out of scope

- The Downloads panel bar, the address bar toolbar and the translation banner.
- The Spaces dots switcher.
- Buttons other than the nine ids above, and user-defined layouts.
- Moving the user's own buttons into a wave; a wave replaces both lists.
- Reacting to the sync of the lists from another computer, other than FR-7.

## Open questions

- [ ] **Q-1. Where does the control live?** Options: a module option in `src/config.json`
  (`"wave": "swell"`), a group of buttons in the sidebar, or a command. Recommendation: the group of
  three icon buttons in the tab bar's footer, next to the other VivArcDi controls, plus the
  `config.json` option as the initial wave, so that a new user has one visible control and an editor of
  the file has a plain setting.
- [ ] **Q-2. A write over the user's lists.** When the lists are not Vivaldi's defaults or a preset,
  is a write allowed? Recommendation: yes after one confirmation toast-style prompt, with the backup of
  FR-4, and Back to Vivaldi to undo.
- [ ] **Q-3. Empty `tabbar_before` for the Breaking wave.** Recommendation: if the live scenario
  shows that Vivaldi accepts the empty list and removes the row, keep it empty. If not, keep a single
  `Spacer` so that the strip still starts at the top.
- [ ] **Q-4. Vivaldi without these preferences.** Recommendation: the module does not start and logs one
  warning, like a missing selector (FR-9), and the control never appears.
- [ ] **Q-5. Writes that persist without updating the UI.** If AC-18 fails, the feature cannot ship as
  written. Recommendation: stop and write a new draft that drives Vivaldi's own toolbar editor, as 055
  did for the web panel form.
- [ ] **Q-6. The sidebar look rules.** Recommendation: put a class on `body` while a wave is chosen,
  and make `sidebar-look.scss` hide `NewTab` and flexible spacers only without that class. This changes
  the rules of [028](../028-arc-sidebar-look/spec.md) and needs its status read again.
- [ ] **Q-7. Module id and name.** Recommendation: id `toolbar-waves`, name "Toolbar waves", matching the
  spec folder, enabled by default but writing nothing until the user chooses a wave (NFR-4).
- [ ] **Q-8. Interplay with the compact tab bar.** Recommendation: the compact bar of
  [032](../032-compact-tab-bar/spec.md) keeps its own rules; the live scenarios run with it off, and a
  conflict becomes a follow-up spec.

## References

- Probe of 2026-11-28 on a throwaway lab profile, Vivaldi 8.3.4191.47, with `npm run live -- --probe`.
- [Toolbar waves mockups](https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG).
- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md), [032 Compact tab bar](../032-compact-tab-bar/spec.md),
  [036 Module options](../036-module-options/spec.md), [037 Versioned storage](../037-versioned-storage/spec.md).
- [055 Tile web panel](../055-tile-web-panel/spec.md), question 1: a preference write that did not reach
  the interface.
- [059 Arc pinned tabs](../059-pinned-tabs-arc/spec.md) and [060 Clear bar](../060-clear-bar-and-pinned-unload/spec.md):
  the Arc footer this layout sits beside.
