# 025 Annotated screenshots

| | |
|---|---|
| Status | Draft |
| Phase | 5 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc's capture takes the whole page, a free area, or an element it detects, then lets the user copy, save or send it (1cQ at 1:44; the annotated version in TffkM and fRi). Vivaldi already has a capture tool for area and page, so what is missing is drawing on the capture before saving.

## User stories

- **US-1.** As a user, I want to draw an arrow, a box or text on a capture, so that I can explain what I mean.
- **US-2.** As a user, I want to copy the result to the clipboard in one key.

## Expected behavior

After a capture the user sees it in a panel with a toolbar: arrow, rectangle, free pen, text and a color row. The result is copied with Cmd/Ctrl+C or saved with Cmd/Ctrl+S to the downloads folder. Esc discards. The capture itself is Vivaldi's: the module starts after its capture completes.

## Requirements

### Functional

- **FR-1.** The module opens an editor on the image Vivaldi's capture produces.
- **FR-2.** Tools: arrow, rectangle, pen, text; four colors; undo and redo.
- **FR-3.** Copy writes a PNG to the clipboard; save writes a PNG file.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a capture completes, THE editor SHALL open with the image. | manual |
| AC-2 | WHEN the user presses copy, THE clipboard SHALL hold the annotated PNG. | manual |
| AC-3 | THE editor SHALL keep the original pixels under the drawing. | auto: `keeps original pixels` |
| AC-4 | WHEN the user presses undo, THE last stroke SHALL disappear. | auto: `undoes the last stroke` |

## Out of scope

- Automatic element detection, sending to an Easel.

## Open questions

- [ ] Can a mod receive the image from Vivaldi's capture, or must VivArcDi offer its own capture shortcut? Probe requested.

## References

- 1cQ review 1:44; TffkM and fRi reviews; Project files: `video-arc/gap-list-arc-consolidata.md` (G5).
