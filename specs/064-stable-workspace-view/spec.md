# 064 Stable workspace view

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-25 |
| Follow-up to | [063 Minus closes folder link tabs](../063-minus-closes-folder-tabs/spec.md); GitHub issue #283 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Tore's recording of 2026-11-25 at 12:30 shows the sidebar keeping the name `Riposino` while drawing
another workspace's tabs: pressing the Streaming folder's minus while `vivaldi:inspect/#apps` is
loading replaces the Favorites and folder rows with a `Tabs` section, and only switching workspace
away and back restores the view. VivArcDi infers the workspace from the active tab's
`vivExtData.workspaceId`, so a tab that is not in the selected workspace — an internal inspection
page, or none after a removal — pulls the section away from it, and the header, folder section, live
folders and pinned tiles each follow their own copy of that inference. This spec keeps the selected
workspace through an inspection page and a tab removal, makes every surface show one consistent
workspace, and saves a folder's close state under the workspace the press started in.

## Seen in the recording

The recording is by Tore on 2026-11-25 at 12:30, VivArcDi 0.72.0, Vivaldi on macOS. Its sequence:

- At about 4.5 s the pointer presses the minus of the `Streaming` folder while
  `vivaldi:inspect/#apps` is loading.
- At about 4.75 s a `Tabs` label appears.
- At about 5 s the Favorites folder rows are replaced by a `Tabs` section with rows such as
  `Offerte Luce Green…`, `Untitled` and `Programming`, while the header still reads `Riposino`.
- Switching to another workspace and back restores the expected folders and link rows.
- At about 8 s Vivaldi's own workspace menu lists `Inspect with Chrome Develop… — 2 schede` as a
  separate row above `Riposino — 7 schede`, with the checkmark on `Riposino`.

The `2 schede` is Vivaldi's own count for the separate inspection workspace, not a VivArcDi count:
no code under `src/` counts tabs or writes that menu. This spec treats the count as out of scope and
keeps the recording as the behavior to match for the sidebar.

## User stories

- **US-1.** As a user, I want pressing a folder's minus to keep the workspace and its rows, so that
  the sidebar does not jump to another workspace's tabs in the middle of one gesture.
- **US-2.** As a user, I want a Vivaldi inspection page, which I did not ask to browse, not to change
  the workspace I am looking at.
- **US-3.** As a user, I want the header, the folder rows, the open-tab rows and the pinned tiles to
  always agree on which workspace they show.
- **US-4.** As a user, I want a folder I just closed to stay closed when I come back, even if the
  active tab changed while its tabs were closing.

## Expected behavior

**The selected workspace is what the user sees.** While a Vivaldi workspace is selected, the header,
the folder rows, the open-link rows and the pinned tiles show that workspace. An internal Vivaldi
page that opens for inspection, such as `vivaldi:inspect/#apps` and the extension and window targets
it opens, does not change it: the sidebar keeps the selected workspace's name and rows. A normal
page that genuinely belongs to no workspace still selects the area outside any workspace, named
`Tabs`, exactly as today; that area and its store stay reserved (043/FR-4).

**One state for every surface.** The header, the folder rows, the open-link rows and the pinned
tiles show the same workspace at the same moment. The user never sees one workspace's name with
another workspace's rows, nor the folders of one workspace with the tabs of another.

**A tab removal does not empty the view.** When tabs close, and at the moment no tab of the window
is active, the last known workspace stays until Vivaldi selects another one. While no tab is active
the open-link rows show the tabs of the workspace the section shows, not the tabs of every workspace
and not only the `Tabs` area's tabs.

**A folder's minus closes and stays closed.** A press on a folder's minus saves the folder's close
state under the workspace that was active when the press started, even if the active tab changes
while the folder's tabs are closing. Switching workspace away and back finds the folder closed, as
the press intended.

**Versions.** The behavior holds on Vivaldi 8.1, 8.2 and 8.3, with the Favorites grid on and off,
for ordinary and live folders.

### Today

