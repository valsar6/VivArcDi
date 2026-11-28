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
the bottom of the column holds a new-tab button, the space switcher and a trash. This spec offers four
layouts of those two lists, named after waves (three ready ones and Still water, the way back), each with its own icon, chosen from the settings page of [075](../075-settings-page/spec.md):

| Name | Italian UI name | Closeness to Arc |
|---|---|---|
| Still water | Specchio d'acqua | none: Vivaldi's own lists, the user customizes |
| Ripple | Increspatura | low: the bar stays one row above the strip |
| Swell | Flutto | medium: a thin top row, the actions below the strip |
| Breaking wave | Cavallone | high: nothing above the strip, everything below it |

A probe of 2026-11-28 (lab profile, Vivaldi 8.3.4191.47, read-only) found that the editor writes two
list preferences, `vivaldi.toolbars.tabbar_before` and `vivaldi.toolbars.tabbar_after`, so a layout is
a pair of lists. What the probe could not prove, and this spec must prove with a live scenario before
anything ships, is that a write through `vivaldi.prefs.set` updates the interface, survives a restart
and is accepted when a list is empty. Spec [055](../055-tile-web-panel/spec.md) found a preference
whose write persisted but never reached the interface.

Mockups (three waves; Still water was added later): [Toolbar waves](https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG).

## User stories

- **US-1.** As a user who wants the tab bar to look like Arc, I want to choose one of four layouts in
  one click, so that I do not assemble it button by button in Vivaldi's editor.
- **US-2.** As a user, I want to see what each layout looks like from its icon, so that I can choose
  without trying all four.
- **US-3.** As a user who customized the toolbars, I want my own lists saved before VivArcDi changes
  them, and a way back (Still water), so that I never lose the layout I built.
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

**Layouts.** A new module, `toolbar-waves`, writes one preset into the two lists. Three waves have fixed lists; the fourth, Still water, writes back the user's own. The button ids come
from Vivaldi's bundle: `WorkspaceButton`, `NewTab`, `SyncedTabs`, `TabsTrash`, `TabButton`, `Spacer`,
`FlexibleSpacer`, `PanelWidthSpacer`, `Divider`.

| Wave | `tabbar_before` | `tabbar_after` |
|---|---|---|
| Still water | the stored backup, else `WorkspaceButton` | the stored backup, else `NewTab`, `FlexibleSpacer`, `TabButton` |
| Ripple | `WorkspaceButton`, `FlexibleSpacer`, `TabsTrash`, `TabButton` | empty |
| Swell | `WorkspaceButton`, `FlexibleSpacer`, `SyncedTabs` | `FlexibleSpacer`, `TabsTrash`, `FlexibleSpacer`, `NewTab` |
| Breaking wave | `Spacer` | `FlexibleSpacer`, `TabsTrash`, `FlexibleSpacer`, `WorkspaceButton`, `FlexibleSpacer`, `NewTab` |

