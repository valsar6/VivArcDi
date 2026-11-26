# 060 Clear bar and pinned tile unload: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/clear-bar-tile-minus` for the code, with a minor version change per CONTRIBUTING:
the version is read from `origin/main` right before T5, today 0.68.1 to 0.69.0, in `package.json`,
`package-lock.json` and `installer/vivarcdi/__init__.py`. Each task follows TDD: first the failing
tests with the verbatim `auto:` names of the criteria, then the code, then `make check`. One commit
per task, each in its own worktree from the same base commit; the lead cherry-picks them into the
feature branch.

## Order and parallelism

```
T1 (probe, lead) ─> T2 (Clear row) ─┬─> T4 (live scenario + AC-6) ─┐
                                     │                              ├─> T5 (lead: docs and version) ─> T6 (Tore: manual)
T3 (tile minus) ─────────────────────┴──────────────────────────────┘
```

- **T1** runs first, only after Tore agrees, on the lab. It is read-only and writes the findings in
  design.md; T2 starts from them.
- **T3** starts in parallel with T1 from the same base commit and touches different files. It can
  still be open when T2 and T4 run.
- **T2** runs after T1 and alone on its files. **T4** runs after T2 and can run while T3 is open.
- **T5** (the lead) runs after T2, T3 and T4. **T6** comes last and is Tore's.
- If Tore answers an open decision of the design against its choice, adjust T2's line predicate or
  placement, or T3's ownership, before starting the task; no other task moves.

## Files each task owns

A task edits only its files.

| Task | Owns |
|---|---|
| T1 | `specs/060-clear-bar-and-pinned-unload/design.md` (the probe findings) |
| T2 | `src/modules/today/ClearSeparator.ts` (new), `src/modules/today/ClearButton.ts` (deleted), `src/modules/today/TodayArchive.ts`, `src/shared/tabs/TabBarMarks.ts`, `src/shared/tabs/StripGapCloser.ts`, `src/styles/today.scss`, `tests/modules/today/ClearSeparator.test.ts` (new), `tests/modules/today/TodayParts.test.ts`, `tests/shared/tabs/StripGapCloser.test.ts`, `tests/styles/Today.test.ts` |
| T3 | `src/modules/favorites/PinnedTileMinus.ts` (new), `src/modules/favorites/PinnedFavorites.ts`, `src/styles/favorites.scss`, `src/styles/_tokens.scss`, `tests/modules/favorites/PinnedTileMinus.test.ts` (new), `tests/modules/favorites/PinnedFavorites.test.ts`, `tests/styles/Favorites.test.ts` (new) |
| T4 | `tests/live/scenarios/the-clear-bar-keeps-a-box-above-today.live.ts` (new), `specs/060-clear-bar-and-pinned-unload/spec.md` (AC-6 and its note) |
| T5 | `specs/058-pinned-tabs-83/spec.md`, `README.md`, `docs/manual/tab-bar.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` |
| T6 | Nothing in the repository; the checklist is `~/Desktop/sonde-vivarcdi/verifica-060.md` |

## Tasks

- [x] **T1. Probe the tab strip layout** (read-only; `npm run live -- --probe <file>`, only after Tore
  agrees; the throwaway profile is lost afterwards). Record in design.md "Placement" and its
  follow-up, with the version and the date:
  - the computed `position`, `overflow` and box of `#tabs-container .tab-strip`;
  - the first Today slot's box, its inner `.tab-position` box, and the inline `--PositionX`,
    `--PositionY`, `--Height` with the Favorites grid on and with it off;
  - the native `div.separator`'s box and computed `display` in both cases, and the box of
    `[data-vivarcdi-pinned-last]` with a visible pinned row;
  - where a zero-height test child appended to the strip, with `position: absolute; top: 0` and the
    row's `--PositionY`/`--vivarcdi-gap-shift` transform, lands: inside the strip, above its top, or
    clipped;
  - the box of `[data-vivarcdi-clear]` today.
  The findings choose between the strip and the anchor host (order 35) for the no-pinned-row case.
  Done when the findings are in the design and the lead agrees. Satisfies the placement questions of
  the design, not a criterion. Closed without the probe on 2026-11-24: the probe agent looped on the
  lab and was stopped; the design's primary strip placement was implemented instead, covered by the
  unit tests, the live scenario of AC-6 and Tore's checklist.
