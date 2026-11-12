# 033 Folder menu: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-12 (PR #160). It says **how**; the spec says **what**.
Step 1 of the Delivery (`Delete`, `Rename…`) is designed in full and shipped in 0.57.0; step 2
(`Duplicate`, `Move to ▸`) is designed below; steps 3 and 4 are sketched and get their own revision
before their code.

## Approach

### Opening the menu (FR-1)

A new `FolderMenu` in `src/modules/folders`, next to `RowMenu`, listens to `contextmenu` in the capture
phase on the document and reacts only to a row with `data-vivarcdi-folder-id` that is **not** marked
`data-vivarcdi-live-folder`; live folder rows keep going to `LiveFolderMenu` through
`FolderSectionView` (AC-2). On such a row it cancels Vivaldi's menu and opens the shared `ContextMenu`
at the pointer, with the items of the steps released so far.

The items are built by a small list of item providers, one per step (`FolderMenuItems`), so later steps
add their items without touching the menu:

```text
FolderMenu ── items(folderId) ──▶ [ step 3 items? ] [ Change Icon…?, Rename… ] [ Duplicate?, Move to? ] [ Delete ]
```

Empty groups and their separators are dropped. `ContextMenu` gains a separator item (`{ separator:
true }`), drawn as a thin line and skipped by the keyboard; this is the only change to the shared menu.

`FolderMenu` is created in `FolderDragDrop` next to `RowMenu`, with the same `ContextMenu`, and is
attached and detached with it.

### Rename… (FR-5)

The item calls `FolderSectionView.edit(folderId)`, the same entry the double click and the `+` of 012
use. Nothing else changes.

### Delete (FR-2, FR-3, FR-4, NFR-1)

A new `FolderDeletion` in `src/modules/folders` does the work in this order:

1. **Find the tabs.** `BookmarkWriter.subTree(folderId)` gives the folder with every descendant; the
   ids of its links (any depth) are collected. `tabs.query({})` and `TabData.ownOf(tab).bookmarkId`
   give the tabs linked to them, in every workspace. Nothing is changed yet.
2. **Move to the Trash.** `BookmarkTrash.id()` (new, in `src/core/bookmarks`) reads `getTree()` once
   and returns the id of the top-level node whose `trash` is `true` (node `4`, `Cestino`, in the probe of
   2026-11-12); it caches the id for the session. `BookmarkWriter.move(folderId, { parentId: trashId })`
   moves the folder, which keeps all its content. `BookmarkNode` gets the optional `trash` flag.
3. **Close the tabs.** Only after step 2 succeeded, `tabs.remove` is called on the tabs of step 1.
   Vivaldi activates the neighbour of an active tab itself.
4. **Tell the user.** The toast of `FolderEditing` shows `Folder "<name>" moved to Trash`.

The section already redraws on bookmark events, so the rows leave with the leaving transition of
`RowTransition`. `OpenFolders` gains `forget(id)`, called after step 2, so a restored folder comes
back closed.

**Failure (NFR-1, AC-6).** If the Trash is not found, or the move fails, nothing else happens: no tab
is closed, the section is drawn again, the problem is logged and the toast shows `Could not delete
"<name>"` with the `error` kind. The folder is **never** erased with `removeTree` as a fallback.

**Race with `unlinkExcept`.** When the bookmarks change, the section calls `TabLinks.unlinkExcept`,
which would bring the tabs of the deleted links back to today's list for a moment before step 3 closes
them. `FolderDeletion` therefore registers the tab ids it is about to close in a short-lived set that
`unlinkExcept`'s `keep` callback honours, so those tabs stay hidden until they are closed.

### Step 2: Duplicate and Move to (FR-6, FR-7)

