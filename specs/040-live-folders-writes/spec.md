# 040 Live folders writes

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |
| Amends | [026 Live folders](../026-live-folders/spec.md) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

The live folders of 026 are kept under one storage key, `vivarcdi.liveFolders`, shared by every
Vivaldi window. Each window reads that key once when it starts and, on every change, writes back its
whole session copy. Every window refreshes its live folders every five minutes, so a window that
started before a change made elsewhere writes its old copy back at its next refresh: a live folder
created, renamed, filtered or deleted in one window comes back as it was, or disappears, because of
another window (storage review of 2026-11-17, finding 1a).

This spec makes the live folders read what is saved now and change only what changed, as the Today
archive (`ArchiveStore`) and the favorite links (`CreatedLinks`) already do. A change made in one
window is then never undone by another. Other windows may keep showing their old rows until their
next refresh, at most one refresh interval later (five minutes by default); Tore accepted this on
2026-11-17.

## User stories

- **US-1.** As a user with two Vivaldi windows, I want a live folder I create, rename, filter or
  delete in one window to stay that way, so that the other window does not undo my change a few
  minutes later.
- **US-2.** As a user, I want the pull requests I archive from a live folder to stay archived, even
  when another window refreshes the same folder.

## Expected behavior

### Today

| Case | What happens | Where |
|---|---|---|
| A window starts | It reads `vivarcdi.liveFolders` once into its own copy | `LiveFolderStore` constructor, `#read` |
| A window adds, renames, filters, archives a row or deletes a folder | It changes its own copy and writes the whole copy back | `LiveFolderStore.add`, `update`, `remove`, `#write` |
| A window refreshes (at start, every `refreshMinutes`, on open, on a filter change) | It writes rows into its own copy and writes the whole copy back | `LiveFolderRefresher.#refreshOne`, `#load` |
| Window A renames a folder; window B refreshes later | B writes its copy, with the old name, over A's change; after a restart the old name is back | finding 1a |
| Window A deletes a folder; window B refreshes later | B writes the folder back; it reappears everywhere | finding 1a |
| Window A creates a folder; window B refreshes later | B writes its copy without the new folder; the folder is gone after a restart | finding 1a |

`PersistentStorage` already keeps its in-memory values in line with the other windows through
`chrome.storage.onChanged`, so a store that reads it at the moment of a change sees the other
windows' changes within milliseconds. Only the session copy of `LiveFolderStore` ignores them.

### After

**Fresh read.** Every operation of the live folder store reads `vivarcdi.liveFolders` as saved now:
listing the workspaces and their folders, finding a folder, adding, changing and removing one. The
store keeps no copy of its own between operations.

**Patch per change.** A change applies to what is saved now and touches only what it names:

- adding a folder appends it to its workspace and leaves every other folder as saved;
- changing a folder (name, filters, rows, warning, archived rows, refresh time) changes only the
  given fields of that folder, as saved now, and leaves the other fields and the other folders as
  saved;
- removing a folder removes only that folder;
- a change to a folder that is no longer saved, because another window deleted it, writes nothing
  and does not bring it back.

The refresher works the same way: when GitHub answers, it changes the rows, the archived rows, the
warning and the refresh time of that folder only, merging the archived rows saved at that moment.
A rename or a filter change made in another window while the request was running is kept.

**Other windows.** Nothing new is drawn when another window changes the live folders. A window shows
the other windows' changes the next time it draws its live folders: at its next refresh (every
`refreshMinutes`, five by default), when the user opens a folder, or after a change made in that
window. Until then it may show old rows, an old name, or a folder that another window deleted. A
folder deleted elsewhere and still shown can be opened or renamed without effect, and disappears at
the next draw.

**Stored value.** The stored value keeps its shape, `{ [workspace]: LiveFolder[] }` under
`vivarcdi.liveFolders`. A user who upgrades keeps every live folder.

## Requirements

### Functional

- **FR-1.** Every read of the live folder store (`workspaces`, `folders`, `all`, `find`) returns
  what is saved in `vivarcdi.liveFolders` at that moment.
- **FR-2.** `add` reads the saved folders, appends the new one to its workspace and saves the
  result.
- **FR-3.** `update` reads the saved folders, changes only the given fields of the folder with that
  id and saves the result. If no saved folder has that id, it returns `false` and saves nothing.
- **FR-4.** `remove` reads the saved folders, removes the folder with that id and saves the result.
  If no saved folder has that id, it saves nothing.
- **FR-5.** A refresh changes only the fields it sets (FR-3), and computes the archived rows from
  the archived rows saved when GitHub answered.
- **FR-6.** A folder that is no longer saved is never written back by a change, a refresh or a menu
  action.
- **FR-7.** If the saved value cannot be read, the store treats it as empty and logs one warning per
  window session, not one per read.

