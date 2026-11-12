# 026 Live folders: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the revision of the spec was approved on 2026-11-12 (PR #148). It replaces the design of
the first version. It says **how**; the spec says **what**. It builds on the folders section of 009
and 012, the space header of 011 and the menu of 031.

## Approach

### Live rows in the folders section (FR-3)

The folders section draws a tree of `TreeEntry` built from the bookmarks. A live folder is drawn by
the same section, with the same rows, open state, link tabs and animation, but its entries do not
come from the bookmarks.

A new shared state in `src/core`, `VirtualFolders.of(document)`, follows the pattern of
`SpaceCollapse` and `HiddenTabs`: one instance per window, so no module calls another. The
`live-folders` module is its only writer; the folders section reads it.

- `set(workspace, entries)` stores the extra top-level entries of a workspace and calls the
  listeners. `entriesFor(workspace)` reads them.
- `onRename(id, name)`, `onOpen(id)` and `onMenu(id, x, y)` are handlers the writer registers; the
  section calls them for ids it does not own.

`FolderSection#draw` appends `VirtualFolders.entriesFor(workspace)` after the bookmark entries, so
live folders sit at the end of the workspace's folders (spec, "Create"). It listens to
`VirtualFolders` and redraws.

**Ids.** Every virtual id starts with `live:`. A live folder is `live:<folderId>`, a row is
`live:<folderId>:<pullRequestId>`. `LinkId.isVirtual(id)` in `src/core` is the one test. Code that
writes bookmarks skips virtual ids: `FolderEditing` (rename goes to `VirtualFolders.onRename`),
`FolderDragDrop` and `DropTargets` (a live folder or row is not a drop target and cannot be dragged),
`LinkRemoval`, `RowMenu` (its items are for bookmark links only). This keeps FR-3: nothing in a live
folder reaches Vivaldi's bookmarks.

**Link tabs (AC-9).** A click on a live row goes through `LinkActivator`, as a bookmark link: the new
tab carries the row id in the `bookmarkId` field of its `vivExtData`, `OpenLinks` matches it by id, the
tab is hidden from the tab list and shows below the row. `FolderSection#treeChanged` passes the union
of bookmark ids and virtual ids to `TabLinks.unlinkExcept`, and also runs when `VirtualFolders`
changes: when a pull request leaves the folder, its tab comes back to today's list instead of
disappearing. The `bookmarkId` field is renamed nowhere; its meaning becomes "link id", noted in its
JSDoc.

**Entries.** `FolderEntry` gains optional `live: true` and `warning: string`; `LinkEntry` gains an
optional `subtitle`. `FolderRows` copies them to the rows. `FolderSectionView` draws:

- a live folder with the pull-request icon instead of the folder icon and `data-vivarcdi-live-folder`;
- a warning mark, `data-vivarcdi-live-warning`, whose `title` is the reason (AC-10);
- a row with a subtitle as two lines, title above, `author · owner/repo` below in the secondary color
  (AC-8).

### The live-folders module (FR-1, FR-4)

`LiveFolders` is a `Module` with id `live-folders`. It stays off without `chrome.tabs`, like the
folders. Its parts:

| Part | Job |
|---|---|
| `LiveFolderStore` | Reads and writes the folders of every workspace in `context.storage` under `liveFolders`: `{ [workspace]: LiveFolder[] }`, with `LiveFolder = { id, name, filters, rows, warning, refreshedAt }`. Rows are kept, so a restart shows them at once (AC-14). |
| `PullRequestFilters` | The filters (`createdByMe`, `reviewRequests`, `drafts`, `repositories`), defaults all on and no repository, and the GitHub search queries they make. |
| `GithubPullRequests` | Runs the queries and maps the answer to rows. |
| `GithubToken` | Reads the token for each refresh. |
| `LiveFolderRefresher` | When and in which order folders refresh; keeps the last rows on failure. |
| `LiveFolderMenu` | The folder menu and the `Live Folders` item of the space menu. |
| `LiveEntries` | Turns stored folders into `TreeEntry` for `VirtualFolders`. |

**Queries (AC-2 to AC-6).** One search per enabled filter, against
`GET https://api.github.com/search/issues`, sorted by `updated`, descending, 50 per page:

- `Created By Me`: `is:pr is:open author:@me`
- `Review Requests`: `is:pr is:open review-requested:@me`
- `Drafts` off adds `draft:false`; each repository adds `repo:owner/name` (GitHub joins several with OR).

The two answers are merged by pull-request id, so a pull request in both lists shows once (AC-2), and
sorted again by `updated_at`. Both filters off makes no request and gives no rows. A closed or merged
pull request is not in the answer of `is:open`, so its row goes at the next refresh (AC-7). The
mapping is pure and tested with fixtures: `title`, `html_url`, `user.login`, and the repository from
`repository_url` (AC-8).

