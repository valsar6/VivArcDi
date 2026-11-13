# 034 Module boundaries: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written only after the spec is `Approved`. It says **how**; the spec says **what**.

## Approach

Files move; their contents do not, apart from import paths. Each class keeps its name, its public
API and its tests, so a reviewer can read every move as a rename (`git mv`) plus a list of changed
import lines. The work goes in three passes, each one green on `make check`:

1. **Shared layer.** The pieces that two or more modules use move to `src/shared/`, and every
   importer points to the new path. The cross-module imports of [Today](spec.md#today) disappear.
2. **Guard.** A local ESLint rule and four structure tests prove the boundaries and keep them.
3. **Folders layout.** The 24 files of `folders` that stay in the module move to six responsibility
   folders.

The shared layer is grouped by topic, not by the module the code came from, so `shared/` never
mirrors `modules/`.

Rejected alternatives:

- **Move the shared pieces into `src/core/`.** `core/` already holds 62 files and is the subject of
  the next spec; it would also blur the line between injected services and feature building blocks.
- **Let modules depend on each other through `ModuleContext`.** It would turn classes into runtime
  services, change the boot, and change behavior when a module is disabled.
- **`eslint-plugin-import` and its `no-restricted-paths`.** A new dependency for one check that a
  rule of about 60 lines covers, next to the existing `no-line-comments`.

## Components

### Shared layer

| New path | From | Used by |
|---|---|---|
| `src/shared/links/FolderTree.ts` | `modules/folders/FolderTree.ts` | `folders`, `folder-preview` |
| `src/shared/links/LinkIcon.ts` | `modules/folders/LinkIcon.ts` | `folders`, `folder-preview`, `today` |
| `src/shared/links/OpenLinks.ts` | `modules/folders/OpenLinks.ts` | `folders`, `folder-preview` |
| `src/shared/links/LinkActivator.ts` | `modules/folders/LinkActivator.ts` | `folders`, `folder-preview` |
| `src/shared/links/LastOpenedStore.ts` | `modules/reopen/LastOpenedStore.ts` | `reopen`, `folder-preview` |
| `src/shared/tabs/UnloadedTabs.ts` | `modules/favorites/UnloadedTabs.ts` | `favorites`, `folders`, `reopen`, `space-header`, and `shared/links` |
| `src/shared/tabs/TabBarMarks.ts` | `PINNED_LAST_ATTRIBUTE` of `modules/pinned/TabBarMarker.ts` | `pinned`, `today` |
| `src/shared/clipboard/TextCopier.ts` | `CopyStrategy`, `ClipboardWriter`, `ClipboardApiCopy`, `SelectionCopy`, `TextCopier` of `modules/copyurl/UrlCopier.ts` | `copy-url`, `live-folders` |

Details:

- `FolderTree.ts` stops re-exporting `FolderEntry`, `LinkEntry` and `TreeEntry`; importers take them
  from `core/FolderEntries.ts`, where they are defined.
- `LastOpenedStore.ts` stops re-exporting `KeyValueStorage`; importers take it from
  `core/PersistentStorage.ts`.
- `UrlCopier.ts` keeps `UrlCopier` only and imports `TextCopier` from the shared layer.
- `TabBarMarker.ts` imports `PINNED_LAST_ATTRIBUTE` from `TabBarMarks.ts`.

### Folders layout

| Folder | Files | Responsibility |
|---|---|---|
| top level | `BookmarkFolders.ts`, `FolderSection.ts` | The module and the composition root of one section |
| `tree/` | `FolderTreeSource.ts`, `WorkspaceRoots.ts`, `OpenFolders.ts` | Which folder each workspace shows, its bookmark tree, and the folders left open |
| `links/` | `TabLinks.ts`, `LinkTabAdopter.ts` | The link between a bookmark row and the tab that shows it, kept in the tab's `vivExtData` |
| `favoritelinks/` | `WorkspaceFavorites.ts`, `CreatedLinks.ts`, `FavoriteShortcut.ts`, `TabCommands.ts`, `LinkRemoval.ts` | Adding tabs to a workspace's favorites and taking them back |
| `dragdrop/` | `FolderDragDrop.ts`, `DropTargets.ts`, `DropPlace.ts`, `FolderLinkTargets.ts`, `TabDrops.ts`, `PanelBookmarkDrop.ts`, `PanelDragData.ts` | Where a drop lands and what a drop of a tab, a row or a panel bookmark does |
| `editing/` | `FolderEditing.ts`, `RowMenu.ts`, `FolderNameEditor.ts`, and from 033 `FolderMenu.ts`, `FolderMenuItems.ts`, `FolderDeletion.ts`, `ClosingLinks.ts`, `FolderLinkTabs.ts`, `FolderDuplication.ts`, `FolderRelocation.ts` | Menus of the rows, renaming, deleting a folder, and wiring of the editing parts |
| `view/` | `FolderSectionView.ts`, `FolderRowElement.ts`, `FolderRows.ts`, `RowTransition.ts` | Turning the tree into rows and drawing them |

Spec [033](../033-folder-menu/spec.md) added the folder menu on main while this work was open; the merge of main put its classes in `editing/`.

### Guard

| File | Responsibility |
|---|---|
| `tools/eslint/module-boundaries.mjs` | Rule `local/module-boundaries`: for a file in `src/modules/<a>/`, reports an import, re-export or literal dynamic `import()` whose relative path resolves into `src/modules/<b>/` with `<b>` other than `<a>`; for a file in `src/shared/`, reports one that resolves into `src/modules/` |
| `eslint.config.mjs` | One `local` plugin with both local rules; `local/module-boundaries` set to `error` for `src/**/*.ts` |
| `tests/tooling/ModuleBoundariesRule.test.ts` | Runs the rule through ESLint's `Linter` on short sources: AC-4, AC-5 |
| `tests/structure/ModuleBoundaries.test.ts` | Reads the real `src/` tree and its import specifiers: AC-1, AC-2, AC-3, AC-6 |

`src/modules/index.ts` lies outside every module folder, so the rule leaves it alone without a
special case. For AC-3 a shared file counts as used by a module when the module imports it directly
or through other shared files; this is how `OpenLinks` counts `folders` and `folder-preview` through
`LinkActivator`.

### Tests

- Test files whose only subject moves follow it, with the same test names: `FolderTree.test.ts`,
  `OpenLinks.test.ts` and `LinkActivator.test.ts` go to `tests/shared/links/`; the `TextCopier` cases
  of `UrlCopier.test.ts` go to `tests/shared/clipboard/TextCopier.test.ts`.
- The tests of `folders` move to the folder of their subject, e.g.
  `tests/modules/folders/dragdrop/DropTargets.test.ts`. Tests that drive the whole module
  (`BookmarkFolders`, `LinkTabHiding`, `LinkTabRace`) and the shared `fakes.ts` and `racing.ts` stay at
  the top level.
- Tests are not part of the payload, so the rule does not apply to them: integration tests such as
  `LinkTabHiding.test.ts` keep driving two modules together. They only update their paths.
- Before and after each pass the sorted list of test names is compared; it must not change
  ([NFR-1](spec.md#non-functional)).

## Vivaldi interface

None. No selector, `data-vivarcdi-*` mark or private API changes.

## Configuration

None. `config.json` does not change.

## Risks

| Risk | Mitigation |
|---|---|
| A wrong path is found only at runtime in Vivaldi, since `dist/` is not bundled and the loader resolves files by URL | `tsc` resolves every import with its `.js` path; `make check` builds `dist/`; after each pass a one-off script, not kept in the repo, lists every relative import of `dist/**/*.js` whose file is missing |
| Spec 033 is implemented in parallel and adds files to the flat `folders/` | Pass 3 lands before the implementation of 033 starts, or 033 rebases onto it and puts its classes in `editing/` |
| A large diff hides a change of behavior | Moves use `git mv` in their own commits, separate from the commits that edit import lines; no other edit in this branch |
| The rule misses a form of import | The rule tests cover `import`, `import type`, `export … from` and `import()` |
