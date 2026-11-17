# 043 Sync robustness

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |
| Amends | [030 Workspace sync](../030-workspace-sync/spec.md) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

The storage review of 2026-11-17 found two ways in which [030](../030-workspace-sync/spec.md) closes
pinned tabs that nobody removed, on every computer of the account. A workspace whose name is also a
name the sync store uses for itself (`Spaces`, `spaces`, `Tabs`) collides with the store. A store
folder that goes missing reads as "every tab was removed elsewhere". This spec skips the workspaces
with a reserved name, with a warning. It also treats a missing store as lost, not as empty, and
rebuilds it from this computer. Both are fixes: nothing changes while names are free and the store
is intact.

## User stories

- **US-1.** As a user coming from Arc, I want to name a workspace `Spaces` or `Tabs` without losing
  its pinned tabs, on this computer or on the others.
- **US-2.** As a user who deletes or loses the `VivArcDi Sync` folder, or the folder of a workspace
  inside it, I want my pinned tabs to stay open and the store to come back, not to have my tabs
  closed on every computer.
- **US-3.** As a user, I want removing a single pinned tab from the store by hand to keep working as
  it does today.

## Expected behavior

### Today

The sync store of 030 is the bookmark folder `VivArcDi Sync` (option `folder`). It holds one
subfolder per workspace name, `Tabs` for the area outside any workspace, and `Spaces` for the list
of workspaces (030 revision of 2026-11-12). On this computer, each workspace's last agreed list (the
**base**) is kept under `vivarcdi.sync.base.<folder name>`, and the list of workspaces under
`vivarcdi.sync.base.spaces`. Titles and keys are compared exactly, so case matters
(`BookmarkFolderFinder.ts:17-19,41`).

| Workspace name | What collides | What the user sees |
|---|---|---|
| `Spaces` | Its pinned tabs go to `VivArcDi Sync/Spaces/Pinned`, inside the workspace list folder (`SyncStore.ts:75`, `SpaceList.ts:6,43`). Each pass first rewrites that list and removes everything in it that is not a workspace entry, `Pinned` included (`SpaceList.ts:69-81`, `SyncPass.ts:59`). The pinned pass then finds no tabs in the store while the base has them, and reads that as "removed elsewhere" (`SyncPass.ts:72-80`). Its `Settings` bookmark is removed in the same way. | The pinned tabs of `Spaces` are closed, and the empty list then reaches every computer. |
| `spaces` | Its base key is `vivarcdi.sync.base.spaces`, the key of the workspace list base (`SyncBase.ts:4,56-57`, `SpaceBase.ts:4`). Each one reads the other's value as invalid and gets `null`, so every pass is a first run. | Deletions of pinned tabs and of workspaces stop travelling: deleted items come back. |
| `Tabs` | It shares its store folder and base key with the area outside any workspace (`SyncNames.ts:1,8-9`, `SyncPass.ts:63-64`). The two lists overwrite each other on every pass. | Pinned tabs flicker open and closed between computers. |

A missing store is read as an empty one:

| What is missing | Where | Effect |
|---|---|---|
| `VivArcDi Sync`, a workspace folder in it, or that folder's `Pinned` | `SyncStore.ts:54-64,116-125` return no entries; `SyncPass.ts:72-80` merges them against a non-empty base | Every pinned tab of the base counts as removed elsewhere: it is closed here, or unpinned if busy (030/FR-3), and then on every other computer |
| `VivArcDi Sync/Spaces` | `SpaceList.ts:32-35` returns an empty list; the merge forgets every workspace (`SpaceMerge.ts:69`, `SpaceSync.ts:59`) | Workspaces stay open, but each one stays unlinked until it is renamed (`SpaceIds.ts:49-51`): the list stops syncing, on every computer |

A folder can go missing when the user deletes it, or when a rename made on another computer has not
reached this computer's list of names yet.

### After

