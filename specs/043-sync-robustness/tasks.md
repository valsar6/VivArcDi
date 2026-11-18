# 043 Sync robustness: tasks

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/sync-robustness`, with a patch version change in `package.json`, `package-lock.json`
and `installer/vivarcdi/__init__.py`. Each task ends green on `make check`. T2 and T3 both change
`SyncPass.ts`, `SpaceSync.ts` and `WorkspaceSync.test.ts`, so they run one after the other, not in
parallel.

- [x] **T1. Reserved names.** `SyncNames.RESERVED_NAMES` and `SyncNames.reserved`, with the
  collision of each name in the comment. Done when the module compiles and nothing else changes.
- [x] **T2. Skip reserved names.** `SyncPass` leaves them out and warns once per name; `SpaceSync`
  moves no store folder or base for a rename from or to a reserved name; `WorkspaceSettings` reads
  and writes nothing for them. Satisfies AC-1 to AC-6. Done when their six tests pass.
- [x] **T3. Missing store.** `StoredSpace.pinned` nullable and `SpaceList.read` returning `null`
  for a missing folder; `SyncPass` and `SpaceSync` merge as a first run when the folder is missing
  and the base is not empty, and warn once per session. Satisfies AC-7 to AC-11. Done when their
  five tests pass and every existing sync test keeps its name and passes (NFR-1).
- [x] **T4. Manual and version.** A short paragraph in `docs/manual/sync.md`: the reserved names,
  and what happens when the sync folder is deleted. Patch version bump, checked with
  `npm run release -- check --base origin/main --branch fix/sync-robustness`.
- [x] **T5. Manual check.** Italian checklist for Tore from AC-12 to AC-14, on a test profile, under
  `~/Desktop/sonde-vivarci/043-sync/`. Done when Tore reports it green on macOS and Debian; then
  the spec becomes `Implemented`.
