# Architecture

VivArcDi has two halves that never import each other: the **payload** (`src/`, compiled to `dist/`),
which runs inside Vivaldi, and the **installer** (`installer/`), which puts the built payload there.

## Build

The payload is TypeScript and SCSS. `npm run build` (`scripts/build.mjs`) writes `dist/`, which is
git-ignored:

| Step | Tool | Result |
|---|---|---|
| Scripts | esbuild, one output file per `.ts`, no bundling | `dist/loader.js`, `dist/core/*.js`, `dist/modules/**/*.js` |
| Page scripts | esbuild, one IIFE bundle per `src/page/*.ts`, helpers in `src/page/lib/` | `dist/page/*.js` |
| Styles | Sass, partials (`_*.scss`) skipped | `dist/styles/*.css` |
| Static files | copied as they are | `dist/config.json`, `dist/selectors/*.json` |

The scripts are not bundled because the loader resolves its files by URL at runtime
(`import.meta.url`, `ResourceLoader`, `StyleInjector`), so `dist/` keeps the layout of `src/`.
Page scripts are the exception: they run inside web pages, injected with `webview.executeScript`,
where payload URLs cannot be imported. `peek-links.ts` becomes `dist/page/peek-links.js`, which
defines the global `VivArcDiPeekLinks` with the file's exports.
The installer never runs Node. CI publishes `dist/` and `installer/` to the `dist` branch, see the
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

Modules are registered in `src/modules/index.ts` and enabled in `config.json` under their id.

| Module | Role |
|---|---|
| `activation-marker` | Marks `#browser` with `data-vivarcdi-active`, so stylesheets apply only when VivArcDi runs |
| `favorites-grid` | Favorites grid: `FavoriteTagger` marks tiles, `GridLayout` picks the columns, `UnloadedTabs` and `TileUnloader` handle unloading |
| `peek` | Peek: `PageScriptInjector` puts the click script in tab pages, `PeekController` holds the open `PeekPanel`, `LinkOpener` and `TabTiler` turn it into a tab |

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
