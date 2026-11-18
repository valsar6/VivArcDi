# 041 Write outcome: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

## Approach

Three pieces, each in its own place, and no change to the keys or the stored values (NFR-2).

**The storage reports what happened.** `PersistentStorage` keeps its memory copy and its single
background write, and gains two members: `mode`, fixed when it opens, and `save(key, value)`, a
promise that resolves with `saved`, `failed` or `memory` and never rejects. `save` changes the
memory copy before it returns, exactly as `setItem` does today, so a `getItem` right after it reads
the new value. `setItem` becomes `void this.save(key, value)`: same signature, same timing, outcome
ignored (FR-3). A failed write keeps the value in memory (FR-4, Q-1). The storage stays free of the
DOM: it only resolves outcomes and logs its console warning, as today.

**The boot turns outcomes into notices.** Modules never receive the storage itself any more but a
decorator, `NoticedStorage`, built in `VivArcDi.start` once the window's interface is ready. It
passes every call through and, when `save` resolves `failed`, calls
`notices.once('storage-failed', …, 'error')`. Since every `setItem` goes through `save`, the first
failed write of the session shows the notice whoever wrote (FR-9), and later failures are absorbed
by the key. Right after building it, the boot calls `announce()`, which shows the start notice when
the mode is `memory` (FR-8).

**The archive waits.** `ArchiveStore.add` returns the outcome of its write. `ArchiveSweeper`
awaits it and closes the tabs only on `saved` (FR-5). With `failed` or `memory` (Q-2) it logs one
warning, shows the archive notice through `notices.once`, and leaves the tabs open; the next sweep
tries again a minute later (FR-6). `ArchiveStore` takes back the entries it just added, so the
archive does not list tabs that are still open (FR-5, AC-6).

**One toast per window.** `Notices` (`src/core/dom/Notices.ts`) owns one `Toast`, created by the
boot with the `#browser` element as parent, and remembers the keys it has shown. It is a new field
of `ModuleContext`; existing modules keep their own `Toast` (out of scope).

```text
module ──save/setItem──▶ NoticedStorage ──▶ PersistentStorage ──▶ chrome.storage.local
                              │ failed                      (or LocalSavingStorage ──▶ localStorage)
                              ▼
ArchiveSweeper ──once──▶ Notices ──▶ Toast (one per window, under #browser)
```

### Rejected alternatives

- **A failure listener on `PersistentStorage`** (`onFailure`, wired by the boot to `notices.once`):
  the storage stays free of the DOM either way, but the `localStorage` branch would need the same
  listener, and the boot would need a type that modules must not see. The decorator covers both
  media with one class and keeps the module-facing type to `getItem`, `setItem`, `mode`, `save`.
- **`setItem` returning the outcome**: changes the signature for every caller (FR-3) and invites
  callers to forget the promise.
- **Rolling the memory copy back on failure**: excluded by Q-1.
- **The sweeper checking `storage.mode` before writing**: a second path for the same rule; treating
  `memory` as an outcome gives one path for `failed` and `memory` alike (Q-2).
- **A notice per failed write**: the spec asks for one per session; `once` under a fixed key does it
  without a flag in the storage.

## Components

### Storage (`src/core/browser/`)

| Class or file | Change | Pattern |
|---|---|---|
| `SavingStorage.ts` (new) | `type StorageMode = 'persistent' \| 'memory'`, `type SaveOutcome = 'saved' \| 'failed' \| 'memory'`, and `interface SavingStorage extends KeyValueStorage { readonly mode: StorageMode; save(key: string, value: string): Promise<SaveOutcome> }`, each with JSDoc. `KeyValueStorage` stays in `PersistentStorage.ts` and keeps every current user compiling | Interface segregation |
| `PersistentStorage.ts` | `implements SavingStorage`. `public readonly mode`: `memory` when built with `area === null`, else `persistent`. `save`: sets the cache, resolves `memory` without an area; otherwise calls `area.set` and resolves `saved` in the callback, or `failed` when `runtime.lastError` is set or `set` throws, after `#warn` (one warning per session, unchanged). `setItem` calls `save`. `#checkWrite` folds into `save`. `open` returns `Promise<SavingStorage>` | Promise adapter over a callback API |
| `LocalSavingStorage.ts` (new) | Wraps the `Storage` that `open` returns when the window has a working `localStorage`: `mode` is `persistent`, `getItem` delegates, `save` resolves `saved` after `setItem`, or `failed` with one warning when it throws (quota). `setItem` calls `save` | Adapter |

`PersistentStorage.ts` stays under the 200-line limit: `save` replaces the body of `setItem` and
`#checkWrite`, and the new types live in `SavingStorage.ts`.

