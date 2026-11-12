# 030 Workspace sync

| | |
|---|---|
| Status | Draft (revision 2026-11-12) |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-10 |

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
| The workspaces: name, icon, order | Vivaldi preference `vivaldi.workspaces.list` | Not known (Q-1); VivArcDi does not rely on it |
| Pinned tabs of a workspace and their own page ([003](../003-pinned-tabs-and-folders/spec.md)) | Vivaldi tabs and their `vivExtData` | No: open tabs stay on their computer |
| Theme color of a workspace ([019](../019-space-theme-color/spec.md), Draft) | planned in `chrome.storage.local` | No |
| Collapsed header, open folders, last opened tabs, Today archive, Little Arc windows | `chrome.storage.local` | No |
| `bookmark-folders.workspaces` | `config.json` on each computer | No |

So Favorites and folders already sync. VivArcDi adds the pinned tabs and the settings of each
workspace, and the workspaces themselves if Vivaldi does not carry them.

### Pinned tabs

Each workspace keeps a copy of its pinned tabs, in order, in the **sync store**: the bookmark folder
`VivArcDi Sync`, with one subfolder per workspace (Q-2). On every
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

VivArcDi does not create workspaces. When the sync store has a workspace that this computer lacks,
VivArcDi shows a message once with its name, so the user can create it with the same name. As soon as
a workspace with that name exists, its pinned tabs arrive. If Vivaldi Sync turns out to carry the
workspaces, the message never appears (Q-1).

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
- **FR-6.** A workspace is matched across computers by its name.
- **FR-7.** When the sync store has a workspace that this computer lacks, VivArcDi shows its name once
  in a message, and applies its pinned tabs as soon as a workspace with that name exists.
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
| AC-8 | THE module SHALL match a workspace to its copy by name. | auto: `matches workspaces across computers` |
| AC-9 | THE module SHALL keep the theme color of a workspace in the sync store. | auto: `keeps workspace settings in the sync store` |
| AC-10 | IF the sync store cannot be used, THEN THE module SHALL log one warning and leave the tabs as they are. | auto: `falls back when the sync store fails` |
| AC-11 | WHERE `enabled` is false, THE module SHALL neither read nor write the sync store. | auto: `does nothing when disabled` |
| AC-12 | WHEN Tore pins a tab in a workspace on the Mac, THE same workspace on Debian SHALL show it after Vivaldi Sync runs. | manual |
| AC-13 | WHEN Tore unpins that tab on Debian, THE Mac SHALL no longer show it after Vivaldi Sync runs. | manual |
| AC-14 | WHEN Tore changes the theme color of a workspace on one computer, THE other computer SHALL show the new color after Vivaldi Sync runs. | manual |
| AC-15 | WHEN Tore creates a workspace on one computer, THE other computer SHALL show it, or name it as in FR-7. | manual |
| AC-16 | WHEN the sync store has a workspace this computer lacks, THE module SHALL show its name once. | auto: `names a workspace missing here once` |

## Out of scope

