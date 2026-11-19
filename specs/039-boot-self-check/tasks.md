# 039 Boot self-check: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/boot-self-check`, with a patch version change from 0.59.4 to 0.59.5 in `package.json`,
`package-lock.json` and `installer/vivarcdi/__init__.py` (NFR-5). Each task ends green on
`make check`, and every existing test keeps its name and passes (NFR-4). No task adds a DOM query, a
timer, a wait or a storage key (NFR-2, NFR-3), and none changes the active line (FR-3).

Order and parallel work, for `vivarcdi-implementer` agents (one base commit and one task each):

- **T1, T2, T3 and T4 run in parallel** from the base commit of the branch. Their files do not
  overlap: T1 touches `src/core/boot/VivArcDi.ts` and the new `ModuleStarter.ts`; T2
  `src/core/dom/SelectorCatalog.ts` and its test; T3 `src/core/boot/ModuleRegistry.ts` and its test;
  T4 only the new `src/core/boot/BootReport.ts` and its new test. T4 needs neither T2 nor T3: it
  declares `CatalogFacts` and takes the skipped counts as two numbers.
- **T5 runs alone** once T1 to T4 are merged: it wires all four into `VivArcDi.ts` and
  `ModuleStarter.ts`, and moves the boot fixture out of `tests/loader/VivArcDi.test.ts`.
- **T6 runs alone** once T5 is merged: it changes `VivArcDi.ts`, `tests/loader/boot.ts` and
  `tests/loader/BootSelfCheck.test.ts`, all three written by T5.
- **T7** (docs and version) is done by the lead, touches no source or test file, and may run in
  parallel with any task.
- **T8** comes last.

- [x] **T1. Module starter.** `src/core/boot/ModuleStarter.ts` (new): `ModuleServices` and
  `ModuleStarter` with `start(entry, start): Promise<boolean>`, the body of today's
  `VivArcDi.#startModule` moved without a change in behavior or log text. `VivArcDi.ts` builds one
  starter in its constructor (`windows` and `search` defaulted there, `payload: loader`), drops
  `#startModule` and the seven service fields it no longer needs, and pushes an entry to `#started`
  when `start` returns `true`. `VivArcDiDependencies` is unchanged. No new test: every test in
  `tests/loader/` and `tests/modules/` keeps passing unchanged. `VivArcDi.ts` drops to about 165
  counted lines. No AC; it makes room for T5 and T6.
- [x] **T2. Catalog facts.** `src/core/dom/SelectorCatalog.ts`: the private `#undefined` set filled by
  `get` before it throws, the `undefinedNames` getter, `standsInFor(vivaldiVersion)`. Tests in
  `tests/loader/SelectorCatalog.test.ts`: `get records the names it does not define` (two `get` of
  the same name and one `has` give one name) and `standsInFor tells an older catalog from a matching
  one` (8.1 for 8.3.x and for `unknown` is true; 8.1 for 8.1.x and an empty catalog are false).
  Prepares FR-7, FR-8.
- [x] **T3. Skipped modules.** `src/core/boot/ModuleRegistry.ts`: `SkippedModules`, `createEnabled`
  returns `skipped` with the `config` and `window` counts; `modules` and `unknown` unchanged. Test in
  `tests/loader/ModuleRegistry.test.ts`: `createEnabled counts the modules it leaves out` (one off,
  one with `enabled: "yes"`, one private-only in a normal window, one unknown and disabled: `config`
  2, `window` 1). Prepares FR-5.
