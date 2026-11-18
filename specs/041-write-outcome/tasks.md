# 041 Write outcome: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/write-outcome`, with a patch version change in `package.json`, `package-lock.json` and
`installer/vivarcdi/__init__.py` (NFR-4). Each task ends green on `make check` and every existing
test keeps its name (NFR-3).

Order and parallel work: T1 and T2 touch different files and can run in parallel, each in its own
`vivarcdi-implementer` worktree from the same base commit. T3 needs both, and changes
`ModuleContext` and every test context, so it runs alone. T4 and T5 can run in parallel from the
commit that has T3. T6 comes last.

- [ ] **T1. Storage outcome.** `src/core/browser/SavingStorage.ts` (`StorageMode`, `SaveOutcome`,
  `SavingStorage`); `PersistentStorage.mode` and `save`, `setItem` built on `save`, `open` returning
  `SavingStorage`; `LocalSavingStorage` for the `localStorage` branch. `MemoryStorage` fakes in
  `tests/modules/reopen/fakes.ts` and `tests/modules/livefolders/fakes.ts` gain `mode` and `save`.
  Satisfies AC-1 to AC-4 in `tests/core/browser/PersistentStorage.test.ts`:
  `reports whether it saves to disk`, `resolves a confirmed write as saved`,
  `resolves a failed write as failed and keeps the value`, `resolves writes in memory as memory`.
  `ModuleContext` is not touched yet.
- [ ] **T2. Notice service.** `src/core/dom/Notices.ts` with `show`, `once`, `remove` and the
  `NoticeBoard` type; `RecordingToast` and `silentNotices()` in `tests/loader/fakes.ts`. Satisfies
  AC-10 in `tests/core/dom/Notices.test.ts`: `shows a keyed notice once per session`. Nothing uses
  it yet.
- [ ] **T3. Boot wiring.** `src/core/boot/NoticedStorage.ts` with the two storage texts and
  `announce`; `ModuleContext.storage: SavingStorage` and `ModuleContext.notices: NoticeBoard`;
  `VivArcDi.start` builds `Notices` under `#browser`, wraps the storage and announces the mode,
  `stop` removes the toast. The 18 test files that build a `ModuleContext` gain `notices`, and
  `PrivateWindow.test.ts` its `save`. Satisfies AC-7, AC-8 and AC-11:
  `warns once when nothing can be saved` and `shows no notice when saving works` in
  `tests/loader/VivArcDi.test.ts`, `warns once when a save fails` in
  `tests/core/boot/NoticedStorage.test.ts`.
- [ ] **T4. Archive waits for the save.** `ArchiveStore.add` returns the outcome, takes back the
  added entries when it is not `saved`, and loses its `@throws`; `ArchiveSweeper` takes `notices`,
  awaits the outcome, closes tabs only on `saved`, otherwise warns and shows the archive notice;
  `TodayArchive` passes `context.notices`. `OutcomeStorage` in `tests/modules/today/fakes.ts`.
  Satisfies AC-5, AC-6 and AC-9 in `tests/modules/today/ArchiveSweeper.test.ts`:
  `closes archived tabs only after the save`, `keeps the tabs open when the archive cannot be saved`
  (the existing test, rewritten for outcomes and **Clear**), `warns once when Today tabs stay open`.
- [ ] **T5. Docs and version.** `docs/architecture.md`: the context paragraph names `storage` with
  `save` and `mode`, and `notices`. Patch version bump, checked with
  `npm run release -- check --base origin/main --branch fix/write-outcome`.
- [ ] **T6. Manual check.** Italian checklist for AC-12 under `~/Desktop/sonde-vivarci/041-write-outcome/`:
  open a window on macOS and Debian with saving working, see no toast, let a stale Today tab be
  archived and restore it, and use **Clear**. When Tore reports it green, the spec becomes
  `Implemented`.
