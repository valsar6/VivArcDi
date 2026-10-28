# 010 Folders per workspace: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/folders-per-workspace`, minor bump to 0.10.0.

- [ ] **T1.** `BrowserPrefs` and `WorkspaceNames` in `src/core`. AC-13.
- [ ] **T2.** `WorkspaceRoots`: parsing of `root` and `workspaces`, fallback, invalid options ignored and
  logged. AC-1, AC-3, AC-8.
- [ ] **T3.** `FolderTreeSource.useRoot` and the missing-root warning once per path. AC-7.
- [ ] **T4.** `OpenFolders.useWorkspace` with a storage key for each workspace, the existing key kept
  for the area outside workspaces. AC-5.
- [ ] **T5.** `ActiveWorkspace`: workspace of the active tab, reported on change. AC-2.
- [ ] **T6.** `FolderSection` and `BookmarkFolders` wiring; the element is hidden while the root is
  empty. AC-2, AC-4.
- [ ] **T7.** Tests that `OpenLinks` and `LinkActivator` keep link tabs inside the active workspace
  when two workspaces show the same bookmark. AC-6.
- [ ] **T8.** `config.json` (`workspaces`, `root` default), README section, version bump of the minor
  number.
- [ ] **T9.** Check that a reinstall keeps Tore's own `root`; fix the installer merge if it does not.
- [ ] **T10.** Manual verification checklist for Tore from AC-9 to AC-12
  (`phase-3/verifica-cartelle-workspace.md` in the project files).
- [ ] **T11.** Manual checks AC-9 to AC-12 on macOS and Debian.
