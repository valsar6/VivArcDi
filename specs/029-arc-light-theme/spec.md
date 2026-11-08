# 029 Arc Light theme

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | Tore, 2026-11-08 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

[028](../028-arc-sidebar-look/spec.md) colors the tab bar, but the rest of Vivaldi (address field,
menus, panels, settings, the frame around the page) still follows the user's Vivaldi theme. Tore wants
a theme that makes all of Vivaldi look like Arc, inspired by the "ArcLight" theme of the VivalArc
project (Tore, 2026-11-08). This spec adds a light Arc theme made of two parts: a native Vivaldi theme
that the installer adds and selects, and a gradient behind the tab bar and the page frame drawn by the
stylesheet of 028.

## User stories

- **US-1.** As a user, I want one command to give Vivaldi an Arc-like light theme, so that menus, panels and fields match the tab bar.
- **US-2.** As a user, I want the window behind the tab bar and around the page to show a soft two-color gradient, as in Arc.
- **US-3.** As a user, I want my previous theme back with one command.

## Expected behavior

Seen in the VivalArc screenshot `themes/theme_screenshots/theme_arclight.jpg` (Vivaldi with ArcLight on
macOS): the whole window is a diagonal gradient, warm coral at the top left, pale grey in the middle,
light aqua at the bottom right. The tab bar has no background of its own: rows sit on the gradient, the
active tab is a white pill with radius about 10 px, separators are thin light lines. The page sits in a
white frame with radius about 14 px and a few pixels of gradient around it. Text is dark grey
(`#212121`). The window buttons, the space name and the bottom icons sit on the gradient too.

VivalArc ships ArcLight as a Vivaldi theme file (settings and a background picture). The VivalArc
repository has no license file, so VivArcDi copies neither the file nor the picture: it builds its own
theme with similar values and draws the gradient in CSS.

**Native theme "VivArcDi Light".** `python3 installer theme apply` (Vivaldi closed, like
`shortcuts apply` of [014](../014-arc-shortcuts/spec.md)) backs up `Preferences`, adds a user theme and
selects it:

| Setting | Value |
|---|---|
| Background (`colorBg`) | `#ffffff` |
| Foreground (`colorFg`) | `#212121` |
| Accent (`colorAccentBg`) | `#ffffff` |
| Highlight (`colorHighlightBg`) | `#4c7fd9` |
| Window (`colorWindowBg`) | `#c9d8dc` |
| Corner radius | 14 |
| Transparent tab bar and tabs | on |
| Simple scrollbars | on |
| Accent from page | off |

`theme restore` puts back the saved theme selection; `theme apply --dry-run` lists the changes. At the
end of `install`, the installer asks "Apply the VivArcDi Light theme? [Y/n]" and runs `theme apply` on
yes (Tore, 2026-11-08); `install --yes` applies it without asking, `install --no-theme` skips it.

**Gradient.** `arclight` becomes the default palette of 028 (Tore, 2026-11-08; change request to 028).
With the theme of 028 on and the palette `arclight`, the stylesheet paints
`#browser` with a linear gradient at 135 degrees from `#f3b8ac` (coral) through `#d0c9c5` to `#8ae3f2`
(aqua), makes the tab bar transparent, and keeps rows, hover and active pill of 028 (pill `#ffffff`,
text `#212121`). The page frame shows the gradient through Vivaldi's own frame of the native theme.

## Requirements

### Functional

- **FR-1.** `theme apply` adds the user theme "VivArcDi Light" with the values above to each profile's
  `Preferences`, selects it, and keeps one backup per run; `--dry-run` writes nothing.
- **FR-2.** `theme restore` selects the theme that was current before the first `apply` and removes "VivArcDi Light".
- **FR-3.** At the end of `install` the installer asks whether to apply the theme (default yes); `--yes` applies it, `--no-theme` skips it.
- **FR-4.** Palette `arclight` in `Palettes` (028) has a gradient (three stops, 135°), pill `#ffffff`, ink `#212121`, and is the default palette.
- **FR-5.** With `arclight`, the tab bar and the window behind the page show the gradient; rows keep 028's sizes and states.

### Non-functional

- **NFR-1.** Text keeps a contrast of at least 4.5:1 on every stop of the gradient and on the pill.
- **NFR-2.** Vivaldi must be closed for `theme apply` and `restore`, as for `shortcuts`.
- **NFR-3.** macOS and Debian.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN `theme apply` runs on a closed Vivaldi, THE installer SHALL add and select "VivArcDi Light" after backing up `Preferences`. | auto: `applies the arc light theme with a backup` |
| AC-2 | WHEN `theme apply --dry-run` runs, THE installer SHALL list the changes and write nothing. | auto: `dry run of the theme writes nothing` |
| AC-3 | WHEN `theme restore` runs, THE previous theme SHALL be selected and "VivArcDi Light" removed. | auto: `restores the previous theme` |
| AC-4 | IF Vivaldi is running, THEN `theme apply` SHALL stop and say so. | auto: `refuses to change the theme while vivaldi runs` |
| AC-5 | THE `arclight` palette SHALL keep ink contrast of at least 4.5:1 on every stop and on the pill. | auto: `arclight palette keeps readable text` |
| AC-6 | WHEN Tore runs `theme apply` and restarts Vivaldi, menus, address field and panels SHALL be light with dark text. | manual |
| AC-8 | WHEN `install` ends and the user answers yes, THE installer SHALL run `theme apply`; WITH `--no-theme` it SHALL not ask. | auto: `install offers the arc light theme` |
| AC-9 | WHILE no palette is configured, THE sidebar look SHALL use `arclight`. | auto: `uses the arclight palette by default` |
| AC-7 | WHILE the palette is `arclight`, THE tab bar and the window around the page SHALL show the coral-to-aqua gradient. | manual |

## Out of scope

- A dark Arc theme ("ArcDark"): a later spec if Tore wants it.
- A different gradient per workspace: [019](../019-space-theme-color/spec.md).
- Background pictures.

## Open questions

- [x] `arclight` replaces `sky` as the default palette (Tore, 2026-11-08).
- [x] `install` asks at the end whether to apply the theme (Tore, 2026-11-08: "in generale sì").
- [x] Highlight: the proposed blue `#4c7fd9` (Tore, 2026-11-08).

## References

- VivalArc themes: https://github.com/tovifun/VivalArc/tree/main/themes (ArcLight screenshot), consulted 2026-11-08; no files copied.
- Specs [014](../014-arc-shortcuts/spec.md) (Preferences backup and restore), [019](../019-space-theme-color/spec.md), [028](../028-arc-sidebar-look/spec.md).
