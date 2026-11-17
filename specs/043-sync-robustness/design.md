# 043 Sync robustness: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

## Approach

Two small guards inside `src/modules/workspacesync/`, and no change to the shape of the store, the
keys or the merge rules of 030.

**Reserved names** live in one place, `SyncNames`, next to the name of the area outside any
workspace that causes one of the collisions. Every collaborator that turns a workspace name into a
store folder or a base key asks `SyncNames.reserved(name)` first:

- `SyncPass` leaves reserved names out of the list of workspaces it syncs, and warns once per name.
  The area outside any workspace stays the `null` entry, so it never meets a workspace named `Tabs`
  (FR-4).
- `SpaceSync` still lists every workspace (FR-3), but never moves a store folder or a base for a
  rename from or to a reserved name. Without that guard, renaming `Spaces` to `Work` would rename
  the workspace list folder itself, and renaming `Work` to `Tabs` would move its pinned tabs into
  the area outside any workspace.
- `WorkspaceSettings` reads nothing and writes nothing for a reserved name.

Nothing is cleaned up. A `Pinned` folder that a workspace named `Spaces` left in the list folder is
removed by the next write of the list, as today, which is what AC-3 asks. A base under
`vivarcdi.sync.base.spaces` damaged by the old collision is read as `null` and the next list pass
is a first run, a union (NFR-2).

**A missing store** becomes visible to the merge instead of reading as empty. `SyncStore.spaces()`
and `SpaceList.read()` already tell "no folder" from "empty folder" internally (`find` returns
`null`); they now pass it on:

- `StoredSpace.pinned` is `null` when the workspace folder has no `Pinned` folder. A workspace with
  no folder at all is absent from the map, as today, and the sync folder missing means an empty map.
- `SpaceList.read()` returns `null` when `VivArcDi Sync/Spaces` does not exist.

The callers then drop the base for that run when the folder is missing and the base is not empty:
`PinnedMerge.merge` and `SpaceMerge.merge` with `base: null` are already the first run of 030, a
union that removes nothing. The write that follows recreates the folder through `ensurePath`, and
the base is set from the result as on every pass. A `Pinned` folder that exists with no bookmarks
is a real store and keeps the three-way merge, so removing entries by hand still closes tabs (FR-8).

Rejected alternatives:

- **Rename the internal folders and keys** (`Spaces` to `.spaces`, a key suffix): needs a migration
  of the bookmarks on every computer and the spec excludes it (NFR-3).
- **Prefix every workspace folder**: same migration, and the folders become harder to read by hand.
- **Treat any empty store as lost**: would make AC-11 impossible, since emptying `Pinned` by hand
  could no longer close tabs.
- **Keep a marker bookmark to detect a deleted store**: a new item in the store (NFR-3), and a
  missing folder is already a clear signal.

## Components

| Class or file | Change | Pattern |
|---|---|---|
| `SyncNames.ts` | `RESERVED_NAMES = ['Spaces', 'spaces', 'Tabs']` and `static reserved(name: string): boolean`, an exact comparison. The comment names the collision of each one | Single source of names |
| `SyncStore.ts` | `StoredSpace.pinned: PinnedEntry[] \| null`, `null` when the folder has no `Pinned` folder. `#spaceOf` keeps returning `null` for a folder with neither `Pinned` nor `Settings` | Absent is not empty |
| `SpaceList.ts` | `read(): Promise<SpaceEntry[] \| null>`, `null` when the list folder does not exist | Absent is not empty |
| `SyncPass.ts` | Filters reserved names out of `names.names`, warns once per name (`the workspace "Spaces" has a name the sync store uses for itself: its pinned tabs and settings are not synced until it is renamed`). In `#syncWorkspace`, `stored = space?.pinned ?? null`; when `stored` is `null` and the base is not empty, merges with `base: null` and remembers the name for the rebuild warning | Guard clause |
| `SpaceSync.ts` | `run` reads the list first; when it is `null` and the known base is not empty, merges with `base: null`. One private `#moveStore(from, to)` wraps `store.renameSpace` and `pinnedBase.rename`, and does nothing when either name is reserved; both rename paths use it | Guard clause |
| `WorkspaceSettings.ts` | `get` returns `undefined` and `set` returns without writing for a reserved name. No warning of its own: `SyncPass` already names the workspace | Guard clause |

