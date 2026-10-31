# 013 Incognito mode: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/incognito-mode`, minor bump to 0.14.0.

- [x] **T1.** Probes for Tore on a private window: a mod cannot play shortcuts (2026-10-30 and
  2026-10-31); selectors of the address field (`input.UrlBar-UrlField`) and of Vivaldi's Downloads
  button found (2026-10-31).
- [ ] **T2.** `BrowserRuntime.isPrivateWindow()`, `Module.privateWindows`, `ModuleRegistry.createEnabled`
  with the window kind, `VivArcDi` detection, policies of the existing modules. AC-1, AC-2, AC-3,
  AC-11.
- [ ] **T3.** Test that no storage write happens in a private window, with and without `incognito`.
  AC-10.
- [ ] **T4.** Move `KeptElement` to `src/core`; `BottomBar` and `BarButton`. AC-4.
- [ ] **T5.** `AddressField`, `DownloadsButton`, `CommandLauncher` (`newTab`, `openLibrary`). AC-7,
  AC-8, AC-9.
- [ ] **T6.** `PrivateTabs.clear()`. AC-5, AC-6.
- [ ] **T7.** `IncognitoHeader`, `NewTabRow`, `incognito.scss`, selectors of the catalog. AC-4.
- [ ] **T8.** `Incognito` module wiring, mark, registry, `config.json`, disabled option, README
  section, minor version bump. AC-12.
- [ ] **T9.** Manual verification checklist for Tore from AC-13 to AC-16
  (`incognito/verifica-incognito.md` in the project files).
- [ ] **T10.** Manual checks AC-13 to AC-16 on macOS and Debian.
