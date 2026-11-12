# Architecture

VivArcDi has two halves that never import each other: the **payload** (`src/`, compiled to `dist/`),
which runs inside Vivaldi, and the **installer** (`installer/`), which puts the built payload there.

## Build

The payload is TypeScript and SCSS. `npm run build` (`scripts/build.mjs`) writes `dist/`, which is
git-ignored:

| Step | Tool | Result |
|---|---|---|
| Scripts | esbuild, one output file per `.ts`, no bundling | `dist/loader.js`, `dist/core/**/*.js`, `dist/shared/**/*.js`, `dist/modules/**/*.js` |
| Page scripts | esbuild, one IIFE bundle per `src/page/*.ts`, helpers in `src/page/lib/` | `dist/page/*.js` |
| Styles | Sass, partials (`_*.scss`) skipped | `dist/styles/*.css` |
| Static files | copied as they are | `dist/config.json`, `dist/selectors/*.json` |

The scripts are not bundled because the loader resolves its files by URL at runtime
(`import.meta.url`, `ResourceLoader`, `StyleInjector`), so `dist/` keeps the layout of `src/`.
Page scripts are the exception: they run inside web pages, injected with `webview.executeScript`,
where payload URLs cannot be imported. `peek-links.ts` becomes `dist/page/peek-links.js`, which
defines the global `VivArcDiPeekLinks` with the file's exports.
The installer never runs Node. CI commits `dist/` and `installer/` on top of the `dist` branch, see the
README.

## Payload

Vivaldi draws its interface with web technologies. Its entry point is `window.html`, inside the
Vivaldi installation. The installer adds a single line to it, between two markers:

```html
<!-- vivarcdi:start -->
<script type="module" src="vivarcdi/loader.js"></script>
<!-- vivarcdi:end -->
```

and copies `dist/` next to it as `vivarcdi/`, adding a generated `build.json` with the VivArcDi and
Vivaldi versions.

`loader.js` boots `VivArcDi` (`src/core/VivArcDi.ts`), which:

1. loads `config.json` and `build.json`;
2. picks the selector catalog for the running Vivaldi version;
3. waits for Vivaldi's interface to exist;
4. injects the stylesheets listed in the configuration;
5. creates and starts every enabled module.

A module that fails to start is logged and skipped; the others keep running, and Vivaldi itself is
never blocked.

### Modules

A module is a class that extends `Module` (`src/core/Module.ts`), declares a static `id`, and
implements `start(context)` and `stop()`. The context gives it the document, the selector catalog,
a logger tagged with its id, its options from `config.json`, the build versions, `tabs`, a
promise-based wrapper of `chrome.tabs` (`src/core/BrowserTabs.ts`; check `tabs.available` first),
`runtime` for `chrome.runtime` messages and new windows (`src/core/BrowserRuntime.ts`), and
`payload`, which loads files that ship with VivArcDi.

Modules mark Vivaldi's elements with `data-vivarcdi-*` attributes and stylesheets style those marks.
Vivaldi re-renders its interface often and rewrites the `class` attribute when it does, but leaves
unknown data attributes alone. Modules that follow the interface observe it with a
`MutationObserver` and redraw through `FrameTask`, at most once per animation frame.

Vivaldi can also replace its containers, for example when the layout of the sidebar changes. An
observer attached to such a container stays on the detached node and never fires again. Elements that
VivArcDi keeps in the interface are therefore watched from a node that outlives the layout (the
document or `#browser`), and their place is looked up again on every check: see `KeptElement` and
`TabBarAnchor`, and the [incident of 2026-11-11](incidents/2026-11-11-sidebar-sections-lost.md).

Modules are registered in `src/modules/index.ts` and enabled in `config.json` under their id.

