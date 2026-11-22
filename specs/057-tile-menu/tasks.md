# 057 Menu of a Favorites tile: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/tile-menu`, minor bump of the version (read the version on `main` right before
bumping). Each implementer task follows TDD: first the failing tests with the verbatim `auto:` names
of the criteria, then the code that makes them pass. Each task ends green on `make check`.

Order and parallel work: 057 shares the menu code with [056](../056-saved-tab-menu/spec.md), so
T2 to T7 start after the implementation of 056 is merged into `main`; each implementer worktree
starts from that commit. Only T1 (a probe, read-only) is independent of 056 and can run now, once Tore
agrees. T2 can run in parallel with T1. T3 runs alone. T4 and T5 run in parallel after T3 (different
files). T6 follows T4 and T5. T7 follows T6. T8 and T9 come last.

- [x] **T1. Probe on the lab Vivaldi** (read-only, `npm run live -- --probe <file>`, only after Tore
  agrees; nothing is written to the throwaway profile except by Vivaldi itself). It settles what is
  specific to tiles (done 2026-11-22, findings in the design): where the bookmark of a tile lives (folder, `parentId`, `index`, `vivExtData`);
  what `index + 1` gives for Duplicate, that is, where a copy appears in the grid and whether the grid
  reads it in that order; how a change of URL shows in every workspace (the tab of the tile in
  another workspace, the grid in each); which tab is "the open tab" of a tile in each workspace. The
  results go into the design, under Approach, in the same pull request as T2.
- [x] **T2. Design update from the probe.** (done 2026-11-22) Document only: the findings of T1 in `design.md`. If the
  probe contradicts the placement of Duplicate or the open-tab rule, stop and report instead of
  changing the behavior.
- [x] **T3. Shared item builders** (done in `e3c7348`) (alone, after 056 is merged). If the items of 056 are not already
  in `src/shared/`, move them there, with `BookmarkCopier`, so that `modules/favorites` can import
  them; no behavior change and no test renamed. Tests: the existing tests of 056 and of the folders
  module stay green. If 056 already put them in `shared`, this task is closed without a commit.
- [x] **T4. `TileLinkCommands`** (done in `e67ef0c`) (TDD, `tests/modules/favorites/TileLinkCommands.test.ts`). Failing
  tests first: `copies the saved link of a tile`, `duplicates a tile right after it`, `edits the pinned url of a tile`,
  `replaces the pinned url of a tile with the current one`. Then `src/modules/favorites/TileLinkCommands.ts`
  (AC-1 to AC-4) and the labels in `CommandLabels.ts` if 056 did not add them.
- [x] **T5. Menu and wiring** (done in `c2f553d` and `1dd0c25`) (TDD, `tests/modules/favorites/TileMenu.test.ts`). Failing tests first:
  `puts the link commands before Untile tab`, `leaves the menu as it was without link commands`. Then
  `TileMenu` takes the optional `links` and `GridDragging` builds and passes `TileLinkCommands`.
  Needs the signature of `TileLinkCommands.items` from T4; run in parallel with T4 against that
  signature, merge after both.
- [x] **T6. Check of the group order and the separators** (done inside the scenario of T7; a probe cannot seed a tile, because the guard blocks `chrome.bookmarks.create` and the lab profile has no Favorites folder). The check reads the menu of a tile and compares it with the spec, so the manual
  checklist (T9) covers it on a real profile.
- [x] **T7. Live scenario `opens a tile in split view`** (done in `56f1870`, pass on the lab Vivaldi), `tests/live/scenarios/opens-a-tile-in-split-view.live.ts`
  (TDD: the scenario fails before the code of T4 and T5 on a lab Vivaldi). In the same pull request,
  AC-5 of the spec changes from `manual` to `live: \`opens a tile in split view\``: the check
  `every live check has a scenario` fails a spec that names a scenario before it exists (as T6 of
  [055](../055-tile-web-panel/tasks.md)).
- [x] **T8. Docs and version** (done in `6b01595`: README, manual, minor bump to 0.66.0, release check green): README row to `Implemented` when everything is
  green, `docs/manual/tab-bar.md` with the five items of the tile menu, `package.json`,
  `package-lock.json` and `installer/vivarcdi/__init__.py` with a minor bump, checked with
  `npm run release -- check --base origin/main --branch features/tile-menu`.
- [x] **T9. Manual checklist for Tore** (written in `~/Desktop/sonde-vivarci/057-tile-menu/verifica-057.md`, green 2026-11-22; the spec is `Implemented`), in Italian, under `~/Desktop/sonde-vivarci/057-tile-menu/`,
  from AC-6 (and AC-5 until its scenario exists): right click on a tile on macOS and Debian; Copy
  Link and paste; Duplicate and check the copy right after the tile and in every workspace; `Edit…`
  with a valid and an invalid address; `Replace Pinned URL with Current`; Open in Split View with a tab
  selected and with none; check the name and icon stay and that there is no `Move to`. When Tore reports it green, the
  spec becomes `Implemented`.
