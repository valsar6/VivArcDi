# 051 More Arc themes

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | Tore, 2026-11-20 |
| Implemented | 2026-11-20 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

[029](../029-arc-light-theme/spec.md) adds one theme, "VivArcDi Light". This spec adds four more and a
way to choose among them: two light ones with a soft gradient (pink and green) and two dark ones (a
purple-to-wine gradient and a flat near-black). They are inspired by the "Reflect Pink", "Reflect
Green", "ArcDark" and "ArcDarkPure" themes of the VivalArc project (Tore, 2026-11-19), drawn in
VivArcDi's own style, and VivalArc's authors are credited wherever the themes appear.

## User stories

- **US-1.** As a user, I want to pick the Arc theme I like (light, pink, green, dark, pure dark), so that Vivaldi matches my taste and the time of day.
- **US-2.** As a user, I want the tab bar gradient and the native Vivaldi theme to change together, so that I do not set two things.
- **US-3.** As a user, I want to see who inspired each theme, so that the original authors get credit.
- **US-4.** As a user, I want my previous theme back with one command, as with the light theme.

## Expected behavior

Seen in the VivalArc screenshots in `themes/theme_screenshots/` (Vivaldi on macOS), sampled on
2026-11-19. The values below are VivArcDi's own approximations, to be tuned in the design.

| Theme | id | Look | Window / gradient | Active pill | Ink |
|---|---|---|---|---|---|
| Light (029) | `vivarcdi-light` | coral to aqua | `#f3b8ac`, `#d0c9c5`, `#8ae3f2` at 135° | `#ffffff` | `#212121` |
| Pink | `vivarcdi-pink` | lavender to peach | `#d8b5dd`, `#ead0dd`, `#f7e4d6` at 180° | `#ffffff` | `#212121` |
| Green | `vivarcdi-green` | sage to pale green | `#a0c1c8`, `#b6d2d3`, `#d1ddd1` at 180° | `#ffffff` | `#212121` |
| Dark | `vivarcdi-dark` | purple to wine | `#2e1141`, `#501d3c`, `#5f243a` at 180° | `#672877` | `#f2f2f2` |
| Pure dark | `vivarcdi-pure-dark` | flat near-black | `#151515`, no gradient | `#323232` | `#f2f2f2` |

Every theme has the same shape as 029: the tab bar has no background of its own, rows sit on the
gradient, the page sits in a rounded frame (`#ffffff` on light themes, `#0e0e0e` on dark ones), and the
native Vivaldi theme makes menus, address field and panels follow (dark themes use a dark `colorBg`
and a light `colorFg`).

**Choosing.** `python3 installer theme list` prints the themes, in a fixed order (Light, Pink, Green,
Dark, Pure Dark), with their credit. `theme apply [--theme <id>]` always writes all five themes into
`Preferences` (added, or replaced if already there: an upsert) so the user can switch later in
Vivaldi's own theme settings, and selects the one named by `--theme` as the current theme (Tore,
2026-11-20). Without `--theme` it selects the light theme, so 029 keeps working unchanged. `theme
restore` selects the theme that was current before the first `apply` and removes every VivArcDi theme.

At the end of `install`, the installer writes all five themes and asks which one starts as current: the
list above, numbered, Enter for Light. `install --yes` selects Light without asking, `install --theme
<id>` answers the question, and `install --no-theme` writes and selects nothing.

**Automatically hide UI (F10).** Vivaldi's "Automatically hide UI" mode hides the tab bar, panel and
address bar until the pointer reaches the edge. The themes must hold there too (Tore, 2026-11-20): the
native theme colors the window and the revealed bars, and the gradient or flat color of the palette
paints the window and the page frame and the revealed tab bar, with the same ink and pill as when
the UI is shown. Nothing flashes white (or black) when the bars slide in or out.

**Credits.** VivalArc has no license file, so VivArcDi copies none of its theme files, pictures or
values: colors are read from the public screenshots and the themes are built from scratch, as in 029.
Credit is kept in four places: the `credit` field of each theme in `theme.json`, the output of `theme
list`, a "Themes" table in the README Credits section, and the references of this spec. The text is
"Inspired by <name> from VivalArc by tovifun".

## Requirements

### Functional

- **FR-1.** `theme.json` holds a list of themes, each with `id`, `name`, `credit` and the Vivaldi settings; the light theme keeps its id and values.
- **FR-2.** `theme apply` upserts all five themes, selects the one named by `--theme` (Light by default) and backs up `Preferences` once per run; an unknown id stops with the list of valid ids.
- **FR-3.** `theme list` prints each id, name and credit.
- **FR-4.** `theme restore` removes every VivArcDi theme and selects the one that was current before the first `apply`.
- **FR-5.** `Palettes` gains one palette per theme with the colors above (`arcpink`, `arcgreen`, `arcdark`, `arcdarkpure`); the gradient is optional, so pure dark is flat.
- **FR-6.** The theme that `apply` selects also selects its tab bar palette (mechanism in the design).
- **FR-8.** At the end of `install` the installer writes all five themes and asks which one starts as current; `--yes`, `--theme <id>` and `--no-theme` answer or skip the question.
- **FR-9.** The native theme and the palette apply while Vivaldi's Automatically hide UI mode is on, as when the UI is shown.
- **FR-7.** The README Credits section lists the themes and their inspiration.

