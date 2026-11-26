# 068 Shared page-message parser and timers: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `refactor/068-shared-page-messages-and-timers`, **no version change** (see the design:
CONTRIBUTING gives a bump only to `features/` and `fix/`, and 034 and 035 were refactors on
`refactor/` branches). One pull request. Each code task follows TDD: first the failing tests with
the verbatim `auto:` names, then the code, then `make check`. T1 and T2 own disjoint files and run
in parallel, each in its own worktree from the same base commit; T3 runs alone after both.

## Order

```
T1 ──┐
     ├──> T3 (lead: docs, bundle check, spec Implemented)
T2 ──┘
```

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `src/shared/messages/PageMessage.ts`, the five `*Message.ts` files of `copyurl`, `pinned`, `peek`, `today` and `callpip`, `tests/shared/messages/PageMessage.test.ts`, `tests/structure/OnePageReader.test.ts` |
| T2 | `src/core/support/Timers.ts`, the eleven users of the design, `tests/core/support/Timers.test.ts`, `tests/structure/OneTimers.test.ts`, and the imports of `tests/modules/sidebarlook/ScrollMark.test.ts`, `tests/modules/copyurl/fakes.ts` and `tests/modules/littlearc/logic.test.ts` |
| T3 | `docs/architecture.md`, `specs/068-shared-page-messages-and-timers/spec.md`, `specs/README.md`, this file |

## Tasks

- [x] **T1. The page-message reader** (TDD; parallel with T2). Add
  `tests/shared/messages/PageMessage.test.ts` with `parsePageMessage returns a valid runtime message`,
  `parsePageMessage returns a valid console line`, `parsePageMessage rejects a wrong prefix`,
  `parsePageMessage rejects broken JSON` and `parsePageMessage rejects a wrong shape` (AC-1 to AC-5),
  and `tests/structure/OnePageReader.test.ts` with `only PageMessage reads a console line` (AC-10).
  Then add `PageMessage.ts` with `parsePageMessage` and `hasEnvelope`, change `CopyMessage`,
  `PinnedMessage`, `ArchiveMessage` and `CallMessage` from `interface` to `type`, give each of the
  five files a guard as the design says and replace `fromConsole` and the cast with one call. Keep
  names, constants, JSDoc and results: the existing tests of the five messages pass unchanged (AC-6).
  Build on the base commit and after the change and compare `wc -c dist/page/*.js` (NFR-3); the lists
  must be identical. Do not touch `LittleArcMessage.ts`. Done when `make check` is green.
- [x] **T2. The shared timers** (TDD; parallel with T1). Add `tests/core/support/Timers.test.ts` with
  `systemTimers set runs the function after the delay` and `systemTimers clear cancels a pending timer`
  (AC-7, AC-8), and `tests/structure/OneTimers.test.ts` with `only Timers defines the system timers`
  (AC-9). Then add `Timers.ts` with `Timers` and `systemTimers`, and move the eleven users of the
  design table onto them (Toast, ConnectPanel, GithubDeviceFlow, Debounce, ScrollMark, FolderHover,
  FolderSectionView, FolderNameEditor, TileHoverName, FavoritesView, IdleTimer), deleting the nine
  interfaces and nine default objects with no alias. Keep every constructor parameter and dependency
  field name. In the three test files that import a removed type, change the import only. The tests
  of all these classes pass with their names unchanged (AC-11). Done when `make check` is green.
- [x] **T3. Docs, bundle check and spec status** (lead; after T1 and T2). Merge both branches, run
  `npm run build` and compare `dist/page/*.js` sizes with the base commit. In
  `docs/architecture.md` add `messages/` to the shared folders and the timers to the `support/` row
  (NFR-5). Set the spec Status and the README row to `Implemented` and tick T1 to T3. Make no
  version change on the `refactor/` branch. Done when `make check` is green and
  `npm run release -- check --base origin/main --branch refactor/068-shared-page-messages-and-timers`
  passes.

There is no manual task: the change is internal and the spec has no `manual` criterion.
