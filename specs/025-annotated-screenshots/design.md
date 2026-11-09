# 025 Annotated screenshots: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-08; design approved by Tore on 2026-11-09, with the decisions on the open questions as written here. It says **how**; the spec says **what**.

## Approach

An `annotator` module draws an editor over the window with the image on a canvas. The open question is where the image comes from, so the design has a source behind an interface.

1. **Source.** T1 is a probe: does Vivaldi's capture put the image in the clipboard, a file in the downloads folder, or neither reach a mod? The design
   takes the first that works, in this order:
   a. clipboard: on the shortcut of the capture, read the image with `navigator.clipboard.read`;
   b. downloads: watch `chrome.downloads.onCreated` for the capture file and read it;
   c. own capture: `chrome.tabs.captureVisibleTab` on an own shortcut, visible area only.
   `ImageSource` has the three implementations; the module picks the first available (resolves the open question).
2. **Editor.** `AnnotationDocument` holds the base bitmap (never modified, AC-3) and a list of strokes (arrow, rectangle, pen, text, color). `Renderer` draws the
   base then the strokes on a canvas. Undo and redo move strokes between two stacks (AC-4).
3. **Output.** Copy: `canvas.toBlob('image/png')` then `navigator.clipboard.write`, falling back to nothing and a toast. Save: `chrome.downloads.download` with a data URL.
4. **Keys.** Cmd/Ctrl+C copy, Cmd/Ctrl+S save, Esc discards, Cmd/Ctrl+Z undo.

Rejected: element detection like Arc; sending to an Easel.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/annotator/ImageSource.ts` and implementations | Gets the capture | Strategy |
| `.../AnnotationDocument.ts` | Base and strokes, undo | Memento |
| `.../Renderer.ts` | Draws to canvas | |
| `.../EditorView.ts` | Overlay, toolbar | View |
| `.../ImageOutput.ts` | Copy and save | Adapter |

## Vivaldi interface

`chrome.downloads`, clipboard permission (T1). The overlay host is `#browser`.

## Configuration

`annotator`: `enabled` true, `source` `auto`, `colors` four values.

## Risks

| Risk | Mitigation |
|---|---|
| Neither clipboard nor downloads is readable | Own capture (c) |
| Large pages make a huge canvas | Limit the canvas to 8192 px and say so in a toast |