- [x] **T2. The owned separator row and Clear** (TDD; after T1; alone on its files). Failing tests
  first, in `tests/modules/today/ClearSeparator.test.ts`:
  `keeps the Clear control out of the hidden pinned group` (AC-3),
  `puts the Clear control above the Today tabs and takes its clicks` (AC-4),
  `draws its line only when no pinned row shows it` (renamed by 067 to
  `draws its line whether or not a pinned row shows it`), and
  `warns once when the tab strip is missing`; in `tests/shared/tabs/StripGapCloser.test.ts`:
  `ignores the row that is not a slot`; in `tests/styles/Today.test.ts`, rewrite the existing test as
  `draws the Clear bar on the separator above the Today tabs` (AC-5). Then add `ClearSeparator` with
  the placement the T1 findings chose, the zero flow height, the line attribute, the watcher, the
  three capture listeners and the `stop` that removes everything; add `OWN_ROW_ATTRIBUTE` to
  `TabBarMarks.ts` and filter it out of the closer's `slots`; delete `ClearButton.ts` and its test
  from `tests/modules/today/TodayParts.test.ts`; build `ClearSeparator` in `TodayArchive` with the
  selectors and the logger; move the Clear rules in `today.scss` from the button to the row, drop the
  button's own `border-top`, and draw the line with the row's pseudo-element. Satisfies AC-3, AC-4,
  AC-5, FR-1, FR-3, NFR-3, NFR-4 and keeps AC-1, AC-2 and 050's tests green. Done when `make check`
  is green.
- [x] **T3. The minus on a pinned tile** (TDD; runs in parallel with T1 and, after it, T2 and T4).
  Failing tests first, in `tests/modules/favorites/PinnedFavorites.test.ts`:
  `shows a minus on the tile of a pinned tab` (AC-7),
  `unloads a pinned tab from its tile minus` (AC-8) and
  `puts the minus back after the tiles are drawn again`; in
  `tests/modules/favorites/PinnedTileMinus.test.ts`: `keeps the minus off a Favorite tile` (AC-10);
  in `tests/styles/Favorites.test.ts`: `draws the tile minus only on hover and on the current tile`.
  Then add `PinnedTileMinus` with the pressed-event swallowing, the tile id read and the unload
  callback; build it in `PinnedFavorites`, start it before the first read, call `sync` at the end of
  `#show` and stop it before `view.destroy()`; add `$tile-minus` and the scoped rules in
  `favorites.scss`, reusing `$minus-glyph`, `$minus-size` and `$minus-offset`. Keep
  `loads the own page of an unloaded pinned tile` (AC-9) and the middle click green. Satisfies AC-7,
  AC-8, AC-10, FR-4, FR-5, FR-7 and keeps AC-9. Done when `make check` is green.
- [x] **T4. The live scenario of AC-6** (after T2; can run while T3 is open). Add
  `tests/live/scenarios/the-clear-bar-keeps-a-box-above-today.live.ts` with the name
  `the Clear bar keeps a box above Today with the Favorites grid on` and `spec: '060'`. It opens one
  pinned tab and one Today tab with the default Favorites grid, waits for the pinned tile and for the
  native pinned slot to be hidden, and fails when `[data-vivarcdi-clear]` has a zero box, starts
  below the first visible Today slot, or is clipped (`document.elementFromPoint` at its center does
  not reach the control or its row). In the same commit, change AC-6 in the spec from the manual note
  to ``live: `the Clear bar keeps a box above Today with the Favorites grid on` `` and replace the note
  under the table with a sentence saying AC-6 is a live check of [046]. The pair must land together:
  `tests/live/LiveChecks.test.ts` fails when a `live:` name has no scenario or a scenario names no
  criterion. Satisfies AC-6 and NFR-1. Done when `npm test` is green and, after Tore agrees,
  `npm run live -- --only 060` passes on the lab Vivaldi 8.3.4191.47.
- [x] **T5. Docs and version** (the lead, after T2, T3 and T4). `specs/058-pinned-tabs-83/spec.md`:
  change the one sentence on the pinned rows with the grid on, exactly as design.md
  "The 058 amendment" says, and add `060` to the footer row of the header; keep its status. `README.md`
  and `docs/manual/tab-bar.md`: the pinned minus is on the row or on a pinned tile, and Clear sits on
  the line above the Today tabs. Read the version on `origin/main`, bump it as the branch type
  requires (minor: 0.69.0 today) in `package.json`, `package-lock.json` and
  `installer/vivarcdi/__init__.py`, then run
  `npm run release -- check --base origin/main --branch features/clear-bar-tile-minus` and
  `make check`. Leave the spec `Approved` until T6 is green. Done when both checks pass.
- [x] **T6. Manual checklist in Italian** (last; written from AC-12, AC-13 and AC-14, in
  `~/Desktop/sonde-vivarcdi/verifica-060.md`, Italian). On macOS and Debian, on Vivaldi 8.3:
  - AC-12: with the Favorites grid on, rest the pointer on the line above the Today tabs; Clear
    appears as in 004, and a click archives the Today tabs while pinned and Favorite tabs stay open.
  - AC-13: hover the tile of a pinned tab; the minus looks and sits as on a pinned row, a click
    unloads the tab, a click on the dimmed tile loads the pinned page, and a Favorite tile shows no
    minus.
  - AC-14: turn the Favorites grid off; Clear stays above the Today tabs and the row minus unloads as
    before.
  Record the version and the result of each. When Tore reports it green, the lead sets
  `specs/060-clear-bar-and-pinned-unload/spec.md` and its row in `specs/README.md` to `Implemented`.
  If an 8.1 or 8.2 build is installed, note the separator and the row minus there too, because the
  design infers them from the 8.1 catalog.
