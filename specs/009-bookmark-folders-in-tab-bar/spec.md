# 009 Bookmark folders in the tab bar

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-10-27; revision approved 2026-10-28 |

## Summary

In Arc, a space shows its folders of links right below the Favorites grid, in the same column as the
tabs: no panel to open. In Vivaldi the same folders, here imported from Arc, are bookmarks that live in
the separate Bookmarks panel. This spec shows a folder of bookmarks in the vertical tab bar, below the
Favorites grid, with Arc's behavior: folders open and close, a click on a link opens its tab, and a
link that is open stays visible below its closed folder. As in Arc, the link row is the tab: the tab
it opens does not show a second time in Vivaldi's list of tabs.

Decided with Tore on 2026-10-26: the folders stay bookmarks and are shown in the tab bar, instead of
becoming tab stacks as the first draft of [003](../003-pinned-tabs-and-folders/spec.md) assumed.

Revised with Tore on 2026-10-28, after a screen recording of 0.8.0: a click on `Board Rame
Development` opened a `Jira` tab in the list of today's tabs, and `MahjongSoul` showed both in the
`Hobbies` folder and in the list. Tore wants the open tabs to be the rows of the Favorites, the pinned
tabs and the folders, never a new tab in the list. The first version left this out on purpose; this
revision brings it in (FR-12 to FR-17, AC-19 to AC-26).

## User stories

- **US-1.** As a user, I want my folders of links right below the Favorites, so that I do not open
  the Bookmarks panel to reach them.
- **US-2.** As a user, I want to open and close each folder, including its subfolders, and find it as
  I left it after a restart.
- **US-3.** As a user, I want a click on a link to bring me to its tab if it is already open, and to
  open it otherwise, so that a link never has two tabs.
- **US-4.** As a user, I want a link that is open to stay visible below its closed folder, so that I
  see what I am using without expanding anything.
- **US-5.** As a user, I want Cmd/Ctrl+T followed by the address of one of these links to bring me to
  its open tab, like [007](../007-reopen-pinned-tabs/spec.md) does for Favorites and pinned tabs.
- **US-6.** As a user, I want the tab of a link to live only in its folder row, so that my list of
  today's tabs holds only the pages I opened outside Favorites, pinned tabs and folders.
- **US-7.** As a user, I want a link to keep its tab while I browse inside it, so that a redirect or a
  login page does not turn it into a stray tab.

## Expected behavior

Seen in Arc (screenshot by Tore, 2026-10-26): under the Favorites grid a heading with the space name,
then one row per folder with a folder icon and a bold title, then the pinned tabs, then a divider and
the other tabs. A folder opens to show its links, indented, each with its icon and title.

In VivArcDi the section sits between the Favorites grid and the pinned and open tabs of Vivaldi's
vertical tab bar: Favorites grid, folders, pinned tabs of the workspace, other tabs, as in Arc. The
section is its own element above Vivaldi's tab list, right below the Favorites grid of 003, so
Vivaldi's redraws of the tab list never move it. It shows the children of one bookmark folder, the **root** (an option; for Tore it is
`Importati da Firefox/Bookmarks Bar`, whose children are Programming, Music, Hobbies and the others). Each child
folder is a row that opens and closes on click; a subfolder opens inside its parent, up to a depth
limit. Folders start closed.

A click on a link looks for an open tab with the same address, in the same window and workspace. If
there is one, it becomes active (and loads again if it was unloaded); if not, a new tab opens with
the bookmark's address. A link with an open tab shows a dot next to its icon, and stays visible
below its folder even when the folder is closed, indented, as the pinned tab does in Arc's video. When
the tab closes, the link goes back inside the folder.

A closed subfolder inside an open folder (Mahjong, Nix, Design in Hobbies) is a folder row too: a click
opens it in place, and resting the pointer on it shows the panel with search and last-opened dates of
[008](../008-folder-hover-preview/spec.md), as Arc does (screenshot by Tore, 2026-10-27).

Two addresses are the same when they match as in 007: same host without `www.` and same path, ignoring
a trailing `/`, the query and the fragment.