`LocalSavingStorage.setItem` no longer throws on a full `localStorage`; today it does. The branch is
unused on Vivaldi 8.2 (no usable `localStorage` in `window.html`), every caller already catches, and
one behavior for both media is simpler. Spec 044 revisits this branch.

### Notices (`src/core/dom/Notices.ts`, new)

```ts
export type NoticeBoard = Pick<Notices, 'show' | 'once'>;

export class Notices {
  constructor(toast: Pick<Toast, 'show' | 'remove'>);
  public show(text: string, kind: ToastKind = 'ok'): void;
  public once(key: string, text: string, kind: ToastKind = 'ok'): void;
  public remove(): void;
}
```

- `show` passes the text to the toast every time; `once` does it only the first time it sees `key`
  in this window (a private `Set<string>`), and does nothing afterwards (FR-11, AC-10).
- One `Toast` per window: a new notice replaces the visible text and restarts its timer, as `Toast`
  already does, so two notices never stack.
- The boot builds it with `new Toast({ document, parent, durationMs: NOTICE_MS })`, with
  `NOTICE_MS = 8000` (the time `workspace-sync` gives its longer messages) and
  `parent = document.querySelector(selectors.get('browser')) ?? document.body`. `Toast` creates its
  element on the first `show`, so a window with no notice gets no element (NFR-1, AC-11).
  `toast.css` is already in the global `styles` list; no new style.
- `remove` is the boot's, called from `VivArcDi.stop`. Modules get the `NoticeBoard` type, so they
  cannot remove the shared toast.

### Boot (`src/core/boot/`)

| Class or file | Change |
|---|---|
| `NoticedStorage.ts` (new) | `implements SavingStorage`, built from a `SavingStorage` and a `NoticeBoard`. Delegates `getItem`, `mode`; `save` awaits the inner outcome and on `failed` calls `notices.once(STORAGE_FAILED_KEY, FAILED_TEXT, 'error')`; `setItem` is `void this.save(…)`. `announce()` calls `notices.once(STORAGE_MEMORY_KEY, MEMORY_TEXT, 'error')` when `mode` is `memory`. The two texts are those of the spec, as constants at the top of the file (Q-3) |
| `Module.ts` | `ModuleContext.storage: SavingStorage` (was `KeyValueStorage`; every existing reader still compiles, since `SavingStorage` extends it) and `ModuleContext.notices: NoticeBoard`, each with a one-line doc |
| `VivArcDi.ts` | `VivArcDiDependencies.storage?: SavingStorage`. In `start`, after `UiReadiness` and the styles: build `Notices`, wrap `this.#storage` in `NoticedStorage`, call `announce()`, and pass both to `#startModule`. `stop` calls `notices.remove()` after the modules stopped. `boot` is unchanged apart from the type `open` now returns |

`VivArcDi.ts` is at the line limit; if the new lines push it over, the creation of `Notices` and
`NoticedStorage` moves into one private static helper, or the context fields are grouped into a
small `#services` object passed to `#startModule`, whichever keeps `max-params` at 4.

The start notice belongs to the boot rather than to `open` because only `start` knows the
selectors, and `open` runs before Vivaldi's interface exists. Nothing writes before `start`, so no
failure can be missed in between.

### Archive (`src/modules/today/`)

| Class or file | Change |
|---|---|
| `ArchiveStore.ts` | Takes a `SavingStorage`. `add(entries): Promise<SaveOutcome>` writes with `save` and returns its outcome. When the outcome is not `saved`, it removes the entries it added from what is saved now, matched with `#same`, through `setItem`, so the archive does not list them; this reads the memory copy again, so a change another window made meanwhile is kept. The JSDoc drops `@throws` and states the outcome. `remove` keeps `setItem` and its outcome is ignored, as today |
| `ArchiveSweeper.ts` | `SweeperDependencies` gains `notices: Pick<NoticeBoard, 'once'>`; `store` is `Pick<ArchiveStore, 'add'>` with the new return type. `#archive` awaits `store.add`; on anything but `saved` it logs `could not save to the archive (<outcome>): the tabs stay open`, calls `notices.once('today-archive-kept', KEPT_TEXT, 'error')` and returns before any `tabs.remove`. The `try/catch` goes: `add` never rejects, and `#enqueue` still catches anything else. The class JSDoc already says a tab whose entry cannot be saved stays open |
| `TodayArchive.ts` | Passes `context.notices` to the sweeper. `#clear` is unchanged: it refreshes the panel after `sweeper.clear()`, which now shows the unchanged archive when the save failed |

`KEPT_TEXT` is `Today tabs stay open: VivArcDi cannot save the archive` (Q-3). In `memory` mode a
window therefore shows the start notice at boot and the archive notice on the first sweep that finds
a stale tab; they are different texts with different keys, as the spec lists them.

