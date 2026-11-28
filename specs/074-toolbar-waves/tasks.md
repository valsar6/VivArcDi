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
  `tests/core/prefs.ts` `FakePrefsApi.set(key, value)` is adapted to `set({ path, value })` so that
  `canSet` stays honest. Green: `writes a preference through the api`. Existing tests keep their names.
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
- [ ] **T7. Sidebar look.** The guards in `src/styles/sidebar-look.scss`: `:not(body[data-vivarcdi-wave] *)` at the end of the two
  rules, inside the look block, so every selector still starts with `#browser[data-vivarcdi-look]`. Green:
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
- [ ] **T11. Address field scenario (red).** Added after Tore found on his real profile that every
  wave removed the address bar. `tests/live/scenarios/a-wave-keeps-the-address-field-of-the-tab-bar.live.ts`,
  `spec: '074'`, named `a wave keeps the address field of the tab bar`: write lists with `AddressField`
  and `Extensions` before and `UpdateButton` after, choose each wave through the service, assert
  `AddressField` stays visible and in the lists, then choose Still water and assert the lists are back.
  Red until T14. Runs in parallel with T12.
- [ ] **T12. Composition tests (red).** `tests/modules/toolbarwaves/ListComposer.test.ts`
  (`keeps the buttons the wave does not manage`, `keeps the address field when it is in the user lists`)
  and cases in `WaveController.test.ts` (`refuses a pair without the address field`) and
  `WaveStrategies.test.ts` (`recognizes a wave among core buttons`), named exactly as the `auto:`
  checks of AC-28 to AC-31. Runs in parallel with T11.
- [ ] **T13. Composer and layout matching.** `LAYOUT_BUTTONS` in `ToolbarButtons.ts`, `ListComposer.ts`,
  and `WaveStrategy.matches` comparing only the layout buttons. Green: `keeps the buttons the wave does
  not manage`, `keeps the address field when it is in the user lists`, `recognizes a wave among core
  buttons`. Needs T12.
- [ ] **T14. Controller composes.** `WaveController.choose` composes through `ListComposer`, refuses a
  pair without the address field with the readable message, and `needsConfirmation` compares layout
  only. Green: `refuses a pair without the address field`, and the earlier controller tests keep their
  names. Needs T13 and T6. Turns T11 green with T8's run.
- [ ] **T15. Run and recheck.** With Tore's agreement, `npm run live -- 074`: the six scenarios pass;
  then Tore tries a wave on his real profile and the address bar must stay. The lab does not show how
  Vivaldi lays out `AddressField` beside a wave's group; the scenario records it for the design.
- [ ] **T16. Navigation scenario (red).** `tests/live/scenarios/a-wave-shows-back-forward-and-reload-above-the-address-field.live.ts`,
  `spec: '074'`, named `a wave shows back forward and reload above the address field`: write lists with
  `AddressField`, choose each preset wave through the service, assert the written lists carry `Back`,
  `Forward`, `Reload` directly before `AddressField`, and record whether and where Vivaldi draws them.
  Red until T18. Runs in parallel with T17.
- [ ] **T17. Navigation tests (red).** Cases in `ListComposer.test.ts`
  (`adds back forward and reload before the address field`, `does not duplicate the navigation buttons`,
  `adds nothing when the address bar is not in the tab bar`) and the Still water case in
  `WaveController.test.ts`, named exactly as the `auto:` checks of AC-33 to AC-35. Runs in parallel
  with T16.
- [ ] **T18. Composer inserts them.** `NAVIGATION_BUTTONS` in `ToolbarButtons.ts` and the insert step
  of `ListComposer.compose`; they stay outside `LAYOUT_BUTTONS`. Green: the three tests of T17. Needs
  T13 and T17.
- [ ] **T19. Run and recheck.** With Tore's agreement, `npm run live -- 074`: the seven scenarios run;
  the AC-36 scenario asserts the measured result (one group above the address row, a click on Back and Forward works);
  then Tore checks a wave on his real profile: address bar, Back, Forward and Reload present. Needs T14
  and T18.