**Reserved names.** The reserved names are exactly `Spaces`, `spaces` and `Tabs`, with this case. A
workspace with one of these names keeps everything it has here: its pinned tabs and its settings
stay as they are. The module neither reads nor writes its store folder or its base. It logs one
warning per session that names the workspace and asks for a rename. The workspace itself still
travels in the workspace list (030 revision), so it is created on the other computers, and it is
skipped there too. As soon as it gets a free name, it syncs from the next pass.

The internal folders and keys keep their names. Renaming them would need a migration of the
bookmarks on every computer.

**Missing store.** "Missing" means that the folder does not exist. An existing folder with no
entries is still a valid, empty store.

- When a workspace's store folder or its `Pinned` folder is missing (the root `VivArcDi Sync`
  included) and the base of that workspace is not empty, the store is treated as lost. The pass works
  as a first run for that workspace: the union of the tabs here and the (empty) store. It closes and
  unpins nothing, and it writes the folder again from the pinned tabs here.
- When `VivArcDi Sync/Spaces` is missing and the workspace list base is not empty, the list is
  written again from the workspaces here. No workspace is forgotten or unlinked.
- Each rebuild logs one warning per session.
- Removing one bookmark from an existing `Pinned` folder, or all of them one by one, still removes
  those tabs on every computer, as 030/AC-5 says.

Deleting the `VivArcDi Sync` folder no longer works as a reset that closes the synced tabs. Tore
accepted this on 2026-11-17.

## Requirements

### Functional

- **FR-1.** A workspace named exactly `Spaces`, `spaces` or `Tabs` takes no part in the pinned tab
  sync or the settings sync: the module neither reads nor writes its store folder, its `Settings`
  bookmark or its base, and it never opens, closes, unpins or moves its tabs.
- **FR-2.** For a workspace with a reserved name, the module logs one warning per session that names
  it and suggests renaming it.
- **FR-3.** A workspace with a reserved name keeps its place in the workspace list of the store.
- **FR-4.** The area outside any workspace keeps the folder `Tabs` and its base, whatever the names of
  the workspaces.
- **FR-5.** IF the store folder of a workspace, its `Pinned` folder or the sync folder itself is
  missing while that workspace's base is not empty, THEN the pass merges as a first run for that
  workspace (no base), so it closes and unpins nothing, and writes the folder from the tabs here.
- **FR-6.** IF the workspace list folder `Spaces` or the sync folder is missing while the workspace
  list base is not empty, THEN the list sync merges as a first run, so it forgets no workspace, and
  writes the list from the workspaces here.
- **FR-7.** Each rebuild of FR-5 or FR-6 logs one warning per session.
- **FR-8.** A pinned entry removed from an existing `Pinned` folder still counts as a removal made
  elsewhere (030/FR-3).

### Non-functional

- **NFR-1.** With free workspace names and an intact store, the sync behaves exactly as today, and
  every existing test keeps its name and passes.
- **NFR-2.** No migration. Data left by the collisions heals on the next pass: a base that cannot be
  read becomes a first run, which is a union and closes nothing.
- **NFR-3.** No new folder, key or storage container. The names of the folders and keys of 030 stay
  as they are.
