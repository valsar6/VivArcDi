# 021 Auto-hide tab bar

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-08 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc's vertical sidebar can be hidden to give the page the whole width and shows again when the pointer touches the left edge of the window (the student video 02:14-03:05 and the review that uses Cmd+S). A probe on Vivaldi 8.2 macOS (Tore, 2026-11-09) found that Vivaldi's own auto-hide already does this and that Tore finds it "almost perfect". The spec is therefore reduced: VivArcDi turns the native behavior on and tunes it, instead of building its own edge watcher. Cmd/Ctrl+S is already bound to Vivaldi's Tab Bar toggle by [014](../014-arc-shortcuts/spec.md).

## User stories

- **US-1.** As a user, I want the tab bar to hide, so that the page uses the full width.
- **US-2.** As a user, I want it to come back when I move the pointer to the left edge, so that I do not need the shortcut.

## Expected behavior

With auto-hide on, the tab bar slides out of view and the page uses the full width. Moving the pointer to the left edge of the window slides the bar back over the page, and moving the pointer away hides it again. Cmd/Ctrl+S toggles the bar, as set by 014.

What the probe saw: the left bar is the element `div.auto-hide-wrapper.left.has-tabbar`, 268 px wide, parked off screen at x = -274 while hidden; `mousemove` events at x between 0 and 5 reach the Vivaldi window, so the edge can be reached by a mod; Cmd+S never reaches the page because Vivaldi handles it itself.

In VivArcDi: the installer or a module turns on Vivaldi's auto-hide for the tab bar, and a small CSS file adjusts what Tore finds missing in the "almost" (width, delay, shadow). Nothing is drawn or watched by VivArcDi unless the native behavior proves not enough.

## Requirements

### Functional

- **FR-1.** VivArcDi sets Vivaldi's auto-hide for the vertical tab bar as part of the Arc shortcuts (014), when the user runs the installer's shortcut step.
- **FR-2.** A `tab-bar-tuning` stylesheet adjusts the overlay of the hidden bar, using the settings `width`, `hideDelayMs` and `shadow` in `config.json`.
- **FR-3.** `auto-hide.enabled` false in `config.json` leaves Vivaldi's setting untouched.
- **FR-4.** WHERE `panel-bar.hideWithTabBar` is true, the stylesheet hides the buttons of the panel bar while the
  tab bar is hidden, so no icon shows at the left edge (proposed, see the open questions).

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the tab bar is hidden and the pointer rests on the left edge, THE bar SHALL show over the page. | manual |
| AC-2 | WHEN the pointer leaves the bar, THE bar SHALL hide again. | manual |
| AC-3 | WHILE the bar is shown over the page, THE page SHALL not move. | manual |
| AC-4 | WHEN the user runs the shortcut step, THE installer SHALL turn on auto-hide in `Preferences`. | auto: `test_auto_hide_is_turned_on` |
| AC-5 | WHERE `auto-hide.enabled` is false, THE installer SHALL leave the setting unchanged. | auto: `test_auto_hide_is_left_alone_when_disabled` |
| AC-6 | WHEN the pointer reaches the left edge while the tab bar is hidden, THE panel bar buttons SHALL not appear before the tab bar. | manual |

## Out of scope

- Hiding the bar itself: native toggle, Cmd/Ctrl+S (014).
- A VivArcDi edge watcher: only if the native behavior proves not enough.
- Right-side or top bar.

## Open questions

- [x] Does a mod reach the left edge? Yes: `mousemove` at x = 0 to 5 arrives on `div#browser` (probe, Tore, 2026-11-09).
- [x] Does Cmd/Ctrl+S reach the page? No, Vivaldi handles it (probe, Tore, 2026-11-09), in line with 014.
- [x] What is the preference that turns on Vivaldi's auto-hide for the tab bar? `vivaldi.auto_hide.enabled`, a boolean
  (probe, Tore, 2026-11-09: `vivaldi.prefs.onChanged` fired for it when he changed the setting; a diff of the `Preferences`
  file missed it because Vivaldi writes the file late). The state also shows as the class `auto-hide-on` or `auto-hide-off`
  on `div#browser`. The installer writes it with Vivaldi closed, like the shortcuts; the design may also set it from the
  mod with `vivaldi.prefs.set`.
- [x] What is missing from the "almost perfect"? Recording of Tore, 2026-11-09 (`Registrazione schermo 2026-11-09 alle 00.12.39.mov`,
  10 seconds): with the tab bar hidden, moving the pointer to the left edge shows an icon over the page, the
  button of a web panel (Wikipedia in the recording) with the other buttons of Vivaldi's panel bar faintly behind
  it, next to a thin colored line along the edge. When the tab bar shows, the same panel buttons are the narrow
  strip to its left. Arc has no such strip.
- [x] Is that icon the panel bar of Vivaldi (web panel buttons) that stays at the edge while the tab bar is
  hidden? Yes, confirmed by Tore on 2026-11-08. Decision: while the tab bar is hidden, hide the
  panel bar as well (`panel-bar.hideWithTabBar`, default true), and show it again together with the tab bar.

## References

- Student video 02:14-03:05; project files `video-arc/gap-list-arc-consolidata.md` (G4).