- Today tabs, the Today archive, last opened tabs, Little Arc windows: they stay on each computer.
- View states: collapsed header, open folders.
- `config.json` and the installer settings: each computer keeps its own.
- Sharing a space with other people (Arc's "Share Space").
- Merging two different workspaces that happen to have the same name.
- Any sync server or account other than Vivaldi Sync.

## Decisions

Tore approved the spec on 2026-11-10 with the proposed answers. The probe of 2026-11-10 ran on the Mac
only (the Debian was on another Vivaldi account); Tore asked to treat Debian as the Mac.

- [x] **Q-1. Does Vivaldi Sync carry the workspaces, and can VivArcDi create one?** Not known.
  VivArcDi does not create workspaces; it names the missing ones (FR-7). If Vivaldi carries them, the
  message never shows.
- [x] **Q-2. What is the sync store?** The bookmark folder `VivArcDi Sync` (option `folder`). The probe
  showed that `chrome.storage.sync` accepts writes but could not show that Vivaldi carries it, while
  bookmarks always sync, keep a `uuid`, and keep a `description` (written and read back on the Mac).
- [x] **Q-3. Is a workspace id the same on both computers?** No: Vivaldi gives it on creation (the
  probe's "Prova sync" got `1794297902728`, a time in milliseconds). Workspaces are matched by name.
- [x] **Q-4. Should sync be on by default?** Yes; `enabled` false turns it off.
- [x] **Q-5. Which computer wins when both change the same workspace before syncing?** The change that
  reaches the sync store last wins, as for bookmarks.

## Proposed revision (2026-11-12)

Tore's first test on two computers (2026-11-12) showed that Vivaldi Sync does **not** carry the
workspaces: the receiving computer kept its own list, so the pinned tabs had nowhere to go. Tore's
request: the workspaces must be available on the new computer at once, without creating them by
hand, with their pinned tabs and folders. This revision replaces FR-7, AC-15 and AC-16 and answers
Q-1 again. Until Tore approves it, the approved text above stays in force.

### Expected behavior

- **Workspaces travel.** The sync store keeps the list of workspaces: name, icon and order. When a
  computer lacks a workspace of the list, VivArcDi creates it there through Vivaldi's own menu, with
  the same name (icon: Q-10), at the end of the list, and its pinned tabs arrive in it as in FR-2. Nothing is asked of the user.
- **Folders come with them.** The folders of a workspace are bookmarks under
  `VivArcDi/<workspace name>` (010), which Vivaldi Sync already carries; a workspace created with
  the same name shows them at once. The Favorites grid is the same in every workspace (003) and
  already syncs.
- **Renames follow.** VivArcDi gives each workspace a sync id, kept in its `Settings` entry and
  linked on each computer to Vivaldi's own id. Renaming a workspace on one computer renames it on the
  other, and its store folder with it.
- **Deleting is never automatic** (Q-7): a workspace deleted on one computer is only removed from the
  store; the other computer keeps it, with its tabs, until the user deletes it there.
- If the menu cannot be driven (a future Vivaldi changes it), the approved behavior stays: the
  missing workspaces are named in a message.

### Requirements

- **FR-7 (revised).** WHEN the sync store lists a workspace that this computer lacks, VivArcDi creates
  it through Vivaldi's workspace menu with the stored name, then applies its pinned tabs.
- **FR-9.** VivArcDi keeps the list of workspaces (sync id, name, icon, order) in the sync store and
  updates it within 2 seconds of a change on this computer.
- **FR-10.** A workspace renamed on one computer is renamed on the other, matched by its sync id.
- **FR-11.** VivArcDi never deletes a workspace or its tabs because another computer deleted it.

### Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-15 (revised) | WHEN Tore creates a workspace on one computer, THE other computer SHALL show it, with its icon and pinned tabs, after Vivaldi Sync runs, without any step by Tore. | manual |
| AC-16 (revised) | WHEN the sync store lists a workspace this computer lacks, THE module SHALL create it through Vivaldi's workspace menu with the stored name. | auto: `creates a workspace missing here` |
| AC-17 | WHEN a workspace is created, renamed, re-iconed or moved, THE module SHALL update the list in the sync store. | auto: `stores the list of workspaces` |
| AC-18 | WHEN a workspace is renamed on another computer, THE module SHALL rename the matching workspace here. | auto: `follows a rename from another computer` |
| AC-19 | WHEN a workspace is deleted on another computer, THE module SHALL keep it here. | auto: `keeps a workspace deleted elsewhere` |
| AC-20 | IF Vivaldi refuses to create a workspace, THEN THE module SHALL name it once, as in the approved FR-7. | auto: `names a workspace it cannot create` |
| AC-21 | WHEN Tore renames a workspace on one computer, THE other computer SHALL show the new name after Vivaldi Sync runs. | manual |

### Open questions

- [x] **Q-6. Can VivArcDi create a workspace?** Yes, through Vivaldi's own menu (probes of
  2026-11-12). Writing `vivaldi.workspaces.list` with `vivaldi.prefs.set` changes the preference but
  Vivaldi neither shows the entry nor keeps it after a restart: the interface owns the list and writes
  it back. There is no API to create a workspace. Driving the menu works: a full pointer sequence
  (pointer and mouse down, up, click) on `button[data-name="WorkspaceButton"]` opens
  `.WorkspacePopup`; the same on its "New workspace" button (`.actions button[aria-label]`) opens the
  inline editor `form.Workspace-Editor` with `input[name="workspace-title"]`; writing the name
  through the native value setter plus an `input` event and pressing `.actions input.primary`
  ("Create") adds the workspace to Vivaldi's list. A plain `click()` does nothing. VivArcDi creates
  the missing workspaces this way, one at a time, closing the menu after each.
- [ ] **Q-10. The icon of a created workspace.** The editor has an icon and an emoji picker. Proposed
  answer: the first version sets only the name, so a created workspace has Vivaldi's default icon;
  the stored icon is applied in a later step after a probe of the picker.
- [ ] **Q-7. Should a workspace deleted on one computer be deleted on the other?** Proposed answer:
  no, to never lose tabs; it is only dropped from the store.
- [ ] **Q-8. What about the workspaces each computer already has?** Proposed answer: on the first run
  they are merged by name; the ones with different names are added to the other computer, so both end
  up with the union (on Tore's computers: Riposino, Ramino, Casettona, Prova).
- [ ] **Q-9. Do the folder roots set by hand in `config.json` (`bookmark-folders.workspaces`) need to
  travel too?** Proposed answer: no; the default roots `VivArcDi/<name>` already follow the name.

## References

- Probe: `workspace-sync/diagnostica-sync.js` and `diagnostica-sync.md` in the project files.
- [003 Favorites and pinned tabs](../003-pinned-tabs-and-folders/spec.md), own page.
- [010 Folders per workspace](../010-folders-per-workspace/spec.md), match by workspace name.
- [019 Space theme color](../019-space-theme-color/spec.md), the setting to sync.
