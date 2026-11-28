# 076 Compact Breaking wave: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/compact-breaking-wave`, minor bump, after 074. **Every task is blocked by 074**:
the scenarios need the Breaking wave lists and `data-vivarcdi-wave` of 074 FR-13 on `main`. Tests come
first: nothing is styled before its scenario or test exists and is red. In this prototype phase Tore
checks the CSS himself after each attempt; a passing scenario does not replace his look.

All tasks run one after the other; none is parallel, because each judges the previous one.

- [ ] **T1. Live scenarios, red.** Write the nine files under `tests/live/scenarios/`, each with
  `spec: '076'` and its name exactly as in the criteria, so that `tests/live/LiveChecks.test.ts`
  (`every live check has a scenario`) passes in CI. Names: `the compact breaking wave puts three
  buttons on one row`, `the compact breaking wave row has the height of an icon button`, `the compact
  new-tab button opens a tab`, `the compact workspace button opens its popup in place`, `the compact
  trash button opens its list`, `the compact buttons keep their labels`, `the compact breaking wave
  row survives a resize`, `the compact form switches off with the breaking wave`, `the compact
  breaking wave fits the narrow tab bar`. A shared `tests/live/scenarios/compactBar.ts` sets the lists and the
  attribute and reads the buttons. Read the trash button selector from the lab and add `afterToolbar`,
  `nestedButtons`, `trashButton` to `src/selectors/8.1.json`. Done when the live check test passes in CI
  and `npm run live -- 076` runs the nine scenarios red (Tore agrees to the run first).
- [ ] **T2. Unit tests, red.** `tests/styles/CompactBreakingWave.test.ts` with `compact rules apply
  only under the breaking wave attribute`, `without the breaking wave attribute the bottom bar is
  unchanged`, `compact breaking wave uses tokens`; and `compact breaking wave never writes
  preferences` next to it. Done when they fail only because the stylesheet and the tokens do not
  exist.
- [ ] **T3. Tokens and attempt 1.** Tokens in `_tokens.scss`, `compact-breaking-wave.scss` with the
  `display: contents` rules, `config.json` entry. Done when T2 passes and the scenarios of AC-5 and AC-6
  pass or fail with a reading.
- [ ] **T4. Tore looks (attempt 1).** Tore opens the lab and the real window with the Breaking wave and
  decides: keep, adjust, or go to attempt 2. Done when his answer is in the pull request.
- [ ] **T5. Attempt 2, only if attempt 1 fails the live scenarios.** The grid rules replace those of
  T3. Done when the nine scenarios pass or the reading says why not; Tore looks again.
- [ ] **T6. Attempt 3, only if attempt 2 fails.** First a design amendment for the helper and Tore's
  approval, then `BreakingWaveRow` with `KeptElement`, `TabBarAnchor` and one frame task, test-first.
  Done when the nine scenarios pass, including the way back of AC-12.
- [ ] **T7. Settle the narrow bar.** From the readings of AC-11 and AC-13 record the break point in
  `design.md`; if AC-13 cannot pass at 42 px, Tore amends the criterion. Done when the scenario and the
  criterion read the same.
- [ ] **T8. Manual checklist and release.** Italian checklist `compact-breaking-wave/verifica-cavallone-compatto.md`
  from AC-14: la riga in basso ha tre icone chiare, cestino a sinistra, spazio di lavoro al centro,
  "+" a destra, nei temi chiaro e scuro, su macOS e Debian. Read `package.json` and
  `installer/vivarcdi/__init__.py` versions on `main` right before, bump the minor in `package.json`,
  `package-lock.json` and `__init__.py` (owned by the lead), update the README row, `make check`. Done
  when `make check` is green.
