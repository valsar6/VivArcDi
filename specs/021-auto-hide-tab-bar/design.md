# 021 Auto-hide tab bar: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-08; design approved by Tore on 2026-11-09, with the decisions on the open questions as written here. It says **how**; the spec says **what**.

## Approach

Vivaldi already hides and shows the tab bar (probe of 2026-11-09), so VivArcDi turns that on and tunes it.
Two parts, kept apart: the installer sets the preference (FR-1, FR-3), a stylesheet tunes the overlay and
the panel bar (FR-2, FR-4).

1. **Preference.** The key is `vivaldi.auto_hide.tab_bar` (probe of 2026-11-09), written as `true` in the `options` object of
   `installer/vivarcdi/shortcuts.json` (the same data file, atomic write, backup and refusal-while-running as 014), so
   `shortcuts apply` covers it (AC-4). Only this key is written: choosing the "auto-hide" layout in Vivaldi rewrites about
   twenty preferences, which VivArcDi does not want to own. Task T1 checks that the key alone gives the native behavior
   and what Cmd/Ctrl+S does then; if it does not, the design falls back to `vivaldi.prefs.set` from the mod or to the full layout.
2. **Disabled.** `auto-hide.enabled` false in `config.json` makes `ShortcutTable` drop the auto-hide option
   from the table, so the profile value stays (AC-5). The installer already reads `config.json` for module options.
3. **Overlay tuning.** `styles/tab-bar-tuning.css` (from `tab-bar-tuning.scss`) styles
   `div.auto-hide-wrapper.left.has-tabbar` with CSS variables: `--vivarcdi-bar-width`, `--vivarcdi-bar-delay` (transition
   delay) and `--vivarcdi-bar-shadow`. A small module, `tab-bar-tuning`, writes the three variables from its
   options on `#browser`, like `ActivationMarker` writes its mark. The selector comes from the catalog
   (`autoHideWrapper`), not from the stylesheet text.
4. **Panel bar (FR-4).** The module sets `data-vivarcdi-bar-hidden` on `#browser` when the wrapper is parked off screen
   (a `MutationObserver` on its `style` and class, no polling). With `panel-bar.hideWithTabBar` true, the stylesheet
   sets `visibility: hidden` and `pointer-events: none` on the panel bar under that mark and removes it with the
   mark when the tab bar shows. The panel bar keeps its size, so the page does not move (AC-3).

Rejected: an own edge watcher with `mousemove` (the native behavior is enough and Tore finds it almost perfect);
hiding the panel bar with `display: none` (it would make the page jump).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `installer/vivarcdi/shortcuts.json` | The auto-hide option next to the shortcuts | Data |
| `installer/vivarcdi/shortcuts.py` `ShortcutTable` | Leaves the option out when `auto-hide.enabled` is false | Factory |
| `src/modules/tabbartuning/TabBarTuning.ts` | Writes the variables and the hidden mark | Module |
| `src/modules/tabbartuning/BarHiddenWatcher.ts` | Tells when the wrapper is off screen | Observer |
| `src/styles/tab-bar-tuning.scss` | Overlay and panel bar rules | |

## Vivaldi interface

Selectors added to `src/selectors/8.1.json`: `autoHideWrapper` (`div.auto-hide-wrapper.left`), `panelBar`.
Mark: `data-vivarcdi-bar-hidden` on `#browser`. If a selector no longer matches, the native behavior stays and
only the tuning is lost.

## Configuration

`config.json`: `auto-hide.enabled` true; `tab-bar-tuning` with `width` 268, `hideDelayMs` 150, `shadow` true;
`panel-bar.hideWithTabBar` true.

## Risks

| Risk | Mitigation |
|---|---|
| The key alone does not give the native behavior, or Cmd/Ctrl+S stops working | T1 probe first; on a miss the design returns to Tore |
| The wrapper is hidden by another transform in a future Vivaldi | The watcher reads the bounding box, not a class; a miss leaves the panel bar visible |
| Vivaldi Sync restores the old preference | Same note as 014 after `apply` |
