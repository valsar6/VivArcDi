# 019 Space theme color

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Each Arc space has its own color: the tab bar, the bottom bar and the frame around the page take it, so
the user sees which space is active without reading its name. Tore wants the same choice in Vivaldi: a
color picker per workspace, as in Arc's "Edit Theme Color" (Tore's recording
`Registrazione schermo 2026-11-08 alle 16.39.23.mov` and screenshot of the same day). This spec
replaces the "Color per space, chosen from a menu" item that [011](../011-space-header/spec.md) left out of scope.

## User stories

- **US-1.** As a user, I want to choose a color for each workspace, so that I know where I am at a glance.
- **US-2.** As a user, I want the color to change as I switch workspace, so that I do not have to apply it by hand.
- **US-3.** As a user, I want to pick the color with a picker like Arc's, not by editing `config.json`.

## Expected behavior

Seen in the recording (26 seconds): with the pointer on the tab bar of the space "Riposino", a right
click opens a menu with these items: Change Space Icon…, Rename Space…, **Edit Theme Color…**, Set
Profile, New Folder, Live Folders, Share Space…, Export "Riposino" into Folder, Manage Spaces…, Delete
Space. "Edit Theme Color…" opens a small panel beside the tab bar, with:

1. Three mode buttons on top: automatic (sparkles), light (sun) and dark (moon). They set whether the
   tab bar and the panel itself use a light or a dark variant of the color.
2. A square area with a round handle. Dragging the handle changes the color live; the tab bar, the
   frame around the page and the bottom bar change while the handle moves. Two buttons, "−" and "+",
   sit at the bottom of the area.
3. A row of nine preset swatches (white, pink, purple, red, orange, yellow, green, blue, indigo), with
   arrows for more.
4. A slider drawn as a wave and a round dial with a notch, both at the bottom. The slider sets the
   intensity of the color and the dial sets the grain (Tore, 2026-11-08).

Closing the panel (click outside) keeps the color. Each space keeps its own color: switching to
another space shows its color at once. A space that never got a color keeps Vivaldi's theme.

In VivArcDi: the menu item sits in the context menu of the space header (011); the panel is drawn by
VivArcDi in the style of the folder panel of [008](../008-folder-hover-preview/spec.md); the color is
applied to the vertical tab bar, the bottom bar and the frame of the page area through CSS variables;
colors are kept in the shared `chrome.storage.local` store, keyed by workspace id.

## Requirements

### Functional

- **FR-1.** A `space-theme` module adds "Edit Theme Color…" to the context menu of the space header.
- **FR-2.** The panel offers the three modes, the color area with "−" and "+", nine presets and the two
  strength controls, and applies each change live.
- **FR-3.** The color is stored per workspace id in `chrome.storage.local` and survives restarts.
- **FR-4.** When the active workspace changes, the module applies the color of the new workspace within
  300 ms; a workspace without a color has VivArcDi's variables removed.
- **FR-5.** The module uses only CSS variables and a background layer: no Vivaldi theme is edited, so
  removing the module restores the user's theme.
- **FR-6.** Text and icons on the colored bar keep a readable contrast in both modes.

### Non-functional

- **NFR-1.** Dragging the handle never drops frames on a 60 Hz display.
- **NFR-2.** The module is off when `space-theme.enabled` is false in `config.json`.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user chooses "Edit Theme Color…", THE panel SHALL open beside the tab bar. | manual |
| AC-2 | WHEN the handle moves, THE tab bar, the bottom bar and the page frame SHALL change color live. | manual |
| AC-3 | WHEN the user clicks a preset, THE handle SHALL jump to it and the colors SHALL follow. | manual |
| AC-4 | WHEN the user switches workspace, THE module SHALL apply that workspace's color. | manual |
| AC-5 | WHEN Vivaldi restarts, THE colors SHALL be as before. | manual |
| AC-6 | THE module SHALL store one color per workspace id. | auto: `stores one color per workspace` |
| AC-7 | WHEN a color is chosen, THE text color SHALL be picked so that contrast is at least 4.5:1. | auto: `picks a readable text color` |
| AC-8 | WHERE `space-theme.enabled` is false, THE module SHALL change nothing. | auto: `disabled module changes nothing` |

## Out of scope

- Per-space profiles ("Set Profile"), sharing a space and exporting it into a folder.
- Background images and gradients between two colors.

## Open questions

- [x] Wave slider = intensity, dial = grain, both from 0 to 100: yes (Tore, 2026-11-08).
- [ ] Does the color also tint the page frame in Vivaldi 8.2, or only the tab bar? To check with the probe.
- [x] Does Vivaldi 8.2 tie a theme to a workspace natively? No. Probe on Vivaldi 8.2 macOS (Tore, 2026-11-08):
  editing a workspace offers only the name, a choice of icon or emoji (20 icons) and the Done button. The
  color is therefore kept entirely by VivArcDi (FR-3) and applied through CSS variables (FR-5).
- [x] Can VivArcDi read the colors of the active Vivaldi theme? Yes. Probe on Vivaldi 8.2 macOS (Tore,
  2026-11-08): `vivaldi.themes.current` is the id of the active theme and `vivaldi.themes.user` is a list of
  themes with `colorBg`, `colorFg`, `colorHighlightBg`, `colorAccentBg`, `colorWindowBg`, `alpha`, `blur`,
  `contrast`, `radius`, `transparencyTabBar` and `transparencyTabs`. Themes are global, and
  `vivaldi.workspaces.list` holds only the id, name and icon of a workspace. `vivaldi.prefs` offers `get`, `set`
  and `onChanged`, so a mod can read and write both prefs.
- [x] How is the color applied? Option (a), override the interface CSS variables. Probe on Vivaldi 8.2 macOS
  (Tore, 2026-11-09): Vivaldi writes the color variables (`--colorFg`, `--colorFgIntense`, `--colorFgFaded`,
  `--colorFgFadedMore`, `--colorFgFadedMost`, `--colorBg`, `--colorBgDark`, `--colorBgLight`, `--colorHighlightBg`,
  `--colorAccentBg`) as inline style on `div#browser`, inherited by `div#main` and everything below; they are empty on
  `html`, `body` and `div#app`. The active theme is also a class of `#browser` (`theme-id-<id>`, `theme-light` or
  `theme-dark`, `acc-dark`). Setting `--colorHighlightBg` on `#browser` from a mod changed the computed value, so an
  override works. Design decision: the module sets a mark on `#browser` and ships a stylesheet whose rules for that
  mark set the variables with `!important`, which wins over Vivaldi's inline values without rewriting them, so a
  theme or workspace change by Vivaldi does not undo it and the module only changes the variable values of its own
  rule. Option (b), a user theme per workspace, is dropped. Still to check in the design phase: that Vivaldi does not
  rewrite the inline style in a way that defeats `!important` (it cannot, by CSS rules) and that the tab bar and the
  page frame both follow the variables (see the first open question).
- [ ] Grain and the wave slider have no native equivalent in Vivaldi: they are drawn by VivArcDi as a noise
  layer over the bar.

## References

- Project files: `spaces/analisi-spaces-arc.md` (B11, Q4) and `video-arc/gap-list-arc-consolidata.md` (G1).
- Specs [011](../011-space-header/spec.md), [012](../012-editable-folders/spec.md).
