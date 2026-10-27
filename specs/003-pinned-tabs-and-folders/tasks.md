# 003 Favorites and pinned tabs: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

- [ ] **T1.** Move `AddressKey`, `TileUnloader` (as `TabUnloader`) and `PageScriptInjector` to
  `src/core/`, the injector generic; `TabData` for `vivExtData`, used by `Workspace` and `TabTiler`.
  Existing tests pass unchanged.
- [ ] **T2.** `src/core/bookmarks/`: `BrowserBookmarks`, `BookmarkFolderFinder`, `BookmarkNode`,
  and `src/core/TabBarAnchor.ts` (shared with 009; whichever lands first creates them).
- [ ] **T3.** `FavoritesFolder`. AC-1, AC-2.
- [ ] **T4.** `LinkedTabs` and `FavoriteOpener`, unlink on removed bookmark. AC-3, AC-4, AC-13.
- [ ] **T5.** `FavoritesView`, glow, dimming, middle click, fallback to `FavoriteTagger` without the
  folder; `favorites.scss`. AC-5.
- [ ] **T6.** `SavedAddresses` and `PinWatcher`. AC-6, AC-7, AC-8.
- [ ] **T7.** `AwayTabs`, `TabBarMarker`, `ResetClick`, reset of the active tile; `pinned.scss` with
  hidden slots, reset arrow and separator. AC-9, AC-10.
- [ ] **T8.** `CloseShortcut` and page script `pinned-keys`. AC-11, AC-12.
- [ ] **T9.** `PinnedTabs` module, registry, `config.json`, selectors, clean stop of both modules.
- [ ] **T10.** 007 matches and dates pinned tabs by their own page.
- [ ] **T11.** Version 0.6.0 on `features/pinned-tabs`; README; note in 001 that 003 replaces its
  tile rule; manual checklist for AC-14 to AC-19 with the setup of the `Favorites` folder
  (`phase-3/verifica-favorites-pinned.md` in the project files).
- [ ] **T12.** Manual checks AC-14 to AC-19 on macOS and Debian.
