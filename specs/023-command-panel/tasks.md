# 023 Command panel with tab actions: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/command-panel`, next minor version.

- [ ] **T1.** Probe for Tore: Cmd/Ctrl+Shift+K reaches the page; `chrome.history` and `chrome.bookmarks.search` exist in `window.html`.
- [ ] **T2.** `ActionRegistry` in `src/core` and `Matcher`. Satisfies AC-2. Done when `lists pin actions for the typed text` passes.
- [ ] **T3.** Providers for tabs, bookmarks and history. Satisfies AC-3.
- [ ] **T4.** `SiteSearch` and the `search-sites` option. Satisfies AC-4. Done when `searches the named site` passes.
- [ ] **T5.** `PanelView`, `PanelKey`, the module and styles. Satisfies AC-1, AC-5.
- [ ] **T6.** Register the actions of pinned tabs, favorites, today and copy URL.
- [ ] **T7.** README, version bump, `make check`.
- [ ] **T8.** Manual verification checklist for Tore from AC-1, AC-3 and AC-5.
