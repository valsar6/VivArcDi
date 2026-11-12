# 026 Live folders: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/live-folders`, next minor version. Replaces the tasks of the first version.

- [x] **T1.** Probe for Tore (OK on 2026-11-12: no CSP, both calls 200): `fetch('https://api.github.com/...')` works from `window.html`
  (`live-folders/sonda-fetch-github.md` in the project files). Code starts after the answer.
- [x] **T2.** `PullRequestFilters` and `GithubPullRequests` with fixtures. Satisfies AC-2 to AC-8.
  Done when `lists my and review-requested pull requests once`, `omits my pull requests when created by
  me is off`, `omits review requests when the filter is off`, `hides drafts when the filter is off`,
  `limits pull requests to the chosen repositories`, `drops closed pull requests` and `maps a pull
  request to a row` pass.
- [x] **T3.** `GithubToken`. Satisfies AC-11, AC-16. Done when `asks for a token when none is stored`
  and `never stores the token in browser storage` pass.
- [x] **T4.** `LiveFolderStore` and `LiveFolderRefresher`. Satisfies AC-10, AC-12 to AC-15. Done when
  `keeps rows when the refresh fails`, `stores the filters of a live folder`, `refreshes on a timer and
  on open`, `restores the last rows at startup` and `deleting a live folder leaves bookmarks untouched`
  pass.
- [x] **T5.** `VirtualFolders`, `LinkId`, and the folders section: virtual entries at the end, icon,
  warning, subtitle, rename routing, no drag or bookmark write on virtual ids, `unlinkExcept` with
  virtual ids. Satisfies AC-8, AC-9.
- [x] **T6.** `ContextMenu` check items and submenus; `SpaceMenuItems`; space menu on the header;
  `LiveFolderMenu` and `RepositoryEditor`. Satisfies AC-1, AC-12, AC-15, AC-17.
- [x] **T7.** Installer `live-folders token` (and `--remove`), copy on deploy, mode 600, Python tests.
  Satisfies FR-5.
- [x] **T8.** Module wiring, `config.json`, styles, manual page `docs/manual/live-folders.md` (the
  page the `Connect GitHub` row opens), README, version bump, `make check`.
- [ ] **T9.** Manual verification checklist for Tore from AC-1, AC-9, AC-17 and the warning mark.

## Second revision: connect GitHub from the browser

- [ ] **T10.** Probe for Tore: `live-folders/sonda-accesso-github.md` (device endpoints reachable from
  `window.html`) and the OAuth App client id (`live-folders/registra-app-github.md`).
- [x] **T11.** `GithubDeviceFlow` with fixtures. Satisfies AC-19, AC-21. Done when `polls at the
  interval github asks for` and `stores nothing when the code expires or is denied` pass.
- [x] **T12.** `GithubConnection` replaces `GithubToken`; 401 handling and `Reconnect GitHub`. Satisfies
  AC-11, AC-16, AC-20, AC-22, AC-23. Done when `asks to connect when github is not connected`, `never
  logs the token`, `stores the token and refreshes after authorization`, `forgets the token on
  disconnect` and `offers to reconnect when the token is refused` pass; the old test names of AC-11
  and AC-16 are renamed.
- [x] **T13.** `ConnectPanel`, connect row routing, `Disconnect GitHub` item. Satisfies AC-18.
- [x] **T14.** `LiveRowMenu` with `Copy Link` and `Archive Pull Request`.
- [x] **T15.** Installer: remove the token command and delete the old files. Satisfies AC-24. Done when
  `removes the old token file` passes.
- [x] **T16.** `githubClientId` in `config.json`, manual page rewritten without the terminal, version
  bump, `make check`.
- [ ] **T17.** Manual verification checklist for Tore from AC-1, AC-9, AC-17, AC-18 and the row actions.