Revision of 2026-11-12, after step 1 shipped in 0.57.0 (PR #164).

**Items.** `FolderMenuItems` fills its middle group with `Duplicate` and `Move to ▸`, in this order,
after the group of `Rename…` (AC-1). `Move to ▸` is a `SubmenuItem` of the shared `ContextMenu`, whose
items are built when the menu opens.

**Duplicate (AC-8).** A new `FolderDuplication` in `src/modules/folders`:

1. `BookmarkWriter.get(folderId)` gives the parent and the index of the folder.
2. `BookmarkCopier.copy([folderId], parentId, index + 1)` (018) copies the folder with all its
   subfolders and links right below it, with the same names; the copier already skips separators and
   rolls back a half-made copy.
3. The copy is closed (its new id is not in `OpenFolders`) and has no tabs, since tabs are linked to
   bookmark ids and the copy has new ones.

A failure keeps the original as it was and shows `Could not duplicate "<name>"` (AC-6).

**Move to ▸ (AC-9, AC-10).** A new `FolderRelocation` in `src/modules/folders`:

- **Submenu.** One item per entry of `WorkspaceNames.entries`, in Vivaldi's order, labelled with the
  workspace name; the current workspace (`ActiveWorkspace.current`) has `checked: true` and does
  nothing when chosen. Outside any workspace no item is checked.
- **Target root.** `WorkspaceRoots.rootFor(name)` gives the path of the target workspace's root (its
  entry in `workspaces`, a non-empty `root`, or `VivArcDi/<name>`); `BookmarkWriter.ensurePath` creates
  it on the first write, as 012 FR-5 does.
- **Same root.** IF the target root is the same folder as the current one (both workspaces use one
  non-empty `root`), THEN nothing moves and a toast says `"<name>" is already there`.
- **Order of the writes.** The tabs of the folder's links (any depth, found as in step 1) are read
  first. Then `BookmarkWriter.move(folderId, { parentId: targetRootId })` puts the folder at the end of
  the target root. Only after that, each of those tabs gets the target `workspaceId` with
  `TabDataWriter` and `TabData.withWorkspace`, so it shows under the folder in the other workspace and
  leaves this one. `OpenFolders` forgets the folder in this workspace.
- **Toast.** `Moved "<name>" to <workspace>`.

A failure of the bookmark move leaves the folder and the tabs where they were and shows `Could not move
"<name>"`; a failure on one tab is logged and the other tabs still move.

**Shared pieces.** Finding the link ids and the tab ids of a folder is now needed by `Delete` and
`Move to`, so it moves out of `FolderDeletion` into `FolderLinkTabs` (`linkIds(folder)`,
`tabsOf(linkIds)`), used by both.
`ClosingLinks` is used by the move as well, so the moving tabs do not flash in today's list while the
bookmarks change.

### Steps 3 and 4 (sketch)

| Step | Items | Plan |
|---|---|---|
| 3 | `New Nested Folder…` | `WorkspaceFavorites.addFolder(parentId)`, `OpenFolders` opens the parent, `view.edit(newId)`. |
| 3 | `Change Icon…` | Popover with 24 inline SVG symbols; storage field chosen by a probe (Q-5). |
| 4 | `Turn into Space` | `WorkspaceCreator` of 030, then the step-2 move of the content and the tabs, then switch. |

## Files

| File | Change |
|---|---|
| `src/core/ContextMenu.ts` | Separator item. |
| `src/core/bookmarks/BookmarkNode.ts` | Optional `trash` flag. |
| `src/core/bookmarks/BookmarkTrash.ts` | New: finds and caches the Trash id. |
| `src/modules/folders/FolderMenu.ts` | New: opens the menu on folder rows. |
| `src/modules/folders/FolderMenuItems.ts` | New: the items, by step and group. |
| `src/modules/folders/FolderDeletion.ts` | New: tabs, move to Trash, close, toast. |
| `src/modules/folders/OpenFolders.ts` | `forget(id)`. |
| `src/modules/folders/FolderDragDrop.ts`, `FolderEditing.ts`, `FolderSection.ts` | Wiring and the `keep` set. |
| `src/modules/folders/editing/FolderLinkTabs.ts` | Step 2. New: link ids and tab ids of a folder, taken out of `FolderDeletion`. |
| `src/modules/folders/editing/FolderDuplication.ts` | Step 2. New: `Duplicate`. |
| `src/modules/folders/editing/FolderRelocation.ts` | Step 2. New: `Move to ▸` and its submenu. |

## Risks

- **Moving into the Trash through `chrome.bookmarks.move`.** Checked by the T1 probe (2026-11-12):
  Vivaldi accepted the move of a folder with a link into node `4`, kept its content, and the Bookmarks
  panel showed it in the Trash.
- **The Trash is synced and emptied by Vivaldi.** A deleted folder lives as long as Vivaldi keeps the
  Trash, as for a delete from the Bookmarks panel.
- **A tab of a deleted link in another window.** `tabs.query({})` covers every window, so it is closed
  too, as Arc closes a folder's tabs everywhere.
