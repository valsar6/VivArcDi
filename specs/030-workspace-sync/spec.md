# 030 Workspace sync

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc Sync carries each Space with its pinned tabs, folders, Favorites and theme to every computer of
the same account. Tore uses VivArcDi on macOS and on Debian and wants the same: a workspace set up on
one computer shows up, with its data, on the other. VivArcDi has no server, so everything travels
through Vivaldi Sync. This spec lists what Vivaldi Sync already carries, and makes VivArcDi put the
rest in a place that Vivaldi Sync carries too.

## User stories

- **US-1.** As a user with Vivaldi on two computers, I want each workspace to have the same pinned
  tabs on both, so that I do not set them up twice.
- **US-2.** As a user, I want the folders and Favorites of a workspace to be the same on both
  computers.
- **US-3.** As a user, I want the look of a workspace (its theme color of
  [019](../019-space-theme-color/spec.md)) to follow it to the other computer.
- **US-4.** As a user, I want a workspace created on one computer to appear on the other one.
- **US-5.** As a user, I want sync to need nothing beyond the Vivaldi Sync account I already use.

## Expected behavior

### What Vivaldi Sync already carries

| Data | Where it lives today | Carried by Vivaldi Sync |
|---|---|---|
| Favorites ([001](../001-favorites-grid/spec.md), [003](../003-pinned-tabs-and-folders/spec.md)) | bookmark folder `Favorites` | Yes, as bookmarks |
| Folders of a workspace ([009](../009-bookmark-folders-in-tab-bar/spec.md), [010](../010-folders-per-workspace/spec.md), [012](../012-editable-folders/spec.md)) | bookmarks under `root` or `VivArcDi/<workspace name>` | Yes, as bookmarks, matched by workspace name |
| The workspaces: name, icon, order | Vivaldi preference `vivaldi.workspaces.list` | To be probed (Q-1) |
| Pinned tabs of a workspace and their own page ([003](../003-pinned-tabs-and-folders/spec.md)) | Vivaldi tabs and their `vivExtData` | No: open tabs stay on their computer |
| Theme color of a workspace ([019](../019-space-theme-color/spec.md), Draft) | planned in `chrome.storage.local` | No |
| Collapsed header, open folders, last opened tabs, Today archive, Little Arc windows | `chrome.storage.local` | No |
| `bookmark-folders.workspaces` | `config.json` on each computer | No |

So Favorites and folders already sync. VivArcDi adds the pinned tabs and the settings of each
workspace, and the workspaces themselves if Vivaldi does not carry them.

### Pinned tabs

Each workspace keeps a copy of its pinned tabs, in order, in the **sync store** (Q-2). On every
computer:

- Pinning a tab, unpinning it, moving it among the pinned tabs or changing its own page updates the
  copy.
- When the copy lists a pinned tab that the workspace does not have, VivArcDi opens it there as a
  pinned tab that is not loaded yet, in the copy's position. It loads on the first click, like any
  pinned tab after a restart.
- When the copy no longer lists a pinned tab, VivArcDi closes that pinned tab on the computer where
  it is still open. A tab that is the active tab, or that shows a page other than its own page, is
  left open and unpinned, so nothing the user is reading disappears.

Two pinned tabs are the same tab when they have the same own page, compared as in 007/FR-2.

### Workspace settings

The settings a workspace owns in VivArcDi (today only the theme color of 019, once approved) are kept
in the sync store with the workspace, not in `chrome.storage.local`. View states that Arc keeps per
computer stay local: collapsed header, open folders, last opened tabs.

### Matching a workspace on two computers

Workspaces are matched by name, as the folders of 010 already are, unless the probe shows that
Vivaldi keeps the same workspace id on both computers (Q-3). Renaming a workspace in VivArcDi's
sense renames its entry in the sync store; the other computer then finds the entry under the new
name only after its own workspace has the same name (Q-3).

### A workspace missing on the other computer

If Vivaldi Sync carries the workspaces, there is nothing to do. If it does not, a workspace that is
in the sync store but not on this computer is created by VivArcDi when Vivaldi lets it do so, else
listed in the space header menu as "From your other computers", where one click creates it (Q-1).

### Where Arc and VivArcDi differ

- Arc syncs through its own servers; VivArcDi uses only Vivaldi Sync and has no server.
- Today tabs are not synced, as in Arc.
- The Today archive stays on each computer.

## Requirements

### Functional

- **FR-1.** VivArcDi keeps, for each workspace, an ordered copy of its pinned tabs (title, own page)
  in the sync store, and updates it within 2 seconds of a change on that computer.
- **FR-2.** When the copy of a workspace lists a pinned tab that the workspace lacks on this
  computer, VivArcDi opens it as an unloaded pinned tab of that workspace, in the copy's order.
- **FR-3.** When the copy no longer lists a pinned tab that is open on this computer, VivArcDi closes
  it, unless it is active or shows another page than its own page; then it is unpinned and kept.
- **FR-4.** Changes that VivArcDi makes to apply the sync store are not copied back into it.
- **FR-5.** The workspace settings of VivArcDi (theme color of 019) are kept in the sync store,
  matched to the workspace as in FR-6.
- **FR-6.** A workspace is matched across computers by its name, or by its id if Q-3 shows the id is
  the same on every computer.
