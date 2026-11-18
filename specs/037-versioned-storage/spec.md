# 037 Versioned storage

| | |
|---|---|
| Status | Approved |
| Phase | 0 |
| Owner | Tore |
| Approved | 2026-11-18 |
| Amends | [040 Live folders writes](../040-live-folders-writes/spec.md) (FR-7), [041 Write outcome](../041-write-outcome/spec.md) (notices) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

VivArcDi keeps its data as JSON text under `vivarcdi.*` keys of `chrome.storage.local`, through
`PersistentStorage`. No stored value says which format it is in, and every store reads its value with
its own `JSON.parse` in a `try`/`catch` that turns an unreadable value into "nothing saved". The next
write of that store then replaces the value with what the session holds, so damaged data, or data
written by a newer VivArcDi after a downgrade (`install --allow-downgrade`, spec 045), is wiped
without a trace (storage review of 2026-11-17, finding 3).

This spec gives every stored JSON value a version and one shared way to read it, with four rules
approved by Tore on 2026-11-17: a value without a version is version 1; an older version is upgraded
when read; a newer version than the store knows is read-only for the window session, with a notice;
and before a store overwrites a value it could not read, it keeps a copy of it once under
`vivarcdi.recovery.*`. Nothing is wiped silently any more.

## User stories

- **US-1.** As a user who goes back to an older VivArcDi, I want my archive, live folders and other
  data saved by the newer version to survive, so that updating again brings them back as they were.
- **US-2.** As a user whose saved data got damaged, I want VivArcDi to keep a copy of it instead of
  overwriting it, so that it can still be recovered.
- **US-3.** As a developer of a module, I want to change the format of a stored value with one upgrade
  step and no special code for old users, so that format changes are cheap and safe.

## Expected behavior

### Today

The keys that hold JSON, all read through `PersistentStorage.getItem` and written through `setItem`
or `save` (041):

| Key | Store | Shape | What an unreadable value becomes |
|---|---|---|---|
| `vivarcdi.archive` | `ArchiveStore` | array of entries | `[]`, one warning; malformed entries skipped |
| `vivarcdi.liveFolders` | `LiveFolderStore` | `{ [workspace]: LiveFolder[] }` | `{}`, one warning (040 FR-7) |
| `vivarcdi.liveFolders.github` | `GithubConnection` | `{ token, login }` | not connected, no warning |
| `vivarcdi.lastOpened` | `LastOpenedStore` | `{ [key]: time }` | `{}`, one warning |
| `vivarcdi.openFolders[.<workspace id>]` | `OpenFolders` | array of folder ids | `[]`, one warning |
| `vivarcdi.createdLinks` | `CreatedLinks` | array of bookmark ids | `[]`, no warning |
| `vivarcdi.little-arc.windows` | `LittleArcRegistry` | array of window ids | `[]`, no warning |
| `vivarcdi.sync.base.<folder>` | `SyncBase` | array of address keys | "never synced here", no warning |
| `vivarcdi.sync.base.spaces` | `SpaceBase` | space list | "never synced here", no warning |
| `vivarcdi.sync.spaceIds` | `SpaceIds` | `{ [workspace id]: sync id }` | `{}`, no warning |
| `vivarcdi.sync.announced` | `MissingSpaces` | array of sync ids | `[]`, no warning |

In every row the next write of the store replaces the unreadable text. `vivarcdi.spaceCollapsed[.<id>]`
holds `true` or `false`, not a structure, and `vivarcdi.probe` is a test key: neither is JSON data.

### After

**Version.** Every value under the keys of the table above has a version, a positive whole number,
known to its store. All of them are at version 1 when this spec ships.

- A value saved as before, without a version, is version 1. Existing data reads as it does today.
- A value at version 2 or later is saved in an **envelope**, an object with exactly two members: the
  version and the data. The design names the two members so that no version 1 value of any key above
  can look like an envelope.
- A version 1 value keeps being saved without an envelope, so the stored values do not change when
  this spec ships, and an older VivArcDi still reads them.

**One way to read.** Every store reads its value through one shared reader. The reader tells the
store one of four results:

