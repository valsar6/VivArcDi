# 063 Minus closes folder link tabs

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |
| Supersedes | Nothing yet. It changes the press of the Favorites link row's and folder row's minus in [061](../061-pinned-minus-ui/spec.md) FR-6, AC-11 and AC-12, the unload model kept by [062](../062-minus-hover-and-indent/spec.md) FR-3, and the other close routes of [009](../009-bookmark-folders-in-tab-bar/spec.md) FR-15. The pinned row and tile minus of 061/FR-3 keeps unloading. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Tore's recording of 2026-11-25 at 10:30 shows what a press on the minus of a Favorites row should
do: a link's tab closes, its row stops being indented as an open tab and returns among the
bookmark's children, and a folder's minus closes all open link tabs inside the folder and closes the
folder itself. VivArcDi currently discards those tabs through `TabUnloader`, so the rows keep their
`tab`, their extra indent and their dimmed look after the press. This spec replaces that press with
a real close on the two Favorites row surfaces, leaving the pinned surfaces' unload unchanged.

## Seen in the recording

The recording is 11.3 s at 3104×1962 retina pixels. Its sequence:

- The pointer rests on the minus of the open link `Wikipedia` below the `Hobbies` folder; the row
  is indented one step further than the folder and its siblings.
- After the press, `Wikipedia` is no longer listed below the folder. When `Hobbies` is opened
  again, `Wikipedia` is one of its ordinary bookmark rows, at the same depth as its siblings and
  with no open-tab look.
- The pointer then rests on the minus of another open link, `Dashboard Streaming`, and presses it;
  that row also returns to the folder's children.
- The pointer rests on the minus of the `Hobbies` folder row. After that press the open link tabs
  inside the folder are gone and `Hobbies` is closed, with no open links listed below it.

The folders and their bookmarks stay in the sidebar throughout. The recording is the behavior
Tore wants, not a claim that the current VivArcDi press already matches it.

## User stories

- **US-1.** As a user, I want a link's minus to close its tab, so that the row goes back to being an
  ordinary bookmark row instead of an indented, dimmed tab.
- **US-2.** As a user, I want a folder's minus to close every open link tab inside that folder and
  close the folder, so that the sidebar returns to its calm state in one gesture.
- **US-3.** As a user, I want the bookmarks and folders to stay, so that a closed tab is not a lost
  link.
- **US-4.** As a user, I want the pinned row and tile minus to keep unloading instead of closing, so
  that this correction does not change the pinned model I already use.

## Expected behavior

**A link's minus closes its tab.** A press on the minus of a Favorites link row closes that tab for
real, the same way Cmd/Ctrl+W or Vivaldi's menu does (009/FR-15). The link no longer has a tab, so
its row loses the extra indentation of 062/FR-5, the active and unloaded looks, and the minus
itself. When its folder is open, the row takes its place among the folder's ordinary children at the
bookmark's depth; when the folder is closed, the row is no longer listed below it. The bookmark is
unchanged, and no new tab is opened.

**A folder's minus closes its folder's open tabs and the folder.** A press on the minus of a
Favorites folder row closes the tabs of every open link row inside that folder, at any depth below
it up to the next folder at the same or a lower depth, then closes that folder. Its open link rows
therefore disappear from below it, and its children are hidden as for any closed folder. The
folder, its subfolders and its bookmarks stay; a later click opens it again with its links as
ordinary rows. The folder's open/closed state is saved like any other folder's (009/FR-2).

**The look and the gesture stay.** The minus keeps its 062 visibility, badge, size and position on
both row surfaces. A press still belongs to the minus: it never starts a drag, never opens the row
and never shows the folder's menu or preview. The accessible names change with the action: the
link's minus is named for closing one tab and the folder's for closing its tabs (Q-1). No visible
tooltip repeats Arc's wording (061).

**Pinned surfaces are untouched.** The minus of a pinned row and of a pinned tile keeps unloading
the tab through `TabUnloader`, as in 061/FR-3 to FR-5 and 062/FR-3: the tab is discarded, the row
or tile stays and opening it loads the pinned page again. Cmd/Ctrl+W and Vivaldi's own close keep
closing a link's or a Favorite's tab for real.

**Versions.** The behavior holds on Vivaldi 8.1, 8.2 and 8.3, with the Favorites grid on and off,
for ordinary and live folders.

### Today

| Case | What happens today | Where |
|---|---|---|
| Press a link row's minus | `TabUnloader` discards the tab; the row keeps its tab, extra indent and dimmed look | `FolderSectionView.ts`, `FolderSection.ts`, `FolderRowElement.ts` |
| Press a folder row's minus | `TabUnloader` discards the tabs of its open links; the folder stays open | `FolderMinus.ts`, `FolderSection.ts` |
| Label | `Unload tab` and `Unload tabs` | `FolderRowElement.ts` |
| Pinned minus | Discards the tab and keeps the row or tile | 061 |

### After

| Case | What happens after | Where |
|---|---|---|
| Press a link row's minus | The tab closes, the row returns to its bookmark depth and loses the open-tab look | `FolderSectionView.ts`, `FolderSection.ts` |
| Press a folder row's minus | The open link tabs inside close and the folder becomes closed | `FolderMinus.ts`, `FolderSection.ts`, folder state |
| Label | Names the close action (Q-1) | `FolderRowElement.ts` |
| Pinned minus | Unchanged: discards the tab | 061 |

## Requirements

### Functional

