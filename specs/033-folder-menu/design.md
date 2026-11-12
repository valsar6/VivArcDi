# 033 Folder menu: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-12 (PR #160). It says **how**; the spec says **what**.
This version designs **step 1** of the Delivery (`Delete`, `Rename…`) in full, and only sketches steps
2 to 4, which get their own design revision before their code.

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

### Steps 2 to 4 (sketch)

| Step | Items | Plan |
|---|---|---|
| 2 | `Duplicate` | `BookmarkCopier` of 018, target = parent of the folder, index + 1. |
| 2 | `Move to ▸` | Submenu from `WorkspaceNames`; `WorkspaceRoots` + `ensurePath` for the target root, `BookmarkWriter.move`, then the open tabs get the target `workspaceId` in `vivExtData`. |
| 3 | `New Nested Folder…` | `WorkspaceFavorites.addFolder(parentId)`, `OpenFolders` opens the parent, `view.edit(newId)`. |
| 3 | `Change Icon…` | Popover with 24 inline SVG symbols; storage field chosen by a probe (Q-5). |
| 4 | `Turn into Space` | `WorkspaceCreator` of 030, then step-2 move of the content and the tabs, then switch. |

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

## Risks

- **Moving into the Trash through `chrome.bookmarks.move`.** The probe found the node but did not
  write. Vivaldi might refuse a move into it. T1 is a probe that moves a throw-away folder there; if it
  fails, the design is revised before the code (for example with `vivaldi.bookmarksPrivate`), never by
  erasing.
- **The Trash is synced and emptied by Vivaldi.** A deleted folder lives as long as Vivaldi keeps the
  Trash, as for a delete from the Bookmarks panel.
- **A tab of a deleted link in another window.** `tabs.query({})` covers every window, so it is closed
  too, as Arc closes a folder's tabs everywhere.
