# 035 Core layout

| | |
|---|---|
| Status | Approved |
| Phase | 0 |
| Owner | Tore |
| Approved | Tore, 2026-11-13 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

`src/core/` holds 62 files in one flat folder, plus `bookmarks/`. Next to the boot, the services that
`ModuleContext` injects and generic DOM helpers, it holds feature building blocks such as the Today
list, the drop zones of favorites and folders, the tab drag pill and the space collapse, and files
that a single module uses. This spec gives `core/` one job, which is infrastructure and injected
services. Feature building blocks move to `src/shared/` (from [034](../034-module-boundaries/spec.md)),
and single-module files move to their module. `core/` is split into folders by responsibility, and
a lint rule and structure tests keep the result in place. Nothing changes for the user.

## User stories

- **US-1.** As the maintainer, I want `core/` to hold only what every module may rely on, so that I
  know a change there affects the whole payload, and a change elsewhere does not.
- **US-2.** As the maintainer, I want a file that one module uses to live in that module, so that I
  find it next to the code that calls it.
- **US-3.** As the maintainer, I want `core/` to show its responsibilities in its layout, so that I
  find a service without scanning sixty file names.

## Expected behavior

The user sees no difference: every module behaves exactly as its own spec says. The change is in the
source tree only.

### Today

`core/` mixes four kinds of file:

| Kind | Examples |
|---|---|
| Boot and module system | `VivArcDi`, `Module`, `ModuleRegistry`, `UiReadiness`, `StyleInjector`, `ResourceLoader` |
| Services injected through `ModuleContext` | `BrowserTabs`, `BrowserWindows`, `BrowserHistory`, `BrowserSearch`, `PersistentStorage`, `bookmarks/BrowserBookmarks` |
| Generic helpers that know no feature | `Logger`, `FrameTask`, `SerialTask`, `DomQuery`, `KeptElement`, `TabBarAnchor`, `Toast` |
| Feature building blocks | `TodayList`, `FavoriteDropZone`, `LinkDropZone`, `TabDragPill`, `RowDrag`, `SpaceCollapse`, `SpaceMenuItems`, `VirtualFolders`, `HiddenTabMarker` |

Some files are used by one module only and by nothing in `core/`: `ElementGestures`
(`workspace-sync`), `TabMenuItems` and `MenuItemShape` (`folders`), `bookmarks/BookmarkCopier` and
`bookmarks/BookmarkTrash` (`folders`), `bookmarks/LinkKeyIndex` (`reopen`).

`BrowserHistory`, `BrowserSearch` and `ResourceLoader` are also used by one module only (`little-arc`
and `peek`), but they are services that `VivArcDi` builds and injects through `ModuleContext`, and
`ResourceLoader` also loads the selectors and the stylesheets. They are not single-module files in
the sense of this spec (see [Open questions](#open-questions)).

### After

```text
src/
  loader.ts
  core/        infrastructure and injected services only; imports from core/ only
    boot/      VivArcDi, the module system, readiness, style and resource loading
    browser/   wrappers of the Vivaldi and Chrome APIs injected through ModuleContext
      bookmarks/
    tabs/      reading and writing the data Vivaldi keeps on tabs
    dom/       DOM helpers, selectors, kept elements, menus, toasts and keys
    log/       logger and task helpers
  shared/      feature building blocks used by two or more modules (034), now including those from core
  modules/     each module also keeps the files from core that only it uses
```

The folder names above are a proposal. The exact folders and the file-by-file mapping are part of
the design.

## Requirements

### Functional

- **FR-1.** `src/core/` keeps only:
  - files that `VivArcDi` or `ModuleContext` needs, directly or through other core files;
  - generic helpers that name no VivArcDi feature and are used by two or more modules or by other
    core files.
- **FR-2.** A core file that names a VivArcDi feature and is used by two or more modules moves to
  `src/shared/`, grouped by topic. The rules of 034 apply: FR-3 (two users) and FR-4 (imports from
  core and shared only).
- **FR-3.** A core file that only one module uses, and that core does not need, moves into that
  module's folder.
- **FR-4.** `src/core/` imports from `src/core/` only, never from `src/shared/` or `src/modules/`.
- **FR-5.** The local rule `module-boundaries` also reports an import from `src/core/` into
  `src/shared/` or `src/modules/`, and `npm run lint` fails on it.
- **FR-6.** `src/core/` keeps no file at its top level. Every file sits in one of the responsibility
  folders that the design fixes.
- **FR-7.** The tests mirror the source layout: `tests/core/<folder>/` for core files,
  `tests/shared/` and `tests/modules/<name>/` for the files that move there.

### Non-functional

- **NFR-1.** No behavior changes: every existing test keeps its name and passes, and no acceptance
  criterion of another spec changes.
- **NFR-2.** `ModuleContext` keeps the same fields, with the same types under the same names.
- **NFR-3.** `config.json`, the selectors, the stylesheets and the `data-vivarcdi-*` attributes stay
  as they are.
- **NFR-4.** The build keeps the layout of `src/` in `dist/`, and every relative import in `dist/`
  points to an existing file.
- **NFR-5.** `docs/architecture.md` describes the core layout and the three layers: modules, shared,
  core.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria) and verifiable one by one. `Check` says how:
`auto` names the test that proves it, `manual` is a step Tore performs on a real Vivaldi.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE core layer SHALL import from core only | auto: `core imports only core` |
| AC-2 | THE core layer SHALL contain no file that only one module imports, unless core itself imports it | auto: `every core file is used by core or by two modules` |
| AC-3 | THE core layer SHALL keep no file at its top level | auto: `core keeps no file at its top level` |
| AC-4 | IF a core file imports a file of shared or of a module, THEN THE lint rule SHALL report it | auto: `rule reports an import from core into shared or a module` |
| AC-5 | IF a core file imports another core file, THEN THE lint rule SHALL report nothing | auto: `rule accepts imports from core into core` |
| AC-6 | WHEN VivArcDi is installed from this change, THE payload SHALL start and every enabled module SHALL behave as before | manual |

AC-2 cannot tell a generic helper from a feature building block on its own. That split (FR-1, FR-2)
is fixed by the design's mapping and checked in review.

## Out of scope

- Changing `ModuleContext`: no service is added, removed or built by a module instead of the boot.
- Typed module options and a shared reader for JSON kept in storage (points 3 and 4 of the review of
  2026-11-12).
- Splitting the large modules (`little-arc`, `favorites`, `workspace-sync`).
- Any change of behavior, configuration or style.

## Open questions

- [x] **Injected services used by one module.** `BrowserHistory` and `BrowserSearch` serve only
  `little-arc`, and `ResourceLoader`'s `PayloadSource` serves only `peek`, but all three come through
  `ModuleContext`. Decided: they stay in `core/browser/` and `core/boot/`, because they are part of
  the base every module stands on. Moving them would make `little-arc` and `peek` build their own
  services, which changes the boot and `ModuleContext`, the alternative that 034 already rejected.
- [x] **Order with 034.** 034 is not merged yet, and main gained spec 033's classes in the flat
  `folders/` and `core/bookmarks/BookmarkTrash.ts`. Decided: 034 takes main first and puts 033's
  classes in `folders/editing/`, then merges; 035 starts from that main, so the two refactors never
  conflict.
- [x] **Branch and version.** Decided: `refactor/core-layout`, with no version change, as for 034.

## References

- Code review of 2026-11-12, point 2 (flat `core/`).
- [034 Module boundaries](../034-module-boundaries/spec.md): the shared layer and the
  `module-boundaries` rule.
- [Architecture](../../docs/architecture.md)
