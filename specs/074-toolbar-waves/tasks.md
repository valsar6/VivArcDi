# 074 Toolbar waves: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/toolbar-waves`, with a minor version change (NFR-5). Tore asked for test-first work:
every task starts with its failing tests or scenarios and ends green on its own tests. T1 and T2 are
the red state of the whole spec.

Order and parallel work: T1 and T2 touch different files and run in parallel, each in its own
`vivarcdi-implementer` worktree from the same base commit. T3, T4 and T5 can run in parallel after
T2 (own worktrees, same base commit); T6 needs T3 and T4; T7 needs T5; T8 needs T3 to T6. T9 runs
alone. The spec 075 page needs T6; spec 076 needs T5 (the marker) and T8.

- [ ] **T1. Live scenarios (red).** Write all five scenarios of 074 in `tests/live/scenarios/`,
  named exactly as the criteria, each default-exporting a `Scenario` with `spec: '074'`:
  `the ripple wave puts the buttons above the strip`,
  `the swell wave splits the buttons around the strip`,
  `the breaking wave puts every button below the strip`,
  `a written toolbar list shows without a reload`, `still water restores the toolbar`. AC-15 to
  AC-17 choose the wave through `globalThis[Symbol.for('vivarcdi.waves')].choose(id)` (only `choose` sets
  the marker; a raw write never adopts a wave) and check the marker and the visible buttons and rows against the
  group (the structure of Measured), AC-18 checks the DOM, `onChanged` and `[]` on read-back, AC-19
  chooses Still water through `globalThis[Symbol.for('vivarcdi.waves')]`. They may fail on
  `npm run live` until the code exists; that is the red state, and they are run only with Tore's
  agreement. They also make `tests/live/LiveChecks.test.ts` pass: it fails today in CI with
  `every live check has a scenario` because the spec lists live checks that have no scenario.
- [ ] **T2. Unit tests (red).** Write the tests of the Tests table in `tests/core/browser/` and
  `tests/modules/toolbarwaves/`, with `fakes.ts`, named exactly as the `auto:` checks of AC-1 to
  AC-14 and AC-22 to AC-27 (including the strategies, the factory and the fake strategy). They fail to compile or run until the code exists. Done: each test names a
  criterion and the file list matches the design.
- [ ] **T3. Waves and icons.** `ToolbarButtons.ts` (ids and Vivaldi's defaults), `WaveStrategy.ts`
  (with `ToolbarLists`, `WaveContext`, `PreviewShape` as `{ before, after }`), `StillWaterWave.ts`,
  `RippleWave.ts`, `SwellWave.ts`, `BreakingWave.ts`, `WaveFactory.ts`, `WaveDataMapper.ts` (`WaveData`)
  and `WaveIcons.ts`, with the four previews of the design. Green:
  `draws the four wave icons with currentColor`, `serves the waves with a JSON-safe preview`,
  `each wave gives the lists of its table`, `builds the four waves in order`.
- [ ] **T4. Preference writer.** `BrowserPrefs.set` and `canSet`, `PrefsApi.set`, the class JSDoc.
  Green: `writes a preference and resolves`. Existing tests keep their names.
- [ ] **T5. Marker and store.** `WaveMarker.ts`, `WaveStore.ts` with its versioned format. Green:
  `marks the body with the chosen wave`.
- [ ] **T6. Controller and module.** `WaveController.ts`, `ToolbarWaves.ts`, options, the published
  service, `src/modules/index.ts`, `src/config.json`, the four selectors
  (`toolbarBefore`, `toolbarAfter`, `nestedButtons`, `trashButton`) in `src/selectors/8.1.json`,
  the `toolbar-trash` state in `scripts/live/checks/SelectorStates.ts` and the entry
  `trashButton` in `tests/live/selector-states.json`; the lab proves the `trashButton` selector. Green: `shows the wave the lists already equal`,
  `writes the lists of the chosen wave`, `stores the user's lists before the first write`,
  `keeps the first backup when waves change`, `still water writes the stored lists`,
  `still water writes the defaults without a backup`, `drops the choice after a manual edit`,
  `asks before replacing custom lists`, `does not start without writable toolbar lists`,
  `stays out of private windows`, `exposes the four waves and a service to choose one`,
  `reports a failed choice with a readable message`, `chooses a wave it has no special case for`. Blocks 075.
- [ ] **T7. Sidebar look.** The guards in `src/styles/sidebar-look.scss`. Green:
  `lets an active wave keep the new-tab button, spacers and nested row`; the existing style tests
  keep their names.
- [ ] **T7b. Tore looks.** Tore checks the CSS himself in this prototype phase: with a wave chosen
  and with none, the "+ New Tab" row, the `NewTab` button, the spacers and the nested row. His
  remarks go back into T7 before the next task.
- [ ] **T8. Run the scenarios.** With Tore's agreement, `npm run live -- 074` on a lab profile: the
  five scenarios turn green, or the spec returns to Q-5 (AC-18). Add the 028 revision note: a
  "Refined by" line and a note under FR-6 about the row and the button. Blocks 076.
- [ ] **T9. Docs, version, check.** Lead only. `docs/architecture.md`: the module and the service
  key; the README row to `Implemented` after T10. Read `package.json` and
  `installer/vivarcdi/__init__.py` on `origin/main` right before, bump the minor version in both and
  in `package-lock.json`, run `npm run release -- check --base origin/main --branch features/toolbar-waves`
  and `make check`.
- [ ] **T10. Manual check.** Italian checklist for AC-20 and AC-21 under
  `~/Desktop/sonde-vivarci/074-toolbar-waves/`: su macOS e Debian, vedere le quattro icone nei temi
  chiaro e scuro e verificare che siano leggibili e distinguibili; scegliere ogni onda, riavviare
  Vivaldi sul proprio profilo e controllare che le liste e l'onda scelta siano rimaste. When Tore
  reports it green, the spec becomes `Implemented`.
