# 038 Page scripts: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/page-scripts`, with a patch version change from 0.59.3 to 0.59.4 in `package.json`,
`package-lock.json` and `installer/vivarcdi/__init__.py` (NFR-4, Q-6). Each task ends green on
`make check`, and every existing test keeps its name and passes (NFR-3). No task changes what a user
sees (NFR-1) or a message, token or permission (NFR-2).

Order and parallel work, for `vivarcdi-implementer` agents (one base commit and one task each):

- **T1 and T2 run in parallel** from the base commit of the branch. T1 touches `src/core/` and three
  test fakes; T2 touches only `src/page/` and the new `tests/page/`. Neither imports the other's files.
- **T3 runs alone** once T1 is merged: it needs `ScriptRunner`, `BrowserRuntime.lastError` and the
  fake webview callbacks.
- **T4 runs alone** once T3 is merged: it changes `Peek.ts`, which T3 also touches (the injector's
  `errors`), and it uses the `PeekPanel` and `Peek.test.ts` fakes of T1.
- **T5** (docs and version) touches no source file and may run in parallel with any task.
- **T6** comes last.

- [ ] **T1. Runner, runtime and logger.** `src/core/support/Logger.ts`: optional `debug` on
  `LogSink`, `Logger.debug`. `src/core/browser/BrowserRuntime.ts`: the `lastError` getter.
  `src/core/browser/ScriptRunner.ts` (new): `TAB_CLOSED_ERROR`, `LastErrorSource`, `ScriptRunner`
  with `run`, the debug line for a page that went away and one warning per runner. Test fakes:
  `SilentSink.debug` in `tests/loader/fakes.ts`; in `tests/modules/peek/fakes.ts`,
  `FakeElement.executeScript(details, callback?)` with `callbacks`, `connectedAtRun` and
  `throwOnExecute`, and the `answer(webview, host, message)` helper. Nothing uses the runner yet.
  Tests: `logger writes debug lines when the sink has them` (`tests/core/support/Logger.test.ts`,
  new) and `browser runtime reads the message of the last error`
  (`tests/core/browser/BrowserRuntime.test.ts`). No AC yet; it prepares AC-9, AC-10 and AC-14.
- [ ] **T2. Page registry and page scripts.** `src/page/lib/PageInstall.ts` (new): `PageHook`,
  `PageListener`, `PageInstall`. The five scripts in `src/page/` use it, keep their keys, globals,
  parameters and listener bodies; `peek-keys` replaces on install and exports `uninstall`. Satisfies
  AC-1 to AC-5 in `tests/page/PageScripts.test.ts` (new): `every page script exports install and
  uninstall`, `a second install replaces the first`, `uninstall leaves the page as before`,
  `uninstall without install does nothing`, `peek keys use the newest token`. FR-1 to FR-3, FR-8.
- [ ] **T3. Injector.** `src/core/browser/PageScriptInjector.ts`: `errors: LastErrorSource` in
  `InjectorDependencies`, the runner instead of `#execute` and `#warned`, the request number on each
  tracked webview and `#runLatest`. `src/modules/pinned/PinnedClosing.ts`,
  `src/modules/copyurl/CopyUrl.ts`, `src/modules/today/ArchiveKeys.ts` and the `#createInjector` of
  `src/modules/peek/Peek.ts` pass `errors: runtime`. Satisfies AC-7, AC-8, AC-9 and AC-14 in
  `tests/core/browser/PageScriptInjector.test.ts` (new): `injector installs nothing after detach`,
  `injector keeps the newest request of a webview`, `injector warns once when a page refuses the
  script`, `injector logs a closed tab at debug level`. FR-5 to FR-7.
- [ ] **T4. Peek key script.** `src/modules/peek/PageScripts.ts`: `uninstallKeys()`.
  `src/modules/peek/PeekPanel.ts`: `runner` in `PanelDependencies`, install through it on a top-level
  `loadcommit`, uninstall through it at the start of `remove()`. `src/modules/peek/Peek.ts`: one
  `ScriptRunner('Peek keys', runtime, logger)` in `#createController`, passed to every panel.
  Satisfies AC-6 and AC-10 in `tests/modules/peek/PeekPanel.test.ts` (new): `peek panel uninstalls
  its key script before closing`, `peek panel warns once when its key script fails`; and AC-11 by
  extending `peek module cleans up on stop` in `tests/modules/peek/Peek.test.ts` (same name). `page
  scripts call the bundle globals after the bundles` adds the `uninstallKeys()` string. FR-4, FR-7.
- [ ] **T5. Docs and version.** `docs/architecture.md`, after the paragraph on page scripts: every
  page script exports `install` and `uninstall`, built on `src/page/lib/PageInstall.ts`; the interface
  runs them through `ScriptRunner`, which reads `chrome.runtime.lastError`, logs a closed tab at
  debug level and warns once per purpose (spec 038). `specs/002-peek/design.md:77`: the
  `executeScript` row points to 038 for how failures are logged. `specs/README.md`: no change until
  the spec is `Implemented`. Patch version bump to 0.59.4, checked with
  `npm run release -- check --base origin/main --branch fix/page-scripts`.
- [ ] **T6. Manual check.** Italian checklist for AC-12 and AC-13 under
  `~/Desktop/sonde-vivarci/038-page-scripts/`, on macOS and Debian with 0.59.4 installed and Vivaldi
  restarted. AC-12: in a Peek, Esc, Cmd/Ctrl+W and Cmd/Ctrl+O close and expand as before, also after
  following a link inside the Peek and after opening a second Peek; Cmd/Ctrl+W in a pinned tab unloads
  it; Cmd/Ctrl+Shift+C copies the address and Cmd/Ctrl+Shift+A opens the archive with the focus in a
  page. AC-13: open `vivaldi://settings` and `https://chromewebstore.google.com/` in tabs, use
  Cmd/Ctrl+Shift+C in the Web Store tab and in another tab, then open the DevTools console of
  `window.html` and check that no `[VivArcDi` warning appears (debug lines, shown only at the Verbose
  level, are allowed). When Tore reports it green, the spec becomes `Implemented`.
