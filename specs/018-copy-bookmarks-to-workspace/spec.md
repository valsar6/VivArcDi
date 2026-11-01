# 018 Copy bookmarks into a workspace

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Tore keeps years of bookmarks in Vivaldi's Bookmarks panel. To use them in Arc's way they must be in
the favorites of a workspace, and today the only ways are `config.json` (010), the `+` button and
dropped tabs (012), one link at a time. This spec lets him drag a bookmark or a bookmark folder from
the Bookmarks panel into the favorites of the active workspace, where VivArcDi copies it (Tore,
2026-11-01).

## User stories

- **US-1.** As a user, I want to drag a bookmark folder from the Bookmarks panel into the favorites of
  my workspace, so that its links are there without creating them again one by one.
- **US-2.** As a user, I want to drag a single bookmark into the favorites of my workspace, or onto
  one of its folders, so that it becomes a link of that workspace.
- **US-3.** As a user, I want my original bookmarks to stay where they are, so that the Bookmarks panel
  and other workspaces do not change.

## Expected behavior

Seen in Tore's recording (`Registrazione schermo 2026-11-01 alle 12.55.24.mov`, 8 seconds): with the
Bookmarks panel open beside the tab bar, he drags the folder `Programming` (27 bookmarks) out of the
panel and releases it over the link rows of the workspace favorites, under the Favorites grid. Vivaldi
shows its drag image with a green `+`, but nothing happens on release. He tries again with `Music`.
In VivArcDi 0.18.0 the panel's drag has no target in the tab bar.

Words as in [012](../012-editable-folders/spec.md): **workspace favorites** are the folders section of
009 to 012, below the space header, where folders and single links live; **Pinned Tabs** are the
Favorites grid of 001 and 003.

In VivArcDi:

**Drop a folder.** Releasing a bookmark folder of the panel over the workspace favorites copies it into
the workspace's root (012 FR-4) at the drop position: a new folder with the same name and a copy of
every bookmark and subfolder in the same order. Separators are skipped. The new folder shows at once,
closed, as any folder of 009.

**Drop a bookmark.** Releasing a single bookmark over the area adds a copy at the drop position, as a
link row. Releasing it over a folder row adds the copy at the end of that folder, as a dropped tab does
(012 FR-6).

**Where.** The drop targets are the same as for tabs in 012: between two rows (012 FR-13), on a folder
row, and on the space header, which adds the copy at the end of the root. A workspace whose root does
not exist yet gets it on the first copy, as on any first write (012 FR-5).

**Copy, never move.** The bookmarks in the panel are not changed or moved, and the copies are ordinary
bookmarks: they can be renamed, moved or deleted in the panel without touching the originals. No tab
is opened or closed by a copy.

**Relation with 012 T9.** 012 FR-10 (task T9, not done) gives a second meaning to the same gesture:
a panel folder dropped on the space header becomes the root of the workspace, linked and not copied.
On 2026-10-28 Tore chose that reading and left copying out; his recording now drops on the area and
asks for a copy. Both need the same detection of a drag from the panel, so this spec and T9 share it.
Two meanings for one gesture would confuse, so this spec proposes to supersede 012 FR-10, FR-11, AC-19
to AC-22 and T9: dropping on the header copies too. See the first open question.

## Requirements

### Functional

- **FR-1.** Releasing a bookmark folder of the Bookmarks panel over the workspace favorites creates a
  copy of the folder, with its bookmarks and subfolders in the same order, in the active workspace's
  root at the drop position. Separators are not copied.
- **FR-2.** Releasing a single bookmark of the panel over the area creates a copy of it at the drop
  position; over a folder row, at the end of that folder; over the space header, at the end of the
  root.
- **FR-3.** The originals are never changed, moved or deleted.
- **FR-4.** The drop targets and positions are the ones of tabs in 012 (FR-6, FR-13, FR-14); a copy
  into a workspace whose root does not exist creates it first (012 FR-5).
- **FR-5.** A drop of something that is not a bookmark or folder of the panel (text, a file, a link of
  a page) keeps Vivaldi's own behavior.
- **FR-6.** Dropping a folder onto itself or into one of its own subfolders, possible when the panel
  shows the workspace's root, is ignored.
- **FR-7.** Several bookmarks selected in the panel and dragged together are copied together, in the
  panel's order.

### Non-functional

- **NFR-1.** A failed write stops the copy, logs the problem and leaves no half-made folder: the copy
  made so far is removed.
- **NFR-2.** A folder of up to 500 bookmarks is copied in less than 2 seconds; Vivaldi stays usable
  meanwhile.
