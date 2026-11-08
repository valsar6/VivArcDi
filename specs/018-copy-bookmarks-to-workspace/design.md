# 018 Copy bookmarks into a workspace: design

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-01 and the two probes Tore ran on 2026-11-08
(`copy-bookmarks/diagnostica-trascina-segnalibri.js` and `-2.js` in the project files). It says
**how**; the spec says **what**.

## Probe results (Vivaldi 8.2, macOS)

- The Bookmarks panel uses real HTML5 drag, unlike tabs (012 FR-14). `dragstart` fires on
  `div.tree-row[draggable=true]` inside `div[tree-item][data-id=<bookmark id>]`.
- From `dragenter` on, `dataTransfer.types` holds `vivaldi/x-bookmarks`, `vivaldi/x-title` and
  `text/plain`, plus `text/uri-list` for a link. At `drop`, `vivaldi/x-bookmarks` is a JSON array of
  bookmark ids (`["184"]` for the folder `Music`, `["279"]` for a link); `vivaldi/x-title` is the title.
- `dragenter`, `dragover` and `drop` reach the rows of the folders section
  (`[data-vivarcdi-folder-id]`, `[data-vivarcdi-folders]`) in the tab bar. With `preventDefault` on
  `dragover`, the `drop` arrives on our row with `dropEffect` `copy`.
- The top-level folders (ids 1 and 2) cannot be dragged: Vivaldi cancels the drag at once.
- A drop outside the section (on a pinned tab) reaches Vivaldi as before: nothing to change there.

## Approach

The drop targets of 012 stay the same; only the source changes. The folders module gets a second
drop path next to the pointer path of tabs, and every write still goes through `WorkspaceFavorites`
and `BookmarkWriter`.

1. **Listening.** `PanelBookmarkDrop` listens to `dragover`, `drop`, `dragleave` and `dragend` in the
   capture phase of the window document. It acts only when `dataTransfer.types` contains
   `vivaldi/x-bookmarks` and `DropTargets.at(clientX, clientY)` (012) gives a target. On `dragover` it
   calls `preventDefault`, sets `dropEffect` to `copy` and marks the target with `DropTargets.mark`, as
   for tabs. On `drop` it calls `preventDefault` and `stopPropagation`, clears the mark, reads the ids
   and hands them over. Any other drag, or a point outside the section and the header, is left to
   Vivaldi untouched (FR-5, NFR-3). `dragleave` out of the window and `dragend` clear the mark.
2. **Reading the ids.** `PanelDragData.ids(dataTransfer)` parses `vivaldi/x-bookmarks` as a JSON array
   of strings; anything else (bad JSON, not an array, empty) gives no ids and the drop is ignored.
   Several ids come in the panel's order (FR-7).
3. **Where.** The target maps to a place like `TabDrops` does: `folder(id)` is the end of that
   folder, `between(before)` is the index before that row in the root (the existing `indexBefore`),
   `header` is the end of the root. The mapping moves from `TabDrops` into a shared `DropPlace`, so
   tabs and bookmarks use the same code.
4. **Copying.** `WorkspaceFavorites.copy(ids, place)` finds or creates the root
   (`BookmarkWriter.ensurePath`, so a workspace without a root gets it on the first copy, AC-7) and
   delegates to `BookmarkCopier`. `BookmarkCopier.copy(ids, parentId, index)`:
   - reads each id with `getSubTree`, in the given order;
   - refuses the whole drop when the target folder is one of the dragged folders or inside one of
     them, by walking the target's parents with `get` (FR-6, AC-8);
   - creates the copies depth first with `BookmarkWriter.create`: a folder with its title, then its
     children in order; a link with title and address; nodes with `separator === true` are skipped
     (AC-2). Top-level copies go at `index`, `index + 1`, … or at the end;
   - remembers the top-level copies it made; if any write fails it removes them with `removeTree`
     and rethrows, so no half-made folder stays (NFR-1, AC-10). The originals are only read (FR-3).
   Copies are not added to `CreatedLinks`: no tab is linked, so Cmd/Ctrl+D never removes them.
5. **Writer.** `BookmarkWriter` gets `subTree(id)`, `get(id)` and `removeTree(id)`. It stays the only
   class that writes, and its queue keeps one copy from interleaving with another write.
6. **Wiring.** `FolderDragDrop` (012) builds `PanelBookmarkDrop` next to `TabPointerDrag`, with the
   same `DropTargets`, and starts and stops both.

Rejected: reusing the pointer path of tabs (the panel uses HTML5 drag, so no `mouseup` arrives during
the drag); copying with `chrome.bookmarks.move` on a duplicate (there is no duplicate call); reading the
dragged rows from the panel's DOM (the ids are already in the drag data).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/folders/PanelBookmarkDrop.ts` | HTML5 drag from the Bookmarks panel over the section: mark, accept, hand over | Observer |
| `src/modules/folders/PanelDragData.ts` | Ids out of `vivaldi/x-bookmarks` | - |
| `src/modules/folders/DropPlace.ts` | Target to `{ parentId, index }`, shared by `TabDrops` and the panel drop | - |
| `src/core/bookmarks/BookmarkCopier.ts` | Recursive copy, self-nesting check, rollback | Command |
| `src/core/bookmarks/BookmarkWriter.ts` | Adds `subTree`, `get`, `removeTree` | Adapter |
| `src/modules/folders/WorkspaceFavorites.ts` | Adds `copy(ids, place)` | Facade |
| `src/modules/folders/FolderDragDrop.ts` | Starts the panel drop next to the tab drag | - |

All of them take their dependencies in the constructor and are tested with fakes.

## Vivaldi interface

- Drag data type `vivaldi/x-bookmarks` (JSON array of ids), seen in the probe of 2026-11-08.
- `chrome.bookmarks.getSubTree`, `get`, `create`, `removeTree` (permission already held).
- Marks stay the ones of 012: `data-vivarcdi-drop` on the row or header under the pointer.

## Configuration

None.

## Risks

| Risk | Mitigation |
|---|---|
| A future Vivaldi renames `vivaldi/x-bookmarks` or changes its format | `PanelDragData` is the only reader; unknown data is ignored, so the drop falls back to Vivaldi |
| A large folder takes long to copy | Writes are sequential but small; a test with 500 fake bookmarks guards NFR-2, and Tore checks a real folder (AC-12) |
| Vivaldi also handles the drop on our rows | `stopPropagation` in the capture phase, only when we accept; the probe showed nothing else happening there |
| The section re-renders on every created bookmark while copying | The tree refresh already runs on a frame task (`FrameTask`), so many events make one redraw |
| The window drag region swallows the drag on macOS | The section is already outside it (012 NFR-2); AC-15 checks it |
