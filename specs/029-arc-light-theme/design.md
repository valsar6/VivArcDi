# 029 Arc Light theme: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

## Approach

Two independent parts, each built on code that already exists.

**Native theme (installer, Python).** A `ThemeService` mirrors `ShortcutService` of 014: it finds the
profiles with `ProfileLocator`, refuses to run while Vivaldi runs (`ProcessGuard`), saves
`Preferences` with `PreferencesBackupStore` once per run, and edits the JSON through
`PreferencesDocument`. The theme values live in a data file, `installer/vivarcdi/theme.json`, like
`shortcuts.json`, so they are not repeated in code. `apply` adds the theme to the list of user themes
under a fixed id (`vivarcdi-light`), replaces it if it is already there, remembers the id of the
current theme in VivArcDi's own key, and selects `vivarcdi-light`. `restore` selects the remembered
theme and removes `vivarcdi-light`; it does not restore the whole `Preferences` file, so settings the
user changed after `apply` are kept.

**Gradient (stylesheet, TypeScript).** `Palettes` gains an optional gradient: three stops and an
angle. `arclight` is the only palette with one and becomes the default of `sidebar-look`
(`config.json`, `SidebarLook.defaults`). The module writes `--vivarcdi-gradient` next to the three
colors of 028; `sidebar-look.scss` paints `#browser` with it when it is set and makes the tab bar
background transparent, so the gradient shows behind the rows and around the page. Without a gradient
the flat `--vivarcdi-space` of 028 stays.

**Install prompt.** `InstallCommand` asks at the end, through `Reporter`, "Apply the VivArcDi Light
theme? [Y/n]" and calls `ThemeService.apply` on yes. `--yes` answers yes, `--no-theme` skips the
question; in `--background` (update hook) and non-interactive modes it never asks.

Rejected:

- Shipping a Vivaldi theme file (`.zip`) for the user to import by hand: one more manual step, and
  Vivaldi asks for confirmation for each import.
- A background picture for the gradient: CSS draws the same thing without a binary file and follows
  019's colors later.
- Restoring the whole `Preferences` backup on `theme restore`: it would also undo the user's later
  changes; the backup stays as a safety net.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `installer/vivarcdi/theme.json` | Values of "VivArcDi Light" | Data file |
| `installer/vivarcdi/theme.py` | `ThemeService`: apply, restore, status, dry run | Service, same shape as `ShortcutService` |
| `installer/vivarcdi/commands.py` | `ThemeCommand` (`theme apply|restore|status`), install prompt | Command |
| `installer/vivarcdi/cli.py` | `theme` subcommand, `--dry-run`, `install --yes`, `install --no-theme` | – |
| `src/modules/sidebarlook/Palettes.ts` | `arclight` with gradient stops and angle | Value object |
| `src/modules/sidebarlook/SidebarLook.ts` | Writes `--vivarcdi-gradient`; default palette `arclight` | – |
| `src/styles/sidebar-look.scss`, `_tokens.scss` | Gradient on `#browser`, transparent tab bar | – |

## Vivaldi interface

`Preferences` keys, to be confirmed on Tore's Vivaldi 8.2 with T1 before writing:

| Key | Use |
|---|---|
| `vivaldi.themes.user` | List of user themes; "VivArcDi Light" is added with id `vivarcdi-light` |
| `vivaldi.themes.current` | Id of the selected theme |
| `vivarcdi.theme.previous` | VivArcDi's own key: the id selected before `apply` |

Theme fields used: `id`, `name`, `colorBg`, `colorFg`, `colorAccentBg`, `colorHighlightBg`,
`colorWindowBg`, `radius`, `transparencyTabBar`, `transparencyTabs`, `simpleScrollbar`,
`accentFromPage`, `engineVersion`, `version`.

## Configuration

`sidebar-look.palette` default changes from `sky` to `arclight`. No other option.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi 8.2 stores themes under other keys, or a schedule (light/dark) overrides `current` | T1: Tore runs `python3 installer theme status --keys`, which prints only the theme key names and ids; the design is corrected before T3 |
| Vivaldi Sync brings the old theme back | Same note as `shortcuts` (014): printed after `apply` |
| Gradient under Vivaldi's transparent tab bar shows twice or not at all | Manual checks AC-6, AC-7; the tab bar background is set only under the look |
| User answers the prompt by mistake | `theme restore` brings the previous theme back |
