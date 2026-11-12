# 026 Live folders

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | First version 2026-11-08, never implemented; this revision of 2026-11-12 is pending approval |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

A live folder in Arc fills itself from a source. The only source Arc shipped is GitHub: the folder
collects the open pull requests of the user and of their team, with the title and the author's name
under it, and a click opens the pull request. Rows are not managed by hand: a pull request that closes
leaves the folder. The user creates the folder from the sidebar menu, narrows it with filters from the
folder's own menu and deletes it from the same menu. This spec brings the same to the folders of
[009](../009-bookmark-folders-in-tab-bar/spec.md).

**Revision of 2026-11-12.** The first version took one repository from `config.json`, with no menu and
no filters. Tore's article on Arc's Live Folders (allthings.how, April 2024, Arc 1.38 for Mac) shows
how the feature is created, filtered and deleted; Tore chose to follow it (decision card, 2026-11-12).
The design and tasks of the first version are superseded and will be rewritten once this revision is
approved.

## How Arc does it

From the article and the Browser Company's clip (`recensioni/live-folders.md`):

- **Create.** Right click on the sidebar, `Live Folders`, `GitHub`. The folder appears in the sidebar of
  the current space. Arc also creates one by itself the first time the user clicks "Create a Pull
  Request" on GitHub.
- **Content.** The pull requests of the user and of their team, in one place. Each row shows the GitHub
  favicon, the title and, under it, the author.
- **Filter.** Right click on the folder, `Pull Requests`: `Created By Me`, `Review Requests`, `Drafts`,
  and specific repositories.
- **Delete.** Right click on the folder, `Delete Live Folder`. After that Arc no longer creates GitHub
  live folders by itself.
- Other sources (Figma, Notion, Google Drive, Linear) were announced but not shipped.

## User stories

- **US-1.** As a user, I want to create a live folder of my GitHub pull requests from the sidebar, so
  that I do not edit a file to get one.
- **US-2.** As a user, I want the folder to list the pull requests I opened and the ones waiting for my
  review, so that I see my GitHub work without opening GitHub.
- **US-3.** As a user, I want to choose from the folder's menu which pull requests it shows, so that it
  holds only what I follow.
- **US-4.** As a user, I want the folder to update on its own and to drop pull requests that closed.
- **US-5.** As a user, I want to delete a live folder from its menu.

## Expected behavior

**Connect GitHub.** A live folder reads GitHub as the user, so it needs a GitHub token with read access
to pull requests. The user stores it once with the installer command `vivarcdi live-folders token`,
which asks for the token and keeps it outside the browser. Without a token a live folder shows a single
row, `Connect GitHub`, that says which command to run; no request reaches GitHub.

**Create.** A right click on the space header of [011](../011-space-header/spec.md) opens a menu with
`New Folder` (the same action as the `+` of [012](../012-editable-folders/spec.md)) and
`Live Folders` › `GitHub`. Choosing `GitHub` adds a live folder named `Pull Requests` at the end of the
workspace's folders, with a pull-request icon instead of the folder icon. The folder belongs to the
workspace where it was created; several live folders in one workspace are allowed, each with its own
filters. A double click renames it, as a folder of 012.

**Content.** By default the folder lists every open pull request that the user created or whose review
is requested from the user, in any repository the token can read, each pull request once, newest
update first. Each row shows the GitHub favicon, the title and, under it, the author and the repository
(`author · owner/repo`). A click opens the pull request as a link tab of the workspace, as a row of 009.

**Filter.** A right click on the live folder opens its menu:

- `Pull Requests` › `Created By Me` (on by default), `Review Requests` (on by default), `Drafts` (on by
  default: drafts are listed), each a check item;
- `Pull Requests` › `Repositories…`: a field where the user types `owner/repo` names, one per line;
  an empty list means every repository;
- `Refresh`;
- `Delete Live Folder`.

With both `Created By Me` and `Review Requests` off the folder is empty. A change takes effect at once
and is kept across restarts.

