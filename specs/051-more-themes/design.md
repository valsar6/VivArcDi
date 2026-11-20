# 051 More Arc themes: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

Two parts, as in [029](../029-arc-light-theme/design.md), each extended rather than rewritten.

**Native themes (installer, Python).** `theme.json` becomes a catalog: an ordered list of five
themes, each with `id`, `name`, `credit` and the Vivaldi settings. `ThemeCatalog` loads it and
answers `get(id)`, `ids` and `settings(id)`; `settings` drops `credit`, which is not a Vivaldi
field, so only real settings reach `Preferences`. `ThemeService.apply(theme_id)` upserts all five
themes (replace by id, never duplicate), remembers the previous current theme once under
`vivarcdi.theme.previous`, and selects `theme_id`. `restore` removes every id of the catalog and
selects the remembered theme, as in 029. An unknown id stops before any profile is read. `list`
prints id, name and credit.

**Palettes and the follow (payload, TypeScript).** `Palettes` gains four palettes (`arcpink`,
`arcgreen`, `arcdark`, `arcdarkpure`); `arcdarkpure` has no gradient, the optional field of 029. A new
`ThemePalettes` value object maps a Vivaldi theme id to a palette name (`vivarcdi-light` to
`arclight`, `vivarcdi-pink` to `arcpink`, and so on). `SidebarLook` reads `vivaldi.themes.current`
through `context.prefs`: if the id is one of VivArcDi's, that palette is painted; otherwise the
`palette` option applies, which keeps 029/AC-9 (no VivArcDi theme selected: `arclight`). When
`prefs.canFollow`, a change of the preference repaints, so choosing a theme in Vivaldi's own settings
changes the tab bar at once; without it the palette is read once at start. The installer never
writes into the payload's `config.json`, so an update does not undo the choice.

**Hidden UI (F10).** The palette variables and the gradient sit on `#browser`, which also exists
while the UI is hidden. Under 029 the stylesheet makes only the tab bar and the panels transparent in
gradient mode; the bars that slide in (`.auto-hide-wrapper`) keep their own background, and Vivaldi
may rewrite attributes of `#browser` when the mode toggles. The design therefore adds two things,
both confirmed by the probe of T1 before they are written:

- the stylesheet makes the revealed wrappers transparent in gradient mode, or gives them the space
  color in flat mode, with the same ink and pill;
- `LookMarks` re-applies the marks and the variables when a `MutationObserver` on `#browser` sees them
  removed, so a Vivaldi redraw cannot strip the look. It is the only observer and it stops with the
  module.

**Install prompt.** `InstallCommand` writes all five themes and asks "Which theme should Vivaldi start
with?" through `Reporter`, with a numbered list and Enter for Light. `--yes` answers Light, `--theme <id>`
answers with that id, `--no-theme` skips both writing and asking. The update hook (`--background`) and
non-interactive runs never ask and never write. 029's question "Apply the VivArcDi Light theme?" is
replaced by this one; the 029 test is adapted in T7.

Rejected:

- Writing `sidebar-look.palette` into the installed `config.json` from `theme apply`: an update
  overwrites it, and a theme chosen later in Vivaldi would not move the tab bar.
- Importing the VivalArc theme files or pictures: no license (spec, Expected behavior).
- One theme file per theme: five files for one list, and the order and the credit belong together.
- Switching light and dark with the system appearance: out of scope.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `installer/vivarcdi/theme.json` | Ordered list of the five themes with `credit` | Data file |
| `installer/vivarcdi/theme.py` | `ThemeCatalog` and `ThemeService`: `apply(theme_id)`, `restore`, `status`, `list` | Service |
| `installer/vivarcdi/commands.py`, `cli.py` | `theme list`, `theme apply --theme`, `install --theme`, the question at the end of `install` | Command |
| `src/modules/sidebarlook/Palettes.ts` | Four new palettes, `arcdarkpure` flat | Value object |
| `src/modules/sidebarlook/ThemePalettes.ts` | Vivaldi theme id to palette name | Value object |
| `src/modules/sidebarlook/SidebarLook.ts` | Chooses the palette from the current theme, follows its changes | Module |
| `src/modules/sidebarlook/LookMarks.ts` | Applies, re-applies and removes the marks and variables (moved out of `SidebarLook`) | Class with one reason to change |
| `src/styles/sidebar-look.scss`, `_tokens.scss` | Dark tokens, revealed bars in hidden UI | – |
| `README.md` | Option table and a "Themes" table in Credits | – |

