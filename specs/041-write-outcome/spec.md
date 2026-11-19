# 041 Write outcome

| | |
|---|---|
| Status | Implemented |
| Phase | 0 |
| Owner | Tore |
| Approved | 2026-11-18 |
| Amends | [004 Today tabs and keyboard](../004-today-tabs-and-keyboard/spec.md) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

VivArcDi keeps its data (archive, live folders, folder states, dates) in `chrome.storage.local`
through `PersistentStorage`. The storage review of 2026-11-17 found that no module can tell whether
a write reached the disk:

- `setItem` changes the memory copy at once and writes in the background. A failed write leaves
  one console warning, and the memory copy keeps the value as if it were saved (finding 2a).
- When `chrome.storage.local` is missing or cannot be read, the storage works in memory only, with
  one console warning; modules cannot tell (finding 6).
- The archive of 004 closes Today tabs right after `ArchiveStore.add`, which it believes throws on
  failure. It never does, so a failed save closes the tabs and loses them (finding 2b).

This spec lets the storage say how a write went, makes the archive close tabs only after the save is
confirmed, and tells the user once per session, with a toast, when VivArcDi cannot save. It also
defines the shared toast service that later specs reuse (039 boot self-check, the reserved-name
notice of 043).

## User stories

- **US-1.** As a user, I want a Today tab to close only when its archive entry is saved, so that
  nothing I had open disappears.
- **US-2.** As a user, I want to know when VivArcDi cannot save, instead of finding out after a
  restart that folders, dates or archived tabs are gone.
- **US-3.** As a developer of a module, I want to wait for the outcome of a write when losing it
  would lose user data, and to ignore it otherwise.

## Expected behavior

### Today

| Case | What happens | Where |
|---|---|---|
| A write fails (`runtime.lastError`, or `set` throws) | One console warning per session; the memory copy keeps the new value; the caller is never told | `PersistentStorage.ts` `setItem`, `#checkWrite`, `#warn` |
| `chrome.storage.local` missing or unreadable at start | One console warning; values live in memory until restart; modules cannot tell | `PersistentStorage.open` |
| The archive saves stale Today tabs | `ArchiveStore.add` calls `setItem`, which does not throw on a failed save; the tabs are closed anyway | `ArchiveSweeper.ts` `#archive`, `ArchiveStore.add` (its JSDoc says it throws) |
| A module shows a message | Each module builds its own `Toast` (`copy-url`, `live-folders`, `workspace-sync`, folder editing); two of them can show at once | `core/dom/Toast.ts` |

### After

**Storage.** The storage has a **mode**: `persistent` when it writes to `chrome.storage.local`,
`memory` when it cannot (missing or unreadable at start). Besides `setItem`, which stays as it is
for every caller that does not care, it offers a write that **reports its outcome**: `saved` once
`chrome.storage.local` confirms it, `failed` when the write fails, `memory` when the storage works
in memory only. A failed write still keeps the value in memory, so the session goes on working as
today; only the outcome tells the truth.

**Archive.** The sweep and the **Clear** button save the entries first and wait for the outcome.
Only `saved` closes the tabs. With `failed` or `memory`, the tabs stay open, nothing is added to
the archive, and the next sweep tries again a minute later.

**Notice.** The first time in a window's session that VivArcDi cannot save, the window shows one
toast, kind `error`:

- at start, when the storage works in memory only:
  `VivArcDi cannot save its data: changes last until Vivaldi restarts`;
- on the first failed write:
  `VivArcDi could not save its data: changes may be lost when Vivaldi restarts`;
- when the archive keeps tabs open because of either:
  `Today tabs stay open: VivArcDi cannot save the archive`.

Each text shows at most once per window session; the console warnings stay as they are.

Spec 037 adds two notices to this list, for data from a newer version and for unreadable data.

**Toast service.** The module context gains one shared notice service, backed by a single `Toast`
element per window. It shows a message now, or once per session under a key. Modules that already
build their own `Toast` keep it; moving them to the service is out of scope.

## Requirements

### Functional

- **FR-1.** The storage exposes its mode, `persistent` or `memory`, fixed when it opens.
- **FR-2.** The storage offers a write that resolves with `saved`, `failed` or `memory`, and never
  rejects. `saved` means `chrome.storage.local` called back without `runtime.lastError`.
- **FR-3.** `setItem` keeps its signature and behavior; it uses the same write and ignores the
  outcome.
- **FR-4.** A failed write keeps the new value in memory (no rollback).
- **FR-5.** The archive closes Today tabs only after their entries are saved with outcome `saved`.
  With any other outcome the tabs stay open, the archive does not list them, and the console logs
  one warning.