**Update.** VivArcDi refreshes every live folder every five minutes, when the user opens the folder and
after a filter change. A pull request that closed or merged is not in the answer and its row disappears.
The last rows are kept, so after a restart the folder shows them before the first refresh. If a refresh
fails (no network, an expired token, GitHub's rate limit) the folder keeps its last rows and shows a
warning mark; hovering the mark says why.

**Delete.** `Delete Live Folder` removes the folder, its filters and its kept rows. No bookmark is
touched, because a live folder is not a bookmark folder.

## Requirements

### Functional

- **FR-1.** A `live-folders` module adds the space menu, the live folders and their menu.
- **FR-2.** The only source is GitHub pull requests.
- **FR-3.** Rows are virtual: they are not bookmarks and are not written to Vivaldi's bookmarks.
- **FR-4.** Live folders, their filters and their last rows are stored by VivArcDi per workspace.
- **FR-5.** The token is stored by the installer outside the browser and is never written to browser
  storage or to a log.
- **FR-6.** A failed refresh keeps the last rows and marks the folder with a warning.
- **FR-7.** The `live-folders` list of `config.json` of the first version is dropped.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user right-clicks the space header and chooses `Live Folders` › `GitHub`, THE workspace SHALL show a live folder named `Pull Requests` with the pull-request icon. | manual |
| AC-2 | WHEN a live folder refreshes with the default filters, THE folder SHALL list the open pull requests created by the user or with a review requested from the user, each once. | auto: `lists my and review-requested pull requests once` |
| AC-3 | WHERE `Created By Me` is off, THE folder SHALL list no pull request only created by the user. | auto: `omits my pull requests when created by me is off` |
| AC-4 | WHERE `Review Requests` is off, THE folder SHALL list no pull request only waiting for the user's review. | auto: `omits review requests when the filter is off` |
| AC-5 | WHERE `Drafts` is off, THE folder SHALL list no draft pull request. | auto: `hides drafts when the filter is off` |
| AC-6 | WHERE the repository list is not empty, THE folder SHALL list only pull requests of those repositories. | auto: `limits pull requests to the chosen repositories` |
| AC-7 | WHEN a pull request closes or merges, THE row SHALL disappear at the next refresh. | auto: `drops closed pull requests` |
| AC-8 | THE row SHALL show the title and, under it, the author and the repository. | auto: `maps a pull request to a row` |
| AC-9 | WHEN the user clicks a row, THE pull request SHALL open as a link tab of the workspace. | manual |
| AC-10 | IF the refresh fails, THEN THE folder SHALL keep its last rows and show a warning with the reason. | auto: `keeps rows when the refresh fails` |
| AC-11 | IF no token is stored, THEN THE folder SHALL show only the `Connect GitHub` row and send no request. | auto: `asks for a token when none is stored` |
| AC-12 | WHEN the user changes a filter, THE folder SHALL refresh and the filter SHALL be kept after a restart. | auto: `stores the filters of a live folder` |
| AC-13 | WHILE a live folder exists, THE module SHALL refresh it every five minutes and when the user opens it. | auto: `refreshes on a timer and on open` |
| AC-14 | WHEN Vivaldi restarts, THE live folder SHALL show its last rows before the first refresh. | auto: `restores the last rows at startup` |
| AC-15 | WHEN the user chooses `Delete Live Folder`, THE folder and its stored data SHALL go and no bookmark SHALL change. | auto: `deleting a live folder leaves bookmarks untouched` |
| AC-16 | THE token SHALL never appear in browser storage or in a log. | auto: `never stores the token in browser storage` |
| AC-17 | WHEN the user right-clicks the space header and chooses `New Folder`, THE result SHALL be the same as the `+` of 012. | manual |

## Out of scope

- Automatic creation of a live folder when the user creates a pull request on GitHub.
- Sources other than GitHub pull requests (issues, Figma, Notion, Google Drive, Linear, feeds).
- Signing in to GitHub from the browser (OAuth); the token comes from the installer.
- Notifications and unread marks for new pull requests.
- Syncing live folders between devices ([030](../030-workspace-sync/spec.md) covers bookmarks only).
- The rest of Arc's space menu (rename, icon, color, delete space).

## Open questions

Each has a proposed answer; the spec stays Draft until Tore answers.

- [ ] **"My team".** Arc lists the pull requests of the user and of their team. GitHub has no single
  "team" query; the proposal is "created by me" plus "review requested from me", which covers the
  pull requests the team asks the user to look at. Alternative: add `Involves Me` (also mentions,
  comments and assignments).
- [ ] **Token.** Proposal: installer command and a file with mode 600, as the approved design of the
  first version decided (a mod cannot read the macOS Keychain). Alternative: paste the token into a
  field of the folder menu, kept in browser storage (simpler, less safe; would change FR-5 and AC-16).
- [ ] **Where the menu opens.** Proposal: right click on the space header, since VivArcDi has no space
  menu yet. Alternative: also on the empty area below the folders.
- [ ] **Order.** Proposal: newest update first, as GitHub's pull request list.

## References

- Article: [How do Live Folders work in Arc Browser](https://allthings.how/how-do-live-folders-work-in-arc-browser/)
  (April 2024).
- Live Folders clip (`recensioni/live-folders.md`); Project files: `video-arc/gap-list-arc-consolidata.md` (G11).
- First version of this spec: approved 2026-11-08 (PR #109), design written in PR #112 and approved 2026-11-09 (PR #113).
