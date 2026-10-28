# 011 Space header: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/space-header`, minor bump to 0.11.0.

- [ ] **T1.** Read-only probe for Tore: the `icon` field of `vivaldi.workspaces.list` and the element
  that draws a workspace icon in Vivaldi 8.2 (`spaces/diagnostica-icone-workspace.js` in the project
  files). Decides how the icon is drawn.
- [x] **T2.** Move `ActiveWorkspace` to `src/core`; `WorkspaceNames.iconOf`. AC-1, AC-3, AC-11.
- [x] **T3.** `SpaceCollapse` shared state. AC-5.
- [x] **T4.** `CollapsedSpaces`: one key per workspace, the area outside workspaces included. AC-10.
- [x] **T5.** `SpaceHeaderView`: arrow, icon or fallback, name, `Tabs` outside workspaces, click,
  `no-drag`; `space-header.scss`. AC-1, AC-4, AC-5.
- [x] **T6.** `FolderRows.build` with `collapsed`, `FolderSection` following `SpaceCollapse`. AC-6,
  AC-7.
- [x] **T7.** `CollapsedPinned`: hides unloaded, inactive pinned tabs of the active workspace; shows
  one when it gets loaded. AC-8, AC-9.
- [x] **T8.** `SpaceHeader` module wiring, switch of workspace, registry, `config.json`, disabled
  option, README section, version bump of the minor number. AC-2, AC-12.
- [ ] **T9.** Manual verification checklist for Tore from AC-13 to AC-16
  (`spaces/verifica-intestazione-space.md` in the project files).
- [ ] **T10.** Manual checks AC-13 to AC-16 on macOS and Debian.
