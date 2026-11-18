# 037 Versioned storage: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

Two pieces in `src/core/`, and one small change in each store.

**A format per key, pure.** `StoredFormat<T>` (`src/core/browser/StoredFormat.ts`) knows one
stored value: its upgrade steps, its version (the number of steps plus one), its empty value and how
to turn parsed JSON into the store's value. `decode(text)` turns the saved text into one of the four
results (FR-1) and never throws; `encode(value)` turns the store's value into the text to save, with
or without an envelope (FR-3). It touches no storage, so it can be tested alone and reading never
writes (FR-4).

**One reader per window, with the guard.** `GuardedStorage` (`src/core/boot/GuardedStorage.ts`) is
a decorator around the `NoticedStorage` of 041, built once per window by `WindowServices.open`. It
is what `ModuleContext.storage` is from now on. It adds `read(key, format)`, which decodes the saved
text with the format and remembers, per key and for the window session, what it found: a `newer`
key is read-only (FR-5) and an `unreadable` key gets its recovery copy before its first write
(FR-6). Because the guard sits in the storage every store writes through, it works whether the store
calls `setItem` or `save`, and no store needs code for it. The notices (FR-5, FR-7) and the console
warning (FR-7) come from here as well, once per session for the whole window.

**Stores read through it.** Each store declares one `StoredFormat` constant next to its key, replaces
its `JSON.parse` in `try`/`catch` with `storage.read(KEY, FORMAT).value`, and writes
`FORMAT.encode(value)`. Every store is at version 1, so `encode` gives exactly the text it writes
today (NFR-1). Stores drop their own read warnings: the reader logs them (FR-7, FR-9).

```text
store ── read(key, FORMAT) ──▶ GuardedStorage ── getItem ──▶ NoticedStorage ──▶ PersistentStorage
      ── setItem / save ─────▶   │ newer key: held in this window, outcome `memory`
                                 │ unreadable key: copy to vivarcdi.recovery.<name> first, once
                                 └─ notices.once(…) ──▶ Notices (041)
```

### Rejected alternatives

- **A static reader function that each store calls with the storage** (`StoredValue.read(storage,
  key, format)`): the per-key state (read-only, copy pending, warned) must be shared by every store
  of the window, and a function has nowhere to keep it but a global or a `WeakMap` keyed by the
  storage. The decorator owns it, and the boot already builds one per window.
- **The guard in each store** (a `#readOnly` flag set from the result): eleven copies of the same
  rule (DRY), and a store that forgets it wipes newer data again.
- **Dropping writes to a newer key without holding them**: the stores that read fresh at every call
  (`ArchiveStore`, `LiveFolderStore`, `CreatedLinks`, the sync stores) would lose a change at once,
  while the spec wants changes to last until the window closes.
- **Folding the guard into `NoticedStorage`**: that class reports write outcomes; versions and
  recovery are a second reason to change. Two decorators of about 60 and 110 lines stay under the
  limits and each has one job.
- **Versioning inside `PersistentStorage`**: it runs before the interface exists and knows nothing
  of formats or notices; it stays a plain text store.