- **NFR-4.** Warnings go to the console only. A toast belongs to the mechanism of spec 041 (see
  [Open questions](#open-questions)).
- **NFR-5.** The code ships on a `fix/` branch with a patch version change.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria) and verifiable one by one. `Check` says how:
`auto` names the test that proves it, `manual` is a step Tore performs on a real Vivaldi.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | IF a workspace is named `Spaces`, `spaces` or `Tabs`, THEN THE module SHALL neither read nor write its store folder, settings or base, and SHALL log one warning that names it | auto: `skips a workspace with a reserved name` |
| AC-2 | WHILE a workspace has a reserved name, THE module SHALL leave its pinned tabs as they are | auto: `keeps the pinned tabs of a workspace with a reserved name` |
| AC-3 | WHILE a workspace named `Spaces` exists, THE module SHALL write nothing but workspace entries into the workspace list folder | auto: `writes only workspace entries into the workspace list` |
| AC-4 | WHILE a workspace named `Tabs` exists, THE module SHALL sync the area outside any workspace on its own | auto: `keeps the area outside workspaces apart from a workspace named Tabs` |
| AC-5 | WHILE a workspace has a reserved name, THE module SHALL keep it in the workspace list of the store | auto: `lists a workspace with a reserved name` |
| AC-6 | WHEN a workspace with a reserved name is renamed to a free name, THE module SHALL sync its pinned tabs from the next pass | auto: `syncs a workspace once its reserved name changes` |
| AC-7 | IF the store folder or the `Pinned` folder of a workspace is missing while its base is not empty, THEN THE module SHALL close no tab and SHALL write the folder from the pinned tabs here | auto: `rewrites a missing workspace store from this computer` |
| AC-8 | IF the sync folder is missing while the bases are not empty, THEN THE module SHALL close no tab and SHALL write the store from the pinned tabs here | auto: `rewrites a missing sync folder from this computer` |
| AC-9 | IF the workspace list folder is missing while the list base is not empty, THEN THE module SHALL forget no workspace and SHALL write the list from the workspaces here | auto: `rewrites a missing workspace list from this computer` |
| AC-10 | WHEN the module rebuilds a missing store, THE module SHALL log one warning per session | auto: `warns once when the store went missing` |
| AC-11 | WHEN a pinned entry is removed from an existing `Pinned` folder, THE module SHALL close or unpin that tab as in 030/AC-5 and 030/AC-6 | auto: `still closes a tab whose entry was removed by hand` |
| AC-12 | WHEN Tore pins 2 tabs in a workspace named `Spaces` on the Mac (test profile), THE tabs SHALL stay pinned on both computers after Vivaldi Sync runs, and the console SHALL show the reserved name warning | manual |
| AC-13 | WHEN Tore deletes the `VivArcDi Sync` folder on the Mac (test profile), THE pinned tabs SHALL stay open on both computers, and the folder SHALL come back with them after Vivaldi Sync runs | manual |
| AC-14 | WHEN Tore removes one bookmark from `VivArcDi Sync/<workspace>/Pinned` on the Mac (test profile), THAT tab SHALL close on both computers after Vivaldi Sync runs | manual |

## Out of scope

- Two `VivArcDi Sync` folders (for example on the first start of a second computer before Vivaldi
  Sync delivers the store) and a search for the store folder that starts from where it was created
  instead of anywhere in the tree.
- Reordering pinned entries with a move instead of removing and creating them again
  (`SyncStore.ts:77-80`, `SpaceList.ts:45-48`).
- The data VivArcDi keeps on tabs (`vivExtData`): spec 042.
- A toast, and the shared mechanism for severe failures: spec 041.
- Renaming the internal folders or keys, or forbidding names in Vivaldi's workspace editor.
- Removing base keys of workspaces that no longer exist.

## Open questions

- [ ] **Toast for a reserved name.** The user who names a workspace `Spaces` does not see the console,
  so their tabs stop syncing without notice. Proposed: not in this spec. Once 041 defines the toast
  for severe failures, a follow-up adds this notice to it, once per workspace.
- [ ] **How 030 shows the amendment.** Proposed: when this spec is approved, 030 keeps its status
  `Implemented` and gains the header row `| Amended by | [043 Sync robustness](../043-sync-robustness/spec.md) |`.
  Its References also get a link to 043. The sentence "The user edits the store by hand: treated like a
  change from another computer" in 030's design gets a pointer to FR-5 and FR-8 here. The text of
  030's FR-3 and AC-5 stays, because this spec adds a case before them and does not change them.

## References

- Storage review of 2026-11-17, risks B, C and D and point 4b.
- [030 Workspace sync](../030-workspace-sync/spec.md): FR-3, AC-5, AC-6, Q-7, the revision of
  2026-11-12 and its design.
- [010 Folders per workspace](../010-folders-per-workspace/spec.md): matching by workspace name.