Vivaldi's defaults are `["WorkspaceButton"]` for `tabbar_before` and `["NewTab", "FlexibleSpacer",
"TabButton"]` for `tabbar_after`.

`NewTab` is in every preset except Ripple, the minimal one for tabs, which drops the button because
the "+ New Tab" row of 028 stays. Still water writes the user's lists, which may have no `NewTab`.

**Service and data.** This module draws no control. It exposes the four waves as data (id, English
name, Italian name, icon, preview) and a service with three calls: read the current wave, choose a
wave, and tell when the current wave changes. The cards, their preview, the check mark on the chosen
one and where the page is reached are specified in [075](../075-settings-page/spec.md), which calls this
service; 074 depends on it only for the page. Without a page, the `config.json` option `wave` gives the
initial wave.

**Icons.** Four inline SVG icons drawn in the payload, 16 px grid, stroke only, colored with
`currentColor` so they follow the theme:

| Wave | Drawing |
|---|---|
| Still water | two calm flat horizontal lines |
| Ripple | two low sine lines, one above the other |
| Swell | one rounded swell with a small curl at the crest |
| Breaking wave | a tall wave with a curling crest and a foam dot |

**Memory.** Before the first write, the module stores the user's current pair of lists in the module
storage, with the chosen wave. **Still water** writes the stored lists back and clears the stored wave; there is no separate back button. Without a backup it writes Vivaldi's defaults.

**Following.** The module listens to both preferences. When they stop matching the chosen preset
because the user edited them, the module drops the choice, keeps the stored backup, and writes
nothing.

**Interaction with the sidebar look.** `sidebar-look.scss` (lines 37-43) hides `.button-toolbar.newtab`
and `.button-toolbar.toolbar-spacer-flexible` in the tab bar, and hides a `.tabbar-nested-buttons` row
that holds no button other than spacers. Both defeat Swell and Breaking wave, whose layouts are made of
`NewTab` and flexible spacers. Decided (Tore, 2026-11-28): before any wave is chosen the hiding stays,
so nothing changes. While a wave is active, including Still water, nothing in the tab bar hides
`NewTab` or the flexible spacers, and the nested row is not hidden; the other look rules of
[028](../028-arc-sidebar-look/spec.md) stay. 028 FR-6 draws its own "+ New Tab" row, so with Swell or
Breaking wave the tab bar shows both the row and the button. 028 needs a revision note.

## Requirements

### Functional

- **FR-1.** The module reads both lists through `vivaldi.prefs.get` at start and on every change
  announced by `onChanged`.
- **FR-2.** `BrowserPrefs` gains a `set(key, value)` that resolves when the write is done and never
  rejects; it stays the only place that touches `vivaldi.prefs`.
- **FR-3.** Choosing a wave writes its two lists of the table in [After](#after), `before` first.
- **FR-4.** Before the first write of a session in which no wave is chosen, the module stores the
  current lists as the backup. It never overwrites a backup while a wave is chosen.
- **FR-5.** The choice is stored, so that the page shows the same wave after a restart.
- **FR-6.** Choosing **Still water** writes the backup lists and clears the stored wave; when there
  is no backup it writes Vivaldi's defaults.
- **FR-7.** When either list changes and the pair no longer equals the chosen preset, the module clears
  the choice and keeps the backup. It never writes in response to a change.
- **FR-8.** When the user's lists differ from every preset and from Vivaldi's defaults, a choice needs
  a confirmation (Q-2).
- **FR-9.** When `vivaldi.prefs` has no `set`, or a list is missing, the module does not start, and the
  boot logs one warning (Q-4).
- **FR-10.** The module exposes the four waves as data and a service to read, choose and follow the
  current wave, for the page of [075](../075-settings-page/spec.md); it builds no visible control.
- **FR-11.** The module keeps `privateWindows = 'never'`: it stores the backup and the choice, and the
  lists are profile-wide.
- **FR-12.** While a wave is active, `sidebar-look.scss` does not hide `.button-toolbar.newtab`, the
  flexible spacers or the `.tabbar-nested-buttons` row in the tab bar; the module marks the document
  so that the style can tell; with no wave chosen the hiding stays (Q-6, Q-9).

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
| AC-6 | WHEN the user chooses Still water, THE module SHALL write the backup and clear the choice | auto: `still water writes the stored lists` |
| AC-7 | IF there is no backup, THEN Still water SHALL write Vivaldi's default lists | auto: `still water writes the defaults without a backup` |
| AC-8 | WHEN the user edits a list so that the pair no longer equals the chosen preset, THE module SHALL clear the choice, keep the backup and write nothing | auto: `drops the choice after a manual edit` |
| AC-9 | WHEN the lists differ from every preset and from the defaults, THE module SHALL ask for a confirmation before the first write | auto: `asks before replacing custom lists` |
| AC-10 | IF `vivaldi.prefs.set` or a list is missing, THEN THE module SHALL not start and SHALL log one warning | auto: `does not start without writable toolbar lists` |
| AC-11 | THE module SHALL NOT start in a private window | auto: `stays out of private windows` |
| AC-12 | THE module SHALL expose the four waves as data, with English and Italian names, and a service to read, choose and follow the current wave | auto: `exposes the four waves and a service to choose one` |
| AC-13 | THE four icons SHALL be inline SVG colored by `currentColor` | auto: `draws the four wave icons with currentColor` |
| AC-14 | WHILE a wave is active, THE sidebar look SHALL NOT hide `NewTab`, flexible spacers or the nested buttons row in the tab bar | auto: `lets an active wave keep the new-tab button, spacers and nested row` |
| AC-15 | WHEN a lab Vivaldi receives the Ripple lists, THE tab bar SHALL show `TabsTrash` and `TabButton` in `.toolbar-tabbar-before` and no `.toolbar-tabbar-after` buttons | live: `the ripple wave puts the buttons above the strip` |
| AC-16 | WHEN a lab Vivaldi receives the Swell lists, THE tab bar SHALL show `SyncedTabs` above the strip and `TabsTrash` and `NewTab` in `.toolbar-tabbar-after` | live: `the swell wave splits the buttons around the strip` |
| AC-17 | WHEN a lab Vivaldi receives the Breaking wave lists, THE tab bar SHALL show only a spacer in `.toolbar-tabbar-before` and the trash, the workspace button and `NewTab` in order in `.toolbar-tabbar-after` | live: `the breaking wave puts every button below the strip` |
| AC-18 | WHEN the lists are written in a lab Vivaldi, THE interface SHALL update without a reload and the preference SHALL still hold the written lists after reading it again | live: `a written toolbar list shows without a reload` |
| AC-19 | WHEN Still water runs after a wave, THE lab tab bar SHALL show the lists as before the first wave | live: `still water restores the toolbar` |
| AC-20 | WHEN Tore looks at the four icons in the light and dark themes on macOS and Debian, THE icons SHALL be told apart and legible | manual |

AC-18 decides whether the whole feature is possible (Q-5). A restart and a sync of the lists cannot be
proven on the throwaway profile, and they are the one thing Tore checks on his own profile together
with AC-20.

## Verification plan

Tore wants the work test-first, with spikes. Before any module code, these `live:` scenarios are
written and run red on a lab profile; each one proves a fact this spec only assumes, and its result
goes in the design, not here:

1. A list written with `vivaldi.prefs.set` updates `.toolbar-tabbar-before` and
   `.toolbar-tabbar-after` without a reload (AC-18).
2. An empty list and a list with a single `Spacer` are accepted and give the expected rows (Q-3
   resolved on the strength of Tore's choice; the spike checks the result).
3. The order of buttons and the rows or columns they take in the vertical toolbar match the three
   presets (AC-15 to AC-17).
4. `onChanged` fires for both lists after a write and after a manual edit (AC-8).
5. The written preference still holds the lists when read again, and after a window reload of the lab
   profile (AC-18).
6. With `sidebar-look` on, `NewTab`, the flexible spacers and the nested row are visible while a wave
   is active, and still hidden before one is chosen (AC-14).
7. Still water writes back the lists stored before the first wave (AC-19).

If scenario 1 or 5 fails, the spec returns to Q-5.

## Out of scope

- The Downloads panel bar, the address bar toolbar and the translation banner.
- The Spaces dots switcher.
- The "VivArcDi Settings" page, its cards and its other sections (themes, features, troubleshooting):
  [075](../075-settings-page/spec.md).
- Buttons other than the nine ids above, and user-defined layouts.
- Moving the user's own buttons into a wave; a wave replaces both lists.
- Reacting to the sync of the lists from another computer, other than FR-7.

## Open questions

- [x] **Q-1. Where does the control live?** Answered (Tore, 2026-11-28, revised): not in the tab bar.
  It lives in a "VivArcDi Settings" page inside Vivaldi, styled like Vivaldi's own settings: cards with
  a preview, the name below and a check mark on the chosen one. That page is spec
  [075](../075-settings-page/spec.md); 074 owns the wave logic and the contents of the cards. The
  `config.json` option for the initial wave stays.
- [x] **Q-2. A write over the user's lists.** Answered (Tore, 2026-11-28): allowed after one
  confirmation, with the backup of FR-4. The way back is a fourth wave, Still water (Specchio
  d'acqua), which writes the backup and leaves customization to the user; it replaces the separate
  back button.
- [x] **Q-3. Empty `tabbar_before` for the Breaking wave.** Answered (Tore, 2026-11-28): keep a
  single `Spacer` ("uno spacer è gradito").
- [x] **Q-4. Vivaldi without these preferences.** Answered (Tore, 2026-11-28): as recommended; the
  module does not start and logs one warning (FR-9), and the wave section of the 075 page is absent.
- [x] **Q-5. Writes that persist without updating the UI.** Answered (Tore, 2026-11-28): as
  recommended. If AC-18 fails, stop and write a new draft that drives Vivaldi's own toolbar editor, as
  055 did for the web panel form.
- [x] **Q-6. The sidebar look rules.** Answered (Tore, 2026-11-28): `NewTab` and the flexible spacers
  must be present, so the earlier idea to keep hiding them was rejected. While a wave is active
  (Still water included), `sidebar-look.scss` stops hiding `.button-toolbar.newtab`, the flexible
  spacers and the nested buttons row, through a mark on the document set by `toolbar-waves`; its other
  look rules stay. 028 needs a revision note (a "Refined by" line and FR-6 text about the two new-tab
  entries), written with the design.
- [x] **Q-7. Module id and name.** Answered (Tore, 2026-11-28): id `toolbar-waves`, name "Toolbar
  waves".
- [x] **Q-8. Interplay with the compact tab bar.** Answered (Tore, 2026-11-28): as recommended; the
  compact bar of [032](../032-compact-tab-bar/spec.md) keeps its own rules and the live scenarios run
  with it off.
- [x] **Q-9. Before any wave is chosen.** Answered (Tore, 2026-11-28): the 028 hiding stays until a
  wave is chosen. With a wave active, Swell and Breaking wave show both the "+ New Tab" row and the
  `NewTab` button. `NewTab` is in every preset except Ripple (minimal, the row stays) and may be
  removed in Still water.

## References

- Probe of 2026-11-28 on a throwaway lab profile, Vivaldi 8.3.4191.47, with `npm run live -- --probe`.
- [Toolbar waves mockups](https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG).
- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md), [032 Compact tab bar](../032-compact-tab-bar/spec.md),
  [036 Module options](../036-module-options/spec.md), [037 Versioned storage](../037-versioned-storage/spec.md).
- [075 Settings page](../075-settings-page/spec.md): the page that shows the wave cards (Draft, in
  progress).
- [055 Tile web panel](../055-tile-web-panel/spec.md), question 1: a preference write that did not reach
  the interface.
- [059 Arc pinned tabs](../059-pinned-tabs-arc/spec.md) and [060 Clear bar](../060-clear-bar-and-pinned-unload/spec.md):
  the Arc footer this layout sits beside.