### Non-functional

- **NFR-1.** Text keeps a contrast of at least 4.5:1 on every stop of every gradient and on every pill.
- **NFR-2.** Vivaldi must be closed for `theme apply` and `restore`, as in 029.
- **NFR-3.** macOS and Debian; no binary file (pictures, zips) is added to the repository.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN `theme apply --theme <id>` runs on a closed Vivaldi, THE installer SHALL add and select that theme after backing up `Preferences`. | auto: `applies the chosen theme with a backup` |
| AC-13 | WHEN `theme apply --theme <id>` runs, THE installer SHALL write all five themes and select only the one named. | auto: `installs all themes and selects the chosen one` |
| AC-14 | WHEN a chosen theme is already in `Preferences`, THE installer SHALL replace it and not duplicate it. | auto: `upserts a theme that is already installed` |
| AC-15 | WHEN `install` ends interactively, THE installer SHALL write all five themes and ask which one starts as current; WITH `--no-theme` it SHALL not ask. | auto: `install asks which theme starts as current` |
| AC-16 | WHILE Automatically hide UI is on, THE palette variables and gradient SHALL stay set on the window and the revealed tab bar. | auto: `palette stays applied with the ui hidden` |
| AC-17 | WHEN Tore turns Automatically hide UI on (F10) with each theme and moves the pointer to the edges, THE window, the page frame and the revealed bars SHALL show the theme, with no white or black flash. | manual |
| AC-2 | WHEN `theme apply` runs without `--theme`, THE installer SHALL apply "VivArcDi Light". | auto: `applies the light theme by default` |
| AC-3 | IF the id given to `--theme` is unknown, THEN THE installer SHALL stop, write nothing and list the valid ids. | auto: `refuses an unknown theme id` |
| AC-4 | WHEN `theme list` runs, THE installer SHALL print the id, name and credit of every theme. | auto: `lists the themes with their credit` |
| AC-5 | THE credit of every theme in `theme.json` SHALL name VivalArc and tovifun. | auto: `every theme credits vivalarc` |
| AC-6 | WHEN `theme restore` runs after switching between themes, THE theme current before the first `apply` SHALL be selected and every VivArcDi theme removed. | auto: `restores the theme from before the first apply` |
| AC-7 | IF Vivaldi is running, THEN `theme apply --theme <id>` SHALL stop and say so. | auto: `refuses to change the theme while vivaldi runs` |
| AC-8 | THE palettes of the new themes SHALL keep ink contrast of at least 4.5:1 on every stop and on the pill. | auto: `arc theme palettes keep readable text` |
| AC-9 | WHEN a theme is selected by `apply`, THE matching palette SHALL be the one `sidebar-look` uses. | auto: `theme apply selects the matching palette` |
| AC-10 | THE README Credits section SHALL list each theme with its inspiration and the authors' link. | auto: `readme credits the vivalarc themes` |
| AC-11 | WHEN Tore applies each theme and restarts Vivaldi, menus, address field, panels and the tab bar SHALL match the table (light or dark, with the stated gradient). | manual |
| AC-12 | WHEN Tore runs `theme restore`, his previous theme SHALL be back after a restart. | manual |

## Out of scope

- Copying or importing VivalArc's theme files, pictures or exact values (no license; see Expected behavior).
- The other VivalArc themes (Blue, Purple, PurpleVibrant, the Dark variants, gradient Light ones): a later spec if Tore wants them.
- Automatic switching between a light and a dark theme with the system appearance.
- Background pictures, and a color per workspace ([019](../019-space-theme-color/spec.md)).
- A theme picker inside Vivaldi's UI.

## Open questions

- [x] Scope: pink, green, dark and pure dark, next to light (Tore, 2026-11-19).
- [x] Names and ids: "VivArcDi Pink / Green / Dark / Pure Dark" (Tore, 2026-11-19).
- [x] The installer writes the themes (upsert) and selects one as the current theme (Tore, 2026-11-19).
- [x] Credits are enough; no request to the VivalArc author, since the themes are already in the community's hands (Tore, 2026-11-19).
- [x] `install` writes all five themes and asks which one starts as current (Tore, 2026-11-20, replaces the choice of several).
- [x] The payload reads the current theme at runtime and follows its changes; the design confirms the preference is readable in T1 (Tore, 2026-11-20, design proposal).
- [ ] Which Vivaldi elements and selectors carry the window and the bars while the UI is hidden (FR-9): found with `npm run live -- --probe` in T1; the design lists them in `src/selectors/`.

## References

- VivalArc themes: https://github.com/tovifun/VivalArc/tree/main/themes and `theme_screenshots/` (`vivalarc_reflect_pink.jpg`, `vivalarc_reflect_green.jpg`, `theme_arcdark.jpg`, `theme_arcdark_pure.jpg`), consulted 2026-11-19; the zip files (Green, Pink, ArcDark, ArcDarkPure) were not opened and nothing was copied.
- Specs [019](../019-space-theme-color/spec.md), [028](../028-arc-sidebar-look/spec.md), [029](../029-arc-light-theme/spec.md).
