# 037 Versioned storage: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/versioned-storage`, with a patch version change from 0.59.2 to 0.59.3 in `package.json`,
`package-lock.json` and `installer/vivarcdi/__init__.py` (NFR-5, Q-6). Each task ends green on
`make check`, and every existing test keeps its name and passes (NFR-4). No task changes a stored
value (NFR-1).

Order and parallel work:

- **T1 runs alone, first.** It adds the format, the reader and its guard, wires them into the boot
  and gives the shared storage fakes `read`, so that every store task starts from a working reader.
- **T2 to T6 run in parallel**, each in its own `vivarcdi-implementer` worktree from the commit that
  has T1. They touch disjoint source folders and disjoint test files; the shared fakes are already
  done in T1. Only T5 and T6 both import `tests/modules/reopen/fakes.ts`, and neither changes it.
- **T7 runs alone** once T2 to T6 are merged, since its test builds every store.
- **T8** (docs and version) touches no source file and may run in parallel with T2 to T6.
- **T9** comes last.

- [x] **T1. Format and reader.** `src/core/browser/StoredFormat.ts` (`ReadStatus`, `StoredRead`,
  `Readout`, `Upgrade`, `FormatRules`, `StoredReader`, `ReadingStorage`, `VersionedStorage`,
  `StoredFormat` with `version`, `decode`, `encode`, and the envelope members `vivarcdi:version`
  and `vivarcdi:data`); `src/core/boot/GuardedStorage.ts` (`read`, the per-key hold of a newer
  value, the recovery copy under `vivarcdi.recovery.<name>` kept once, the two notices, one warning
  per key, `recoveryKeyOf`); `WindowServices.open` takes the logger and returns the
  `GuardedStorage`; `VivArcDi.start` passes `this.#logger`; `ModuleContext.storage:
  VersionedStorage`. Test fakes: `read` on `MemoryStorage` in `tests/modules/reopen/fakes.ts` and
  `tests/modules/livefolders/fakes.ts` and on `OutcomeStorage` in `tests/modules/today/fakes.ts`;
  `guarded(inner, logger?)` in `tests/loader/fakes.ts`. No store changes yet. Satisfies AC-1, AC-3,
  AC-4 and AC-10 in `tests/core/browser/StoredFormat.test.ts`:
  `reads a value without a version as version 1`, `saves a version 1 value as before`,
  `saves a later version in an envelope`, `treats a bad version as unreadable`; and AC-2, AC-5 to
  AC-9 and AC-12 in `tests/core/boot/GuardedStorage.test.ts`:
  `upgrades an older value in order without writing`,
  `keeps a newer value read-only for the session`,
  `warns once about data from a newer version`,
  `keeps a copy of an unreadable value before overwriting it`,
  `does not replace an existing recovery copy`, `warns once about unreadable data`,
  `shows no notice and keeps no copy for readable data`.
- [x] **T2. Archive.** `src/modules/today/ArchiveStore.ts`: `FORMAT` (empty `[]`, rejects a
  non-array, skips entries that fail `#isEntry`), reads through `storage.read`, writes
  `FORMAT.encode`; `#read`, the malformed-entries warning and the `logger` parameter go;
  `src/modules/today/TodayArchive.ts` stops passing the logger. In
  `tests/modules/today/ArchiveStore.test.ts`, `skips malformed entries and warns once` builds the
  store over `guarded(...)` with its recording logger; the other archive tests drop the logger
  argument and keep their bodies.
- [x] **T3. Live folders and GitHub connection.** `src/modules/livefolders/LiveFolderStore.ts`:
  `FORMAT` (empty `{}`, rejects a non-object, skips a workspace that is not an array and a folder
  `#folderFrom` cannot read, not rows or archived ids), `#read` builds the map from `.value`,
  `#warned` and the read warning go, `#write` uses `FORMAT.encode` (FR-9).
  `src/modules/livefolders/GithubConnection.ts`: `FORMAT` (empty `null`, rejects a non-object).
  In `tests/modules/livefolders/LiveFolderStore.test.ts`,
  `warns once when the saved live folders are damaged` (040/AC-8) builds the store over
  `guarded(...)` and also expects `vivarcdi.recovery.liveFolders` to hold `{not json`.