- [x] **T4. Boot report.** `src/core/boot/BootReport.ts` (new): `BootStage`, `BootOutcome`,
  `ModuleOutcome`, `CatalogFacts`, `BOOT_NOTICE_KEY`, `MARKING_MODULE`, `SEVERE_FAILURES`,
  `bootNoticeText`, and `BootReport` with `enter`, `useBuild`, `useCatalog` (the stand-in line),
  `skip`, `record`, `summarize` (selector warnings, then the summary line at its level) and
  `notify`. Tests in `tests/core/boot/BootReport.test.ts` (new), over a `Logger` on `SilentSink`, a
  plain `CatalogFacts` object and a `RecordingToast` behind `Notices`:
  `summary line has the same fields for every result` (active, inactive, failed at each stage, with
  `unknown` and `none`), `summary level follows the problems` (the table of the design),
  `boot notice needs two failures and the activation mark`. Nothing uses it yet. Prepares FR-1,
  FR-2, FR-4, FR-7 to FR-10.
- [ ] **T5. Summary at every start.** `VivArcDi.start` creates the report, runs `#run(report)` with the
  stage calls of the design, catches and logs `Startup failed` itself, and calls `summarize` once;
  `boot` loses its `try`/`catch`. `ModuleStarter.start` returns `ModuleOutcome` and logs
  `stays off: invalid options` at `warn`; `VivArcDi` records every outcome. Tests: the boot fixture
  moves to `tests/loader/boot.ts` with the `missing` and `browser` options and the `Asker` module;
  `tests/loader/VivArcDi.test.ts` only imports it, and `module without a required option stays off with a warning` changes its body to expect two warnings. Satisfies AC-1 to AC-9 in
  `tests/loader/BootSelfCheck.test.ts` (new): `summarizes a clean start in one line`,
  `keeps the active line as it is`, `names failed modules in the summary`,
  `counts the modules that stay off`, `says when invalid options keep a module off`,
  `lists selectors the catalog does not define`, `says which catalog stands in for a newer Vivaldi`,
  `summarizes an inactive start without a toast`, `names the stage where startup failed`. FR-1 to
  FR-8, FR-11.
- [ ] **T6. Boot notice.** `VivArcDi.start` ends with `report.notify(outcome, this.#notices)`. Fixture:
  the `marker` option of `createApp`, the `AlsoBroken` and `BrokenMarker` modules in
  `tests/loader/boot.ts`. Satisfies AC-10 to AC-13 in `tests/loader/BootSelfCheck.test.ts`:
  `shows the boot notice when two modules fail`, `keeps a single failure in the console`,
  `shows no boot notice without the activation mark`, `shows no boot notice after a clean start`.
  FR-9, FR-10.
- [x] **T7. Docs and version.** `docs/architecture.md`, boot list: a seventh step "logs a self-check
  summary on `VivArcDi:boot` and, when two or more modules failed and `activation-marker` started,
  shows one notice (spec 039)"; the paragraph after the list adds that the summary is `info`, `warn`
  or `error`, lists the failed ids and the counts of modules off, and that undefined selectors and a
  stand-in catalog get their own lines. `docs/manual/getting-started.md:46`: after the active line,
  look for `[VivArcDi:boot] self-check: active, …` and send it with any bug report. `specs/README.md`:
  no change until the spec is `Implemented`. Patch version bump to 0.59.5, checked with
  `npm run release -- check --base origin/main --branch fix/boot-self-check`.
- [ ] **T8. Manual check.** Italian checklist for AC-14 under
  `~/Desktop/sonde-vivarci/039-boot-self-check/`, on macOS and Debian with 0.59.5 installed and Vivaldi
  restarted, shipped `config.json`. Open `vivaldi://inspect/#apps`, *inspect* under `vivaldi`, and
  check, for a normal window: the active line; on Vivaldi 8.3, the `info` line
  `Vivaldi 8.3 has no selector catalog of its own: using 8.1`; then the summary at `info`
  `self-check: active, 14 of 14 modules started, 0 failed (…); off: 0 in config, 1 for this window,
  0 by options; undefined selectors: 0`; no VivArcDi toast in the window. Repeat in a private window
  (fewer modules tried, the rest counted `for this window`, still `info`, no toast). When Tore reports
  it green, the spec becomes `Implemented`.
