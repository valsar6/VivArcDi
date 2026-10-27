# 003 Favorites and pinned tabs: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

- [x] **T1.** Move `AddressKey`, `TileUnloader` (as `TabUnloader`) and `PageScriptInjector` to
  `src/core/`, the injector generic; `TabData` for `vivExtData`, used by `Workspace` and `TabTiler`.
  Existing tests pass unchanged.
- [x] **T2.** `src/core/bookmarks/`: `BrowserBookmarks`, `BookmarkFolderFinder`, `BookmarkNode`,
  and `src/core/TabBarAnchor.ts` (shared with 009; whichever lands first creates them).
- [x] **T3.** `FavoritesFolder`. AC-1, AC-2.
- [x] **T4.** `LinkedTabs` and `FavoriteOpener`, unlink on removed bookmark. AC-3, AC-4, AC-13.
- [x] **T5.** `FavoritesView`, glow, dimming, middle click, fallback to `FavoriteTagger` without the
  folder; `favorites.scss`. AC-5.
- [x] **T6.** `SavedAddresses` and `PinWatcher`. AC-6, AC-7, AC-8.
- [x] **T7.** `AwayTabs`, `TabBarMarker`, `ResetClick`, reset of the active tile; `pinned.scss` with
  hidden slots, reset arrow and separator. AC-9, AC-10.
- [x] **T8.** `CloseShortcut` and page script `pinned-keys`. AC-11, AC-12.
- [x] **T9.** `PinnedTabs` module, registry, `config.json`, selectors, clean stop of both modules.
- [x] **T10.** 007 matches and dates pinned tabs by their own page.
- [x] **T11.** Version 0.6.0 (shared with 009, which is in the same pull request); README; note in 001 that 003 replaces its
  tile rule; manual checklist for AC-14 to AC-19 with the setup of the `Favorites` folder
  (`phase-3/verifica-favorites-pinned.md` in the project files).
- [ ] **T12.** Manual checks AC-14 to AC-19 on macOS and Debian.
