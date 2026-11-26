# 058 Pinned tabs on Vivaldi 8.3: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `test/058-vivaldi-83`, or `fix/058-vivaldi-83` with a patch bump if a task changes `src/`
(see the design). Each task writes its test first with the verbatim `auto:` name, makes it pass and
runs `make check`. T1, T2 and T3 own separate files and can run in parallel from the same base
commit.

## Order

```
T1 ──┐
T2 ──┼──> T4 (lead: live run, spec, branch and version) ──> T5 (Tore: manual)
T3 ──┘
```

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `tests/loader/SelectorCatalog.test.ts`, `tests/loader/fakes.ts` |
| T2 | `tests/modules/pinned/PinnedTabs.test.ts`, `tests/modules/pinned/fakes.ts`, `tests/modules/pinned/Marking.test.ts`, and `src/modules/pinned/` only if a test fails |
| T3 | `tests/live/scenarios/the-separator-and-the-minus-work-on-the-pinned-group.live.ts` |
| T4 | `specs/058-pinned-tabs-83/spec.md`, `specs/058-pinned-tabs-83/tasks.md`, `specs/README.md`, and the version files if T2 changed `src/` |
| T5 | Nothing in the repository; the checklist comes from AC-6 |

## Tasks

- [x] **T1. The 8.1 catalog serves 8.3** (AC-3). Add `DiskLoader` to `tests/loader/fakes.ts`,
  reading payload files from `src/` with `node:fs/promises`. Add
  `defines on Vivaldi 8.3 every selector of the 8.1 catalog` to
  `tests/loader/SelectorCatalog.test.ts`: load the catalog for `8.3.4191.47`, assert no key of
  `src/selectors/8.1.json` is missing, and assert `standsInFor('8.3.4191.47')` while the index lists
  no `8.3`. Done when `make check` is green.
- [x] **T2. The pinned rows in both layouts** (AC-4, AC-7). In `tests/modules/pinned/fakes.ts` let
  `MinusDocument` put a row inside a `group` node. Add
  `unloads a pinned tab from its minus in a group beside the tab strip` to `PinnedTabs.test.ts` with
  the assertions of `unloads a pinned tab from its minus`, and
  `marks the separator after the last pinned row inside the tab strip` to `Marking.test.ts` with the
  `favorites/fakes.ts` catalog, two pinned rows, one normal tab and no group. If a test fails, fix
  `src/modules/pinned/` and report it, so T4 picks the `fix/` branch. Done when `make check` is
  green.
- [x] **T3. The live scenario** (AC-5). Add the scenario of the design with `name`
  `the separator and the minus work on the pinned group` and `spec` `058`: read `maxTiles` from
  `src/config.json`, pin `maxTiles + 1` tabs, browse the last one away, assert the separator on the
  last row of `pinnedGroup`, click its minus, wait for `discarded`, activate it and wait for its
  pinned page, and remove every tab in `finally`. Do not run `npm run live`. Done when `make check`
  is green.
- [x] **T4. Live run, spec and version** (lead; after T1 to T3). With Tore's agreement, run
  `npm run live` on the lab Vivaldi 8.3; record the scenario result and that the selector check
  reports no failed selector. Change AC-5 of the spec to
  `live: the separator and the minus work on the pinned group`, tick T1 to T4, and name the branch
  and version as the design says. Done when `make check` is green and the live run passes.
- [ ] **T5. Tore's manual check** (last). On Vivaldi 8.3, macOS and Debian, with the Favorites grid
  on and then off: pin a tab, browse away and unload it from its minus; confirm the row keeps its
  favicon, the separator sits below the last pinned row, and the dimmed row looks as a pinned row of
  059. Record the result in the checklist built from AC-6, then set the spec to `Implemented`.
