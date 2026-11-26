# 070 Guards for the two couplings to Vivaldi's interface: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `refactor/070-vivaldi-coupling-guards`, **no version change** (see the design: a refactor with
one console warning; the alternative is `fix/` with a patch bump, Tore decides). One pull request.
Each code task follows TDD: first the failing tests with the verbatim `auto:` names, then the code,
then `make check`. T1 and T2 own disjoint files and run in parallel, each in its own worktree from
the same base commit; T3 runs alone after both.

## Order

```
T1 ──┐
     ├──> T3 (lead: docs, spec Implemented)
T2 ──┘
```

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `src/styles/_vivaldi.scss`, `_tokens.scss`, `column-scroll.scss`, `hidden-tabs.scss`, `favorites.scss`, `pinned.scss`, `little-arc.scss`, `sidebar-look.scss`, `tests/styles/VivaldiNames.test.ts`, `tests/styles/CompactTabBar.test.ts` (one read target) |
| T2 | `src/core/boot/ShapeGuards.ts`, `WindowServices.ts`, `ModuleStarter.ts`, `Module.ts`, `VivArcDi.ts`, `BootReport.ts`; `src/shared/spaces/ReactProbe.ts`, `ReactInternals.ts`; `src/modules/workspacesync/WorkspaceSync.ts`, `src/modules/folders/BookmarkFolders.ts`, `src/modules/folders/editing/LinkRelocationFactory.ts`; `tests/loader/boot.ts`, `tests/loader/BootShape.test.ts`, `tests/core/boot/ShapeGuards.test.ts`, `tests/core/boot/BootReport.test.ts`, `tests/shared/spaces/ReactProbe.test.ts`, `tests/shared/spaces/WorkspaceMenu.test.ts` (constructor arguments), `tests/structure/ReactProbeUsers.test.ts`, the test contexts of `workspacesync` and `folders` |
| T3 | `docs/architecture.md`, `specs/070-vivaldi-coupling-guards/spec.md`, `specs/README.md`, this file |

## Tasks

- [x] **T1. The Vivaldi names of the styles** (TDD; parallel with T2). Add
  `tests/styles/VivaldiNames.test.ts` with `_vivaldi.scss defines every Vivaldi name the styles use`,
  `every mirrored variable equals its catalog selector in every catalog`,
  `a mirrored name missing in a catalog fails` and `no stylesheet writes a Vivaldi name as a literal`
  (AC-1 to AC-4), with the mapping table of the design inside the test. Then add `_vivaldi.scss`
  with the variables of the design, add `@use 'vivaldi' as *;` and `@forward 'vivaldi';` to
  `_tokens.scss`, delete `$strip`, `$tab-bar` and `$narrow-tab-bar` there, build `$root`,
  `$private` and `$look` from `$browser`, and replace every literal of the list of the design in the
  six stylesheets. Compile every stylesheet at the base commit and after the change and compare
  (whitespace aside): the selectors must be identical (NFR-1). The existing tests under
  `tests/styles/` pass with their names unchanged; `CompactTabBar.test.ts` reads `_vivaldi.scss`
  for the `$narrow-tab-bar` row. Done when `make check` is green.
- [x] **T2. The probe service, the React probe and the boot scenario** (TDD; parallel with T1). Add
  the tests with the verbatim names: `React probe passes when the interface carries a fiber`,
  `React probe fails without a fiber and never throws` and `a missing React shape at first use warns once`
  (`tests/shared/spaces/ReactProbe.test.ts`); `BootReport warns once for a failed probe and counts it`
  and `BootReport logs nothing for a passing probe` (`tests/core/boot/BootReport.test.ts`);
  `boot runs the registered probes once after the modules`,
  `boot warns when Vivaldi's React shape is missing` and
  `boot stays silent when Vivaldi's React shape is present` (`tests/loader/BootShape.test.ts`, with
  `ReactUser` and `ProbeRecorder` added to `tests/loader/boot.ts`); and
  `every module that builds ReactInternals registers the React probe`
  (`tests/structure/ReactProbeUsers.test.ts`). Then add `ShapeGuards.ts` and wire it as the design
  says (`WindowServices`, `ModuleStarter`, `Module`, `VivArcDi`, `BootReport`), add `ReactProbe.ts`
  and `registerReactProbe`, give `ReactInternals` its board argument and the first-use report, and
  register the probe in `WorkspaceSync.start` and `BookmarkFolders.start`. Keep the clean summary
  line as it is: `shape warnings: N` only appears when N is above zero. Fix the contexts and the
  `ReactInternals` constructor calls of the existing tests as the design describes, changing no test
  name (AC-13). Done when `make check` is green, including the structure tests and the
  `module-boundaries` lint rule (AC-12).
- [x] **T3. Docs and spec status** (lead; after T1 and T2). Merge both branches. In
  `docs/architecture.md` say where the Vivaldi names live and how the self-check reports React
  (NFR-6). Do a lab check if Tore agrees: in `npm run live`, that `#browser` or one of its children
  carries a `__reactFiber` key (the design's open point). Set the spec Status and the README row to
  `Implemented` and tick T1 to T3. Make no version change on the `refactor/` branch. Done when
  `make check` is green and
  `npm run release -- check --base origin/main --branch refactor/070-vivaldi-coupling-guards`
  passes.

There is no manual task: the change is internal and the spec has no `manual` criterion.
