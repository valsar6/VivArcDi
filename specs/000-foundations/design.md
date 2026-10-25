# 000 Foundations: design

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |

Written after the fact. [docs/architecture.md](../../docs/architecture.md) describes the same design
for readers of the code; this file records the decisions behind it.

## Approach

VivArcDi is a JavaScript mod loaded by `window.html`, not a browser extension: an extension cannot
reach the tab bar or draw an overlay inside the browser window, which phases 1 to 3 need. The
installer adds a single script block to `window.html`, so every feature can be switched on or off in
`config.json` without touching `window.html` again.

Rejected alternatives:

- **CSS only**, as VivalArc does: it changes the look but no behavior.
- **A shell installer**: Python is on both target systems and is far easier to test.
- **Bundling the payload**: the loader resolves its files by URL at runtime, so `dist/` keeps the
  layout of `src/` and stays readable inside Vivaldi's folder.

## Components

### Payload (`src/`)

| Class | Responsibility | Pattern |
|---|---|---|
| `VivArcDi` | Application: configuration, selectors, readiness, styles, modules | Facade |
| `ResourceLoader` | Reads payload files by URL | Adapter |
| `SelectorCatalog` | Selectors of one Vivaldi version, picked by version | Strategy, chosen at load |
| `UiReadiness` | Waits for an element with a `MutationObserver` and a timeout | |
| `StyleInjector` | Adds and removes stylesheet links | |
| `ModuleRegistry` | Maps ids to module classes, instantiates enabled ones | Registry, Factory |
| `Module` | Base class with static `id`, `start(context)`, `stop()` | Template Method |
| `BrowserTabs` | Promise wrapper of `chrome.tabs` callbacks | Adapter |
| `FrameTask` | Merges repeated requests into one run per animation frame | |
| `Logger` | `[VivArcDi:<module>]` prefixed console output | |
| `ActivationMarker` | Marks `#browser` while VivArcDi runs | |

### Installer (`installer/vivarcdi/`)

| Class | Responsibility | Pattern |
|---|---|---|
| `PlatformFactory`, `MacOSPlatform`, `DebianPlatform` | Where Vivaldi lives, data folder, hook, root rules | Abstract Factory |
| `UpdateHook`, `LaunchAgentHook`, `AptHook` | Reapply after updates | Strategy |
| `WindowHtmlPatcher` | Idempotent marker block in `window.html` | |
| `PayloadDeployer` | Copies `dist/`, writes `build.json` with a payload fingerprint | |
| `BackupStore` | First original `window.html` per channel and version | |
| `InstallationPatcher` | Combines the three above, explains permission errors | Facade |
| `SelfStager` | Copies `dist/` and the installer to the data folder | |
| `PermissionAdvisor`, `MacOSAdvisor`, `SudoAdvisor` | Explains how to fix a denied write | Strategy |
| `Command` and subclasses | `install`, `reapply`, `uninstall`, `status` | Command |

## Vivaldi interface

`src/selectors/8.1.json` defines `browser`, `tabBar`, `verticalTabBar`, `tabStrip`, `pinnedTab`,
`tabWrapper` and `webviewContainer`. `src/selectors/index.json` lists the available versions.

## Configuration

`config.json` holds `styles` (paths relative to the payload) and `modules` (id to options, with
`enabled`). `build.json` is written by the installer: `vivarcdiVersion`, `vivaldiVersion`,
`payloadFingerprint`.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi rewrites `window.html` on update | Update hook and `reapply` |
| Vivaldi changes its DOM | One selector file per version; inactive on unknown older versions |
| macOS App Management blocks writes | Advisor with exact steps; open question on the launchd agent |
| Code with browser privileges | No remote code, no third-party code without review |
