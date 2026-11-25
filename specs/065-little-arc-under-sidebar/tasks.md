# 065 Little Arc under the sidebar: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/little-arc-under-sidebar` for the code, with a patch version change per CONTRIBUTING:
read the version on `origin/main` right before T4 and bump both `package.json` and
`installer/vivarcdi/__init__.py`. Each task follows TDD: first the failing tests with the verbatim
`auto:` names of the criteria, then the code, then `make check`. The spec moves to `Implemented`
when the last code pull request is merged.

## Order

```
T1 ──┐
     ├──> T3 ──> T4 (lead: docs and version) ──> T5 (Tore: manual)
T2 ──┘
```

T1 and T2 touch disjoint files and can run in parallel from the same base commit, each in its own
worktree. T3 needs both; T4 runs last on the code; T5 is Tore's check. No `live:` criterion is in
this spec, so no live scenario is part of these tasks.

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `src/core/browser/BrowserTabs.ts`, `src/core/browser/BrowserWindows.ts`, `tests/modules/littlearc/module.test.ts` (wrapper tests) |
| T2 | `src/modules/littlearc/SidebarBox.ts`, `src/modules/littlearc/SidebarPlacement.ts`, `tests/modules/littlearc/placement.test.ts` |
| T3 | `src/modules/littlearc/LittleArcLauncher.ts`, `src/modules/littlearc/MainWindowRole.ts`, `tests/modules/littlearc/module.test.ts` (launcher tests) |
| T4 | `docs/manual/little-arc.md`, `README.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py`, `specs/065-little-arc-under-sidebar/spec.md` |
| T5 | Nothing in the repository; the checklist comes from AC-7 and AC-8 |

## Tasks

- [x] **T1. Read and update a window** (TDD; parallel with T2). Extend the wrapper test
  `browser windows wrap the callbacks of chrome.windows` in `tests/modules/littlearc/module.test.ts`
  with a `get` call and an `update` call carrying bounds and `focused: true`; extend
  `browser windows report errors and a missing API` for the two new calls. Then add `get` and
  `update` to `BrowserWindows`, the optional methods to `ChromeApi.windows`, the bounds to
  `WindowDetails` and the new `WindowUpdate` type. Keep `#call` and its `lastError` handling as the
  single path. Done when `make check` is green.
- [x] **T2. Sidebar-aware bounds** (TDD; parallel with T1). Failing tests first in the new
  `tests/modules/littlearc/placement.test.ts`: `places the Little Arc window clear of the sidebar`
  (AC-1), `places Little Arc beside the rendered sidebar` (AC-2),
  `falls back when the sidebar leaves no room beside it` (AC-4) and
  `centres Little Arc when the sidebar cannot be read` (AC-5). Use a fake document with a
  `verticalTabBar` element and a screen area; assert the left edge, the gap, the shrink, the centred
  fallback and the warning reasons. Then add `SidebarBox` and `SidebarPlacement` with `SIDEBAR_GAP`
  and `MIN_POPUP_WIDTH`, leaving `WindowBounds.centred` untouched. Done when `make check` is green.
- [x] **T3. Place and verify the popup** (TDD; after T1 and T2). Failing tests first in
  `tests/modules/littlearc/module.test.ts`: `uses the same placement for every Little Arc opening`
  (AC-3), `keeps the Little Arc popup bar and the Open in workspace action` (AC-6),
  `moves Little Arc clear of the sidebar after creation` (AC-9) and
  `leaves the main window focused when Little Arc cannot clear the sidebar` (AC-10). Add `get` and
  `update` to the fake `windows` object. Then pass `sidebar` and `mainWindowId` into
  `LittleArcLauncher` from `MainWindowRole`, use `SidebarPlacement` in `#open` and add the bounded
  `#keepClear` sequence: one read, at most one `windows.update` on the popup, a second read, then a
  focus of the main window when the overlap remains. Keep `type: 'popup'`, `focused: true`, the
  registry mark, the bar, the indicator and the adoption path unchanged. Done when `make check` is
  green.
- [x] **T4. Docs and version** (lead; after T3). Say in `docs/manual/little-arc.md` and `README.md`
  that Little Arc opens beside the sidebar, that the sidebar stays usable and that an overlap is
  corrected once before the main window is left in front. Bump the patch version read from
  `origin/main` in the three version files. Set the spec to `Implemented` when the code pull request
  is merged. Done when `make check` is green.
- [ ] **T5. Tore's manual check** (last). On macOS and Debian, with the Favorites grid on and off,
  work through the checklist below built from AC-7 and AC-8. Record the result of each step.

## T5 checklist — verifica manuale

- [ ] Con `Cmd+Opt+N` (`Ctrl+Alt+N` su Debian) apro Little Arc, scrivo un indirizzo e premio Invio:
      la finestra non copre la sidebar e la barra con back, indirizzo e **Open in workspace**
      funziona come prima.
- [ ] In una pagina pinned o in un Favorite clicco un link `target="_blank"`: la pagina si apre in
      Little Arc accanto alla sidebar, la riga o il riquadro mostra l'indicatore e la sidebar resta
      visibile.
- [ ] Con la pagina Little Arc aperta clicco un'altra tab nella sidebar: la tab principale cambia,
      la pagina Little Arc resta aperta con la sua barra e posso riportarla in primo piano.
- [ ] Se la finestra finisce comunque sopra la sidebar, verifico che venga spostata una volta; se
      non basta, verifico che la sidebar resti cliccabile, che la pagina Little Arc non si chiuda e
      che un clic sulla finestra la riporti davanti.
- [ ] Ripeto i controlli su macOS e Debian, con la griglia dei Favorite attiva e disattiva, e li
      confronto con il controllo di Arc del 2026-11-23 descritto nella issue #263.
