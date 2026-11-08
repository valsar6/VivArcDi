# 026 Live folders: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/live-folders`, next minor version.

- [ ] **T1.** Probe for Tore: `fetch('https://api.github.com/...')` works from `window.html`.
- [ ] **T2.** `GithubPullRequests` mapping with fixtures. Satisfies AC-1, AC-2. Done when `lists open pull requests only` and `drops closed pull requests` pass.
- [ ] **T3.** `LiveFolderRefresher`. Satisfies AC-4. Done when `keeps rows when the refresh fails` passes.
- [ ] **T4.** Row source in the 009 view, `LiveRows`, styles, warning mark. Satisfies AC-3.
- [ ] **T5.** Installer `live-folders token`.
- [ ] **T6.** Module, config, README, version bump, `make check`.
- [ ] **T7.** Manual verification checklist for Tore from AC-3.
