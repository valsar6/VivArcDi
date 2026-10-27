# 009 Bookmark folders in the tab bar: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

A new module, `bookmark-folders`, draws the folders as its own element, never inside Vivaldi's tab
list. Probes run by Tore on Vivaldi 8.2 (2026-10-27) showed that an element added to `#tabs-container`
before the child that holds `.tab-strip` is laid out as full-width rows above the list and survives
workspace switches, opening and closing tabs, pinning and the auto-hide sidebar, while an element added
inside the tab strip is moved by Vivaldi's rebuilds. That spot is the shared `TabBarAnchor` of
[003](../003-pinned-tabs-and-folders/design.md): the Favorites grid takes order 10, this section order 20.

1. **Read the tree (FR-1, FR-5, FR-6, AC-1 to AC-3).** `FolderTreeSource` finds the root with
   `BookmarkFolderFinder` (a path of exact titles, first match), and `FolderTree` turns its children
   into a plain tree of folders and links: separators, links that are not `http` or `https` and folders
   deeper than `maxDepth` are dropped. Every bookmark event (`onCreated`, `onRemoved`, `onChanged`,
   `onMoved`) asks a `FrameTask` for one rebuild per frame, so a burst of changes redraws once.
2. **Open and closed (FR-2, AC-7).** `OpenFolders` keeps the ids of open folders in the interface's
   the shared `PersistentStorage` (`chrome.storage.local`, since `localStorage` is null in Vivaldi 8.2's `window.html`) and restores them on start. Folders start closed.
3. **Open links (FR-3, FR-4, AC-5, AC-6).** `OpenLinks` maps each link to the tab that shows it: same
   window, same workspace (`TabData`, shared with 003), same `AddressKey` as in 007, the most recently
   used tab when several match. It follows `tabs.onCreated`, `onUpdated` (address, discarded state),
   `onRemoved` and `onActivated`.
4. **Click (FR-3, AC-4, AC-5).** `LinkActivator` activates the tab of the link and reloads it if it is
   unloaded; with no tab it creates one with the bookmark's address and writes the active tab's
   workspace id into it right away, as 003 does for its tabs. A click on a folder row toggles it.
5. **View (FR-4, NFR-1, AC-6).** `FolderSectionView` builds the rows with `createElement` and one
   delegated click listener; it carries no framework. A folder shows its title; when it is open, its
   children follow, indented by depth. When a folder is closed, its open links, at any depth, are listed
   below it, indented, so that what is in use stays visible (AC-6). A link with an open tab gets a dot.
   Folder rows carry `data-vivarcdi-folder-id` so that [008](../008-folder-hover-preview/spec.md)
   can attach its panel to them, subfolders included.
6. **Reopen (FR-8, FR-9, AC-9, AC-10).** 007 gains a second source of matches. `LinkKeyIndex`, in
   `src/core/bookmarks`, holds the address keys of the links under a root and rebuilds on bookmark
   events; one instance per root path is shared by the modules that ask for it. `ReopenPinned` asks
   `TabTargets`, which tries its finders in order: `PinnedTabFinder` of 007, then `LinkedTabFinder`,
   which looks for a tab whose address key is in the `LinkKeyIndex`. `ActivationRecorder` records a
   date for a tab that is pinned or whose key is in the index.
7. **Scroll (FR-11, AC-16).** Vivaldi's tab list scrolls by itself inside its box, so a taller section
   above it would push the list out of view. The first version limits the section to
   `maxHeightPercent` of the tab bar (60 by default) and scrolls inside itself, so the tab list always
   keeps room. Tore prefers one scroll for the whole column as in Arc; that means changing how
   Vivaldi lays out and scrolls its own list, which a mod should not do blindly. It is left for an
   iteration after Tore sees the first version, and the option can be set to 100 to try it.

Rejected alternatives:

- **Tab stacks as folders** (first draft of 003): each link would have to be a real tab, and the
  existing 100 or so links would need to be created as tabs.
- **Drawing inside the tab strip** after the last pinned tab: probe 2 showed Vivaldi's rebuilds move it.
- **Copying the bookmarks into our own store**: two copies to keep in step; the bookmarks stay the
  single source and the module is read-only (FR-7, AC-8).
- **A framework for the view**: a handful of rows and one listener do not justify one.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/bookmarks/BrowserBookmarks.ts` | Promise-based `chrome.bookmarks`: `getTree` and the four change events; no write method is exposed (shared with 003) | Adapter |
| `src/core/bookmarks/BookmarkFolderFinder.ts` | Finds a folder by a path of exact titles, first match (shared with 003) | |
| `src/core/bookmarks/BookmarkNode.ts` | Bookmark type for both modules (shared with 003) | |
| `src/core/bookmarks/LinkKeyIndex.ts` | Address keys of the links under a root, rebuilt on events; one instance per root path | Flyweight, Observer |
| `src/core/TabBarAnchor.ts` | Host above the tab list: `add(element, order)` (created by 003 or by the first of the two modules) | |
| `src/core/TabData.ts` | Workspace id of a tab and writing it to a new tab (shared with 003) | Adapter |
| `src/core/AddressKey.ts` | Moved from `reopen/` (as 003 does), shared by 007, 003 and 009 | Value object |
| `src/modules/folders/FolderTree.ts` | Pure: bookmark nodes to the tree of folders and links, with the rules of FR-6 (AC-1, AC-2) | |
| `src/modules/folders/FolderTreeSource.ts` | Finds the root, rebuilds the tree on bookmark events once per frame (AC-3) | Observer |
| `src/modules/folders/OpenFolders.ts` | Ids of open folders, saved and restored (AC-7) | Repository |
| `src/modules/folders/OpenLinks.ts` | Which link has which open tab, from tab events (AC-5, AC-6) | Observer |
| `src/modules/folders/LinkActivator.ts` | Click on a link: activate, reload, or create (AC-4, AC-5) | Command |
| `src/modules/folders/FolderRows.ts` | Pure: which rows to show, with the open links of a closed folder below it (AC-6) | |
| `src/modules/folders/FolderSectionView.ts` | Rows, indentation, dots, open links below closed folders, one delegated listener | |
| `src/modules/folders/BookmarkFolders.ts` | Module: options, wiring, clean stop | Facade |
| `src/modules/reopen/TabTargets.ts` | Tries the finders of 007 in order | Chain of responsibility |
| `src/modules/reopen/LinkedTabFinder.ts` | Tab whose address key is in the `LinkKeyIndex` (AC-9) | Strategy |
| `src/styles/folders.scss` | Rows, indentation, dot, hover, scroll limit, theme colors | |

`ActivationRecorder` receives a predicate for the tabs it records; 007's tests keep passing with the
pinned-only default.

## Vivaldi interface

| What | Use | IF missing or failing |
|---|---|---|
| `chrome.bookmarks` (`getTree`, `onCreated`, `onRemoved`, `onChanged`, `onMoved`) | Tree and live updates; read-only use | Module stays off, logged (NFR-2) |
| `chrome.tabs` events, `query`, `create`, `update`, `reload` | Open links, click | Module stays off, logged |
| `vivExtData.workspaceId` | Workspace of tabs | Tabs are matched by window only, logged once |
| Selector `tabListHost` (`#tabs-container > :has(> .tab-strip)`), added by 003 or here | `TabBarAnchor` | Module stays off, logged |
| `chrome://favicon/` in the interface | Icon of a link; the favicon of its open tab is used first | First letter of the title |
| Marks: `data-vivarcdi-folders` on the section, `data-vivarcdi-folder-id`, `data-vivarcdi-open` on rows | Styles and 008 | |

The tab bar is a window-drag region on macOS: real clicks and hover never reached the section until it was marked `-webkit-app-region: no-drag` (found by Tore with a console test, 2026-10-27, issue #30). The shared `TabBarAnchor` host carries the mark, so every section in it is covered (AC-17).

Uninstalling VivArcDi removes the section and leaves every bookmark as it was (AC-15).

## Configuration

```json
"bookmark-folders": {
  "enabled": true,
  "root": "Importati da Firefox/Bookmarks Bar",
  "maxDepth": 3,
  "maxHeightPercent": 60
}
```

`root` defaults to `VivArcDi` in the module; `config.json` sets Tore's folder. The sizes are clamped
to 20 to 100.

## Risks

| Risk | Mitigation |
|---|---|
| `chrome://favicon/` is not served to the interface | Icon of the open tab first, then the first letter; manual check in the checklist |
| A tab created by the click lands in another workspace | Write the active tab's `workspaceId` right after creating it, as 003 does; manual check in the checklist |
| A burst of bookmark events, for example an import, redraws the section many times | One rebuild per frame through `FrameTask` |
| Hundreds of links make the section heavy | Closed folders do not draw their children; only open ones are in the DOM |
| Vivaldi removes the anchor on a redraw | `TabBarAnchor` creates it again; the probes saw it survive every tested redraw; manual check AC-14 |
| Two folders with the same title, such as `Bookmarks Bar` and `Bookmarks bar` | Exact, case-sensitive path; the first match wins and is logged |
| The scroll limit hides the tab list in a very short window | The limit is a percentage with a floor of 120 px; `maxHeightPercent` is an option |
