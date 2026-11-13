# 035 Core layout: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written only after the spec is `Approved`. It says **how**; the spec says **what**.

## Approach

As in [034](../034-module-boundaries/design.md), files move and their contents stay the same, apart
from import paths. Each class keeps its name, its public API and its tests, so a reviewer can read
every move as a rename (`git mv`) plus a list of changed import lines.

Each of the 69 files of `src/core/` goes to one of three places, decided in this order:

1. **The module that uses it.** It is used by one module only, and no core file imports it: 6 files.
2. **`src/shared/`.** It names a VivArcDi feature (Today, favorites, folders, spaces, the `New Tab`
   row, drag and drop of tabs and rows) and two or more modules use it: 24 files.
3. **A folder of `src/core/`.** It is part of the boot, it is injected through `ModuleContext` or
   used by a file that is, or it is a generic helper that names no feature: 39 files.

The work goes in four passes, each one green on `make check`: out to the modules, out to shared, the
core folders, then the guard.

Before any file moves, every core file that stays was checked against the files that leave. None of
them imports a file that leaves, so `core/` never has to import `shared/`.

Rejected alternatives:

- **Move `BrowserHistory`, `BrowserSearch` and `ResourceLoader` to their single module.** This was
  decided in the spec's open questions: they are injected services, and moving them would change the
  boot.
- **Keep `core/` flat and only move files out.** About 40 files would remain in one folder, and
  nothing would group the browser wrappers apart from the DOM helpers.
- **One folder per kind of service with a single file each.** Too fine: folders of one file add
  paths without telling the reader anything.

## Components

### Core folders

The folders differ from the spec's proposal in two ways:

- `workspaces/` is new. The three workspace files are injected through `ModuleContext` or used by
  four modules, and they belong neither in `tabs/` nor in `browser/`.
- `log/` becomes `support/`, because it also holds the two task helpers.

| Folder | Files | Responsibility |
|---|---|---|
| `boot/` | `VivArcDi.ts`, `Module.ts`, `ModuleRegistry.ts`, `types.ts`, `UiReadiness.ts`, `StyleInjector.ts`, `ResourceLoader.ts` | Starting the payload, the module system, and loading styles and resources |
| `browser/` | `BrowserTabs.ts`, `BrowserWindows.ts`, `BrowserRuntime.ts`, `BrowserSearch.ts`, `BrowserHistory.ts`, `BrowserPrefs.ts`, `PersistentStorage.ts`, `Webview.ts`, `PageScriptInjector.ts` | Promise wrappers of the Vivaldi and Chrome APIs, and scripts injected into web views |
| `browser/bookmarks/` | `BrowserBookmarks.ts`, `BookmarkWriter.ts`, `BookmarkNode.ts`, `BookmarkFolderFinder.ts` | Reading and writing bookmarks |
| `tabs/` | `TabData.ts`, `TabDataWriter.ts`, `TabSlot.ts`, `TabUnloader.ts`, `AddressKey.ts` | The data Vivaldi keeps on a tab, the tab strip's slots, and the key of a tab's address |
| `workspaces/` | `ActiveWorkspace.ts`, `WorkspaceNames.ts`, `WorkspaceTabs.ts` | Which workspace is active, its name, and its tabs |
| `dom/` | `DomQuery.ts`, `SelectorCatalog.ts`, `KeptElement.ts`, `TabBarAnchor.ts`, `ContextMenu.ts`, `Toast.ts`, `ShortcutKeys.ts`, `WindowKeys.ts` | Finding and keeping elements in Vivaldi's window, menus, toasts and keys |
| `support/` | `Logger.ts`, `FrameTask.ts`, `SerialTask.ts` | The logger, and running work once per frame or one at a time |

`src/loader.ts` imports `./core/boot/VivArcDi.js`. Nothing outside `src/` names a core path.

### Composition root

