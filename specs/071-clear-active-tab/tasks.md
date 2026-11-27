# 071 Clear archives the active tab too: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/071-clear-active-tab`, with a patch version change per CONTRIBUTING: read the version on
`origin/main` right before T4 and bump `package.json`, `package-lock.json` and
`installer/vivarcdi/__init__.py`. TDD: T1 adds the failing tests with the verbatim names and is
committed red; T2 makes them pass; T3 adds the live scenarios. All run one after the other in the
same area (`modules/today`), so none runs in parallel with another.

`npm run live -- --only 071` runs a lab Vivaldi: run it only on a machine with Vivaldi and a
desktop session, and only with Tore's agreement.

## Order

```
T1 (red tests) ──> T2 (fix) ──> T3 (live) ──> T4 (lead: docs and version) ──> T5 (Tore: manual)
```

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `tests/modules/today/ArchiveSweeper.test.ts`, `TodayArchive.test.ts`, `TodayTabPolicy.test.ts`, the `WorkspaceTabs` test under `tests/core/` |
| T2 | `src/modules/today/TodayTabPolicy.ts`, `ArchiveSweeper.ts`, `TodayArchive.ts`, `src/core/workspaces/WorkspaceTabs.ts` |
| T3 | `tests/live/scenarios/the-clear-shortcut-archives-the-active-today-tab.live.ts` (renamed from `the-clear-shortcut-archives-the-today-tabs.live.ts`), `clear-leaves-a-blank-tab-when-nothing-else-is-open.live.ts` |
| T4 | `specs/071-clear-active-tab/` (status), `specs/README.md`, `docs/manual/today-and-keyboard.md`, `docs/manual/tab-bar.md`, `README.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` |
| T5 | Nothing in the repository; the checklist comes from AC-9 |

## Tasks

- [ ] **T1. Red tests** (alone). Replace `clear archives every Today tab of the workspace except the
  active one` with the six `auto:` tests of AC-1 to AC-6, add the extra tests, and adjust the
  existing tests as listed in the design ("Existing tests the change touches"), including the
  `blank` dependency in `setup` and `outcomeSetup`. They fail for the right reason (the active tab is
  still kept, no blank tab). Done when the new tests fail and the others compile; commit red.
- [ ] **T2. The fix** (after T1; alone). Split `TodayTabPolicy`, let `WorkspaceTabs.open` take a null
  address, add the `blank` dependency and the hook in `ArchiveSweeper`, and wire it in
  `TodayArchive`, as in the design. The sweep keeps `isArchivable`. Done when `make check` is green.
- [ ] **T3. The live scenarios** (after T2; alone). Rename the scenario with `git mv`, change its name
  to `the Clear shortcut archives the active Today tab` and its `spec` to `'071'`, and add the AC-8
  scenario as in the design. Run `npm run live -- --only 071` if Tore agrees; otherwise leave it to
  the lab run. Report whether Vivaldi gives a pinned tab a `workspaceId`. Done when `make check` is green.
- [ ] **T4. Docs and version** (lead; after T3). Update the manual and README lines about Clear, set
  071 to `Implemented` in its header and in `specs/README.md`, and bump the patch version on
  `fix/071-clear-active-tab` from the version on `origin/main`. Done when `make check` is green.
- [ ] **T5. Manual check** (Tore, in Italian, on Vivaldi 8.3), from AC-9:
  - [ ] Con una scheda fissata e due schede di Oggi, dalla scheda attiva di Oggi premi Cmd+Shift+K
    (o clicca "Clear"): entrambe le schede di Oggi spariscono e la finestra resta aperta.
  - [ ] Senza schede fissate, Preferiti o pile, solo con schede di Oggi, dalla scheda attiva premi
    Cmd+Shift+K: resta una scheda vuota nello spazio di lavoro e la finestra non si chiude.
  - [ ] Le schede archiviate compaiono nell'archivio (Cmd+Shift+A) e si riaprono nello stesso spazio.
  - [ ] Con una scheda che riproduce audio, "Clear" la lascia aperta.
  - [ ] Il risultato e quello che mostra Arc con "Clear".
