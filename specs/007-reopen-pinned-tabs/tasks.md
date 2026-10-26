# 007 Reopen pinned tabs: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

- [x] **T1.** `AddressKey`. AC-1, AC-2.
- [x] **T2.** `BrowserTabs.remove`, `reload`, `onCreated`.
- [x] **T3.** `NewTabWatcher`: empty tabs only, first web navigation, once. AC-6.
- [x] **T4.** `LastOpenedStore` and `ActivationRecorder`. AC-8.
- [x] **T5.** `Workspace` and `PinnedTabFinder`, most recently opened first. AC-5.
- [x] **T6.** `TabSwitcher`: activate, reload if unloaded, remove the new tab, keep it on failure.
  AC-3, AC-4, AC-7.
- [x] **T7.** `ReopenPinned` module, registry, `config.json`, clean stop.
- [x] **T8.** Version 0.5.0 on `features/reopen-pinned`, README section, manual checklist for AC-9
  and AC-11 (`phase-3/verifica-riapertura.md` in the project files).
- [ ] **T9.** Manual checks AC-9 and AC-11 on macOS and Debian; AC-10 once 003 is implemented.