| Module | Folder | Role | Spec |
|---|---|---|---|
| `activation-marker` | `ActivationMarker.ts` | Marks `#browser` with `data-vivarcdi-active`, so stylesheets apply only when VivArcDi runs | [000](../specs/000-foundations/spec.md) |
| `favorites-grid` | `favorites/` | Favorites grid of the workspace, tile drag, unloading | [001](../specs/001-favorites-grid/spec.md), [020](../specs/020-drag-tab-to-favorites/spec.md) |
| `peek` | `peek/` | Opens links in a floating panel and turns it into a tab | [002](../specs/002-peek/spec.md), [015](../specs/015-peek-new-tab-links/spec.md) |
| `pinned-tabs` | `pinned/` | Pinned tabs: reset button, unloading on close, tab bar marks | [003](../specs/003-pinned-tabs-and-folders/spec.md) |
| `reopen-pinned` | `reopen/` | Reopens a pinned tab on its own page and dates its last opening | [007](../specs/007-reopen-pinned-tabs/spec.md) |
| `bookmark-folders` | `folders/` | Bookmark folders of the workspace in the tab bar, editable | [009](../specs/009-bookmark-folders-in-tab-bar/spec.md), [010](../specs/010-folders-per-workspace/spec.md), [012](../specs/012-editable-folders/spec.md) |
| `live-folders` | `livefolders/` | Folders filled from GitHub | [026](../specs/026-live-folders/spec.md) |
| `folder-preview` | `folderpreview/` | Preview of a folder's links on hover | [008](../specs/008-folder-hover-preview/spec.md) |
| `today-archive` | `today/` | Today tabs, archiving after a delay, the archive panel | [004](../specs/004-today-tabs-and-keyboard/spec.md) |
| `copy-url` | `copyurl/` | Copies the address of the active tab | [014](../specs/014-arc-shortcuts/spec.md) |
| `space-header` | `spaceheader/` | Header of the space: icon, name, collapse | [011](../specs/011-space-header/spec.md) |
| `incognito` | `incognito/` | Arc-like private windows | [013](../specs/013-incognito-mode/spec.md) |
| `little-arc` | `littlearc/` | Small window for quick links and the command bar | [005](../specs/005-little-arc/spec.md), [023](../specs/023-command-panel/spec.md) |
| `sidebar-look` | `sidebarlook/` | Arc look and palettes of the sidebar | [028](../specs/028-arc-sidebar-look/spec.md), [029](../specs/029-arc-light-theme/spec.md) |
| `workspace-sync` | `workspacesync/` | Syncs workspaces and their pinned tabs between computers | [030](../specs/030-workspace-sync/spec.md) |

### Module boundaries

Modules never import each other ([spec 034](../specs/034-module-boundaries/spec.md)). A module imports
from `src/core/`, from `src/shared/` and from its own folder only; `src/modules/index.ts`, the
registry, is the one file that sees every module.

| Folder | Holds | May import |
|---|---|---|
| `src/core/` | Services that `ModuleContext` injects and infrastructure: browser API wrappers, DOM helpers, logger | `src/core/` |
| `src/shared/` | Building blocks that two or more modules use, grouped by topic: `links/`, `tabs/`, `clipboard/` | `src/core/`, `src/shared/` |
| `src/modules/<name>/` | One module | `src/core/`, `src/shared/`, its own folder |

A file moves to `src/shared/` when a second module needs it, and back into its module when only one
module still uses it. The local ESLint rule `local/module-boundaries` (`tools/eslint/`) fails the
lint on an import that crosses these lines, and `tests/structure/ModuleBoundaries.test.ts` checks
the real tree. Tests are not bound by the rule: an integration test may drive two modules together.

A large module splits its folder by responsibility. `folders/` keeps the module
(`BookmarkFolders.ts`) and the composition root of a section (`FolderSection.ts`) at its top level:

| Folder | Responsibility |
|---|---|
| `tree/` | Which folder each workspace shows, its bookmark tree, and the folders left open |
| `links/` | The link between a bookmark row and the tab that shows it |
| `favoritelinks/` | Adding tabs to a workspace's favorites and taking them back |
| `dragdrop/` | Where a drop lands and what a drop of a tab, a row or a panel bookmark does |
| `editing/` | Menus of the rows, renaming, and wiring of the editing parts |
| `view/` | Turning the tree into rows and drawing them |

### Selectors

Vivaldi's interface changes between versions. Modules never hard-code its CSS selectors: they ask the
`SelectorCatalog` by name (`selectors.get('tabBar')`). Each supported Vivaldi version has a file in
`src/selectors/`, listed in `src/selectors/index.json`.

The catalog picks the newest file that is not newer than the running Vivaldi. When every file is
newer, VivArcDi stays inactive instead of guessing. Supporting a new Vivaldi version usually means
adding one selector file.

## Installer

Plain Python 3.9+, standard library only. The main pieces:

| Class | Role |
|---|---|
| `PlatformFactory` | Chooses `MacOSPlatform` or `DebianPlatform` |
| `Platform` | Finds Vivaldi installations, knows the data folder and the update hook |
| `UpdateHook` | `LaunchAgentHook` on macOS, `AptHook` on Debian |
| `WindowHtmlPatcher` | Adds and removes the loader block in `window.html` |
| `PayloadDeployer` | Copies `dist/` and writes `build.json` with a fingerprint of the payload; fails with `InstallerError` when `dist/` was not built |
| `BackupStore` | Keeps the original `window.html` of each Vivaldi version |
| `InstallationPatcher` | Combines the three above for one installation |
| `SelfStager` | Copies `dist/` and the installer to the data folder for the update hook |
| `Command` | `install`, `reapply`, `uninstall`, `status` |

`reapply` compares each installation with what it should be: patched `window.html`, and a
`build.json` matching the current payload fingerprint and Vivaldi version. Only installations that
differ are touched, so running it often is cheap.

## Conventions

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full guidelines. In short:

- English everywhere, readability first.
- No `//` comments (enforced by ESLint). Exposed functions and classes get JSDoc (TypeScript) or a
  docstring (Python) describing inputs, outputs and behavior.
- TypeScript is strict and has no `any`.
- Object-oriented design; dependencies are passed in, so every class can be tested with fakes.
- Commit messages are a single subject line of 50 to 80 characters.
