# 045 Live verification: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes.

- [ ] **T1.** `lab.py prepare` and `LabVivaldi`: find the installation, copy it once per version,
  deploy and patch the copy, refuse targets inside a real installation; `tests/live/test_lab.py`
  and `make test-py` discovering it. Satisfies AC-4. Done when `test_harness_patches_only_the_lab_copy`
  passes.
- [ ] **T2.** Read the tab bar position key from Tore's profile with a read-only probe, then write
  `ProfileDirectory` and `tests/live/profile/Preferences.json`. Satisfies AC-2. Done when
  `harness refuses a directory that holds a profile` passes.
- [ ] **T3.** `VivaldiProcess` and `Cleanup`, with `FakeSpawner`. Satisfies AC-1, AC-3. Done when
  `harness starts Vivaldi on a temporary profile and a local port` and
  `harness cleans up after a failed run` pass.
- [ ] **T4.** `CdpConnection`, `WindowTarget`, `ConsoleLog` and `Driver`, with `FakeCdp`. Done when
  their unit tests pass against the fake.
- [ ] **T5.** `BootCheck`, `SelectorCheck`, `SelectorStates` and `tests/live/selector-states.json`.
  Satisfies AC-5, AC-6. Done when `selector check reports every selector of the version` and
  `selector check matches versions like the catalog` pass.
- [ ] **T6.** `Report`, `LiveRun` and `cli.ts`; `npm run live` and `make live`. Satisfies AC-7, AC-8.
  Done when `harness saves a screenshot and fails on a failed check` and
  `report lists versions, results and console lines` pass.
- [ ] **T7.** `ProbeGuard` and `ProbeRunner`, `--probe`. Satisfies AC-9. Done when
  `probe with a write call is rejected` passes.
- [ ] **T8.** `ScenarioCatalog`, the scenario `space header shows each workspace name` and the test
  `every live check has a scenario`. Done when the unit tests pass and a local run lists the scenario.
- [ ] **T9.** The `live` check kind in `specs/README.md`, `CONTRIBUTING.md`, `AGENTS.md`,
  `docs/architecture.md` and the `vivarcdi-verifica-vivaldi` skill; 000/AC-17 and 011/AC-13 marked
  `live` after the first green run. Satisfies FR-10.
- [ ] **T10.** Write the manual verification checklist for Tore from AC-10, AC-11 and AC-12.
