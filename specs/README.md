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
| [004 Today tabs and keyboard](004-today-tabs-and-keyboard/spec.md) | 4 | Approved |
| [005 Little Arc and extras](005-little-arc-and-extras/spec.md) | 5 | Draft |
| [006 Versioning and releases](006-versioning-and-releases/spec.md) | Tooling | Approved |
| [007 Reopen pinned tabs](007-reopen-pinned-tabs/spec.md) | 3 | Approved |
| [008 Folder hover preview](008-folder-hover-preview/spec.md) | 3 | Approved |
| [009 Bookmark folders in the tab bar](009-bookmark-folders-in-tab-bar/spec.md) | 3 | Approved |
| [010 Folders per workspace](010-folders-per-workspace/spec.md) | 3 | Approved |
| [011 Space header](011-space-header/spec.md) | 3 | Approved |
| [012 Editable folders](012-editable-folders/spec.md) | 3 | Approved |
| [013 Incognito mode](013-incognito-mode/spec.md) | 3 | Approved |
| [014 Arc shortcuts](014-arc-shortcuts/spec.md) | 0 | Implemented |
| [015 Peek for new-tab links](015-peek-new-tab-links/spec.md) | 2 | Implemented |

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
- `manual` when only a real Vivaldi can prove it. Manual criteria become the verification checklist
  Tore runs on macOS and Debian, because automated checks cannot reach a real Vivaldi.

Refer to a criterion from elsewhere as `<spec number>/<id>`, for example `001/AC-4`.

## Sources

- [Arc: features and behaviors to replicate](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr)
- [VivArcDi: strategy and roadmap](https://claude.ai/artifact/4JHR28H3euKSPbQZPNhY38)
- [Spec-driven development](https://www.thebcms.com/blog/spec-driven-development/)
