# 018 Copy bookmarks into a workspace: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/copy-bookmarks`, minor bump of the version.

- [x] **T1.** Read-only probes for Tore on the panel's drag events and drag data
  (`copy-bookmarks/diagnostica-trascina-segnalibri.js` and `-2.js` in the project files). Done
  2026-11-08; results in the design.
- [ ] **T2.** `BookmarkWriter` gets `subTree`, `get` and `removeTree`, with tests on a fake API.
- [ ] **T3.** `BookmarkCopier`: depth-first copy in order, separators skipped, self-nesting refused,
  rollback on failure. AC-1, AC-2, AC-6, AC-8, AC-9, AC-10, plus a 500-bookmark test for NFR-2.
- [ ] **T4.** `DropPlace` taken out of `TabDrops` (its tests stay green) and
  `WorkspaceFavorites.copy`, which creates the root when missing. AC-3, AC-4, AC-5, AC-7.
- [ ] **T5.** `PanelDragData` and `PanelBookmarkDrop`: accept only `vivaldi/x-bookmarks` over a
  target, mark it, copy on drop, clear on leave and end; wired in `FolderDragDrop`. AC-11.
- [ ] **T6.** Version bump, README note on dragging bookmarks from the panel, `make check`.
- [ ] **T7.** Manual verification checklist for Tore from AC-12 to AC-15
  (`copy-bookmarks/verifica-copia-segnalibri.md` in the project files).
- [ ] **T8.** Manual checks on macOS and Debian.
