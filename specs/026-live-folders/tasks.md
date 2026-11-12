# 026 Live folders: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/live-folders`, next minor version. Replaces the tasks of the first version.

- [ ] **T1.** Probe for Tore: `fetch('https://api.github.com/...')` works from `window.html`
  (`live-folders/sonda-fetch-github.md` in the project files). Code starts after the answer.
- [ ] **T2.** `PullRequestFilters` and `GithubPullRequests` with fixtures. Satisfies AC-2 to AC-8.
  Done when `lists my and review-requested pull requests once`, `omits my pull requests when created by
  me is off`, `omits review requests when the filter is off`, `hides drafts when the filter is off`,
  `limits pull requests to the chosen repositories`, `drops closed pull requests` and `maps a pull
  request to a row` pass.
- [ ] **T3.** `GithubToken`. Satisfies AC-11, AC-16. Done when `asks for a token when none is stored`
  and `never stores the token in browser storage` pass.
- [ ] **T4.** `LiveFolderStore` and `LiveFolderRefresher`. Satisfies AC-10, AC-12 to AC-15. Done when
  `keeps rows when the refresh fails`, `stores the filters of a live folder`, `refreshes on a timer and
  on open`, `restores the last rows at startup` and `deleting a live folder leaves bookmarks untouched`
  pass.
- [ ] **T5.** `VirtualFolders`, `LinkId`, and the folders section: virtual entries at the end, icon,
  warning, subtitle, rename routing, no drag or bookmark write on virtual ids, `unlinkExcept` with
  virtual ids. Satisfies AC-8, AC-9.
- [ ] **T6.** `ContextMenu` check items and submenus; `SpaceMenuItems`; space menu on the header;
  `LiveFolderMenu` and `RepositoryEditor`. Satisfies AC-1, AC-12, AC-15, AC-17.
- [ ] **T7.** Installer `live-folders token` (and `--remove`), copy on deploy, mode 600, Python tests.
  Satisfies FR-5.
- [ ] **T8.** Module wiring, `config.json`, styles, manual page `docs/manual/live-folders.md` (the
  page the `Connect GitHub` row opens), README, version bump, `make check`.
- [ ] **T9.** Manual verification checklist for Tore from AC-1, AC-9, AC-17 and the warning mark.
