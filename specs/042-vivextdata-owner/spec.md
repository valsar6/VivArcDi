# 042 vivExtData owner

| | |
|---|---|
| Status | Approved |
| Phase | 0 |
| Owner | Tore |
| Approved | 2026-11-19 |
| Amends | [003 Pinned tabs and folders](../003-pinned-tabs-and-folders/spec.md), [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

VivArcDi keeps per-tab data in each tab's `vivExtData` (Vivaldi's own text field, shared with
Vivaldi's keys such as `workspaceId` and `tiling`), under its own key `vivarcdi`: the own page of a
pinned tab, the link to a Favorite or a folder row, the last active time. Every write replaces the
whole text. `TabDataWriter` reads the tab again and queues one write at a time for each tab, but
the queue lives inside one Vivaldi window; the payload runs in every window, and tab events reach
all of them.

Some modules write tabs of other windows. When two windows handle the same tab, each one reads,
builds the whole text and writes; the second write can carry a copy that went stale, and keys of the
first write (or of Vivaldi) are lost: a pinned tab loses its own page, a Favorite link or its
tiling, or a tab jumps to another workspace (storage review of 2026-11-17, finding 5).

This spec states one rule: the `vivExtData` of a tab is written only by the window that owns the
tab, the window that holds it now. It enforces the rule in one place, and makes the modules that
scan or follow all windows look at their own window only.

## User stories

- **US-1.** As a user with two windows, I want a tab I pin, link or tile in one window to keep its
  own page, its link and its tiling, so that the other window never overwrites them.
- **US-2.** As a user, I want the folders of one window not to unlink the tabs of another window
  because that window's folder rows are not drawn yet.
- **US-3.** As a developer of a module, I want one place that guarantees the rule, so that a new
  writer cannot break it by forgetting a check.

## Expected behavior

### Today

| Case | What happens | Where |
|---|---|---|
| A tab is pinned in window A | `onUpdated` reaches every window; each window's `PinWatcher` saves the own page of the tab | `PinWatcher.#follow`, `SavedAddresses.save` |
| A tab is unpinned in window A | Every window's `PinWatcher` forgets its own page and Favorite link | `PinWatcher.#follow`, `SavedAddresses.forget` |
| A window starts | Its `PinWatcher` saves the own page of the pinned tabs of all windows | `PinWatcher.start`, `query({ pinned: true })` |
| A new tab in window A first shows a web address | Every window's `LinkTabAdopter` may link it to a folder row of its own section | `LinkTabAdopter.#adoptNew`, `#adopt`, `TabLinks.link` |
| The Favorites folder changes | Every window rewrites the Favorite link of every tab of every window | `LinkedTabs.sync`, `query({})` |
| The bookmarks tree changes | Every window unlinks the tabs of all windows whose link is not in its own view of the folders; the test uses its own `#closing` set and live rows | `TabLinks.unlinkExcept`, `FolderSection.#unlinkOrphans` |
| A folder moves to another workspace | The window that moves it rewrites the workspace of the folder's tabs in all windows | `FolderLinkTabs.tabsOf`, `FolderRelocation.#send` |
| A tab gets focus | Stamped only when it belongs to this window, but a window that found no active tab at start stamps every window | `ActivityStamps.#isOwnWindow` |
| Two windows write the same tab | Each queue is separate, so one write can carry a stale copy and drop keys | `TabDataWriter.#queues` |

Writers that act on a tab the user handled in this window (`TabLinks.link` and `unlink` from the
tab bar, `TabTiler`, `FavoriteRemoval`, `LinkedTabs.link`, `SavedAddresses.load`, a tab moved into
the window by `WorkspaceAdopter`, a tab opened by the sync window in its own window) already write
tabs of their own window.

What Vivaldi itself writes into `vivExtData` when it moves, tiles or stacks a tab is not known
yet (probe T3). The rule does not depend on it: it only keeps VivArcDi from adding a second writer.

### After

**Owner.** The owner of a tab is the window whose id the tab has when it is read for the write. A
window knows its own id and writes only tabs that have it.

**One guard.** `TabDataWriter` takes the check: when its turn comes, it reads the tab again, and if
the tab belongs to another window it writes nothing and resolves as for a write that had nothing to
change. The check uses the fresh read, so a tab that moved while the write waited is judged by the
window it is in now. Every module that writes through the writer gets the rule without a change.
If the window id cannot be read, the writer behaves as today and logs one warning.

**Scanners and followers.** Modules that look at several windows look at their own window only, so
the guard is not what they depend on and the console shows no skipped writes:

- `PinWatcher` ignores `onUpdated` of tabs of other windows and, at start, saves only the pinned tabs
  of its own window.
- `LinkTabAdopter` ignores new tabs of other windows: the window that holds the tab adopts it.
- `LinkedTabs.sync` and `TabLinks.unlinkExcept` read and rewrite only the tabs of their own window.
  Each window runs them on its own bookmarks events, so every window's tabs are still covered, each
  by its owner, with the owner's own view of the folders.
- `FolderLinkTabs.tabsOf` returns the tabs of its own window; tabs of the folder in other windows
  keep their workspace (see Q-3).
- `ActivityStamps` uses the same window check as the writer instead of its own fallback.

**Skipped writes.** A skipped write is logged once as a debug line with the tab id; there is no
toast and no error.

## Requirements

### Functional

- **FR-1.** The `vivExtData` of a tab is written only by the window that holds the tab when the
  write runs.
- **FR-2.** `TabDataWriter` enforces FR-1 for every write: it reads the tab, compares its window id
  with its own, and writes nothing for a tab of another window.
- **FR-3.** A skipped write resolves without error and calls no `update`.
- **FR-4.** When the window id is unavailable, the writer writes as before and logs one warning.
- **FR-5.** `PinWatcher` saves and forgets own pages only for tabs of its own window, at start and on
  events.
- **FR-6.** `LinkTabAdopter` adopts only new tabs of its own window.
- **FR-7.** `LinkedTabs.sync`, `TabLinks.unlinkExcept` and `FolderLinkTabs.tabsOf` consider only the
  tabs of their own window.
- **FR-8.** `ActivityStamps` stamps only tabs of its own window, also when it found no active tab at
  start.
- **FR-9.** No change to the stored values: the `vivarcdi` key and its fields keep their shape.

### Non-functional

- **NFR-1.** With one window, nothing changes for the user.
- **NFR-2.** No new permission, storage key or message between windows.
- **NFR-3.** Every existing test keeps its name and passes.
- **NFR-4.** Ships on a `fix/` branch with a patch version change.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names the test, `manual` is a step Tore
performs.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a write targets a tab of its own window, THE writer SHALL read the tab again and write the new text | auto: `writes the tab of its own window` |
| AC-2 | IF a write targets a tab of another window, THEN THE writer SHALL call no update and resolve | auto: `skips a tab of another window` |
| AC-3 | WHEN a tab moves to another window while its write waits, THE writer SHALL judge it by the window it has when read | auto: `judges the window from the tab as just read` |
| AC-4 | IF the window id cannot be read, THEN THE writer SHALL write as before and log one warning | auto: `writes as before when the window is unknown` |
| AC-5 | WHEN two windows write the same tab, THE tab SHALL keep the keys of every write, because only its window writes | auto: `two windows never both write the same tab` |
| AC-6 | WHEN a tab is pinned in another window, THE pin watcher SHALL NOT save its own page | auto: `does not save the own page of a tab pinned in another window` |
| AC-7 | WHEN a tab is unpinned in another window, THE pin watcher SHALL NOT forget its own page | auto: `does not forget the own page of a tab unpinned in another window` |
| AC-8 | WHEN the pin watcher starts, THE module SHALL save the own page of the pinned tabs of its own window only | auto: `saves at start only the pinned tabs of its own window` |
| AC-9 | WHEN a new tab of another window shows a web address, THE adopter SHALL NOT link it | auto: `does not adopt a new tab of another window` |
| AC-10 | WHEN the Favorites folder changes, THE module SHALL update the links of the tabs of its own window only | auto: `syncs only the tabs of its own window` |
| AC-11 | WHEN the bookmarks tree changes, THE module SHALL unlink only tabs of its own window | auto: `unlinks only the tabs of its own window` |
| AC-12 | WHEN a folder moves to another workspace, THE module SHALL change the workspace of the folder's tabs in its own window only | auto: `moves only the tabs of its own window with the folder` |
| AC-13 | WHEN the stamps module finds no active tab at start, THE module SHALL still stamp only tabs of its own window | auto: `stamps only tabs of its own window before it knows the window` |
| AC-14 | WHEN Tore, with two windows open, pins a tab, tiles two tabs and links a tab to a folder in one window, and restarts Vivaldi, THE tabs SHALL keep own page, tiling, link and workspace | manual |

AC-14 is the only manual step: whether two real windows race on a tab depends on timing and on
Vivaldi's own writes (probe T3), so the tests cover the rule and Tore confirms the result.

## Out of scope

- Telling another window to write its tab (Q-3 and Q-4 recommend skipping).
- The owner of merged data in other specs: the owner window of the pinned sync
  ([030](../030-workspace-sync/spec.md), `WindowOwner`) is a different notion, the lowest window
  id, and does not change.
- Locking against Vivaldi's own writes: only VivArcDi's writers follow the rule.
- Per-window copies of stored data in `chrome.storage.local` (specs 037, 040, 041).

## Open questions

- [x] **Q-1. Where the rule lives.** The guard in `TabDataWriter` for every writer plus filters in
  the scanners, or only filters in each module? Recommendation: both. The guard keeps a new writer
  from breaking the rule; the filters stop wasted reads and make the module's intent plain.
  Answered (Tore, 2026-11-19): both, as recommended.
- [x] **Q-2. Window id source.** The writer needs the id of its window. Recommendation: read it once
  from `chrome.windows.getCurrent` through `BrowserWindows` and keep it; it never changes for a
  window.
  Answered (Tore, 2026-11-19): read once from `chrome.windows.getCurrent` through `BrowserWindows`, as recommended.
- [x] **Q-3. Folder moved with tabs in other windows.** Moving a folder to another workspace changes
  the workspace of its tabs, but tabs in other windows are not ours to write. Recommendation: skip
  them. The tab stays linked to its row and out of the tab list in both windows; only its workspace
  stays as it was. A message to the owning window (`runtime.sendMessage`) would fix it but adds a
  protocol; do it later if Tore sees it matter.
  Answered (Tore, 2026-11-19): skip the tabs of other windows, as recommended.
- [x] **Q-4. New tab in a window with no VivArcDi running.** The adopter skips tabs of other
  windows; if their window has the module disabled or failed to start, those tabs are not adopted.
  Recommendation: accept; adoption is a convenience and `adoptOpenTabs` runs at that window's
  start.
  Answered (Tore, 2026-11-19): accept, as recommended.
- [x] **Q-5. A tab that moves during a write.** The check and the `update` are two calls; a tab
  moved between them can still be written by the old window once. Recommendation: accept; the
  window is milliseconds, one write, and Vivaldi's own move writes at about the same time.
  Answered (Tore, 2026-11-19): accept, as recommended.

## References

- Storage review of 2026-11-17, finding 5, and probe T3 (keys after move, tile, stack).
- `src/core/tabs/TabDataWriter.ts`, `TabData.ts`: the writer and the text it builds.
- [030 Workspace sync](../030-workspace-sync/spec.md): `WindowOwner`, a different owner.
- [002 Peek](../002-peek/spec.md): `TabTiler`, the tiling write.
- [003](../003-pinned-tabs-and-folders/spec.md), [009](../009-bookmark-folders-in-tab-bar/spec.md): `PinWatcher`, `LinkTabAdopter`.