Warnings, at most once per session each, through the module's logger:

- Reserved name: one line per workspace name, as above (FR-2, AC-1).
- Missing pinned store (FR-5, FR-7): `the sync store of "Work", "Tabs" was missing: rebuilt from this computer, no tab was closed`,
  logged on the first pass that rebuilds, naming the workspaces of that pass. The area outside any
  workspace shows as `Tabs`, the folder name the user sees.
- Missing workspace list (FR-6, FR-7): `the workspace list of the sync store was missing: rebuilt from this computer`.

Deleting the whole sync folder therefore gives two lines, one for the list and one for the pinned
tabs, and AC-10 checks that neither repeats on the next passes.

Order inside a pass does not change: `SpaceSync.run` first, then `store.spaces()`, then each
workspace. The list rebuild writes `VivArcDi Sync/Spaces` before the pinned pass reads the store,
which is harmless: `#spaceOf` ignores a folder with neither `Pinned` nor `Settings`.

### Tests

All in `tests/modules/workspacesync/`, through the fakes of 030 (`fakes.ts`), with names identical
to the `auto:` checks.

| AC | Test | File |
|---|---|---|
| AC-1 | `skips a workspace with a reserved name` | `WorkspaceSync.test.ts` |
| AC-2 | `keeps the pinned tabs of a workspace with a reserved name` | `WorkspaceSync.test.ts` |
| AC-3 | `writes only workspace entries into the workspace list` | `WorkspaceSync.test.ts` |
| AC-4 | `keeps the area outside workspaces apart from a workspace named Tabs` | `WorkspaceSync.test.ts` |
| AC-5 | `lists a workspace with a reserved name` | `WorkspaceSync.test.ts` |
| AC-6 | `syncs a workspace once its reserved name changes` | `WorkspaceSync.test.ts` |
| AC-7 | `rewrites a missing workspace store from this computer` | `WorkspaceSync.test.ts` |
| AC-8 | `rewrites a missing sync folder from this computer` | `WorkspaceSync.test.ts` |
| AC-9 | `rewrites a missing workspace list from this computer` | `WorkspaceSync.test.ts` |
| AC-10 | `warns once when the store went missing` | `WorkspaceSync.test.ts` |
| AC-11 | `still closes a tab whose entry was removed by hand` | `WorkspaceSync.test.ts` |

AC-1 also covers `WorkspaceSettings`: the stored `Settings` of a reserved name is neither read nor
written. AC-6 renames `Spaces` to `Work` on this computer and checks that the list folder keeps its
name. The existing tests keep their names and their checks (NFR-1); `Parts.test.ts:123` reads
`pinned` through `?.` once it can be `null`.

## Vivaldi interface

None. No selector, mark or private API is added; the module keeps using `chrome.bookmarks` through
`BrowserBookmarks` and `BookmarkWriter`.

## Configuration

None. The option `folder` of 030 keeps its default `VivArcDi Sync`.

## Risks

| Risk | Mitigation |
|---|---|
| A rename made on another computer reaches the store before this computer can follow it (renamer disabled, or the menu fails): the old folder is missing here, so it is rebuilt and the store holds both names | Accepted by the spec: the tabs stay open, which is the point. The workspace list still carries the rename, and the extra folder can be removed by hand |
| Vivaldi Sync delivers the deletion of a folder later than its recreation on another computer, and the folder disappears again | Each pass rebuilds it again without closing anything; the warning shows once per session. Probe T5 of the storage review covers partial delivery |
| A user who deleted `VivArcDi Sync` to reset the sync now gets it back | Accepted by Tore on 2026-11-17. Removing the bookmarks inside `Pinned` still removes tabs everywhere |
| A workspace named `Spaces` loses its leftover `Pinned` folder in the store | It is the folder the collision created, and AC-3 requires removing it; the tabs here stay pinned (AC-2) |
| `StoredSpace.pinned` becoming nullable reaches other readers | Only `SyncPass` reads it; `WorkspaceSettings` reads `settings` only. The compiler lists every use |
