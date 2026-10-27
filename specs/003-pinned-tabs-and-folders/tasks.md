# 003 Pinned tabs: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

- [ ] **T1.** Move `AddressKey`, `TileUnloader` (as `TabUnloader`) and `PageScriptInjector` to
  `src/core/`, the injector generic; `peek` and `reopen-pinned` use them, their tests pass unchanged.
- [ ] **T2.** `TabData`: read the workspace id, read and write the `vivarcdi` key, keep every other
  key; `Workspace` and `TabTiler` use it.
- [ ] **T3.** `GlobalPinnedTabs` and the new rule of `FavoriteTagger`, CSS `order` for tiles, fallback
  without `chrome.tabs`. AC-1.
- [ ] **T4.** `SavedAddresses` and `PinWatcher`. AC-2, AC-3, AC-4.
- [ ] **T5.** `AwayTabs`, `PinnedSlotMarker` and the reset arrow in `pinned.scss`. AC-5.
- [ ] **T6.** `ResetClick` for rows and for the active tile. AC-6.
- [ ] **T7.** `CloseShortcut` in the interface, close button, page script `pinned-keys`. AC-7, AC-8.
- [ ] **T8.** `PinnedTabs` module, registry, `config.json`, selectors, separator after pinned rows,
  clean stop.
- [ ] **T9.** 007 matches and dates pinned tabs by their saved address when they have one.
- [ ] **T10.** Version 0.6.0 on `features/pinned-tabs`, README and `docs/native-settings.md`, note in
  001 that 003/FR-1 replaces its tile rule, manual checklist for AC-9 to AC-13
  (`phase-3/verifica-pinned.md` in the project files).
- [ ] **T11.** Manual checks AC-9 to AC-13 on macOS and Debian.
