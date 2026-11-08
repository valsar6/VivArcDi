# 021 Auto-hide tab bar

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc's vertical sidebar can be hidden to give the page the whole width and shows again when the pointer touches the left edge of the window (the student video 02:14-03:05 and the review that uses Cmd+S). [014](../014-arc-shortcuts/spec.md) already binds Cmd/Ctrl+S to Vivaldi's Tab Bar toggle; this spec adds the hover behavior.

## User stories

- **US-1.** As a user, I want the tab bar to hide, so that the page uses the full width.
- **US-2.** As a user, I want it to come back when I move the pointer to the left edge, so that I do not need the shortcut.

## Expected behavior

With the tab bar hidden, moving the pointer to the left edge of the window slides the bar over the page, without moving the page. Moving the pointer away hides it again after a short delay. A button in the bar, or Cmd/Ctrl+S, pins it back so that it stays. The bar is hidden with Cmd/Ctrl+S, as set by 014.

## Requirements

### Functional

- **FR-1.** A module watches the left edge, a strip of a few pixels, while the tab bar is hidden.
- **FR-2.** Pointer on the strip for 150 ms shows the bar as an overlay; leaving it by more than 24 px, or 500 ms without hover, hides it.
- **FR-3.** The overlay never resizes the page.
- **FR-4.** `config.json` has `auto-hide.enabled`, `edgeWidth` and `hideDelayMs`.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the tab bar is hidden and the pointer rests on the left edge, THE bar SHALL show over the page. | manual |
| AC-2 | WHEN the pointer leaves the bar, THE bar SHALL hide after `hideDelayMs`. | auto: `hides after the delay` |
| AC-3 | WHILE the overlay is shown, THE page SHALL not move. | manual |
| AC-4 | WHERE `auto-hide.enabled` is false, THE module SHALL do nothing. | auto: `disabled module does nothing` |

## Out of scope

- Hiding the bar itself: native toggle.
- Right-side or top bar.

## Open questions

- [ ] Does Vivaldi 8.2 let a mod show the hidden bar as an overlay, or only toggle it? Probe requested.
- [ ] Pinning back: button in the bar or only the shortcut?

## References

- Student video 02:14-03:05; Project files: `video-arc/gap-list-arc-consolidata.md` (G4).