- **FR-7.** Where Vivaldi Sync does not carry workspaces, VivArcDi offers the workspaces of the sync
  store that this computer lacks, as described in Q-1.
- **FR-8.** The module `workspace-sync` has the option `enabled` in `config.json`, `true` by default.

### Non-functional

- **NFR-1.** No network access of VivArcDi's own: data travels only through Vivaldi Sync.
- **NFR-2.** Without a Vivaldi Sync account, the module keeps its copy and changes nothing visible.
- **NFR-3.** Applying the sync store never blocks the interface; opened tabs are not loaded until
  clicked.
- **NFR-4.** If the sync store cannot be read or written, the module logs one warning and VivArcDi
  works as before.
- **NFR-5.** Works on macOS and Debian with the same Vivaldi Sync account.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a tab is pinned in a workspace, THE module SHALL add it to that workspace's copy within 2 seconds. | auto: `copies a newly pinned tab` |
| AC-2 | WHEN a pinned tab is unpinned or closed for real, THE module SHALL remove it from the copy. | auto: `removes an unpinned tab from the copy` |
| AC-3 | WHEN pinned tabs are reordered, THE module SHALL store the new order. | auto: `stores the order of pinned tabs` |
| AC-4 | WHEN the copy lists a pinned tab the workspace lacks, THE module SHALL open it unloaded and pinned in that workspace, in the copy's position. | auto: `opens a missing pinned tab unloaded` |
| AC-5 | WHEN the copy no longer lists an open pinned tab that is neither active nor away from its own page, THE module SHALL close it. | auto: `closes a pinned tab removed elsewhere` |
| AC-6 | IF a pinned tab removed elsewhere is active or away from its own page, THEN THE module SHALL unpin it and keep it open. | auto: `keeps a busy tab removed elsewhere` |
| AC-7 | WHEN the module applies the copy, THE module SHALL NOT write that change back to the copy. | auto: `does not echo applied changes` |
| AC-8 | THE module SHALL match a workspace to its copy by name, or by id where ids are shared. | auto: `matches workspaces across computers` |
| AC-9 | THE module SHALL keep the theme color of a workspace in the sync store. | auto: `keeps workspace settings in the sync store` |
| AC-10 | IF the sync store cannot be used, THEN THE module SHALL log one warning and leave the tabs as they are. | auto: `falls back when the sync store fails` |
| AC-11 | WHERE `enabled` is false, THE module SHALL neither read nor write the sync store. | auto: `does nothing when disabled` |
| AC-12 | WHEN Tore pins a tab in a workspace on the Mac, THE same workspace on Debian SHALL show it after Vivaldi Sync runs. | manual |
| AC-13 | WHEN Tore unpins that tab on Debian, THE Mac SHALL no longer show it after Vivaldi Sync runs. | manual |
| AC-14 | WHEN Tore changes the theme color of a workspace on one computer, THE other computer SHALL show the new color after Vivaldi Sync runs. | manual |
| AC-15 | WHEN Tore creates a workspace on one computer, THE other computer SHALL show it, or offer it as in FR-7. | manual |

## Out of scope

- Today tabs, the Today archive, last opened tabs, Little Arc windows: they stay on each computer.
- View states: collapsed header, open folders.
- `config.json` and the installer settings: each computer keeps its own.
- Sharing a space with other people (Arc's "Share Space").
- Merging two different workspaces that happen to have the same name.
- Any sync server or account other than Vivaldi Sync.

## Open questions

- [ ] **Q-1. Does Vivaldi Sync carry the workspaces themselves, and can VivArcDi create one?** To be
  probed (`workspace-sync/diagnostica-sync.md`, step "Prova sync"). Proposed answer: if Vivaldi
  carries them, FR-7 is dropped; if not, VivArcDi lists the missing workspaces in the space header
  menu and creates one on click, if a probe finds a way to create workspaces; otherwise it only tells
  the user which workspaces to create by hand.
- [ ] **Q-2. What is the sync store?** Proposed answer, in this order, by what the probe shows:
  1. `chrome.storage.sync`, if a value written on the Mac reaches Debian;
  2. else a bookmark folder `VivArcDi Sync` (option `folder`), one subfolder per workspace holding
     its pinned tabs as bookmarks in order, and its settings in the description of a bookmark named
     `settings` (or in its address, if descriptions do not sync). Bookmarks always sync, and the user
     can see and repair them in the Bookmarks panel.
- [ ] **Q-3. Is a workspace id the same on both computers?** To be probed. Proposed answer: match by
  name (as 010 does); a workspace renamed on one computer appears on the other as a new entry until
  it is renamed there too.
- [ ] **Q-4. Should sync be on by default?** Proposed answer: yes, as in Arc; Tore can set `enabled`
  to false.
- [ ] **Q-5. Which computer wins when both change the same workspace before syncing?** Proposed
  answer: the last copy that Vivaldi Sync delivers wins, as for bookmarks.

## References

- Probe: `workspace-sync/diagnostica-sync.js` and `diagnostica-sync.md` in the project files.
- [003 Favorites and pinned tabs](../003-pinned-tabs-and-folders/spec.md), own page.
- [010 Folders per workspace](../010-folders-per-workspace/spec.md), match by workspace name.
- [019 Space theme color](../019-space-theme-color/spec.md), the setting to sync.