- **FR-6.** The sweep and **Clear** follow FR-5 alike; the next sweep tries again.
- **FR-7.** `ArchiveStore.add` returns the outcome of its write; its JSDoc no longer says it throws.
- **FR-8.** When the storage opens in `memory` mode, the window shows the start notice once.
- **FR-9.** The first write with outcome `failed` in a window's session shows the failure notice
  once, whoever wrote.
- **FR-10.** When FR-5 keeps tabs open, the window shows the archive notice once per session.
- **FR-11.** `ModuleContext.notices` shows a toast now (`show(text, kind)`) or once per window
  session under a key (`once(key, text, kind)`), through one shared toast element per window.

### Non-functional

- **NFR-1.** With a working `chrome.storage.local`, nothing changes for the user: no toast, same
  timing of the archive within the one-minute sweep.
- **NFR-2.** No new storage key and no change to the stored values.
- **NFR-3.** Every existing test keeps its name and passes.
- **NFR-4.** Ships on a `fix/` branch with a patch version change.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names the test, `manual` is a step Tore
performs.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE storage SHALL report `persistent` with `chrome.storage.local` and `memory` without it or when it cannot be read | auto: `reports whether it saves to disk` |
| AC-2 | WHEN `chrome.storage.local` confirms a write, THE storage SHALL resolve it as `saved` | auto: `resolves a confirmed write as saved` |
| AC-3 | IF a write fails, THEN THE storage SHALL resolve it as `failed`, keep the value in memory and never reject | auto: `resolves a failed write as failed and keeps the value` |
| AC-4 | WHILE the storage works in memory only, THE storage SHALL resolve every write as `memory` | auto: `resolves writes in memory as memory` |
| AC-5 | WHEN the sweep saves the entries of stale Today tabs, THE module SHALL close them only after the outcome `saved` | auto: `closes archived tabs only after the save` |
| AC-6 | IF the archive cannot be saved, THEN THE sweep and Clear SHALL leave the tabs open and the archive unchanged | auto: `keeps the tabs open when the archive cannot be saved` |
| AC-7 | WHEN the storage opens in memory, THE window SHALL show the start notice once | auto: `warns once when nothing can be saved` |
| AC-8 | WHEN a write fails for the first time, THE window SHALL show the failure notice once, and SHALL NOT show it for later failures | auto: `warns once when a save fails` |
| AC-9 | WHEN the archive keeps tabs open, THE window SHALL show the archive notice once per session | auto: `warns once when Today tabs stay open` |
| AC-10 | THE notice service SHALL show a keyed message once per session and an unkeyed one every time, in one toast element | auto: `shows a keyed notice once per session` |
| AC-11 | WHILE saving works, THE window SHALL show no notice | auto: `shows no notice when saving works` |
| AC-12 | WHEN Tore opens a window with saving working on macOS and Debian, THE window SHALL show no toast and the Today archive SHALL work as before | manual |

AC-12 is the only manual step: a failing `chrome.storage.local` cannot be produced on a real
Vivaldi without breaking the profile, so the failure paths are covered by the tests.

## Out of scope

- A cap on the archive size or on `data:` favicons: waits for probe T1 (quota and sizes).
- Moving the existing module toasts to the notice service.
- Rolling back the memory copy after a failed write (FR-4; see Q-1).
- Reading `localStorage` first (spec 044) and versioned values (spec 037).
- Retrying failed writes other than through the next sweep.

## Open questions

- [x] **Q-1. Rollback.** After a failed write, should the memory copy go back to the old value?
  Answered (Tore, 2026-11-18): no. The user keeps seeing what they did for the rest of the session, the notice says it
  may be lost, and the archive, the only place where losing it closes tabs, waits for `saved`.
- [x] **Q-2. Memory mode and the archive.** In `memory` mode the archive would close tabs into a
  list that disappears at restart. Answered (Tore, 2026-11-18): treat `memory` like `failed`: Today tabs stay open
  until saving works again, with the archive notice once.
- [x] **Q-3. Toast texts.** Answered (Tore, 2026-11-18): as in [After](#after), in English like the rest of the
  interface.

## References

- Storage review of 2026-11-17, findings 2a, 2b, 6 and the decisions for 041.
- [004 Today tabs and keyboard](../004-today-tabs-and-keyboard/spec.md): the archive and the sweep.
- [043 Sync robustness](../043-sync-robustness/spec.md): the reserved-name notice that waits for
  this service.
