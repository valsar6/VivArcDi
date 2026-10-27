# 009 Bookmark folders in the tab bar: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Tasks T1 and T2 may already exist from 003; the first of the two
features to be implemented creates them.

- [x] **T1.** `BrowserBookmarks`, `BookmarkFolderFinder`, `BookmarkNode` in `src/core/bookmarks`.
- [x] **T2.** `TabBarAnchor`, `TabData`, and `AddressKey` moved to `src/core`.
- [x] **T3.** `FolderTree`: tree of folders and links with the rules of FR-6. AC-1, AC-2.
- [x] **T4.** `FolderTreeSource`: root lookup, rebuild once per frame on bookmark events. AC-3, AC-8.
- [x] **T5.** `OpenFolders`: saved and restored ids. AC-7.
- [x] **T6.** `OpenLinks`: link to open tab by window, workspace and address key. AC-6.
- [x] **T7.** `LinkActivator`: activate, reload, or create with the workspace id. AC-4, AC-5.
- [x] **T8.** `FolderSectionView` and `folders.scss`: rows, indentation, dots, open links below closed
  folders, scroll limit.
- [x] **T9.** `LinkKeyIndex`, `TabTargets`, `LinkedTabFinder`, and the predicate of
  `ActivationRecorder`. AC-9, AC-10.
- [x] **T10.** `BookmarkFolders` module, registry, `config.json`, README section, clean stop, version
  bump of the minor number on `features/bookmark-folders`.
- [x] **T11.** Manual verification checklist for Tore from AC-11 to AC-16
  (`phase-3/verifica-cartelle.md` in the project files).
- [ ] **T12.** Manual checks AC-11 to AC-16 on macOS and Debian.
