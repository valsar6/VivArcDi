# 040 Live folders writes: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/live-folders-writes`, with a patch version change from 0.59.1 to 0.59.2 in
`package.json`, `package-lock.json` and `installer/vivarcdi/__init__.py` (NFR-5). Each task ends
green on `make check`, and every existing test of 026 keeps its name and passes (NFR-4).

Order and parallel work: T1 and T3 touch different files and can run in parallel, each in its own
`vivarcdi-implementer` worktree from the same base commit. T2 needs the store and the `HeldGithub`
fake of T1 (its tests fail without them), so it starts from the commit that has T1; T3 touches no
file of T2 and may still be running then. T4 comes last, after T1 to T3 are merged.

- [x] **T1. Store reads fresh and patches per change.** In
  `src/modules/livefolders/LiveFolderStore.ts`: drop `#folders` and the read in the constructor;
  `workspaces`, `folders`, `all`, `find` read `#read()` at each call; `add`, `update`, `remove`
  read, change only what they name and write; `update` returns `false` and `remove` writes nothing
  for an id that is not saved; `#read` warns once per store; constructor JSDoc updated. Add
  `HeldGithub` to `tests/modules/livefolders/fakes.ts`. Satisfies AC-1 to AC-5 and AC-8 in
  `tests/modules/livefolders/LiveFolderStore.test.ts`:
  `reads the live folders saved by another window`,
  `adds a folder without dropping the folders of another window`,
  `changes only the given fields of a folder`,
  `does not bring back a folder deleted in another window`,
  `removes only the given folder`,
  `warns once when the saved live folders are damaged`.
- [x] **T2. Refresher keeps changes from other windows.** One sentence in the class JSDoc of
  `src/modules/livefolders/LiveFolderRefresher.ts` (a refresh changes only the rows, the archived
  rows, the warning and the refresh time, as saved when GitHub answers); `setup` in
  `tests/modules/livefolders/LiveFolderRefresher.test.ts` takes an optional `HeldGithub`. Satisfies
  AC-6 and AC-7 in that file: `a refresh keeps a rename made in another window`,
  `a refresh keeps rows archived in another window`. No other code change; if one turns out to be
  needed, stop and report it, since the design says none is.
- [x] **T3. Docs and version.** `docs/manual/live-folders.md`: a short paragraph that, with several
  windows open, a change made in one window stays, and the others show it at their next refresh,
  within `refreshMinutes`. `specs/026-live-folders/design.md`: the `LiveFolderStore` row says the
  folders are read at each call and saved per change (spec 040). Patch version bump to 0.59.2,
  checked with `npm run release -- check --base origin/main --branch fix/live-folders-writes`.
- [ ] **T4. Manual check.** Italian checklist for AC-9 under
  `~/Desktop/sonde-vivarci/040-live-folders-writes/` (probe T6 of the storage review): on macOS
  and Debian, open two Vivaldi windows with a connected live folder, rename it in the first window,
  wait for the second window's refresh (`refreshMinutes`, five by default) and check that both show
  the new name; then delete a second live folder in one window, wait for the other's refresh, and
  check that it stays deleted; restart Vivaldi and check both again. When Tore reports it green,
  the spec becomes `Implemented`.
