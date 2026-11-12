# 034 Module boundaries

| | |
|---|---|
| Status | Draft |
| Phase | 0 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

The payload is a set of modules that `config.json` enables one by one, but their code is not
independent: six modules import classes from four others. A change inside `folders` ripples into
`folder-preview` and `today`, and a change inside `favorites` into `folders`, `reopen` and
`space-header`. This spec draws the boundaries: modules never import each other, the pieces they share
live in one shared layer, a lint rule keeps it that way, and `folders`, the largest module, is split
into folders that each hold one responsibility. Nothing changes for the user.

## User stories

- **US-1.** As the maintainer, I want to change a module without reading the other modules, so that
  each feature can evolve and be reviewed on its own.
- **US-2.** As the maintainer, I want the build to fail when a module reaches into another, so that the
  boundaries do not erode again.
- **US-3.** As the maintainer, I want the `folders` module to show its responsibilities in its layout,
  so that I find the class I need without opening thirty files.

## Expected behavior

The user sees no difference: every module behaves exactly as its own spec says. The change is in the
source tree only.

### Today

| Module | Imports from another module |
|---|---|
| `folder-preview` | `FolderTree`, `LinkEntry`, `LinkActivator`, `OpenLinks`, `LinkIcon` from `folders`; `LastOpenedStore` from `reopen` |
| `folders` | `UnloadedTabs` from `favorites` |
| `reopen` | `UnloadedTabs` from `favorites` |
| `space-header` | `UnloadedTabs` from `favorites` |
| `today` | `LinkIcon` from `folders`; `PINNED_LAST_ATTRIBUTE` from `pinned` |
| `live-folders` | `TextCopier` from `copy-url` |

### After

```text
src/
  core/        services and infrastructure, as today
  shared/      building blocks used by two or more modules, grouped by topic
  modules/     one folder per module; imports from core/ and shared/ only
    folders/
      BookmarkFolders.ts    the module
      FolderSection.ts      composition root of one section
      tree/                 reading the bookmark tree and remembering what is open
      links/                linking bookmark rows to the tabs that show them
      favoritelinks/        adding links to and removing them from a workspace's favorites
      dragdrop/             drop targets and drops of tabs, rows and panel bookmarks
      editing/              row menus, renaming and other edits of the section
      view/                 drawing rows and the section
```

A file belongs in `shared/` only while two or more modules use it; a file that only one module uses
lives in that module. The exact file-by-file mapping is part of the design.

## Requirements

### Functional

- **FR-1.** No file in `src/modules/<a>/` imports, at runtime or as a type, a file in
  `src/modules/<b>/` with `<a>` different from `<b>`. `src/modules/index.ts`, the registry, is the
  only exception.
- **FR-2.** The pieces listed in [Today](#today) move to `src/shared/`, grouped by topic. A piece that
  mixes a shared part and a module-specific part is split, for example `TextCopier` leaves
  `UrlCopier.ts` while `UrlCopier` stays in `copy-url`.
- **FR-3.** Every file in `src/shared/` is imported by at least two modules.
- **FR-4.** `src/shared/` imports from `src/core/` and from itself only, never from `src/modules/`.
- **FR-5.** A local ESLint rule, next to `no-line-comments` in `tools/eslint/`, reports every import
  that breaks FR-1 or FR-4, and `npm run lint` fails on it.
- **FR-6.** `src/modules/folders/` keeps only `BookmarkFolders.ts` and `FolderSection.ts` at its top
  level; every other file sits in one of the responsibility folders shown in [After](#after).
- **FR-7.** The tests mirror the source layout: `tests/shared/` for the shared layer and
  `tests/modules/folders/<responsibility>/` for the folders module.

### Non-functional

- **NFR-1.** No behavior changes: every existing test keeps its name and passes, and no acceptance
  criterion of another spec changes.
- **NFR-2.** `config.json`, the selectors, the stylesheets and the `data-vivarcdi-*` attributes stay
  as they are, so an installed VivArcDi upgrades without any visible difference.
- **NFR-3.** The build keeps the layout of `src/` in `dist/` (see
  [architecture](../../docs/architecture.md#build)), so `dist/shared/` appears next to `dist/core/`.
- **NFR-4.** `docs/architecture.md` describes the shared layer and the boundary rule.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria) and verifiable one by one. `Check` says how:
`auto` names the test that proves it, `manual` is a step Tore performs on a real Vivaldi.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE payload SHALL contain no import from one module folder into another module folder | auto: `no module imports another module` |
| AC-2 | THE shared layer SHALL import from core and from itself only | auto: `shared imports only core and shared` |
| AC-3 | THE shared layer SHALL contain only files that two or more modules import | auto: `every shared file is used by two modules` |
| AC-4 | IF a module file imports a file of another module, THEN THE lint rule SHALL report it | auto: `rule reports an import into another module` |
| AC-5 | IF a module file imports from core, shared or its own folder, THEN THE lint rule SHALL report nothing | auto: `rule accepts imports from core, shared and the same module` |
| AC-6 | THE folders module SHALL keep no file at its top level other than the module and the section | auto: `folders keeps only the module and the section at its top level` |
| AC-7 | WHEN VivArcDi is installed from this change, THE bookmark folders, folder preview, Today archive, live folders, reopen pinned tabs, space header and copy URL SHALL behave as before | manual |

## Out of scope

- Splitting `src/core/` into sub-folders and moving out the core files that one module uses: a
  follow-up spec, once the shared layer exists.
- Typed module options and a shared reader for JSON kept in storage (points 3 and 4 of the review of
  2026-11-12).
- Splitting the other large modules (`little-arc`, `favorites`, `workspace-sync`).
- Any change of behavior, configuration or style.

## Open questions

- [ ] **Name and place of the shared layer.** Proposed: `src/shared/`, separate from `src/core/`.
  `core/` keeps the services that `ModuleContext` injects and the infrastructure; `shared/` holds
  feature building blocks. Putting them in `core/` would make the review's point 2 worse.
- [ ] **Where `WorkspaceFavorites` lives.** It writes to a workspace's favorites but only `folders`
  uses it. Proposed: it stays in `folders/favoritelinks/`; moving it to `favorites` would create a new
  cross-module import.
- [ ] **Branch and version.** No behavior changes, so proposed: a `refactor/module-boundaries` branch
  with no version change, as the "anything else" row of [CONTRIBUTING.md](../../CONTRIBUTING.md#branches-versions-and-releases)
  allows.

## References

- Code review of 2026-11-12, point 1 (cross-module imports).
- [Architecture](../../docs/architecture.md)
- [CONTRIBUTING.md, principles](../../CONTRIBUTING.md#principles): SOLID, DRY.