The section is read-only. Creating, renaming, moving and deleting bookmarks stays in the Bookmarks
panel; the tab bar follows the changes as they happen.

**The link row is the tab.** As in Arc, the tab that a link opens is not a today's tab: Vivaldi's tab
list hides it, with the same mark that [003](../003-pinned-tabs-and-folders/spec.md) uses for the tabs
of the Favorites. The link row stands for it: a dot while it is open, the look of an active tab while
it is the active tab, its page's title and icon while it shows another page of the same site, and a
close button on hover. The tab is linked to the bookmark, not only to the address: the link is stored
in the tab's `vivExtData` (`vivarcdi: { bookmarkId }`), so it survives a restart, a redirect (`Jira`
going to `id.atlassian.com/login`) and the pages opened inside it.

A tab becomes the tab of a link when the link opens it, when Cmd/Ctrl+T opens the link's address and
no tab of the link is open (007 already switches when one is), and, at start-up, when an existing tab
of the window and workspace has the link's address and no link yet. A link has at most one tab in each
workspace. Closing the tab, with the close button of the row, Cmd/Ctrl+W or Vivaldi's menu, closes it
for real: the link goes back inside its closed folder. The Today archive of
[004](../004-today-tabs-and-keyboard/spec.md) never archives the tab of a link, as it never archives a
Favorite.

## Requirements

### Functional

- **FR-1.** A `bookmark-folders` module reads the bookmarks under the root and draws them in the tab
  bar, below the Favorites grid, in Vivaldi's order.
- **FR-2.** Folders open and close on click, nested up to `maxDepth`; the set of open folders is saved
  and restored after a restart.
- **FR-3.** A click on a link activates the open tab with the same address in the same window and
  workspace, loading it if unloaded; with no such tab it opens the address in a new tab.
- **FR-4.** A link with an open tab shows a dot, and stays visible below its folder while the folder
  is closed.
- **FR-5.** The section follows the bookmarks: a created, renamed, moved or removed bookmark under the
  root changes it without a restart.
- **FR-6.** Separators, folders deeper than `maxDepth` and links that are not `http` or `https` are
  skipped.
- **FR-7.** The module never creates, changes or deletes a bookmark.
- **FR-8.** The Cmd/Ctrl+T switch of 007 also applies to the links of the root, in addition to
  Favorites and pinned tabs.
- **FR-9.** The last-opened dates of 007 are also recorded for the tabs that match a link of the
  root, so that [008](../008-folder-hover-preview/spec.md) can show them.
