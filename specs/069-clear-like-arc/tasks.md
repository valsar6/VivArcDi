# 069 Clear like Arc: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/069-clear-like-arc`, with a patch version change per CONTRIBUTING: read the version on
`origin/main` right before T4 and bump `package.json`, `package-lock.json` and
`installer/vivarcdi/__init__.py`. Each code task follows TDD: first the failing tests with the
verbatim `auto:` names, then the code, then `make check`. T1 and T2 own disjoint files and run in
parallel, each in its own worktree from the same base commit; T3 runs after both.

`npm run live -- --probe <file>` runs a lab Vivaldi: run it only on a machine with Vivaldi and a
desktop session, and only with Tore's agreement (he agreed to the probes of this spec).

## Order

```
T1 ──┐
T2 ──┼──> T3 (scenario) ──> T4 (lead: docs and version) ──> T5 (Tore: manual)
```

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `src/core/dom/ShortcutKeys.ts`, `src/modules/today/ClearSeparator.ts`, `ArchiveKeys.ts`, `ArchiveMessage.ts`, `TodayArchive.ts`, `src/page/archive-keys.ts`, and the tests `tests/core/dom/ShortcutKeys.test.ts`, `tests/modules/today/ClearSeparator.test.ts`, `TodayArchive.test.ts`, `TodayParts.test.ts`, `tests/page/PageScripts.test.ts` |
| T2 | `src/styles/_tokens.scss`, `src/styles/today.scss`, `tests/styles/Today.test.ts`, `tests/styles/Pinned.test.ts`, and the probe file in the scratchpad (not committed) |
| T3 | `tests/live/scenarios/the-clear-shortcut-archives-the-today-tabs.live.ts` |
| T4 | `specs/014-arc-shortcuts/spec.md`, `specs/067-clear-line-and-titles/spec.md` (superseded rows), `specs/004-today-tabs-and-keyboard/spec.md`, `specs/060-clear-bar-and-pinned-unload/spec.md`, `specs/069-clear-like-arc/` (status), `specs/README.md`, `docs/manual/tab-bar.md`, `README.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` |
| T5 | Nothing in the repository; the checklist comes from AC-6 |

## Tasks

- [ ] **T1. The tooltip and the shortcut** (TDD; parallel with T2). Add the tests first:
  `titles the Clear control like Arc` (AC-4, with platforms `MacIntel`, `Linux x86_64` and none),
  `clears the Today tabs on the Clear shortcut` (AC-7) and
  `does nothing on the Clear shortcut without Today tabs` (AC-8), the last two in the module test
  that presses Cmd/Ctrl+Shift+A, plus `ShortcutKeys.isMac`, the `clear` action of
  `parseArchiveMessage` and the `archive-keys` page-script case. Then add `ShortcutKeys.isMac`, the
  `platform` dependency and the title of `ClearSeparator`, the two actions of `ArchiveKeys`, the
  `clear` action of `ArchiveMessage` and of the page script, and the wiring in `TodayArchive`, as in
  the design. Before coding, read `ArchiveSweeper.#clearNow` and confirm a press with no Today tab
  writes nothing; if it does, report it instead of adding a guard. Done when `make check` is green.
- [ ] **T2. Styles, tokens and the probe** (TDD; parallel with T1). Remove the 067 tests
  `insets the Clear line like the rows`, `shows the Clear label at rest`,
  `ends the Clear line before its label` and `strengthens the Clear label on hover`; add the new
  `hides the Clear label outside the sidebar`, `shows the muted Clear label while the pointer is in the
  sidebar`, `strengthens the Clear label when pointed at` and `aligns the Clear line with the row
  icons`; change the last assertion of `insets the pinned-last border like the rows`. Then run the
  probe of the design on a lab Vivaldi (ask Tore first, read-only, with the grid on and off and with
  and without a pinned tab), write `$clear-line-start`, `$clear-line-end`, `$clear-gap` and
  `$clear-line-offset` from its numbers, and write the styles of the design. Put the probe numbers in
  the pull request. If a number is outside 1 px of the spec's table, report it. Done when
  `make check` is green.
- [ ] **T3. The live scenario** (after T1 and T2; alone). Add
  `the-clear-shortcut-archives-the-today-tabs.live.ts` as in the design, with the same cleanup style
  as `the-clear-bar-keeps-a-box-above-today.live.ts`. Run it with `npm run live -- --only 069` on a
  lab Vivaldi if Tore agrees; otherwise leave it to CI of the lab. Done when `make check` is green.
- [ ] **T4. Docs and version** (lead; after T1 to T3). Add the shortcut to the Arc shortcuts list of
  014 (`Cmd/Ctrl+Shift+K runs Clear, see 069`), update `docs/manual/tab-bar.md` (Clear shows while the
  pointer is in the sidebar, the tooltip, the shortcut) and `README.md`, mark the superseded rows in
  the criteria table of 067 (AC-5, AC-9 to AC-11, and the 6 px in AC-6), set 069 to `Implemented`
  in its header and in `specs/README.md`, and bump the patch version on `fix/069-clear-like-arc` from
  the version on `origin/main`. Done when `make check` is green.
- [ ] **T5. Manual check** (Tore, in Italian, on Vivaldi 8.3, grid on and off, light and dark),
  from AC-6:
  - [ ] Con il puntatore fuori dalla barra laterale, sopra le schede di Oggi c'e solo una linea piena,
    senza "Clear".
  - [ ] Entrando nella barra laterale (anche su "+ Nuova scheda"), "↓ Clear" appare con dissolvenza,
    in grigio, e la linea si accorcia finendo circa 10 px prima della freccia.
  - [ ] Uscendo dalla barra laterale, "Clear" sparisce e la linea torna intera.
  - [ ] La linea parte dal bordo sinistro delle icone delle righe e finisce al bordo destro delle
    icone finali; e a meta' tra l'ultima riga sopra e "+ Nuova scheda", come in Arc.
  - [ ] Puntando "Clear" il testo diventa pieno e compare il suggerimento
    `Clear Today tabs ⇧⌘K` (su Debian `Clear Today tabs Ctrl+Shift+K`).
  - [ ] Cliccando "Clear" le schede di Oggi vanno in archivio; senza schede di Oggi sparisce tutto e
    "+ Nuova scheda" sale sotto le righe.
  - [ ] Con alcune schede di Oggi, premere ⇧⌘K (Ctrl+Shift+K su Debian), anche con il focus nella
    pagina, le archivia come il clic; senza schede di Oggi non succede nulla.