### Non-functional

- **NFR-1.** No new storage key, no change to the shape of the stored value; existing live folders
  survive the upgrade.
- **NFR-2.** No new request to GitHub and no change to when refreshes run.
- **NFR-3.** Other windows show a change at their next draw, at most one refresh interval later;
  no redraw on `chrome.storage.onChanged` (see [Out of scope](#out-of-scope)).
- **NFR-4.** Every existing test of 026 keeps its name and passes.
- **NFR-5.** Ships on a `fix/` branch with a patch version change.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names the test, `manual` is a step Tore
performs. Another window is simulated in the tests by a second store, or a direct write, on the same
storage.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN another window saves a change to the live folders, THE store SHALL return it at its next read | auto: `reads the live folders saved by another window` |
| AC-2 | WHEN a window adds a live folder, THE store SHALL keep every folder another window saved before | auto: `adds a folder without dropping the folders of another window` |
| AC-3 | WHEN a window changes some fields of a folder, THE store SHALL keep the other fields and the other folders as saved | auto: `changes only the given fields of a folder` |
| AC-4 | IF a folder was deleted by another window, THEN a change, a refresh or a menu action on it SHALL save nothing and SHALL NOT bring it back | auto: `does not bring back a folder deleted in another window` |
| AC-5 | WHEN a window removes a folder, THE store SHALL keep every other folder as saved | auto: `removes only the given folder` |
| AC-6 | WHEN a refresh ends after another window renamed or filtered the folder, THE store SHALL keep the new name and filters | auto: `a refresh keeps a rename made in another window` |
| AC-7 | WHEN a refresh ends after another window archived a row of the folder, THE row SHALL stay archived | auto: `a refresh keeps rows archived in another window` |
| AC-8 | IF the saved value cannot be read, THEN THE store SHALL treat it as empty and log one warning per session | auto: `warns once when the saved live folders are damaged` |
| AC-9 | WHEN Tore renames a live folder in one window, with a second window open, and waits for the second window's refresh, THE new name SHALL stay in both windows and after a restart of Vivaldi, on macOS and Debian | manual |

AC-9 is probe T6 of the storage review: it needs two windows of Tore's Vivaldi and a restart (see
Q-3).

## Out of scope

- Redrawing the other windows at once on `chrome.storage.onChanged` (live updates), and refreshing
  from one owner window only: later, as decided on 2026-11-17.
- The other session copies of the review: `vivarcdi.lastOpened` (finding 1b) and
  `vivarcdi.openFolders` (1c); see Q-1.
- The out-of-order echo in `PersistentStorage#follow` that can roll back a newer local write
  (finding 1e): rare, kept for later.
- The GitHub connection key `vivarcdi.liveFolders.github`: one value replaced as a whole, last
  window wins, which is correct for it.
- Waiting for the outcome of a write (spec 041): live folders keep `setItem`; see Q-2.
- Versioned values and the recovery copy of an unreadable value (spec 037).

## Open questions

- [x] **Q-1. Scope: `lastOpened` and `openFolders`.** The review plans findings 1b and 1c as
  "040 (later)": the same session-copy problem, low severity. Recommendation: keep this spec to the
  live folders, the high-severity finding, and handle 1b and 1c in a later amendment of 040 or a
  spec of their own once this one has shown the pattern.
- [x] **Q-2. Write outcome.** Should the live folders use the reporting write of 041 and, for
  example, keep a new folder off the tab bar when it is not saved? Recommendation: no. Rows come
  back from GitHub at the next refresh, and 041 already shows one toast per session when saving
  fails; `setItem` is enough here.
- [x] **Q-3. Live scenario.** The lab harness of 046 drives one `window.html`. A `live:` scenario
  could simulate the other window by writing `chrome.storage.local` directly, then rename the folder
  in the lab window and read the stored value, without GitHub. Recommendation: keep AC-1 to AC-8 as
  `auto` and AC-9 as `manual` in this spec; add a live scenario only when the harness can open a
  second window, since a direct write proves no more than the tests do.
- [x] **Q-4. Deleted folder still shown.** A folder deleted in another window stays visible here
  until the next draw (at most one refresh interval). Recommendation: accept it, as Tore did for
  stale rows; optionally, when a change finds no saved folder (FR-3, FR-4), redraw the live folders
  at once so it disappears on the click that found it gone.

## References

- Storage review of 2026-11-17, finding 1a and the decision for 040.
- [026 Live folders](../026-live-folders/spec.md): the live folders, their refresh and their storage.
- `src/modules/today/ArchiveStore.ts`, `src/modules/folders/favoritelinks/CreatedLinks.ts`: stores
  that read fresh and save per change.
- [041 Write outcome](../041-write-outcome/spec.md): the reporting write and the notice when saving
  fails.