| The saved text | Result | What the store does |
|---|---|---|
| absent | **empty** | starts empty, as today |
| version equal to or older than the store's | **current** | uses the data, upgraded step by step to the store's version |
| version newer than the store's | **newer** | uses what it can read, never writes the key in this window session, shows the newer notice |
| not JSON, an envelope with a bad version, or a shape the store rejects as a whole | **unreadable** | starts empty, keeps a recovery copy before its first write, shows the unreadable notice |

**Upgrade.** A store that changes its format raises its version and adds one upgrade step from the
previous version. Reading an older value runs the steps in order, in memory. Reading never writes; the
upgraded value is saved in the new version at the store's next ordinary write.

**Newer value: read-only.** The store reads the data of a newer value with its current rules,
ignoring members it does not know and skipping entries it cannot read, so the user sees what can be
shown. For the rest of the window session the store saves nothing under that key: changes the user
makes there last until the window closes. The window shows once per session, kind `error`:
`VivArcDi found data from a newer version: some changes will not be saved until you update VivArcDi`.
After the user updates VivArcDi, the data is read again as it was.

**Unreadable value: recovery copy.** Before the first write that would replace an unreadable value,
the store copies the saved text, unchanged, to `vivarcdi.recovery.<name>`, where `<name>` is the key
without its `vivarcdi.` prefix (for example `vivarcdi.recovery.archive`). The copy is made once: if
the recovery key already holds a text, it is kept and not replaced. The console logs one warning that
names the key and its recovery key, and the window shows once per session, kind `error`:
`VivArcDi could not read some saved data and kept a copy of it`. The store then works as today with
an empty value.

**Recovery.** No button restores a copy. The user manual says where the copies are and how to put
one back from DevTools; the recovery keys stay until removed by hand.

**Notices.** Both notices go through the notice service of 041 (`ModuleContext.notices.once`), one
key each, at most once per window session however many keys are affected.

## Requirements

### Functional