- **FR-1.** WHEN the minus of a Favorites link row is pressed, THE module SHALL close its tab and
  SHALL NOT unload it; the row SHALL no longer be marked open, active or unloaded, SHALL lose the
  extra indentation of 062/FR-5 and SHALL return to its bookmark's depth. With the folder closed,
  THE row SHALL NOT stay listed below it. The bookmark and the folder SHALL stay.
- **FR-2.** WHEN the minus of a Favorites folder row is pressed, THE module SHALL close the tabs of
  all open link rows inside that folder, at any depth up to the next folder at the same or a lower
  depth, and SHALL close that folder. The folder, its subfolders and its bookmarks SHALL stay, and
  its closed state SHALL follow 009/FR-2.
- **FR-3.** A press that starts on either minus SHALL NOT start a drag, open the row or show the
  folder's menu or preview, and it SHALL NOT open a new tab.
- **FR-4.** THE two row minuses SHALL carry accessible names that describe closing tabs, not
  unloading them (Q-1). No visible tooltip SHALL repeat Arc's `Close and Keep Pinned` or
  `Close This Folder` wording.
- **FR-5.** THE minus of a pinned row and of a pinned tile SHALL keep the unload behavior and the
  `Unload tab` name of 061/FR-3 to FR-5 and 062/FR-3.
- **FR-6.** The behavior SHALL hold on Vivaldi 8.1, 8.2 and 8.3, with the Favorites grid on and off,
  for ordinary and live folders.

### Non-functional

- **NFR-1.** VivArcDi SHALL never block Vivaldi; a tab is closed only by a user action.
- **NFR-2.** The change adds no module, no option in `config.json` and no runtime dependency; the
  section's existing delegated listener and `stop()` SHALL still remove every listener (061/NFR-2).
- **NFR-3.** IF a link's tab cannot be closed through the browser API, THEN the module SHALL leave
  the rows as they are and log the reason, as in 003/NFR-3.
- **NFR-4.** Works on macOS and Debian; texts in English.
- **NFR-5.** A failed close SHALL NOT remove a bookmark, rename a folder or change an unrelated
  tab.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). Test names and live scenario names are exact.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the minus of a Favorites link row is pressed, THE module SHALL close its tab, leave no tab on the link and return the row to its bookmark depth without the open-tab look, and THE bookmark SHALL stay. | auto: `closes a link tab from its minus` |
| AC-2 | WHEN the minus of a Favorites folder row is pressed, THE module SHALL close the tabs of all its open link rows and close the folder, keeping the folder, its subfolders and its bookmarks. | auto: `closes the open link tabs of a folder from its minus and closes the folder` |
| AC-3 | WHEN a press starts on either row minus, THE module SHALL NOT drag or open the row and SHALL NOT open a new tab. | auto: `does not drag or open a Favorites row from its minus` |
| AC-4 | THE two row minuses SHALL carry accessible names that describe closing tabs, and no visible tooltip SHALL repeat Arc's wording. | auto: `labels the row minuses for closing tabs` |
| AC-5 | THE minus of a pinned row and of a pinned tile SHALL still unload their tabs and keep the `Unload tab` name. | auto: `keeps the pinned minus unloading` |
| AC-6 | WHEN Tore compares VivArcDi with his recording of 2026-11-25 at 10:30, a link's minus SHALL return its row to the folder without indentation, the folder's minus SHALL close its open tabs and the folder, and the bookmarks SHALL stay. | manual |

AC-1 to AC-5 are checked with the folder section's fakes and the browser tabs fake; AC-6 is
Tore's check on macOS and Debian. No live Vivaldi scenario is needed because the row state can be
read from the module's fakes.

## Out of scope

- The pinned row and tile minus, the pinned page and the tile unload: 059, 060, 061, 062.
- A visible tooltip with Arc's wording, and the folder's hover preview: 008, 061.
- Creating, renaming, moving or deleting bookmarks or folders: 009, 012.
- The look, visibility and hover behavior of the minus: 062.
- Cmd/Ctrl+W and Vivaldi's own close, which keep closing tabs: 009/FR-15.
- Vivaldi 8.4 and later.

## Open questions

- [ ] **Q-1. What the two minuses are called.** The recording shows Arc's tooltips
  `Close and Keep Pinned` and `Close This Folder`, but 061 deliberately kept `Unload tab` and
  `Unload tabs` because a press unloaded. With a real close, the proposed names are `Close tab` and
  `Close tabs`, with no visible tooltip. Tore to confirm or give the words to use.

## References

- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md): the open-link
  model, the indentation below a closed folder, the saved folder state and the other close routes.
- [061 Pinned minus UI](../061-pinned-minus-ui/spec.md): the minus's look, labels, press handling and
  the pinned unload this spec keeps.
- [062 Minus on hover and open-link indent](../062-minus-hover-and-indent/spec.md): the visibility,
  badge and indent this spec keeps for rows that are still open.
- [003 Favorites and pinned tabs](../003-pinned-tabs-and-folders/spec.md): the unload option and the
  handling of an API failure (NFR-3).
- Code: `src/modules/folders/view/FolderSectionView.ts`, `src/modules/folders/view/FolderMinus.ts`,
  `src/modules/folders/view/FolderRowElement.ts`, `src/modules/folders/FolderSection.ts`,
  `src/core/browser/TabUnloader.ts`.
- Recording by Tore, `~/Desktop/Registrazione schermo 2026-11-25 alle 10.30.43.mov`, 2026-11-25.
