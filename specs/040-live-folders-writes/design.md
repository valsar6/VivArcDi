# 040 Live folders writes: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

One class changes: `LiveFolderStore` stops keeping a session copy. It reads `vivarcdi.liveFolders`
at every operation and writes back the value it just read with one change applied, as
`ArchiveStore` (`#current`, then `#save`) and `CreatedLinks` (`#read`, then `#write`) already do.
The stored shape, the key and the public API stay as they are (NFR-1), so the refresher, the menus,
the handlers, the publisher and the module keep their code.

This is enough because every caller already reads and writes in the same synchronous step, and the
storage is the shared memory copy that `PersistentStorage` keeps in line with the other windows
through `chrome.storage.onChanged`:

- `LiveFolderRefresher.#load` awaits GitHub, then calls `store.find(id)?.archived` and
  `store.update(id, { rows, archived, warning, needsReconnect, refreshedAt })`. With a fresh read,
  the archived rows are those saved when GitHub answered (FR-5, AC-7), and the patch leaves `name`
  and `filters` as saved (AC-6). A folder deleted meanwhile makes `update` return `false` and write
  nothing (FR-6).
- `LiveFolderMenu.#toggle`, `#saveRepositories` and `LiveRowMenu.#archive` call `find`, then
  `update` with values built from what `find` returned, with no `await` in between, so no other
  window can write between the two (JavaScript runs one task at a time, and `onChanged` is a task
  of its own). A folder deleted elsewhere is not found and nothing is written (FR-6).
- `LiveFolderHandlers.rename` calls `update(folderId, { name })` and publishes only when it returns
  `true`.
- `LiveFolders.#create` and `#delete` call `add` and `remove`, then publish.

```text
window A ─┐                                   ┌─▶ chrome.storage.local
          ├─ find / update / add / remove ──▶ PersistentStorage (memory copy) ◀── onChanged ── window B
window B ─┘   read fresh, patch, setItem      └── same copy for every reader in this window
```

### Rejected alternatives

- **Keeping the copy and refreshing it on `chrome.storage.onChanged`**: needs a listener API that
  `KeyValueStorage` does not have, and a merge rule for a change that arrives while a refresh is
  running. The fresh read gets the same result with no new API, and is the pattern already in use.
- **A transactional `modify(id, (folder) => changes)`**: would make "read then patch" explicit for
  the menus and the refresher, but they already do it in one synchronous step; one more method and
  a rewrite of five callers for no behavior change (KISS). Kept in mind if a caller ever needs an
  `await` between `find` and `update`.
- **Redrawing on `onChanged`, or one owner window for refreshes**: out of scope (NFR-3), decided on
  2026-11-17.
- **The reporting `save` of 041**: excluded by Q-2; the store keeps `setItem`.

## Components

### Store (`src/modules/livefolders/LiveFolderStore.ts`)

| Member | Today | After |
|---|---|---|
| `#folders` | Session copy, filled by the constructor | Removed |
| constructor | Stores its dependencies and calls `#read()` | Stores its dependencies only; JSDoc says the folders are read at every call and each change is written at once |
| `workspaces`, `folders(workspace)`, `all()`, `find(id)` | Read `#folders` | Read `this.#read()` (FR-1). They return fresh objects: changing one changes nothing saved, which no caller does today |
| `add(workspace)` | Appends to `#folders`, writes all | `saved = this.#read()`, appends the new folder to its workspace in `saved`, `this.#write(saved)` (FR-2) |
| `update(id, changes)` | `Object.assign` on the copy, writes all | `saved = this.#read()`; finds the workspace and index of `id`; none: returns `false` and writes nothing; otherwise replaces it with `{ ...folder, ...changes }` and writes `saved` (FR-3) |
| `remove(id)` | Filters every workspace, always writes | Filters `saved`, drops a workspace left empty, and writes only when a folder was removed (FR-4) |
| `#read()` | Fills `#folders`, warns on each failure | Returns a new `Map<string, LiveFolder[]>` parsed with the existing `#folderFrom`, `#archivedFrom`, `#isRow`. When `JSON.parse` throws, returns an empty map and warns `the live folders could not be read` only the first time (a private `#warned`, as `ArchiveStore`) (FR-7) |
| `#write(folders)` | Writes `#folders` | Takes the map to write; same `setItem`, same `try/catch` and warning |

Workspaces keep the order they have in the saved object, and a new folder goes at the end of its
workspace, as today. Folders that `#folderFrom` cannot read are dropped from the next write, as
today; the shape of the stored value does not change (NFR-1).

The file has 135 counted lines of the 200 allowed; removing the copy and the constructor read
makes room for the lookup in `update`.

### Refresher, menus, handlers, publisher, module

No code change. `LiveFolderRefresher`'s class JSDoc gains one sentence: a refresh changes only the
rows, the archived rows, the warning and the refresh time of its folder, as saved when GitHub
answers. `#run` reads `store.all()` at each run, so a window now also refreshes a folder that
another window created after it started; see the open questions.

### Tests