Today `VivArcDi.boot` calls `createDefaultRegistry()` from `src/modules/index.ts`, so core imports
the modules. `src/loader.ts` becomes the composition root ([FR-8](spec.md#functional)):

- `VivArcDi.boot(baseUrl, registry, document)` takes the registry as its second parameter, before the
  `document` that keeps its default.
- `src/loader.ts` calls `VivArcDi.boot(new URL('./', import.meta.url), createDefaultRegistry())`.

The same registry is built at the same moment of the boot, so nothing changes at runtime. These are
the only lines of this branch that change something other than an import path.

### Out to shared

| New path | Used by |
|---|---|
| `shared/dragdrop/DragPill.ts`, `RowDrag.ts`, `TabDragPill.ts`, `TabDragRelease.ts`, `TabPointerDrag.ts`, `TabEntries.ts`, `TabRowMove.ts` | `favorites`, `folders` |
| `shared/dragdrop/LinkDropZone.ts`, `FavoriteDropZone.ts` | `favorites`, `folders` |
| `shared/tabs/TodayList.ts`, `HiddenTabs.ts`, `HiddenTabMarker.ts` | `favorites`, `folders`, `space-header` |
| `shared/tabs/KeptTab.ts` | `folders`, `peek`, `today` |
| `shared/tabs/OwnPage.ts` | `favorites`, `pinned`, `reopen`, `workspace-sync` |
| `shared/tabs/CommandLabels.ts` | `favorites`, `folders` |
| `shared/links/FolderEntries.ts`, `LinkId.ts`, `VirtualFolders.ts` | `folders`, `live-folders`, `folder-preview` |
| `shared/links/FolderCommands.ts` | `folders`, `space-header` |
| `shared/spaces/SpaceCollapse.ts` | `folders`, `space-header` |
| `shared/spaces/SpaceMenuItems.ts` | `live-folders`, `space-header` |
| `shared/newtab/NewTabRow.ts`, `NewTabOpener.ts`, `AddressField.ts` | `incognito`, `sidebar-look` |

- `TabPointerDrag`, `TabEntries` and `HiddenTabs` count their users through the shared files that
  import them, as 034/AC-3 allows.
- `OwnPage` moves because it names the own page of a pinned tab, a VivArcDi feature from spec 007.
  `AddressKey`, which it uses, stays in core: it only turns an address into a key.

### Out to modules

| New path | Only user |
|---|---|
| `modules/folders/favoritelinks/TabMenuItems.ts`, `MenuItemShape.ts` | `FolderEditing`, `TabCommands` |
| `modules/folders/editing/BookmarkCopier.ts` | `WorkspaceFavorites`, and `FolderDuplication` from step 2 of 033 |
| `modules/folders/editing/BookmarkTrash.ts` | `FolderEditing`, `FolderDeletion` |
| `modules/workspacesync/ElementGestures.ts` | `WorkspaceSync`, `WorkspaceMenu` |
| `modules/reopen/LinkKeyIndex.ts` | `ReopenPinned`, `LinkedTabFinder` |

### Guard

| File | Change |
|---|---|
| `tools/eslint/module-boundaries.mjs` | A third message, `coreToOuter`: for a file in `src/core/`, reports an import, re-export or dynamic `import()` whose relative path resolves into `src/shared/` or `src/modules/` |
| `tests/tooling/ModuleBoundariesRule.test.ts` | AC-4 and AC-5, next to the cases of 034 |
| `tests/structure/ModuleBoundaries.test.ts` | AC-1, AC-2 and AC-3, next to the checks of 034 and with its helpers |

For AC-2, a core file counts as used when another core file imports it, or when modules import it
directly or through shared files. `VivArcDi.ts` counts as used because `src/loader.ts` imports it.

### Tests

- The tests of core files follow them: `tests/core/<folder>/<Name>.test.ts`, for example
  `tests/core/browser/bookmarks/BookmarkWriter.test.ts`. The shared fakes `tests/core/dom.ts` and
  `tests/core/prefs.ts` stay where they are.
- The tests of files that leave core follow them to `tests/shared/<topic>/` and
  `tests/modules/<name>/<folder>/`.
- Test names do not change. The sorted list of test names is compared before and after each pass
  ([NFR-1](spec.md#non-functional)).

### Documentation

- `docs/architecture.md`: the core folders, the three layers and their import rules, and the core
  paths it cites, such as `src/core/boot/Module.ts`.
- The paths of the files above in earlier specs stay as they are, since they record history. Spec
  033's design names `src/core/bookmarks/BookmarkTrash.ts` and `BookmarkCopier.ts`; code that step 2
  of 033 adds follows the new paths when this branch takes main.

## Vivaldi interface

None. No selector, `data-vivarcdi-*` mark or private API changes.

## Configuration

None. `config.json` does not change.

## Risks

| Risk | Mitigation |
|---|---|
| A wrong path is found only at runtime in Vivaldi, since `dist/` is not bundled | `tsc` resolves every import; `make check` builds `dist/`; after each pass a one-off script checks that every relative import of `dist/**/*.js` points to a file |
| Step 2 of spec 033 is implemented in parallel and imports core files that move, such as `BookmarkTrash` | The branch takes main with a merge, never a rebase, and fixes the new imports in the merge commit, as 034 did |
| A file is put in the wrong layer, since a test cannot tell a generic helper from a feature | The tables above are the reference for review; a change to them goes through this design |
| A large diff hides a change of behavior | Moves are `git mv` commits of their own, apart from the commits that edit import lines; the only other edit is the composition root, in a commit of its own |
