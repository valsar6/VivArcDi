# 012 Editable folders: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-10-28 and revised on 2026-11-01. It says **how**; the spec
says **what**.

## Approach

The folders section of 009 to 011 stays a read-only view over the bookmark tree. Everything new that
writes goes through one class, `WorkspaceFavorites`, and one low-level class, `BookmarkWriter`. The
view only reports what the user did (a `+`, a double click, a drop, Cmd/Ctrl+D) and the tree refresh
that already follows the bookmark events draws the result.

1. **Writing bookmarks.** `BrowserBookmarks` keeps no write method, so the test of 009 AC-8 ("reads
   without changing") stays true. A new `BookmarkWriter` in `src/core/bookmarks` wraps `create`,
   `update` and `remove` of `chrome.bookmarks` and `getChildren`; it is the only class that writes.
   `ensurePath(path)` creates the missing folders of a title path (`VivArcDi/Riposino`) one level at a
   time and returns the id of the last one.
2. **Which root.** `WorkspaceRoots` (010) grows the order of FR-4: saved root of the workspace
   (`SavedRoots`, FR-10), entry in `workspaces`, `root` when not empty, else
   `<workspacesBase>/<workspace name>` (`<workspacesBase>/Tabs` outside any workspace). `rootFor` still
   returns the title path; the new default path is returned even when the folder does not exist yet, and
   the view stays hidden until it does (AC-7). `SavedRoots` keeps `vivarcdi.workspaceRoot.<id>` in the
   shared store.
3. **Adding and taking back.** `WorkspaceFavorites` exposes `add(tab, index?)`, `addFolder()` and
   `take(tab)`. `add` finds or creates the root with `BookmarkWriter.ensurePath`, creates the bookmark
   (title and address of the tab, at `index` or at the end), links the tab with `TabLinks.link` (009)
   and records the bookmark id as created by VivArcDi in `CreatedLinks` (`vivarcdi.createdLinks`, a set
   in the shared store). `take` unlinks the tab and, when the id is in `CreatedLinks`, removes the
   bookmark; otherwise it keeps it and returns `kept`, so the caller shows a toast (AC-24, AC-25).
4. **Cmd/Ctrl+D.** `FavoriteShortcut` listens to `keydown` in the capture phase of the window document,
   like `CloseShortcut` (003): Cmd or Ctrl and `d`, no Shift or Alt. It stops the event, then
   `WorkspaceFavorites.add` for the active tab when the tab is a web page without a link, or `take`
   when it already has one. A page that is not `http` or `https` gets a toast and nothing else. The
   toast is the one of `copyurl`, moved to `src/core` because two modules use it now.
5. **`+` and rename.** `SpaceHeaderView` (011) gets a `+` button shown on hover, outside the drag
   region. `FolderSectionView` gets an edit mode for a row: the title becomes an `input` with the text
   selected; Enter or blur saves through `BookmarkWriter.update`, Escape or an empty text restores. A
   double click on a folder row starts it; the single click that toggles the folder waits the double
   click delay (250 ms) so that a double click does not toggle first. A new folder is created with
   `BookmarkWriter.create`, the section waits for the bookmark event, then puts the new row in edit mode
   by its id.
6. **Drops by pointer.** Vivaldi moves tabs with mouse events and the probe of 2026-10-31 saw no drag
   events, so a `TabPointerDrag` class follows `mousedown` on a row of Vivaldi's tab list (selector of
   the tab wrapper in the catalog), notes when the pointer moves more than 6 px (a drag), and on
   `mouseup` asks `DropTargets.at(x, y)`: the section tells which row is under the point and whether
   the point is in the upper or lower half, giving `folder(id)`, `between(index)` or `header`. It
   never calls `preventDefault`, so Vivaldi's own drag keeps working; its result is ignored because
   the tab leaves the list when it is linked. A drop on the Favorites grid is not handled (FR-8).
7. **Folder of the Bookmarks panel onto the header (FR-10).** Done last, behind the probe of T1: the
   panel is a different part of the window and its rows may or may not use HTML5 drag. If its rows
   expose the id of the folder under the pointer at `mousedown`, `PanelFolderDrag` uses the same
   pointer logic as step 6 with the header as target and `SavedRoots.save`. `Reset folders` is an item
   of the header's hover menu that calls `SavedRoots.forget`.
8. **014.** The table of 014 drops `COMMAND_PIN_TAB: Cmd+D` (revised 2026-11-01). The installer data
   `shortcuts.json` and its tests change in this feature, since Cmd+D must stay unbound for
   `FavoriteShortcut`; whoever applied the earlier table runs `shortcuts apply` again.

