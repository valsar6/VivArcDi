# Specifications

Every feature of VivArcDi starts as a specification in this folder. The spec is the source of truth:
code implements it, tests prove it, and a change in behavior changes the spec first. The workflow and
its approval gates are in [CONTRIBUTING.md](../CONTRIBUTING.md#spec-driven-workflow).

## Index

| Spec | Phase | Status |
|---|---|---|
| [000 Foundations](000-foundations/spec.md) | 0 | Implemented |
| [001 Favorites grid](001-favorites-grid/spec.md) | 1 | Implemented |
| [002 Peek](002-peek/spec.md) | 2 | Approved |
| [003 Favorites and pinned tabs](003-pinned-tabs-and-folders/spec.md) | 3 | Approved |
| [004 Today tabs and keyboard](004-today-tabs-and-keyboard/spec.md) | 4 | Implemented |
| [005 Little Arc](005-little-arc/spec.md) | 5 | Approved |
| [006 Versioning and releases](006-versioning-and-releases/spec.md) | Tooling | Approved |
| [007 Reopen pinned tabs](007-reopen-pinned-tabs/spec.md) | 3 | Approved |
| [008 Folder hover preview](008-folder-hover-preview/spec.md) | 3 | Approved |
| [009 Bookmark folders in the tab bar](009-bookmark-folders-in-tab-bar/spec.md) | 3 | Approved |
| [010 Folders per workspace](010-folders-per-workspace/spec.md) | 3 | Approved |
| [011 Space header](011-space-header/spec.md) | 3 | Approved |
| [012 Editable folders](012-editable-folders/spec.md) | 3 | Approved |
| [013 Incognito mode](013-incognito-mode/spec.md) | 3 | Implemented |
| [014 Arc shortcuts](014-arc-shortcuts/spec.md) | 0 | Implemented |
| [015 Peek for new-tab links](015-peek-new-tab-links/spec.md) | 2 | Implemented |
| [016 Plug-and-play installer](016-plug-and-play-installer/spec.md) | 0 | Implemented |
| [017 Package managers](017-package-managers/spec.md) | 0 | Approved |
| [018 Copy bookmarks into a workspace](018-copy-bookmarks-to-workspace/spec.md) | 3 | Implemented |
| [019 Space theme color](019-space-theme-color/spec.md) | 3 | Draft |
| [020 Drag a tab into the Favorites](020-drag-tab-to-favorites/spec.md) | 1 | Approved |
| [021 Auto-hide tab bar](021-auto-hide-tab-bar/spec.md) | 3 | Approved |
| [022 Split from a dragged tab](022-split-from-drag/spec.md) | 2 | Draft |
| [023 Command panel with tab actions](023-command-panel/spec.md) | 5 | Approved |
| [024 Site boosts and zap](024-site-boosts-and-zap/spec.md) | 5 | Approved |
| [025 Annotated screenshots](025-annotated-screenshots/spec.md) | 5 | Approved |
| [026 Live folders](026-live-folders/spec.md) | 3 | Approved |
| [027 Rename and re-icon pinned tabs](027-rename-pinned-tabs/spec.md) | 3 | Implemented |
| [028 Arc sidebar look](028-arc-sidebar-look/spec.md) | 3 | Approved |
| [029 Arc Light theme](029-arc-light-theme/spec.md) | 3 | Approved |
| [030 Workspace sync](030-workspace-sync/spec.md) | 3 | Implemented |
| [031 Pin and tile commands](031-pin-and-tile-commands/spec.md) | 3 | Approved |
| [032 Compact tab bar](032-compact-tab-bar/spec.md) | 3 | Implemented |
| [033 Folder menu](033-folder-menu/spec.md) | 3 | Approved |
| [034 Module boundaries](034-module-boundaries/spec.md) | 0 | Approved |
| [035 Core layout](035-core-layout/spec.md) | 0 | Implemented |
| [036 Module options](036-module-options/spec.md) | 0 | Implemented |
| [037 Versioned storage](037-versioned-storage/spec.md) | 0 | Implemented |
| [038 Page scripts](038-page-scripts/spec.md) | 0 | Implemented |
| [039 Boot self-check](039-boot-self-check/spec.md) | 0 | Implemented |
| [040 Live folders writes](040-live-folders-writes/spec.md) | 3 | Implemented |
| [041 Write outcome](041-write-outcome/spec.md) | 0 | Implemented |
| [042 vivExtData owner](042-vivextdata-owner/spec.md) | 0 | Implemented |
| [043 Sync robustness](043-sync-robustness/spec.md) | 3 | Implemented |
| [045 No downgrade](045-no-downgrade/spec.md) | 0 | Implemented |
| [046 Live verification](046-live-verification/spec.md) | Tooling | Implemented |
| [047 Snapshot watch](047-snapshot-watch/spec.md) | Tooling | Approved |
| [048 GitHub token refused](048-github-token-refused/spec.md) | 3 | Implemented |
| [049 Review wait](049-review-wait/spec.md) | Tooling | Implemented |
| [050 Tab strip gap](050-tab-strip-gap/spec.md) | 3 | Approved |
| [051 More Arc themes](051-more-themes/spec.md) | 3 | Approved |
| [052 Title bar](052-title-bar/spec.md) | 3 | Draft |
| [053 Single scroll](053-single-scroll/spec.md) | 3 | Implemented |
| [054 Call Picture in Picture](054-call-pip/spec.md) | 5 | Approved |
| [055 Open a tile as a web panel](055-tile-web-panel/spec.md) | 3 | Implemented |
| [056 Menu of a saved tab](056-saved-tab-menu/spec.md) | 3 | Implemented |
| [057 Menu of a Favorites tile](057-tile-menu/spec.md) | 1 | Implemented |




## Layout

```text
specs/
  _template/                copy this folder to start a new spec
  NNN-short-name/
    spec.md                 what and why: stories, behavior, requirements, acceptance criteria
    design.md               how: components, selectors, configuration, risks
    tasks.md                ordered checklist that implements the design
```

`NNN` is the next free number. `design.md` and `tasks.md` exist only once `spec.md` is approved.

## Status

| Status | Meaning |
|---|---|
| `Draft` | Being written or discussed. No code may depend on it. |
| `Approved` | Tore accepted it. Implementation may start. |
| `Implemented` | Merged in `main`; every acceptance criterion has a check. |
| `Superseded` | Replaced by another spec, linked from the header. |

The status sits in the header table of each file, next to the approval date.

## Acceptance criteria

Criteria use EARS (Easy Approach to Requirements Syntax), so each one reads as a single testable
sentence:

| Pattern | Template |
|---|---|
| Ubiquitous | THE *system* SHALL *response* |
| Event-driven | WHEN *trigger*, THE *system* SHALL *response* |
| State-driven | WHILE *state*, THE *system* SHALL *response* |
| Unwanted behavior | IF *condition*, THEN THE *system* SHALL *response* |
| Optional feature | WHERE *option is enabled*, THE *system* SHALL *response* |

Every criterion has an id (`AC-n`) and a check:

- `auto: <test name>` when an automated test proves it. The test keeps that name.
- `live: <scenario name>` when a real Vivaldi can prove it without a person: a scenario in
  `tests/live/scenarios/` with that exact `name` proves it on a lab Vivaldi with `npm run live`
  ([spec 046](046-live-verification/spec.md)). Prefer it to `manual` whenever the result can be read
  from the DOM, `chrome.tabs` or storage.
- `manual` when only a person can judge it: how it looks, macOS permission dialogs, a restart of
  Tore's own profile. Manual criteria become the verification checklist Tore runs on macOS and Debian.

Refer to a criterion from elsewhere as `<spec number>/<id>`, for example `001/AC-4`.

## Sources

- [Arc: features and behaviors to replicate](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr)
- [VivArcDi: strategy and roadmap](https://claude.ai/artifact/4JHR28H3euKSPbQZPNhY38)
- [Spec-driven development](https://www.thebcms.com/blog/spec-driven-development/)