- **NFR-3.** The drop targets stay outside the window drag region (012 NFR-2), and dragging outside the
  area keeps Vivaldi's own behavior.
- **NFR-4.** Uninstalling VivArcDi leaves the copies as ordinary bookmarks.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a bookmark folder of the panel is dropped between two rows of the area, THE module SHALL create a copy of the folder with its bookmarks and subfolders in the same order at that position of the root. | auto: `copies a dropped bookmark folder into the root` |
| AC-2 | WHEN a folder is copied, THE module SHALL skip its separators. | auto: `skips separators when copying a folder` |
| AC-3 | WHEN a single bookmark of the panel is dropped between two rows, THE module SHALL create a copy of it at that position. | auto: `copies a dropped bookmark at the drop position` |
| AC-4 | WHEN a bookmark or folder of the panel is dropped on a folder row, THE module SHALL add the copy at the end of that folder. | auto: `copies a dropped bookmark into a folder` |
| AC-5 | WHEN a bookmark or folder of the panel is dropped on the space header, THE module SHALL add the copy at the end of the root. | auto: `copies a bookmark dropped on the header to the end of the root` |
| AC-6 | WHEN anything is copied, THE original bookmarks SHALL stay unchanged. | auto: `never changes the original bookmarks` |
| AC-7 | WHEN the first copy goes to a workspace whose root does not exist, THE module SHALL create the root first. | auto: `creates the workspace root on the first copy` |
| AC-8 | IF a folder is dropped onto itself or into one of its subfolders, THEN THE module SHALL ignore the drop. | auto: `ignores a folder dropped into itself` |
| AC-9 | WHEN several bookmarks are dragged together, THE module SHALL copy all of them in the panel's order. | auto: `copies every selected bookmark in order` |
| AC-10 | IF a bookmark write fails during a copy, THEN THE module SHALL remove what it copied and log the problem. | auto: `removes a partial copy when a write fails` |
| AC-11 | IF the dragged item is not a bookmark of the panel, THEN THE module SHALL leave the drop to Vivaldi. | auto: `ignores drops that are not panel bookmarks` |
| AC-12 | WHEN Tore drags the folder `Programming` from the Bookmarks panel between two rows of the workspace favorites, THE folder SHALL appear there with its 27 links, and `Programming` SHALL still be in its place in the panel. | manual |
| AC-13 | WHEN Tore drags a single bookmark onto a folder of the area and opens the folder, THE link SHALL be its last row. | manual |
| AC-14 | WHEN Tore switches to another workspace after a copy, THAT workspace SHALL not show the copy. | manual |
| AC-15 | WHEN Tore drops a bookmark on macOS, THE window SHALL not move. | manual |

## Out of scope

- Moving bookmarks (the original leaves the panel): only copies.
- Dropping bookmarks on the Favorites grid to pin them.
- Dropping bookmarks on a workspace in Vivaldi's workspace switcher, or on a workspace that is not
  active.
- Keeping a copy in sync with its original after the drop.
- Dragging rows of the area back to the panel; the panel keeps its own drag and drop.

## Open questions

- [ ] **Does this replace 012 T9?** Proposed: yes. Dropping a panel folder anywhere in the area,
  header included, copies it; 012 FR-10, FR-11, AC-19 to AC-22 and T9 are removed when this spec is
  approved, and `config.json` (`workspaces`) stays the way to link a folder as a workspace's root.
  Alternative: keep both, header = link as root, rows = copy.
- [ ] **Duplicates.** Proposed: always copy, even when the same address is already in the target
  folder; the panel removes extra ones. Alternative: skip a bookmark whose address is already there.
- [ ] **Subfolders.** Proposed: copied with all their levels, since 009 already shows nested folders.
  Alternative: copy only the folder's direct links.
- [ ] **Can a mod see the panel's drag?** The panel's rows are `div[tree-row][draggable=true]` inside
  `div[tree-item][data-id=<bookmark id>]` (probe of 2026-11-01), and the recording shows a real HTML5
  drag (Vivaldi's drag image with a green `+`), unlike tabs (012 FR-14). Proposed: a probe before the
  design records the drag events and data in `window.html` and whether the tab bar accepts the drop. If
  it does not, the drop is found by the pointer on mouse release, as for tabs.

## References

- Recording `Registrazione schermo 2026-11-01 alle 12.55.24.mov` (Tore, 2026-11-01).
- [012](../012-editable-folders/spec.md) FR-4 to FR-6, FR-10, FR-13, FR-14, task T9.
- [009](../009-bookmark-folders-in-tab-bar/spec.md), [010](../010-folders-per-workspace/spec.md).