Names identical to the `auto:` checks. Another window is a second `LiveFolderStore` on the same
`MemoryStorage` (`tests/modules/livefolders/fakes.ts`), with its own id generator so that ids do
not collide.

| AC | Test | File |
|---|---|---|
| AC-1 | `reads the live folders saved by another window` | `tests/modules/livefolders/LiveFolderStore.test.ts` |
| AC-2 | `adds a folder without dropping the folders of another window` | `tests/modules/livefolders/LiveFolderStore.test.ts` |
| AC-3 | `changes only the given fields of a folder` | `tests/modules/livefolders/LiveFolderStore.test.ts` |
| AC-4 | `does not bring back a folder deleted in another window` | `tests/modules/livefolders/LiveFolderStore.test.ts` |
| AC-5 | `removes only the given folder` | `tests/modules/livefolders/LiveFolderStore.test.ts` |
| AC-6 | `a refresh keeps a rename made in another window` | `tests/modules/livefolders/LiveFolderRefresher.test.ts` |
| AC-7 | `a refresh keeps rows archived in another window` | `tests/modules/livefolders/LiveFolderRefresher.test.ts` |
| AC-8 | `warns once when the saved live folders are damaged` | `tests/modules/livefolders/LiveFolderStore.test.ts` |

A held request is a new fake in `tests/modules/livefolders/fakes.ts`: `HeldGithub`, a
`Pick<GithubPullRequests, 'list'>` over a `FakeGithub`: after `hold()`, `list` waits until the test
calls `release()`; otherwise it answers at once. AC-4 uses it with a `LiveFolderRefresher` built in
the test; AC-6 and AC-7 pass it to the refresher of `setup` in `LiveFolderRefresher.test.ts` through
a new optional parameter.

- AC-1: store A is built, then store B adds and renames a folder; A's `all`, `find`, `workspaces`
  and `folders` show it without a new store.
- AC-2: A and B are built on an empty storage; each adds a folder in the same workspace and one in
  another; the saved value holds all four.
- AC-3: B renames a folder after A was built; A updates its `rows` and `refreshedAt`; the saved
  folder has B's name, A's rows, its own filters, and the other folder is unchanged.
- AC-4: B removes a folder that A has seen. Then, on A: `update` returns `false`, `remove` adds no
  entry to `storage.writes`; a `LiveFolderRefresher` over A refreshes it with a held request,
  released after the removal, and writes nothing; a `LiveRowMenu` over A,
  opened before the removal, runs `Archive Pull Request` after it and writes nothing. The folder is
  missing from A and from the saved value at the end.
- AC-5: A removes one of three folders, two of them in one workspace; the other two are saved as
  they were, and a workspace left empty disappears from the saved value.
- AC-6: the refresh's GitHub request is held; a second store renames the folder and changes its
  filters; once released, the saved folder has the new name and filters and the new rows.
- AC-7: a first refresh saves rows 1 and 2; a second refresh is held; a second store archives row 1
  (`rows` without it, `archived` with its `updatedAt`); once released, row 1 is still in `archived`
  and not in `rows`.
- AC-8: the saved text is `{not json`; `all`, `find`, `workspaces`, `folders` and an `add` each read
  it; the logger has one line; the `add` saved a readable value.

The existing tests of 026 keep their names and pass unchanged (NFR-4), including
`starts empty when the stored text is damaged` (one warning) and `ignores a folder that was deleted`
(no request, no redraw).

## Vivaldi interface

None.

## Configuration

None. Same key, same shape, same `refreshMinutes` (NFR-1, NFR-2).

## Risks

| Risk | Mitigation |
|---|---|
| A caller adds an `await` between `find` and `update` and overwrites a change from another window | The only such place, the refresher, reads `archived` after the `await`; the AC-6 and AC-7 tests catch a regression. The rejected `modify` method is the fix if one appears |
| More parsing: one `JSON.parse` per call, `1 + workspaces` per publish | The value is a few kilobytes (rows of a few folders); `ArchiveStore` reads the same way |
| The out-of-order echo of `PersistentStorage#follow` (finding 1e) rolls back a newer write | Out of scope, rare; the next refresh writes the rows again |
| A damaged saved value is replaced by the next change, as today | Unchanged behavior; spec 037 (recovery copy) covers it |
| A folder created in another window is refreshed by this window too | Same as after a restart, when every window refreshes every saved folder; see the open questions |

## Open questions

- **Folders created elsewhere join this window's refreshes.** `#run` refreshes `store.all()`, now
  read fresh, so a folder created in window A after window B started is also refreshed by B, which
  sends one more request per interval. It is what already happens after a restart, and the folder
  then shows in B at its next draw, as the spec wants. Accept it as within NFR-2 ("no change to when
  refreshes run"), or keep B to the folders it knew at start?
- **Redraw on a click that finds the folder gone (Q-4, optional part).** The design takes the main
  recommendation only: no extra redraw. Making `LiveFolderHandlers.rename` publish when `update`
  returns `false` would make a renamed, deleted folder vanish at once; the refresher cannot do the
  same on open without changing the 026 test `ignores a folder that was deleted` (NFR-4). Add the
  rename redraw, or leave it?