| Case | What happens today | Where |
|---|---|---|
| Which workspace is shown | Read from the first active tab's `vivExtData.workspaceId`, not from Vivaldi's selected workspace | `ActiveWorkspace.ts:76-84`, `TabData.ts:26-29` |
| An inspection page becomes active | Its tab is not in the selected workspace, so the section follows it: the root falls to `VivArcDi/Tabs` and the label to `Tabs` | `FolderSection.ts:165-179`, `WorkspaceRoots.ts:39-45,62-65`, `config.json:50-56` |
| The header and the rows | Each module owns its own `ActiveWorkspace`, so they can report different workspaces at the same moment | `FolderSection.ts:79`, `SpaceHeader.ts:80`, `LiveFolders.ts:115` |
| A tab is removed | `onActivated` and `onUpdated(vivExtData)` are followed, not `onRemoved`; the last workspace stays only when `query` returns no tab | `ActiveWorkspace.ts:41-52,79` |
| No tab is active | The open-link rows list every tab of the window; with a null-workspace tab active, only the null-workspace tabs | `OpenLinks.ts:143-152`, `TabData.ts:50-53` |
| A folder's minus | The close state is saved after the closes, under whatever workspace is current then | `FolderClose.ts:26-34`, `OpenFolders.ts:40-43,77-89` |
| The workspace menu's tab count | Vivaldi's own count; no VivArcDi code counts tabs | none in `src/` |

### After

| Case | What happens after | Where |
|---|---|---|
| An inspection page becomes active | The selected workspace stays: its header name, folders, links and pinned tiles | `FolderSection`, `SpaceHeader` |
| A normal tab outside any workspace | Selects the `Tabs` area as today (043/FR-4) | `WorkspaceRoots` |
| The header and the rows | Every surface shows the same workspace | one workspace state |
| A tab is removed | The last known workspace stays until another tab becomes active | `ActiveWorkspace` |
| No tab is active | The rows show the workspace the section shows, not every workspace's tabs | `OpenLinks` |
| A folder's minus | The close state is saved under the workspace active at press time | `FolderClose`, `OpenFolders` |
| The workspace menu's tab count | Out of scope: Vivaldi's own count | – |

## Requirements

### Functional

- **FR-1.** WHEN an internal Vivaldi inspection page, such as `vivaldi:inspect/#apps` and the
  extension and window targets it opens, becomes the active tab while a workspace is selected, THE
  modules SHALL keep showing that workspace's header name, folders, links and pinned tiles and
  SHALL NOT switch to the area outside any workspace.
- **FR-2.** WHEN a normal tab that belongs to no workspace becomes the active tab, THE modules SHALL
  select the area outside any workspace, named `Tabs`, as today (043/FR-4).
- **FR-3.** The header, the folder rows, the open-link rows and the pinned tiles SHALL show one
  consistent workspace state and SHALL NOT show one workspace's name with another workspace's rows.
- **FR-4.** IF a tab removal or a switch leaves no usable active tab, THEN the modules SHALL keep
  the last known workspace until Vivaldi selects another one.
- **FR-5.** WHEN the minus of a folder row is pressed, THE module SHALL save that folder's close
  state under the workspace that was active when the press started, even if the active tab changes
  while the folder's tabs are closing.
- **FR-6.** WHILE no tab of the window is active, THE open-link rows SHALL show the tabs of the
  workspace the folder section shows and SHALL NOT show the tabs of every workspace nor only the
  tabs of the area outside any workspace.

### Non-functional

- **NFR-1.** VivArcDi SHALL never block Vivaldi; the workspace is read from Vivaldi's tab events,
  without polling.
- **NFR-2.** The change adds no module, no option in `config.json` and no runtime dependency; the
  existing listeners SHALL still be removed by `stop()`.
- **NFR-3.** IF the active tab names a workspace that Vivaldi does not list, THEN the last known
  workspace SHALL stay and the problem SHALL be logged once, as 010/NFR-3.
- **NFR-4.** No new storage container: the folder close state keeps the key of `OpenFolders`, and
  the `Tabs` area of 043/FR-4 stays reserved for tabs outside any workspace.
- **NFR-5.** Works on macOS and Debian; texts in English.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). Test names and live scenario names are exact.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN an internal Vivaldi inspection page such as `vivaldi:inspect/#apps` becomes the active tab while a workspace is selected, THE modules SHALL keep showing that workspace's name, folders, links and pinned tiles and SHALL NOT switch to `Tabs`. | auto: `keeps the selected workspace when an internal tab becomes active` |
| AC-2 | WHEN a normal tab outside any workspace becomes the active tab, THE modules SHALL select the `Tabs` area as today. | auto: `selects the Tabs area for a tab outside any workspace` |
| AC-3 | IF a tab removal leaves no usable active tab, THEN the modules SHALL keep the last known workspace until another tab becomes active. | auto: `keeps the last workspace when the active tab is removed` |
| AC-4 | THE header, folder rows, tab list and pinned tiles SHALL show one consistent workspace state and SHALL NOT show one workspace's name with another workspace's rows. | auto: `renders the header and folder rows from one workspace` |
| AC-5 | WHEN a folder minus press starts in a workspace and the active tab changes while its tabs close, THE module SHALL save the folder's close state under the workspace active at press time. | auto: `saves the folder state in the workspace active at press time` |
| AC-6 | WHILE no tab of the window is active, THE open-link rows SHALL show the tabs of the shown workspace and SHALL NOT show every workspace's tabs. | auto: `does not show other workspaces' tabs when no tab is active` |
| AC-7 | WHEN Tore replays the recording of 2026-11-25 at 12:30 and presses the Streaming folder's minus while `vivaldi:inspect/#apps` loads, THE sidebar SHALL keep the `Riposino` header and its folder and link rows, and a switch away and back SHALL NOT be needed. | manual |