- [x] **T4. Links and folders.** `src/shared/links/LastOpenedStore.ts` (empty `{}`, rejects a
  non-object, skips members that are not numbers; expired dates are not skipped; the write warning
  stays), `src/modules/folders/tree/OpenFolders.ts` (empty `[]`, rejects a non-array, skips
  non-texts; the read `try`/`catch` goes), `src/modules/folders/favoritelinks/CreatedLinks.ts`
  (same rule as `OpenFolders`). Existing tests in `tests/modules/reopen/`,
  `tests/modules/folders/tree/OpenFolders.test.ts` and
  `tests/modules/folders/favoritelinks/CreatedLinks.test.ts` keep their bodies.
- [x] **T5. Little Arc.** `src/modules/littlearc/LittleArcRegistry.ts` (empty `[]`, rejects a
  non-array, skips ids that are not whole numbers). The inline storage of
  `tests/modules/littlearc/logic.test.ts` gains `read`.
- [x] **T6. Workspace sync.** `src/modules/workspacesync/SyncBase.ts` and `SpaceBase.ts` (empty
  `null`, reject anything but a fully valid array, never skip), `SpaceIds.ts` (empty `{}`, rejects a
  non-object, skips links that are neither a text nor `{ detached: text }`), `MissingSpaces.ts`
  (empty `[]`, rejects a non-array, skips non-texts). `set` and `#save` compare and write
  `FORMAT.encode(...)`. Tests in `tests/modules/workspacesync/` keep their bodies.
- [x] **T7. Every key through the reader.** `tests/structure/StoredKeys.test.ts` with a `ReadLog`
  storage. Satisfies AC-11: `every stored JSON key reads through the shared reader`, covering the
  eleven rows of the spec's table and failing on any file under `src/modules/` or `src/shared/` that
  has both `getItem(` and `JSON.parse(`. If it finds a store that T2 to T6 missed, stop and report
  it rather than widening the task.
- [x] **T8. Docs and version.** `docs/architecture.md`: the context paragraph says that `storage`
  also has `read(key, format)` for JSON values, with versions, the read-only hold and the recovery
  copy (spec 037). `docs/manual/getting-started.md`: a short section **Saved data** after
  **Updates**: VivArcDi keeps its data under `vivarcdi.*` keys; after going back to an older
  version, data from the newer one is shown but not changed, with a notice; a value that cannot be
  read is copied once to `vivarcdi.recovery.<name>` (with the GitHub connection, that copy may hold
  the token); how to put a copy back from the console of `window.html` with
  `chrome.storage.local.get` and `chrome.storage.local.set`, then restart Vivaldi; and how to remove
  it. `specs/040-live-folders-writes/spec.md` FR-7 and `specs/041-write-outcome/spec.md` (the notice
  list) each get a line that points to 037. Patch version bump to 0.59.3, checked with
  `npm run release -- check --base origin/main --branch fix/versioned-storage`.
- [ ] **T9. Manual check.** Italian checklist for AC-13 under
  `~/Desktop/sonde-vivarci/037-versioned-storage/`: on macOS and Debian, before installing, note
  the archive entries, the live folders, the open folders of two workspaces and the Favorites; then
  install 0.59.3 over Tore's own profile, restart Vivaldi, and check that all of them are as before,
  that no toast appears, and that the DevTools console of `window.html` shows no
  `could not read vivarcdi.` warning and `chrome.storage.local.get(null)` lists no
  `vivarcdi.recovery.` key. When Tore reports it green, the spec becomes `Implemented`.
