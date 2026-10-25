# Architecture

VivArcDi has two halves that never import each other: the **payload** (`src/`), which runs inside
Vivaldi, and the **installer** (`installer/`), which puts the payload there.

## Payload

Vivaldi draws its interface with web technologies. Its entry point is `window.html`, inside the
Vivaldi installation. The installer adds a single line to it, between two markers:

```html
<!-- vivarcdi:start -->
<script type="module" src="vivarcdi/loader.js"></script>
<!-- vivarcdi:end -->
```

and copies `src/` next to it as `vivarcdi/`, adding a generated `build.json` with the VivArcDi and
Vivaldi versions.

`loader.js` boots `VivArcDi` (`src/core/VivArcDi.js`), which:

1. loads `config.json` and `build.json`;
2. picks the selector catalog for the running Vivaldi version;
3. waits for Vivaldi's interface to exist;
4. injects the stylesheets listed in the configuration;
5. creates and starts every enabled module.

A module that fails to start is logged and skipped; the others keep running, and Vivaldi itself is
never blocked.

### Modules

A module is a class that extends `Module` (`src/core/Module.js`), declares a static `id`, and
implements `start(context)` and `stop()`. The context gives it the document, the selector catalog,
a logger tagged with its id, its options from `config.json`, the build versions, and `tabs`, a
promise-based wrapper of `chrome.tabs` (`src/core/BrowserTabs.js`; check `tabs.available` first).

Modules mark Vivaldi's elements with `data-vivarcdi-*` attributes and stylesheets style those marks.
Vivaldi re-renders its interface often and rewrites the `class` attribute when it does, but leaves
unknown data attributes alone. Modules that follow the interface observe it with a
`MutationObserver` and redraw through `FrameTask`, at most once per animation frame.

Modules are registered in `src/modules/index.js` and enabled in `config.json` under their id.

| Module | Role |
|---|---|
| `activation-marker` | Marks `#browser` with `vivarcdi-active`, so stylesheets apply only when VivArcDi runs |
| `favorites-grid` | Favorites grid: `FavoriteTagger` marks tiles, `GridLayout` picks the columns, `UnloadedTabs` and `TileUnloader` handle unloading |

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
| `PayloadDeployer` | Copies `src/` and writes `build.json` with a fingerprint of the payload |
| `BackupStore` | Keeps the original `window.html` of each Vivaldi version |
| `InstallationPatcher` | Combines the three above for one installation |
| `SelfStager` | Copies the installer to the data folder for the update hook |
| `Command` | `install`, `reapply`, `uninstall`, `status` |

`reapply` compares each installation with what it should be: patched `window.html`, and a
`build.json` matching the current payload fingerprint and Vivaldi version. Only installations that
differ are touched, so running it often is cheap.

## Conventions

- English everywhere, readability first.
- No line comments. Exposed functions and classes get JSDoc (JavaScript) or a docstring (Python)
  describing inputs, outputs and behavior.
- Object-oriented design; dependencies are passed in, so every class can be tested with fakes.
- Commit messages are a single subject line of 50 to 80 characters.
