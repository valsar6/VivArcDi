# 004 Today tabs and keyboard: tasks

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes.

- [x] **T1.** `WorkspaceTabs` moved to `src/core` from `LinkActivator`; `TabData` gains `lastActive`;
  `ShortcutKeys`. 009's tests keep passing.
- [x] **T2.** Probe script for Tore: `vivExtData` of a stacked tab, `lastAccessed` after a restart,
  the bottom of `#tabs-container`, `navigator.clipboard` in the interface
  (`phase-4/diagnostica-archivio` in the project files; results pending).
- [x] **T3.** `ActivityClock` and `TodayTabPolicy`. AC-2, AC-4.
- [x] **T4.** `ActivityStamps`. AC-3.
- [x] **T5.** `ArchiveStore`. AC-5.
- [x] **T6.** `ArchiveSweeper`, sweep and "Clear". AC-1, AC-12.
- [x] **T7.** `ArchiveRestorer`.
- [x] **T8.** `ArchiveGroups`, `ArchiveSearch`, `ArchivePanelView`. AC-9.
- [x] **T9.** `ClearButton`, `ArchiveButton`, `today.scss`, `archive-keys` page script.
- [x] **T10.** `TodayArchive` module, registry, `config.json`, README section, clean stop.
- [x] **T11.** `UrlCopier`, `Toast`, `copy-keys` page script, `CopyUrl` module, `toast.scss`.
- [x] **T12.** `docs/native-settings.md`: auto-archive and copy URL move from "Still missing" to the
  modules; minor version bump on `features/today-archive`.
- [x] **T13.** Manual verification checklist for Tore from AC-6, AC-7, AC-8, AC-10, AC-11
  (`phase-4/verifica-archivio.md` in the project files).
- [x] **T14.** Manual checks on macOS and Debian (passed, Tore, 2026-10-31).