The removal after a failed `add` is the archive's own concern, not a storage rollback (Q-1): the
storage keeps whatever it is given, and the archive gives it the list without the tabs that stayed
open. In `failed` mode that second write may succeed; then the disk holds the archive as it was,
which is the right state.

### Tests

Names identical to the `auto:` checks.

| AC | Test | File |
|---|---|---|
| AC-1 | `reports whether it saves to disk` | `tests/core/browser/PersistentStorage.test.ts` |
| AC-2 | `resolves a confirmed write as saved` | `tests/core/browser/PersistentStorage.test.ts` |
| AC-3 | `resolves a failed write as failed and keeps the value` | `tests/core/browser/PersistentStorage.test.ts` |
| AC-4 | `resolves writes in memory as memory` | `tests/core/browser/PersistentStorage.test.ts` |
| AC-5 | `closes archived tabs only after the save` | `tests/modules/today/ArchiveSweeper.test.ts` |
| AC-6 | `keeps the tabs open when the archive cannot be saved` | `tests/modules/today/ArchiveSweeper.test.ts` |
| AC-7 | `warns once when nothing can be saved` | `tests/loader/VivArcDi.test.ts` |
| AC-8 | `warns once when a save fails` | `tests/core/boot/NoticedStorage.test.ts` |
| AC-9 | `warns once when Today tabs stay open` | `tests/modules/today/ArchiveSweeper.test.ts` |
| AC-10 | `shows a keyed notice once per session` | `tests/core/dom/Notices.test.ts` |
| AC-11 | `shows no notice when saving works` | `tests/loader/VivArcDi.test.ts` |

- AC-1 covers `localStorage` (through `LocalSavingStorage`), `chrome.storage.local`, no area, and
  an unreadable area. AC-3 covers both `runtime.lastError` and a throwing `set`, and checks that
  the promise resolves rather than rejects.
- AC-5 uses a storage fake whose `save` resolves only when the test says so, and checks that no tab
  is removed before that.
- AC-6 already exists with this name (004) and throws from `add`; it is rewritten to resolve `failed`
  and `memory`, and to check both the sweep and **Clear**, the open tabs and the unchanged
  `store.entries`.
- AC-9 runs two failing sweeps on a real `Notices` over a recording toast and expects one call.
- AC-7 and AC-11 boot `VivArcDi` with a fake storage in `memory` and `persistent` mode and a module
  that writes; AC-11 expects no toast element under `#browser`.
- AC-8 runs two failed writes, one through `setItem` and one through `save`, and expects one notice.

Shared fakes:

- `tests/loader/fakes.ts`: `RecordingToast` (records `show` calls) and `silentNotices()`, used by
  every test that builds a `ModuleContext`.
- The two `MemoryStorage` fakes (`tests/modules/reopen/fakes.ts`, `tests/modules/livefolders/fakes.ts`)
  gain `mode = 'persistent'` and `save`, resolving `saved`. `tests/modules/today/fakes.ts` gains
  `OutcomeStorage`, a `MemoryStorage` whose outcome the test sets.
- `tests/loader/PrivateWindow.test.ts`: its `WriteLog` storage gains `mode` and a `save` that records
  the attempt and resolves `failed`; the test still expects no attempt at all.

Every existing test keeps its name (NFR-3); the 18 files that build a `ModuleContext` gain the
`notices` field and nothing else.

## Vivaldi interface

None new. The toast goes under the `browser` selector that every catalog already has; its styles
are in `toast.css`.

## Configuration

None. No option, no new storage key (NFR-2).

## Risks

| Risk | Mitigation |
|---|---|
| `chrome.storage.local.set` never calls back, so `save` never resolves and the sweep queue stops | Chrome always calls the callback, with or without `lastError`. Accepted without a timeout (KISS); a stuck queue keeps tabs open, the safe side |
| Between `add` and its outcome, a panel opened in that instant lists the new entries for a moment | The outcome arrives within milliseconds; the panel is refreshed after **Clear**, and the sweep runs once a minute |
| The removal write after a failed `add` fails as well | The memory copy is right either way, the disk still holds the old list, and the failure notice is already shown |
| The start notice in a private window, where no module that stores data runs | See the open question below; the design shows it in every window, as the spec says |
| Changing `ModuleContext` breaks every test context at once | Done in one task with the shared fakes, before the module tasks start |
| `VivArcDi.ts` passes the line or parameter limits | The helper described under Boot |

## Open questions

- **Private windows.** Modules that store data never start in a private window, yet in `memory`
  mode the boot would still show `VivArcDi cannot save its data…` there. Keep it (the spec's wording,
  every window) or skip the start notice in private windows? The design keeps it until Tore decides.
- **Notice duration.** 8 seconds, as `workspace-sync` uses for its longer messages. Fine?