**Token (FR-5, AC-11, AC-16).** The installer command `vivarcdi live-folders token` asks for the
token without echo (`getpass`), writes it to `<data dir>/secrets/github-token` with mode 600, and
copies it to `<payload>/secrets/github-token` on every deploy, since the payload is replaced on each
install and reapply. `vivarcdi live-folders token --remove` deletes both. `GithubToken` reads
`secrets/github-token` through `context.payload.text` before each refresh, so a token added while
Vivaldi runs is used at the next refresh; a missing file means no token. The token lives only in that
variable and the `Authorization` header: it is never stored, never logged, and errors are logged
without headers. Without a token the folder has one row, `Connect GitHub`, whose subtitle is
`vivarcdi live-folders token`, and a click opens the manual page that explains it; no request is sent.

**Refresh (AC-10, AC-12, AC-13).** `LiveFolderRefresher` refreshes every live folder of every workspace
every `refreshMinutes` (option, default 5, minimum 1), and one folder when `VirtualFolders.onOpen`
reports it opened or its filters changed. Refreshes run one at a time through `SerialTask`, so a timer
and a click never race. A failure (network, 401, 403 rate limit, 422) keeps `rows`, sets `warning` to a
short reason (`GitHub cannot be reached`, `The token was refused`, `GitHub's rate limit, retrying
later`), and a success clears it. The timer is cleared in `stop`.

### Menus (AC-1, AC-12, AC-15, AC-17)

`ContextMenu` of 031 gains two things, used by these menus only and covered by its own tests:

- an item with `checked: boolean` draws a check mark;
- an item with `items: MenuItem[]` opens a submenu to its side on hover or click, kept inside the
  window like the menu.

**Space menu.** `SpaceHeaderView` listens to `contextmenu` on the header and cancels Vivaldi's menu
there. `SpaceHeader` opens `ContextMenu` with `New Folder` (the same callback as the `+`, AC-17)
followed by the items of a second shared state, `SpaceMenuItems.of(document)`, where other modules add
items. `LiveFolders` adds `Live Folders` › `GitHub`, which creates a folder named `Pull Requests` in the
active workspace, opens it and refreshes it (AC-1).

**Folder menu.** The section calls `VirtualFolders.onMenu(id, x, y)` on `contextmenu` over a live
folder row. `LiveFolderMenu` opens:

| Item | Effect |
|---|---|
| `Pull Requests` › `Created By Me`, `Review Requests`, `Drafts` | Toggle the filter, store it, refresh (AC-12). |
| `Pull Requests` › `Repositories…` | Opens `RepositoryEditor` below the row: a text area with one `owner/repo` per line, Save and Cancel. Lines that are not `owner/repo` are dropped. |
| `Refresh` | Refreshes the folder now. |
| `Delete Live Folder` | Removes the folder from the store and from `VirtualFolders` (AC-15). Its tabs come back to today's list through `unlinkExcept`. |

Rename is the double click of 012, routed to `VirtualFolders.onRename`.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/VirtualFolders.ts` | Extra entries per workspace and their handlers, shared per window | Observer, Registry |
| `src/core/SpaceMenuItems.ts` | Items other modules add to the space menu | Registry |
| `src/core/LinkId.ts` | `isVirtual(id)` | |
| `src/core/ContextMenu.ts` | Check items and submenus | Composite |
| `src/modules/livefolders/LiveFolders.ts` | Module | Module |
| `.../LiveFolderStore.ts` | Stored folders, filters and rows | Repository |
| `.../PullRequestFilters.ts` | Filters and queries | |
| `.../GithubPullRequests.ts` | Search and mapping | Adapter |
| `.../GithubToken.ts` | Reads the token file | |
| `.../LiveFolderRefresher.ts` | Timer, open and filter refresh, keep-last-rows | |
| `.../LiveEntries.ts` | Store to `TreeEntry` | |
| `.../LiveFolderMenu.ts`, `.../RepositoryEditor.ts` | Menus and repository field | Command |
| `src/modules/folders/*` | Read `VirtualFolders`, skip virtual ids where bookmarks are written, draw icon, warning, subtitle | |
| `src/modules/spaceheader/*` | Space menu on right click | |
| `installer/vivarcdi/live_token.py` | `live-folders token` command and the copy on deploy | Command |
| `src/styles/live-folders.scss`, `folders.scss` | Live folder icon, warning mark, two-line row, check mark, submenu | |

## Vivaldi interface

No new selector. Network: `fetch` to `api.github.com` from `window.html`, which the T1 probe
(`live-folders/sonda-fetch-github.md`) must confirm. Marks: `data-vivarcdi-live-folder`,
`data-vivarcdi-live-warning`.

## Configuration

```json
"live-folders": { "enabled": true, "refreshMinutes": 5 }
```

The `live-folders` list of the first version is not read (FR-7). Folders are created from the menu.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi's CSP blocks `fetch` from `window.html` | T1 probe before code; fallback is a request through the extension's background page, which would change this design |
| Search rate limit, 30 requests a minute with a token | Two requests per folder every five minutes; a 403 sets the warning and the next timer retries |
| The token is readable in the payload folder | Mode 600, same user as Vivaldi; never in browser storage, never in logs |
| A virtual id reaches code that writes bookmarks | One `LinkId.isVirtual` test, a unit test for each writer that it skips virtual ids |
| A live row tab is taken for a bookmark link by 008 or 030 | 008 reads the bookmark tree and 030 syncs bookmarks: neither sees virtual ids; covered by the test above |