- **`version` and `data` as envelope members**: `vivarcdi.lastOpened` and `vivarcdi.sync.spaceIds`
  are objects keyed by data; plain names could in theory collide. See [Envelope](#envelope).

## Components

### Envelope

```json
{ "vivarcdi:version": 2, "vivarcdi:data": [ … ] }
```

A parsed value is an envelope when it is a plain object (not an array, not `null`) whose own members
are exactly `vivarcdi:version` and `vivarcdi:data`. No version 1 value of the spec's table can be
one:

| Key | Version 1 shape | Why it cannot look like an envelope |
|---|---|---|
| archive, openFolders, createdLinks, little-arc.windows, sync.base.*, sync.base.spaces, sync.announced | array | not an object |
| liveFolders | `{ [workspace id]: LiveFolder[] }` | members are Vivaldi workspace ids (numbers, as `TabData.rawWorkspace` shows) or `''`; it would take exactly two workspaces with these ids |
| liveFolders.github | `{ token, login }` or `{}` | fixed member names |
| lastOpened | `{ [address key]: time }` | an address key is a host and a path (`AddressKey.from`); a host cannot hold `:` followed by letters, since that is a port, and `new URL('http://vivarcdi:version/')` throws |
| sync.spaceIds | `{ [Vivaldi workspace id]: sync id \| { detached } }` | members are Vivaldi workspace ids, as above |

The names are the constants `VERSION_MEMBER` and `DATA_MEMBER` of `StoredFormat.ts`. An envelope
whose `vivarcdi:version` is not a whole number of 1 or more is `unreadable` (FR-8). An envelope at
version 1 is accepted as version 1, though nothing writes one.

### Format (`src/core/browser/StoredFormat.ts`, new)

```ts
export type ReadStatus = 'empty' | 'current' | 'newer' | 'unreadable';

export interface StoredRead<T> {
  readonly status: ReadStatus;
  readonly value: T;
  readonly skipped: boolean;
}

export interface Readout<T> {
  value: T;
  skipped: boolean;
}

export type Upgrade = (data: unknown) => unknown;

export interface FormatRules<T> {
  empty: T;
  read: (data: unknown) => Readout<T> | null;
  upgrades?: readonly Upgrade[];
}

export interface StoredReader {
  read<T>(key: string, format: StoredFormat<T>): StoredRead<T>;
}

export type ReadingStorage = KeyValueStorage & StoredReader;

export type VersionedStorage = SavingStorage & StoredReader;

export class StoredFormat<T> {
  constructor(rules: FormatRules<T>);
  public get version(): number;
  public decode(text: string | null): StoredRead<T>;
  public encode(value: T): string;
}
```

- `rules.read` is the store's own shape check: it returns the value and whether it **skipped**
  entries it could not read (Q-1), or `null` when it rejects the shape as a whole. It ignores members
  it does not know, so the same function reads a newer value as far as it can (FR-5).
- `upgrades[i]` turns data of version `i + 1` into version `i + 2`; `version` is
  `upgrades.length + 1`, so a new version cannot exist without its step (US-3). Today every store
  passes none.
- `decode(text)`, each step a private method so that `complexity` stays under 8:
  1. `null`: `{ status: 'empty', value: empty }`.
  2. `JSON.parse` throws: `unreadable`.
  3. An envelope: its version and data, or `unreadable` for a bad version (FR-8). Anything else:
     version 1 and the parsed value (FR-2).
  4. Version above `this.version`: `newer`, with `read(data)?.value ?? empty`.
  5. Otherwise the steps from that version on, in order (FR-4); a step that throws makes it
     `unreadable`. Then `read(data)`: `null` is `unreadable`, a readout is `current` with its
     `skipped`.
  `unreadable` and `empty` always carry `empty` as the value, so a store never needs the status to
  go on.
- `encode(value)`: `JSON.stringify(value)` at version 1 (FR-3, NFR-1), otherwise
  `JSON.stringify({ [VERSION_MEMBER]: version, [DATA_MEMBER]: value })`.

`StoredReader`, `ReadingStorage` and `VersionedStorage` live in this file because they name `StoredFormat`;
`SavingStorage.ts` is unchanged. About 90 counted lines.

### Reader and guard (`src/core/boot/GuardedStorage.ts`, new)

```ts
export const RECOVERY_PREFIX = 'vivarcdi.recovery.';

export class GuardedStorage implements VersionedStorage {
  constructor(inner: SavingStorage, notices: NoticeBoard, logger: Logger);
  public get mode(): StorageMode;
  public getItem(key: string): string | null;
  public setItem(key: string, value: string): void;
  public save(key: string, value: string): Promise<SaveOutcome>;
  public read<T>(key: string, format: StoredFormat<T>): StoredRead<T>;
  public static recoveryKeyOf(key: string): string;
}
```

Private state, for the window session: `#held: Map<string, string | null>` (keys found newer, with
what this window wrote to them, `null` until the first write), `#pending: Map<string, string>` (keys
found unreadable or skipped, with the text that was read, until it is copied) and `#warned:
Set<string>` (keys already logged).

- **`read(key, format)`**:
  - A held key decodes its held text when there is one, else the saved text, and always reports
    `newer`: the key stays read-only for the session (FR-5).
  - Otherwise it decodes `inner.getItem(key)`. `newer`: the key joins `#held` and
    `notices.once('storage-newer', NEWER_TEXT, 'error')` (FR-5, AC-6). `unreadable`: the key and its
    text join `#pending` unless already there, one warning, and
    `notices.once('storage-unreadable', UNREADABLE_TEXT, 'error')` (FR-7, AC-9). `current` with
    `skipped`: the same without the notice (Q-1).
  - The warning, once per key (`#warned`): `could not read <key>: its saved text goes to
    <recovery key> before it is replaced`. It never prints the text, which may hold the GitHub token.
  - Reading writes nothing (FR-4) and makes no call besides `getItem` on the memory copy (NFR-3).
- **`save(key, value)`**, not `async`, so the memory copy changes before it returns as 041 requires:
  - held key: the value goes to `#held`, nothing reaches `inner`, the outcome is `memory` (FR-5,
    AC-5). The archive then keeps the tabs open with its 041 notice, which is right: it cannot save.
  - pending key: first `#keepCopy(key)`, then `inner.save(key, value)` (FR-6, AC-7).
  - any other key: `inner.save(key, value)`. Readable data adds nothing (NFR-2, AC-12).
- **`#keepCopy(key)`**: when `inner.getItem(recoveryKeyOf(key))` is `null`, `inner.setItem` of the
  pending text, unchanged; an existing copy is kept (AC-8, Q-4). The key leaves `#pending` either
  way, so a copy is attempted once per damage.
- **`setItem`** is `void this.save(key, value)`. **`getItem`** returns the held text of a held key
  that this window wrote, else `inner.getItem(key)`, so a store that compares texts before writing
  (`SyncBase`, `SpaceBase`, `SpaceIds`) sees its own change.
- **`recoveryKeyOf(key)`**: `vivarcdi.recovery.` plus the key without `vivarcdi.`
  (`vivarcdi.openFolders.12` gives `vivarcdi.recovery.openFolders.12`). `PersistentStorage` already
  loads every `vivarcdi.*` key into its memory copy at open, so the check needs no extra call.
- The two texts are the spec's, as constants at the top of the file, as `NoticedStorage` does:
  `NEWER_TEXT = 'VivArcDi found data from a newer version: some changes will not be saved until you
  update VivArcDi'`, `UNREADABLE_TEXT = 'VivArcDi could not read some saved data and kept a copy of
  it'` (Q-3). The keys are fixed, so many keys give one notice each per window (spec, Notices).

About 110 counted lines; `read` splits into `#decode` and `#note(key, result, text)` to stay under 40
lines and complexity 8.

### Boot (`src/core/boot/`)

| File | Change |
|---|---|
| `WindowServices.ts` | `open(document, selectors, storage, logger)`: wraps the `NoticedStorage` in `new GuardedStorage(noticed, notices, logger.child('storage'))`. `StartServices.storage` becomes `VersionedStorage`. Four parameters, the `max-params` limit |
| `VivArcDi.ts` | Passes `this.#logger` to `WindowServices.open`; one line, no new member (the file is at its limit) |
| `Module.ts` | `ModuleContext.storage: VersionedStorage`, doc: strings that survive a restart, and `read` for JSON values (spec 037). Every current user compiles, since `VersionedStorage` extends `SavingStorage` |

Nothing reads a store before `start`, so every read goes through the guard.

### Where it lives

Both files are in `src/core/` because `src/shared/links/LastOpenedStore.ts` and the module stores
use them, and `shared/` may import only `core/` and `shared/` (`tools/eslint/module-boundaries.mjs`,
`tests/structure/ModuleBoundaries.test.ts`). `StoredFormat` sits with the storage types in
`core/browser/`; `GuardedStorage` uses `NoticeBoard` (`core/dom/`) and sits with `NoticedStorage` in
`core/boot/`. Neither imports `shared/` or a module.

### Stores

Each store gets a `FORMAT` constant beside its key, built with `new StoredFormat({ empty, read })`.
Its `read` rule is the check the store does today, moved, with one choice per store: what rejects
the value as a whole (`unreadable`, recovery copy and notice) and what only skips an entry
(`skipped`, recovery copy and log). Each constructor narrows the storage it takes to the members it
uses, as 041 did with `SavingStorage`: `ReadingStorage`, or `SavingStorage & StoredReader` for the
archive, which needs `save`.

| Store (file) | `empty` | Rejected as a whole | Skipped | Other change |
|---|---|---|---|---|
| `ArchiveStore` (`src/modules/today/ArchiveStore.ts`) | `[]` | not an array | entries that fail `#isEntry` | Takes `SavingStorage & StoredReader`. `#read` and the `skipped … malformed` warning go; `#current` reads `storage.read(...).value`, then sorts and cuts as today. The `logger` parameter becomes unused and is dropped; `TodayArchive` stops passing it |
| `LiveFolderStore` (`src/modules/livefolders/LiveFolderStore.ts`) | `{}` | not a plain object | a workspace whose value is not an array, a folder `#folderFrom` cannot read | `#parse` becomes the `read` rule over `Record<string, LiveFolder[]>`; `#read` builds the `Map` from `.value`; `#warned` and the read warning go (FR-9). Rows and archived ids that fail their checks are dropped without counting as skipped: the next refresh rewrites them. `#write` uses `FORMAT.encode` |
| `GithubConnection` (`src/modules/livefolders/GithubConnection.ts`) | `null` | not a plain object | never | `read` gives `{ token, login }` or `null` for `{}` or an empty token, as `#read` does today |
| `LastOpenedStore` (`src/shared/links/LastOpenedStore.ts`) | `{}` | not a plain object | members that are not numbers | Dates older than a year are still dropped by `load`, not counted as skipped. The read half of `#warnOnce` goes; the write warning stays. A `null` storage still means session only |
| `OpenFolders` (`src/modules/folders/tree/OpenFolders.ts`) | `[]` | not an array | ids that are not texts | `load`'s `try`/`catch` and warning go; same per-workspace keys |
| `CreatedLinks` (`src/modules/folders/favoritelinks/CreatedLinks.ts`) | `[]` | not an array | ids that are not texts | none |
| `LittleArcRegistry` (`src/modules/littlearc/LittleArcRegistry.ts`) | `[]` | not an array | ids that are not whole numbers | none |
| `SyncBase` (`src/modules/workspacesync/SyncBase.ts`) | `null` | not an array of texts | never: a partial base would mislead the merge, as today | `set` compares and writes `FORMAT.encode(keys)` |
| `SpaceBase` (`src/modules/workspacesync/SpaceBase.ts`) | `null` | not an array of valid entries | never, as today | `set` uses `FORMAT.encode` |
| `SpaceIds` (`src/modules/workspacesync/SpaceIds.ts`) | `{}` | not a plain object | links that are neither a text nor `{ detached: text }` | `#save` uses `FORMAT.encode`. Today such links are kept unchecked; now they are skipped, copied first and dropped at the next write |
| `MissingSpaces` (`src/modules/workspacesync/MissingSpaces.ts`) | `[]` | not an array | names that are not texts | none |

`OpenFolders` and `LastOpenedStore` accept `ReadingStorage | null`; the others `ReadingStorage`.
Modules pass `context.storage` as today, with no other change. No store needs the status: `value` is
always usable, and the guard does the rest.

`LiveFolderStore` drops about 10 lines and stays well under 200. `SpaceIds`, the longest of the sync
files, stays under 100.

### Tests

Names identical to the `auto:` checks.

| AC | Test | File |
|---|---|---|
| AC-1 | `reads a value without a version as version 1` | `tests/core/browser/StoredFormat.test.ts` |
| AC-2 | `upgrades an older value in order without writing` | `tests/core/boot/GuardedStorage.test.ts` |
| AC-3 | `saves a version 1 value as before` | `tests/core/browser/StoredFormat.test.ts` |
| AC-4 | `saves a later version in an envelope` | `tests/core/browser/StoredFormat.test.ts` |
| AC-5 | `keeps a newer value read-only for the session` | `tests/core/boot/GuardedStorage.test.ts` |
| AC-6 | `warns once about data from a newer version` | `tests/core/boot/GuardedStorage.test.ts` |
| AC-7 | `keeps a copy of an unreadable value before overwriting it` | `tests/core/boot/GuardedStorage.test.ts` |
| AC-8 | `does not replace an existing recovery copy` | `tests/core/boot/GuardedStorage.test.ts` |
| AC-9 | `warns once about unreadable data` | `tests/core/boot/GuardedStorage.test.ts` |
| AC-10 | `treats a bad version as unreadable` | `tests/core/browser/StoredFormat.test.ts` |
| AC-11 | `every stored JSON key reads through the shared reader` | `tests/structure/StoredKeys.test.ts` |
| AC-12 | `shows no notice and keeps no copy for readable data` | `tests/core/boot/GuardedStorage.test.ts` |

- AC-1 decodes the text every store writes today (an array, an object, `{}`) and expects `current`
  with the same value; AC-3 encodes it back to the same text.
- AC-2 uses a test format with two upgrade steps that record their order, saves a version 1 and a
  version 2 value in an envelope, reads both through a `GuardedStorage` over a storage fake that
  counts writes, and expects version 3 data, the steps in order and no write.
- AC-4 encodes with a format of one step and expects the envelope with version 2.
- AC-5 saves a version 3 envelope for a version 2 format, reads it (`newer`, the known members read,
  an unknown entry skipped), writes through both `setItem` and `save` (outcome `memory`), and
  expects the inner text unchanged, the change visible to the next `read` and `getItem`, and still
  `newer`.
- AC-6 and AC-9 read two keys twice each through a real `Notices` over `RecordingToast` and expect
  one call per notice; AC-9 also expects one warning per key naming the key and its recovery key.
- AC-7 reads `{not json`, writes, and expects the recovery key to hold `{not json` before the new
  value; it also covers a skipped entry (Q-1): copy made, warning, no notice.
- AC-8 seeds the recovery key, reads and writes, and expects the old copy.
- AC-10 decodes envelopes with versions `0`, `-1`, `1.5`, `"2"` and `null`.
- AC-11 builds each store of the spec's table over a `ReadLog` storage that records the keys passed
  to `read` and fails on `getItem` of those keys, calls one reading method, and expects every key of
  the table. The same test fails when a file under `src/modules/` or `src/shared/` contains both
  `getItem(` and `JSON.parse(` (FR-1).
- AC-12 reads one readable value of each status `empty` and `current`, writes, and expects no toast
  call, no warning and no `vivarcdi.recovery.*` key.

Existing tests keep their names (NFR-4). Two change their body:

- `skips malformed entries and warns once` (`tests/modules/today/ArchiveStore.test.ts`) builds the
  store over a `GuardedStorage` with the recording logger; the warning now comes from the reader.
- `warns once when the saved live folders are damaged`
  (`tests/modules/livefolders/LiveFolderStore.test.ts`, 040/AC-8) the same, and also expects the
  recovery copy (FR-9).

Shared fakes:

- `tests/modules/reopen/fakes.ts` and `tests/modules/livefolders/fakes.ts` (`MemoryStorage`),
  `tests/modules/today/fakes.ts` (`OutcomeStorage`) gain
  `public read<T>(key: string, format: StoredFormat<T>): StoredRead<T> { return format.decode(this.getItem(key)); }`,
  a reader without the guard. Every store test and module test that uses them keeps its body.
- `tests/loader/fakes.ts` gains `guarded(inner, logger?)`, a `GuardedStorage` over a fake with
  `silentNotices()`, for the tests that need the warning or the guard.
- Inline storages that reach a store gain the same `read`: the one in
  `tests/modules/littlearc/logic.test.ts` (`LittleArcRegistry`) and any the typecheck or a failing
  module test points to.

## Vivaldi interface

None. The notices use the 041 toast under `#browser`.

## Configuration

None. New keys appear only after a damaged value: `vivarcdi.recovery.<name>`, removed by hand.

## Risks

| Risk | Mitigation |
|---|---|
| A store's `read` rule rejects as a whole a value it accepts today, so a working user gets a recovery copy and a toast | The rules move today's checks unchanged; the "rejected as a whole" column only names values that read as empty today. AC-1 decodes the real shapes, and AC-13 checks Tore's profile |
| A rule counts as skipped something that is dropped on purpose (expired dates, stale rows), so every start copies and logs | Only entries that fail their shape check count; expiry and rows are excluded in the table above |
| An unknown member of a v1 object read as an envelope | Exactly two members with `vivarcdi:` names, impossible for every key (Envelope) |
| A newer key shows the archive notice on top of the newer notice, since `save` resolves `memory` | Both are true; one toast replaces the other's text (041). The newer notice comes first, at read time |
| The GitHub token ends up in `vivarcdi.recovery.liveFolders.github` | Only when the saved connection is not JSON; it stays in the same local storage, is never logged, and the manual says what the key holds |
| Another window writes a readable value between this window's read and write; the copy keeps the damaged text this window saw | It is the text the user lost; the copy is still once per key |
| A test context passes a storage without `read`, which typecheck misses because contexts are cast | The module tests run every store; T1 gives the shared fakes `read` before any store needs it |
| `VivArcDi.ts` over its limits | One argument added to an existing call, no new line |

## Open questions

- **Skipped entries without a toast (Q-1).** The design copies and logs when a store skips entries,
  as answered. The table above adds `SpaceIds` links that are neither a text nor `{ detached }` as a new
  skip: today they are kept untouched. Fine to drop them after the copy?
- **Recovery copy also for live folder rows.** Rows and archived ids that fail their checks are not
  counted as skipped, because a refresh rewrites them within minutes. Agree?