Rejected: letting `BrowserBookmarks` write (it would break the guarantee that the view cannot change
bookmarks); HTML5 `dragover` and `drop` (no events, probe of 2026-10-31); deleting the bookmark on every
second press (could remove a bookmark Tore made himself).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/bookmarks/BookmarkWriter.ts` | The only writer of bookmarks: `create`, `update`, `remove`, `ensurePath` | Adapter |
| `src/core/Toast.ts` | Moved from `src/modules/copyurl` | - |
| `src/modules/folders/SavedRoots.ts` | Saved root of each workspace (FR-10) in the shared store | Repository |
| `src/modules/folders/CreatedLinks.ts` | Ids of the bookmarks VivArcDi created, to decide what a second press removes | Repository |
| `src/modules/folders/WorkspaceRoots.ts` | Order of FR-4 and `workspacesBase` | Value object |
| `src/modules/folders/WorkspaceFavorites.ts` | `add`, `addFolder`, `take`: bookmark, link and tab together | Facade |
| `src/modules/folders/FavoriteShortcut.ts` | Cmd/Ctrl+D | - |
| `src/modules/folders/TabPointerDrag.ts` | Pointer drag of a tab row, reports the release point | Observer |
| `src/modules/folders/DropTargets.ts` | Maps a point to `folder(id)`, `between(index)` or `header` | - |
| `src/modules/folders/FolderSectionView.ts` | Edit mode of a row, delayed toggle, drop highlight | - |
| `src/modules/spaceheader/SpaceHeaderView.ts` | `+` button and `Reset folders` item | - |
| `src/modules/folders/PanelFolderDrag.ts` | Bookmarks panel folder dropped on the header (after T1) | Observer |
| `installer/vivarcdi/shortcuts.json` and tests | `COMMAND_PIN_TAB` empty | - |

All of them take their dependencies in the constructor, so every one is tested with fakes.

## Vivaldi interface

- `chrome.bookmarks.create`, `update`, `remove` and `getChildren` (permission already held; the probe
  of 2026-10-27 showed the read side).
- A selector for Vivaldi's tab wrapper already exists in the catalog (`HiddenTabMarker`); the panel
  rows need a selector found by the probe of T1.
- The tab row clicked at `mousedown` gives the tab id through `data-id=tab-N`, as in 003.
- Marks stay data attributes: `data-vivarcdi-editing`, `data-vivarcdi-drop` on the row under the
  pointer.

## Configuration

```json
"bookmark-folders": {
  "workspacesBase": "VivArcDi"
}
```

Documented in the README next to `root` and `workspaces`.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi handles Cmd+D before the page sees it | T1 also checks it; if so the shortcut is set in `Preferences` to a command VivArcDi listens to instead |
| The Bookmarks panel rows give no folder id to a mod | FR-10 stays behind T1; if impossible, an item `Use this folder` in the header's hover menu with a path field replaces it, and the spec is revised |
| A second press removes a bookmark Tore made | Only ids in `CreatedLinks` are removed, AC-24 and AC-25 |
| Vivaldi reorders its list on the same drag that we read | The linked tab is hidden from the list right after the drop; nothing is cancelled |
| A write fails halfway (folder created, bookmark not) | Errors are caught per call, logged, the tab stays unlinked (NFR-1); the empty folder is harmless |
| Renaming a workspace in Vivaldi orphans `VivArcDi/<name>` | Accepted in the spec; the old folder stays in the Bookmarks panel |
| The delayed single click feels slow | 250 ms is the system double-click time; only on folder rows |

## Empty Favorites grid (added 2026-11-01)

With neither a `Favorites` bookmark folder nor pinned tabs, `FavoritesGrid` draws nothing (`tileCount`
and the bookmark count are 0) and Vivaldi has no pinned strip to drop on. FR-15 adds
`EmptyGridDrop` in `src/modules/favorites`:

- `FavoritesGrid.#update` already knows when there are no tiles. It then asks `EmptyGridDrop` to show a
  placeholder element (`data-vivarcdi-empty-grid`) at the anchor of the grid (order 10 in `TabBarAnchor`),
  with the hint text, and to remove it as soon as a tile exists. The hint is in `config.json` (`emptyHint`).
- The drop uses the same pointer tracking as the folders (`TabPointerDrag`, moved to `src/core` so both
  modules share it): on mouse release over the placeholder, `chrome.tabs.update(tabId, { pinned: true })`.
  A tab that is already pinned, a link or not a web page is ignored (AC-30).
- Only the placeholder takes drops; with tiles Vivaldi's own drag keeps pinning (FR-8, NFR-3).
- The placeholder is outside the window drag region (NFR-2).
- Risk: if Vivaldi pins a tab a moment after release, a second `pinned: true` is harmless.
