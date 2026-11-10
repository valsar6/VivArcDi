# 030 Workspace sync: design

| | |
|---|---|
| Status | Approved |
| Approved | 2026-11-10 |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-10. It says **how**; the spec says **what**.

## Approach

VivArcDi has no server, so the data rides on the one thing Vivaldi Sync always carries: bookmarks.
A new module, `workspace-sync`, keeps a mirror of each workspace's pinned tabs in a bookmark folder and
merges it with the tabs on every computer.

1. **Sync store.** The folder `VivArcDi Sync` (option `folder`, created in Vivaldi's default bookmark
   folder when missing) holds one subfolder per workspace name, and one more named `Tabs` for the area
   outside any workspace. Each subfolder holds:
   - `Pinned`: one bookmark per pinned tab, in the tab order; the title is the tab's title, the address
     is its own page (003).
   - `Settings`: one bookmark with the address `https://vivarcdi.invalid/settings` and a JSON object in
     its `description` (probe of 2026-11-10: `description` is kept). Keys are owned by the specs that
     use them; 019 will add `themeColor`.
   The user can see and repair everything in the Bookmarks panel. The folder is not under `VivArcDi/`,
   so the folders of 009 and 010 never show it.
2. **Three-way merge.** Each computer keeps, in `chrome.storage.local` under
   `vivarcdi.sync.base.<workspace name>`, the list it last agreed with the store (the **base**). On
   every change it compares three ordered lists of address keys (`AddressKey`, the comparison of
   007/FR-2): the pinned tabs here (**local**), the store, and the base.
   - In local, not in base: pinned here, added to the store.
   - In base, not in local: unpinned here, removed from the store.
   - In store, not in base: pinned elsewhere, opened here (FR-2).
   - In base, not in store: unpinned elsewhere, closed or unpinned here (FR-3).
   - Order: the side that changed its order since the base wins; when both did, the store wins
     (Q-5).
   The result is written to the store, applied to the tabs and saved as the new base. Applying it
   makes local, store and base equal, so the next run finds nothing to do: this is how FR-4 (no echo)
   holds without flags or timers. A first run with no base takes the union of local and store, so
   nothing is lost when a computer joins.
3. **Triggers.** Tab events (`onCreated`, `onUpdated` with `pinned`, `onRemoved`, `onMoved`) and
   bookmark events under the store folder start a run, debounced by 500 ms, so FR-1's 2 seconds hold.
   Runs are serialized with `SerialTask`.
4. **One window.** Every window runs the modules, but only the **owner** merges: the normal window with
   the lowest id (`BrowserWindows`), chosen again when it closes. Other windows do nothing, so two
   windows never open the same tab twice. Tabs opened by sync go to the owner window.
5. **Opening and closing.** A tab missing here is opened inactive and pinned in its workspace with
   `WorkspaceTabs.openPinned` (new: `active: false`, `pinned: true`, then `discard`), its own page saved
   with `SavedAddresses`, so it stays unloaded until clicked (NFR-3). A tab removed elsewhere is closed
   with `BrowserTabs.remove`, unless it is active or `AwayTabs` says it shows another page; then it is
   unpinned instead (FR-3).
6. **Missing workspaces (FR-7).** A store subfolder whose name matches no workspace here is skipped by
   the merge and named once in a `Toast` ("Spaces from your other computers: …"); the names already
   shown are kept in `vivarcdi.sync.announced`. When a workspace with that name appears
   (`WorkspaceNames` follows the preference), its next run applies the store.
7. **Settings (FR-5).** `WorkspaceSettings` reads and writes the `Settings` bookmark of a workspace
   with the same merge rule per key (last write wins). It is the store 019 uses for its color; until
   019 is built, it holds no keys.

Rejected: `chrome.storage.sync` (the probe could not show that Vivaldi carries it); Vivaldi's own
workspace preference (read-only in `BrowserPrefs` by design, and its sync is unknown); matching
workspaces by id (ids differ between computers, Q-3); the bookmark `uuid` as the tab key (pinned tabs
have no bookmark on the first computer, and address keys already match tabs in 007).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/workspacesync/WorkspaceSync.ts` | Module: wiring, owner check, triggers | Facade |
| `src/modules/workspacesync/SyncStore.ts` | Reads and writes the `VivArcDi Sync` folder | Repository |
| `src/modules/workspacesync/PinnedMerge.ts` | Pure three-way merge of ordered key lists | Strategy |
| `src/modules/workspacesync/SyncBase.ts` | Base lists in the persistent storage | Repository |
| `src/modules/workspacesync/LocalPinned.ts` | Pinned tabs of each workspace here, as entries | Adapter |
| `src/modules/workspacesync/PinnedApplier.ts` | Opens, closes, unpins and moves tabs to match the merge | Command |
| `src/modules/workspacesync/WindowOwner.ts` | Tells whether this window is the owner | |
| `src/modules/workspacesync/MissingSpaces.ts` | Names workspaces missing here, once | |
| `src/modules/workspacesync/WorkspaceSettings.ts` | Per-workspace settings in the store | Repository |
| `src/modules/workspacesync/SyncPass.ts` | One merge pass over every workspace | Template method |
| `src/modules/workspacesync/SyncNames.ts` | Store folder name of a workspace, `Tabs` outside any | |
| `src/modules/workspacesync/Debounce.ts` | The 500 ms trigger delay | |
| `src/core/bookmarks/BookmarkWriter.ts` | Gains `describe(id, description)` | |
| `src/core/WorkspaceTabs.ts` | Gains `openPinned`, which writes the own page with the workspace in one write | |
| `src/core/BrowserWindows.ts`, `BrowserTabs.ts`, `WorkspaceNames.ts` | Gain `normalIds`, `onMoved`, `idOf` | |

`PinnedMerge` has no browser dependency, so AC-1 to AC-8 are mostly tested on it with plain lists;
`PinnedApplier` and `SyncStore` are tested with the fake tabs and bookmarks the other modules use.

Notes from the build: tabs linked to a Favorite are left out of the copy (the Favorites folder already
syncs them); the base is saved only after the store and the tabs both changed, so a half-applied run
is repeated, not read as a removal; a title change alone is not a change.

## Vivaldi interface

No new selectors. APIs: `chrome.bookmarks` (with Vivaldi's `description`, probe of 2026-11-10),
`chrome.tabs`, `chrome.windows`, `vivaldi.prefs` (read only, `vivaldi.workspaces.list`), tab
`vivExtData` (`workspaceId`, VivArcDi's own page).

## Configuration

`config.json`, new module:

```json
"workspace-sync": {
  "enabled": true,
  "folder": "VivArcDi Sync"
}
```

`privateWindows` stays `never`: a private window neither reads nor writes the store.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi Sync never carries the bookmarks between Tore's two computers | Nothing breaks; the manual checks AC-12 to AC-15 show it |
| Two computers pin the same page in the same workspace before syncing | Same address key, merged into one entry |
| A pinned tab without a web address (`vivaldi://`, `file://`) | No address key: left out of the store, logged once |
| The user edits the store by hand | Treated like a change from another computer; malformed `Settings` JSON is ignored and logged once |
| Many pinned tabs open at once on a new computer | Opened unloaded, one at a time through `SerialTask` |
| The owner window is closed during a run | The run finishes; the next window becomes owner and its first run repairs any gap |
| A workspace renamed on one computer | Appears as a new store entry and in the missing-spaces message on the other, as the spec says |