- **FR-10.** Options in `config.json`: `enabled` (true), `root` (the folder to show, as a path of
  titles separated by `/`, for example `Importati da Firefox/Bookmarks Bar`; `VivArcDi` by default),
  `maxDepth` (3). The path is searched from the top of the bookmarks tree, titles compared exactly
  (`Bookmarks Bar` and `Bookmarks bar` are different folders in Tore's bookmarks), and the first
  folder that matches is used. IF no folder matches, THEN the section stays hidden and the reason is logged.
- **FR-11.** WHEN the section is taller than the room the tab bar leaves it, THEN the tab list below
  stays reachable: Tore wants the whole column to scroll as one, as in Arc; the design says what
  Vivaldi's layout allows.
- **FR-12.** The tab of a link is marked as hidden in Vivaldi's tab list, as the tabs of the
  Favorites are in 003; the link row shows its state (open, active, unloaded) and has a close button.
- **FR-13.** A tab opened from a link, or adopted as the tab of a link, stores the bookmark id in its
  `vivExtData`; the link and the tab stay linked while the tab navigates, until the tab closes or the
  bookmark is removed.
- **FR-14.** WHEN a new tab opens the address of a link that has no tab in the window and workspace,
  THEN that tab becomes the tab of the link. At start-up, an existing tab with the address of a link
  that has no tab becomes its tab.
- **FR-15.** Closing the tab of a link closes it; the link returns inside its closed folder.
- **FR-16.** The Today archive of 004 skips the tabs of links.
- **FR-17.** Peek of 002 treats the tab of a link as a Favorite or pinned tab: a click on a link to
  another site opens in Peek (option `pinnedCrossSite`).

### Non-functional

- **NFR-1.** The section follows Vivaldi's theme colors and the rounded style of the Favorites grid.
- **NFR-2.** IF `chrome.bookmarks` or the tab bar is missing, THEN the module stays off, Vivaldi works
  as usual and the reason is logged.
- **NFR-3.** The section survives Vivaldi's own redraws of the tab bar, a change of workspace and the
  auto-hide of the sidebar.
- **NFR-4.** Drawing 500 links takes under 100 ms.
- **NFR-5.** Stopping the module removes the section, its styles and every listener; the bookmarks are
  untouched.
- **NFR-6.** Works on Vivaldi 8.1 and 8.2, on macOS and Debian.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE section SHALL list the folders and links under the root in Vivaldi's order, nested as in the bookmarks. | auto: `builds the folder tree from the bookmarks keeping order and nesting` |
| AC-2 | THE section SHALL skip separators, links that are not web pages and folders deeper than `maxDepth`. | auto: `skips separators, non-web links and folders beyond the depth limit` |
| AC-3 | WHEN a bookmark under the root is created, renamed, moved or removed, THE section SHALL be rebuilt. | auto: `rebuilds the tree when the bookmarks change` |
| AC-4 | WHEN the user clicks a link with no open tab, THE module SHALL open its address in a new tab. | auto: `opens a link that has no open tab in a new tab` |
| AC-5 | WHEN the user clicks a link with an open tab, THE module SHALL activate that tab, loading it if unloaded, and open no new tab. | auto: `switches to the open tab of a clicked link` |
| AC-6 | THE section SHALL mark a link as open when a tab in the same window and workspace has its address, and list it below its closed folder. | auto: `marks open links and keeps them visible below a closed folder` |
| AC-7 | WHEN Vivaldi restarts, THE open folders SHALL be the same as before. | auto: `remembers which folders are open` |
| AC-8 | THE module SHALL read bookmarks without ever creating, changing or deleting one. | auto: `reads bookmarks without changing them` |
| AC-9 | WHEN a new tab opens the address of a link of the root that has an open tab, THE module SHALL switch to that tab as 007 does. | auto: `reopen switches to the open tab of a bookmark` |
| AC-10 | WHEN a tab that matches a link of the root becomes active, THE module SHALL record its last-opened date. | auto: `records the last opened date of tabs that match a bookmark` |
| AC-11 | THE section SHALL appear below the Favorites grid in the vertical tab bar, also with the sidebar set to auto-hide. | manual |
| AC-12 | WHEN Tore clicks a folder, THE folder SHALL open and close, with its subfolders inside it. | manual |
| AC-13 | WHILE a folder is closed and one of its links is open, THAT link SHALL appear below the folder, indented, with a dot. | manual |
| AC-14 | WHEN Tore switches workspace, resizes the window or toggles the sidebar, THE section SHALL stay in place. | manual |
| AC-15 | IF the module is disabled or VivArcDi is uninstalled, THEN the bookmarks and the Bookmarks panel SHALL be unchanged. | manual |
| AC-16 | WHILE a folder with many links is open, THE tab list SHALL stay reachable by scrolling. | manual |
| AC-17 | THE section SHALL be marked as outside the window drag region, so that Vivaldi on macOS does not take its clicks and hover. | manual |
| AC-18 | THE section SHALL keep the width of the tab bar, cutting long titles with an ellipsis instead of overflowing it. | manual |
| AC-19 | THE module SHALL mark the tab of a link as hidden from the tab list. | auto: `hides the tab of a link from the tab list` |
| AC-20 | WHEN the user clicks a link with no open tab, THE module SHALL store the bookmark id in the new tab. | auto: `links the tab opened from a link to its bookmark` |
| AC-21 | WHILE the tab of a link shows another address, THE section SHALL keep it as the tab of that link. | auto: `keeps the tab of a link while it navigates away` |
| AC-22 | WHEN a new tab opens the address of a link that has no tab, THE module SHALL make it the tab of that link. | auto: `adopts a new tab that opens the address of a link` |
| AC-23 | WHEN the user closes the tab of a link from its row, THE module SHALL close the tab. | auto: `closes the tab of a link from its row` |
| AC-24 | THE Today archive SHALL never archive the tab of a link. | auto: `does not archive the tab of a link` |
| AC-25 | WHEN Tore clicks `Board Rame Development` and logs in through `id.atlassian.com`, THE tab list SHALL show no new tab and the link row SHALL show the active page. | manual |
| AC-26 | WHEN the user clicks a link to another site in the tab of a link, THE page SHALL open in Peek and the tab SHALL keep its page. | manual |
| AC-27 | WHILE another module writes the data of the tab of a link at the same time, THE module SHALL keep the bookmark id in the tab. | auto: `keeps the bookmark id when another module writes the tab at the same time` |
| AC-28 | THE module SHALL collapse the slot of the tab of a link with an inline style, since Vivaldi's own rules beat the stylesheet. | auto: `collapses the slot of a hidden tab with an inline style` |

## Out of scope

- Creating, renaming, moving or deleting bookmarks, and dragging a tab into a folder to bookmark it.
- A different set of folders for each workspace: [010](../010-folders-per-workspace/spec.md). Tore wants it as a second iteration once this one
  works.
- The hover panel with search and last-opened dates: [008](../008-folder-hover-preview/spec.md).
- Tab stacks as folders: [003](../003-pinned-tabs-and-folders/spec.md).

## Open questions

- [x] **Which folder is the root?** The folder `Bookmarks Bar` inside `Importati da Firefox`: option
  `root` is a path of titles (Tore, 2026-10-27).
- [x] **Different folders for each workspace?** Not in this version: the same folders in every
  workspace. Tore wants it later, as a second iteration (Tore, 2026-10-27).
- [x] **Open tab and list of tabs.** First answer: the opened link also stays in Vivaldi's list of
  tabs, with a dot in the folder (Tore, 2026-10-27). Changed on 2026-10-28: the tab lives only in its
  link row, hidden from the list, as in Arc (Tore, screen recording of 0.8.0).
- [x] **Subfolders.** Open inside the parent up to 3 levels (Tore, 2026-10-27).
- [x] **Prototype before the design.** Probes run by Tore on Vivaldi 8.2 on 2026-10-27:
  `chrome.bookmarks` is readable with its four change events. An element added above the tab list,
  inside `#tabs-container`, shows as a full-width row and survives changes of workspace, opening and
  closing tabs, pinning and the auto-hide sidebar. An element added inside the tab list, after the last
  pinned tab, survived too but ended above the Favorites tiles after the sidebar was shown again,
  because Vivaldi rebuilds the tab list. So the section is drawn above the tab list, next to the
  Favorites grid of [003](../003-pinned-tabs-and-folders/spec.md), and never inside it.
- [x] **Height of the section.** The whole column scrolls as one, as in Arc (Tore, 2026-10-27, with
  screenshots of Arc). FR-11 keeps the requirement; the design explains how far Vivaldi's layout allows it.

- [x] **Closing.** Cmd/Ctrl+W and the close button close the tab of a link: the link goes back inside
  its folder and is no longer highlighted (Tore, 2026-10-28).
- [x] **Leaving the site.** A click on a link to another site opens it in Peek, the window linked to
  the tab of [002](../002-peek/spec.md), as for Favorites and pinned tabs; the tab stays on its site
  and stays linked. A redirect is not a click, so the tab follows it and stays linked (Tore,
  2026-10-28).
- [x] **Tabs already open.** At start-up an open tab with the address of a link becomes its tab and
  leaves the list; to be tried on Vivaldi (Tore, 2026-10-28).

## References

- [003 Pinned tabs and folders](../003-pinned-tabs-and-folders/spec.md): the first draft treated
  folders as tab stacks; folders are now only in this spec.
- [007 Reopen pinned tabs](../007-reopen-pinned-tabs/spec.md): FR-8 and FR-9 extend it.
- [008 Folder hover preview](../008-folder-hover-preview/spec.md): lists the links of a folder.
- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section "Spaces, Pinned tabs e
  cartelle".