## Theme values

Approximations read from the screenshots, to be tuned on a real Vivaldi in T8. Common to all five:
`radius` 14, `transparencyTabBar` and `transparencyTabs` on, `simpleScrollbar` on, `accentFromPage`
off, `version` 1, `engineVersion` 1.

| id | `colorBg` | `colorFg` | `colorAccentBg` | `colorHighlightBg` | `colorWindowBg` |
|---|---|---|---|---|---|
| `vivarcdi-light` | `#ffffff` | `#212121` | `#ffffff` | `#4c7fd9` | `#c9d8dc` |
| `vivarcdi-pink` | `#ffffff` | `#212121` | `#ffffff` | `#a35fc0` | `#d8b5dd` |
| `vivarcdi-green` | `#ffffff` | `#212121` | `#ffffff` | `#3f8f8a` | `#a0c1c8` |
| `vivarcdi-dark` | `#1e1224` | `#f2f2f2` | `#672877` | `#b46ad0` | `#2e1141` |
| `vivarcdi-pure-dark` | `#151515` | `#f2f2f2` | `#323232` | `#7a9be0` | `#151515` |

Credit text for the four new themes: "Inspired by Reflect Pink from VivalArc by tovifun", "…Reflect
Green…", "…ArcDark…", "…ArcDarkPure…"; Light keeps "…ArcLight…" (029).

## Vivaldi interface

| Item | Use | Fallback |
|---|---|---|
| `Preferences` `vivaldi.themes.user`, `vivaldi.themes.current` | Written by the installer, as in 029 | `theme status --keys` (029/T1) |
| `vivaldi.prefs.get('vivaldi.themes.current')` and `onChanged` | Read by `SidebarLook` to pick and follow the palette | `prefs.available` false: the `palette` option applies, with a warning in the log |
| `#browser` marks and variables | Gradient and palette, also in hidden UI | `LookMarks` re-applies them |
| `.auto-hide-wrapper` (and the other bars of hidden UI) | Made transparent or colored by the stylesheet | Found by the probe of T1; added to `src/selectors/8.1.json` and `tests/live/selector-states.json` |

## Configuration

No new option. `sidebar-look.palette` keeps its default `arclight` and its meaning: the palette used
while no VivArcDi theme is selected. Its choices grow by the four new names. The README documents
that a selected VivArcDi theme wins over `palette`.

## Risks

| Risk | Mitigation |
|---|---|
| `vivaldi.themes.current` cannot be read or followed from the window | T1 probe before T4; if so, the follow is dropped and the installer writes the palette into the config (palette stays chosen at install), spec 051 is updated and approved again |
| Hidden UI uses elements the probe did not see, or a theme flashes when bars slide | T1 lists the elements while F10 is on; AC-17 is checked by Tore with each theme |
| Vivaldi rewrites `#browser` and removes the marks | `LookMarks` with its observer; AC-16 test |
| Vivaldi Sync brings an older theme list back | Same sync note as 029, printed after `apply` |
| Dark text-on-pill or highlight contrasts are weak | AC-8 test on every stop and pill; highlight colors tuned in T8 |
| The sampled colors differ from what a user expects of "Pink" | They are VivArcDi's own; tuning is a value change in `theme.json` and `Palettes.ts` |