- **FR-1.** Every key listed in [Today](#today), and every new key that holds JSON, is read through
  one shared reader that returns `empty`, `current`, `newer` or `unreadable`, never throws, and
  calls no store-specific `JSON.parse`.
- **FR-2.** A value without an envelope is version 1.
- **FR-3.** A store writes its value without an envelope while its version is 1, and in an envelope
  with its version from version 2 on.
- **FR-4.** A value at an older version is upgraded through each step in order, in memory, at read
  time; reading never writes.
- **FR-5.** After a `newer` result, the store saves nothing under that key for the rest of the window
  session, and the window shows the newer notice once per session.
- **FR-6.** After an `unreadable` result, the store's first write to that key is preceded by a copy
  of the saved text to `vivarcdi.recovery.<name>`, unless that recovery key already holds a text.
- **FR-7.** An `unreadable` result logs one console warning per key and window session that names
  the key and its recovery key, and shows the unreadable notice once per session.
- **FR-8.** An envelope whose version is not a positive whole number is `unreadable`.
- **FR-9.** 040 FR-7 becomes: if the saved live folders are unreadable, the store treats them as
  empty, logs one warning per session, and keeps a recovery copy as FR-6 says.

### Non-functional

- **NFR-1.** No stored value changes when this spec ships; a user who upgrades keeps every value, and
  an older VivArcDi reads values written after the upgrade (FR-3).
- **NFR-2.** With readable data, nothing changes for the user: no notice, no new key, no extra write.
- **NFR-3.** Reading stays synchronous and needs no extra call to `chrome.storage.local`.
- **NFR-4.** Every existing test keeps its name and passes.
- **NFR-5.** Ships on a `fix/` branch with a patch version change (see Q-6).

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names the test, `manual` is a step Tore
performs.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a store reads a value saved without a version, THE reader SHALL return it as version 1 | auto: `reads a value without a version as version 1` |
| AC-2 | WHEN a store reads a value at an older version, THE reader SHALL upgrade it through every step in order and SHALL NOT write | auto: `upgrades an older value in order without writing` |
| AC-3 | WHILE a store's version is 1, THE store SHALL save its value without an envelope | auto: `saves a version 1 value as before` |
| AC-4 | WHERE a store's version is 2 or later, THE store SHALL save its value in an envelope with that version | auto: `saves a later version in an envelope` |
| AC-5 | IF a value has a newer version than the store knows, THEN THE store SHALL show what it can read and SHALL NOT write that key for the rest of the session | auto: `keeps a newer value read-only for the session` |
| AC-6 | IF a value has a newer version, THEN THE window SHALL show the newer notice once per session | auto: `warns once about data from a newer version` |
| AC-7 | IF a value is unreadable, THEN THE store SHALL copy the saved text to its recovery key before its first write | auto: `keeps a copy of an unreadable value before overwriting it` |
| AC-8 | IF the recovery key already holds a text, THEN THE store SHALL keep that text | auto: `does not replace an existing recovery copy` |
| AC-9 | IF a value is unreadable, THEN THE window SHALL show the unreadable notice once per session and the console SHALL name the key and its recovery key | auto: `warns once about unreadable data` |
| AC-10 | IF an envelope has a version that is not a positive whole number, THEN THE reader SHALL return it as unreadable | auto: `treats a bad version as unreadable` |
| AC-11 | THE stores of every key in the table of this spec SHALL read through the shared reader | auto: `every stored JSON key reads through the shared reader` |
| AC-12 | WHILE every saved value is readable, THE window SHALL show no notice and SHALL write no recovery key | auto: `shows no notice and keeps no copy for readable data` |
| AC-13 | WHEN Tore installs the new version over his profile on macOS and Debian, THE archive, live folders, folder states and Favorites SHALL be as before, with no toast | manual |

AC-13 is the only manual step: the failure paths need a damaged or newer value, which the tests write
directly into a fake storage.

## Out of scope

- Reading `localStorage` before `chrome.storage.local` (spec 044).
- A size cap on any value, including the `data:` favicons of the archive: waits for probe T1.
- A button or command that restores a recovery copy, and removing recovery keys automatically (Q-4).
- Data that `PersistentStorage` does not hold: tab `vivExtData` (spec 042), the JSON in bookmark
  descriptions of the `VivArcDi Sync` store (`SpaceList`, `WorkspaceSettings`), and the console
  messages of page scripts.
- `vivarcdi.spaceCollapsed[.<id>]`, which holds `true` or `false` (Q-5).
- Any change of format of an existing key: each one bumps its version in its own spec.
- Rolling back writes made before this spec ships: values already wiped cannot be recovered.

## Open questions

- [x] **Q-1. Malformed entries.** The archive, live folders and lists skip single entries they cannot
  read, and the next write drops them. Should a read that skipped entries count as `unreadable` for
  the recovery copy (FR-6), without the notice? Recommendation: yes, copy once and log, no toast, so
  a partly damaged value is never lost either.
- [x] **Q-2. Notice for unreadable data.** The approved decisions name a notice only for newer data.
  Should unreadable data show a toast too, or only log? Recommendation: one toast per session as in
  [After](#after), because the user sees data missing and the copy exists only if someone knows.
- [x] **Q-3. Notice texts.** Recommendation: as in [After](#after), in English, kind `error`.
- [x] **Q-4. Recovery copy once.** If the recovery key already holds an older copy, the newer
  unreadable text is overwritten without a copy (FR-6). Alternatives: replace the old copy, or keep
  one copy per day. Recommendation: keep the first copy; a second damage of the same key is unlikely,
  and one slot per key keeps the storage bounded.
- [x] **Q-5. `spaceCollapsed`.** Leave the scalar `true`/`false` keys out of versioning?
  Recommendation: yes; an unreadable value means "expanded", there is nothing to lose.
- [x] **Q-6. Branch.** The behavior changes only for damaged or newer data. Recommendation: `fix/`,
  patch version, after 040 is merged, since both touch `LiveFolderStore`.

## References

- Storage review of 2026-11-17, finding 3 and the decisions for 037.
- [041 Write outcome](../041-write-outcome/spec.md): `SavingStorage`, the notice service and its
  toasts.
- [040 Live folders writes](../040-live-folders-writes/spec.md): FR-7, the fresh read of the live
  folders.
- [045 No downgrade](../045-no-downgrade/spec.md): `install --allow-downgrade`, the way an older
  VivArcDi meets newer data.
- Spec 044 (not yet written): reading `localStorage` first.
