# 030 Workspace sync: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/workspace-sync-code`, next minor version.

- [x] **T1.** `BookmarkWriter.describe` and `WorkspaceTabs.openPinned`, with unit tests. Done when
  their tests pass.
- [x] **T2.** `PinnedMerge`: three-way merge of ordered key lists, first run as a union, order rule.
  Satisfies AC-1, AC-2, AC-3, AC-7. Done when `copies a newly pinned tab`, `removes an unpinned tab from
  the copy`, `stores the order of pinned tabs` and `does not echo applied changes` pass.
- [x] **T3.** `SyncStore` and `SyncBase`: the `VivArcDi Sync` folder, one subfolder per workspace name,
  `Pinned` and `Settings`; base lists in the persistent storage. Satisfies AC-8, AC-10. Done when
  `matches workspaces across computers` and `falls back when the sync store fails` pass.
- [x] **T4.** `LocalPinned` and `PinnedApplier`: read the pinned tabs of each workspace; open missing
  ones unloaded, close or unpin removed ones, reorder. Satisfies AC-4, AC-5, AC-6. Done when `opens a
  missing pinned tab unloaded`, `closes a pinned tab removed elsewhere` and `keeps a busy tab removed
  elsewhere` pass.
- [x] **T5.** `WindowOwner`, `MissingSpaces` and the `WorkspaceSync` module with its triggers, debounce
  and `config.json` options; register it. Satisfies AC-11, AC-16. Done when `does nothing when disabled`
  and `names a workspace missing here once` pass.
- [x] **T6.** `WorkspaceSettings` with a sample key in the tests. Satisfies AC-9. Done when `keeps
  workspace settings in the sync store` passes. 019 uses it for its color when it is built.
- [x] **T7.** README, user manual page on sync, version bump. Done when `make check` passes.
- [ ] **T8.** Write the manual verification checklist for Tore (Italian, in the project files) from
  AC-12, AC-13, AC-15, and AC-14 once 019 exists.
