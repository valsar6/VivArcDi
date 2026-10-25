# 002 Peek: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

- [x] **T1.** `SiteComparator`. AC-12, AC-13.
- [x] **T2.** `LinkClassifier` with one rule per trigger. AC-9, AC-10.
- [x] **T3.** Page script `src/page/peek-links.ts` and its bundling in `scripts/build.mjs`.
- [x] **T4.** `BrowserTabs.create`, `update`, `onActivated`.
- [x] **T5.** `PageScriptInjector`: inject on `loadcommit`, remove on stop.
- [x] **T6.** `PeekPanel` and `peek.scss`: backdrop, panel, webview, buttons.
- [x] **T7.** `PeekController`: open, replace, close, expand, fallback. AC-11, AC-14.
- [x] **T8.** `TabTiler` and Split with fallback to Expand.
- [x] **T9.** `PeekKeys` and the panel key script.
- [x] **T10.** `Peek` module, registry, `config.json`, clean stop. AC-15.
- [x] **T11.** Version 0.4.0, README section, manual checklist for AC-1 to AC-8
  (`phase-2/verifica-peek.md` in the project files).
- [ ] **T12.** Manual checks AC-1 to AC-8 on macOS and Debian.