AC-1 to AC-6 are checked with the `ActiveWorkspace` fakes, the `FolderTabs` fake and the
folder-section fakes; AC-7 is Tore's check on macOS and Debian. The live harness drives window.html
only and has no way to open `vivaldi:inspect/#apps`, so no `live:` scenario is used.

## Out of scope

- Vivaldi's native tab count in its workspace popup: the recording's `2 schede` is Vivaldi's count
  for the separate inspection workspace, and VivArcDi has no tab-count code.
- How Vivaldi creates its inspection workspace or where it places the inspection page.
- The look, labels and gesture of the minus: 061, 062, 063.
- The content and sync of live folders: 026, 030.
- The pinned unload and its tiles: 059 to 062.
- Vivaldi 8.4 and later.

## Open questions

- [x] **Q-1. Should an internal inspection page change the workspace?** An inspection page such as
  `vivaldi:inspect/#apps`, and the extension and window targets it opens, should NOT change the
  workspace the sidebar shows, while a normal tab that genuinely belongs to no workspace still
  selects the `Tabs` area as today (so 043/FR-4 is preserved). Recommendation: yes. The tab's
  address is available through `chrome.tabs` (`BrowserTabs.query` returns `chrome.tabs.Tab`, whose
  `url` and `pendingUrl` are read elsewhere already, `OpenLinks.ts:121`), so the distinction is
  implementable without polling. Answered (Tore, 2026-11-25): yes; inspection pages leave the
  shown workspace alone, while a normal tab outside any workspace still selects `Tabs`.
- [x] **Q-2. What happens when a removal leaves no active tab?** The last known workspace should
  stay until Vivaldi selects another one, instead of the section falling to `Tabs`.
  Recommendation: yes. Answered (Tore, 2026-11-25): yes, the last known workspace stays.
- [x] **Q-3. Should every surface share one workspace state?** The header, folder rows, open-link
  rows and pinned tiles should show the same workspace and never mix one workspace's name with
  another's rows. Recommendation: yes. Answered (Tore, 2026-11-25): yes, every surface uses one
  workspace state.
- [x] **Q-4. Which workspace gets a folder's close state?** A folder minus press should save the
  close state under the workspace active when the press started, even if the active tab changes
  while its tabs close. Recommendation: yes. This refines the ordering prescribed in the
  `FolderClose` paragraph of [063's design](../063-minus-closes-folder-tabs/design.md), where the
  folder is forgotten after the awaits on whatever workspace is current then. Answered (Tore,
  2026-11-25): yes; the close state is saved under the workspace active at press time.

## References

- [063 Minus closes folder link tabs](../063-minus-closes-folder-tabs/spec.md): the folder and link
  minus whose press this spec keeps stable; its design's `FolderClose` ordering (Q-4).
- [010 Folders per workspace](../010-folders-per-workspace/spec.md): the workspace of a tab, the root
  of each workspace and the fallback to `root` (FR-2, FR-3).
- [011 Space header](../011-space-header/spec.md): the header name and the `Tabs` fallback for tabs
  outside any workspace (FR-6).
- [043 Sync robustness](../043-sync-robustness/spec.md): the reserved `Tabs` area (FR-4) this spec
  keeps for tabs outside any workspace.
- [026 Live folders](../026-live-folders/spec.md): the live folders stored per workspace.
- Code: `src/core/workspaces/ActiveWorkspace.ts`, `src/core/workspaces/WorkspaceNames.ts`,
  `src/core/tabs/TabData.ts`, `src/modules/folders/FolderSection.ts`,
  `src/modules/folders/tree/WorkspaceRoots.ts`, `src/modules/folders/tree/OpenFolders.ts`,
  `src/modules/folders/links/FolderClose.ts`, `src/shared/links/OpenLinks.ts`,
  `src/modules/spaceheader/SpaceHeader.ts`, `src/modules/livefolders/LiveFolders.ts`.
- GitHub issue #283, `https://github.com/valsar6/VivArcDi/issues/283`.
- Recording by Tore, `~/Desktop/Registrazione schermo 2026-11-25 alle 12.30.22.mov`, 2026-11-25.
