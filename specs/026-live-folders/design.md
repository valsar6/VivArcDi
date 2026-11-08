# 026 Live folders: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-08. It says **how**; the spec says **what**.

## Approach

The folders of 009 are drawn from the bookmark tree. Live folders add rows that are not bookmarks (FR-3), so they cannot come from the tree. The design adds a
**row source** to the 009 view: today it reads `FolderTree`; a live folder supplies its rows from `LiveFolderSource`. This answers the open question: virtual rows,
the 009 tree stays untouched and no hidden bookmark folder is written.

1. **Config.** `live-folders` is a list of `{name, source, repo, tokenFile?}`. Only `github-pull-requests` is accepted; any other `source` is logged and skipped.
2. **Source.** `GithubPullRequests.fetch()` calls `GET https://api.github.com/repos/{repo}/pulls?state=open` and maps to `{title, author, url}`. A closed or merged pull
   request is simply not in the answer, so the row goes at the next refresh (AC-1, AC-2). Pure mapping, tested with fixtures.
3. **Token (open question).** A mod cannot read the Keychain. The installer step `live-folders token` stores the token into the file `tokens/github` in the data directory with mode 600
   on both systems; the loader reads it through `ResourceLoader`. Keychain is dropped from the first version and the spec's proposal is updated by a CR when Tore agrees.
   Public repositories need no token.
4. **Refresh.** `LiveFolderRefresher` runs every five minutes with `setInterval` and when the folder opens. A failed request keeps the last rows and sets a warning
   mark on the folder (AC-4, FR-4). Last rows are kept in memory and in `chrome.storage.local` so they survive a restart.
5. **Rows.** Row title and author under it, GitHub favicon, `data-vivarcdi-live` on the folder. A click opens the URL with `BrowserTabs.create` as a link tab of the workspace, like the
   rows of 009 (AC-3).
6. **No filters** in the first version (answers the open question); the list is in `config.json` for later.

Rejected: Keychain from the mod (impossible); real bookmarks in a hidden folder (would be read by 008 and by Vivaldi's bookmark views).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/livefolders/LiveFolders.ts` | Module | Module |
| `.../GithubPullRequests.ts` | Fetch and map | Adapter |
| `.../LiveFolderRefresher.ts` | Timer, keep-last-rows | |
| `.../LiveRows.ts` | Rows for the 009 view | |
| `installer/vivarcdi/live_token.py` | Writes the token file | Command |

## Vivaldi interface

The 009 view gets an optional row source; mark `data-vivarcdi-live`. Network: `fetch` to `api.github.com` from `window.html` (T1 probe: not blocked by Vivaldi's CSP).

## Configuration

`live-folders`: `[]` by default; `refreshMinutes` 5.

## Risks

| Risk | Mitigation |
|---|---|
| GitHub rate limit without a token (60/h) | Five-minute refresh = 12/h per repository; warning mark on 403 |
| CSP of `window.html` blocks `fetch` | T1 probe; fallback is a background page of the extension |
| Token leaks into logs | Never logged; file mode 600 |
