# 054 Call Picture in Picture: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Tests keep the names of the `auto:` checks.

- [ ] **T1.** Probe on the lab copy, with Tore's agreement to run `npm run live -- --probe <file>`:
  (a) does Vivaldi 8.1 call a page's `enterpictureinpicture` media session action when the tab is
  left, and does it need a site permission; (b) does `requestPictureInPicture()` run from
  `executeScript` without a gesture; (c) is a handler registered by `executeScript` seen by the
  browser. Write the answers into `design.md` (the way each site opens, the fallback decision of
  Q-2). Selectors of Discord and Teams are confirmed by Tore in a real call. Satisfies Q-1 to Q-3.
  Done when the design names one way per site and the in-call selectors are real.
- [ ] **T2.** `CallSites.ts`, `CallPipOptions.ts`, the four selector keys in `src/selectors/8.1.json`,
  the `call-pip` entry in `src/config.json`. Satisfies AC-7, AC-8. Done when
  `skips a disabled site` and `injects the call script on the four sites only` pass.
- [ ] **T3.** `CallMessage.ts` and `CallRegistry.ts`. Satisfies AC-4, AC-5, AC-6. Done when
  `does not open a PiP window without a call`, `does not open the call PiP twice` and
  `does not reopen a PiP window closed by the user` pass.
- [ ] **T4.** `PageScriptInjector.send(tabId, code)` with its test in `tests/core`. Done when a
  command reaches only the tracked tab and a stopped injector sends nothing.
- [ ] **T5.** `CallController.ts` and `CallPip.ts`, registered in `src/modules/index.ts`; the module
  keeps `privateWindows = 'never'`. Satisfies AC-1, AC-2, AC-3, AC-10. Done when
  `opens the call PiP when the tab is left`, `closes the call PiP when the tab is shown again`,
  `closes the call PiP when the call ends` and `does not run in private windows` pass.
- [ ] **T6.** `src/page/lib/CallDetector.ts`, `src/page/lib/PipOpener.ts` and `src/page/call-pip.ts`,
  added to the page script build, with tests in `tests/page` on a fake page that registers the media
  session action. Satisfies AC-9. Done when `leaves an unexpected call page untouched` passes and
  `uninstall` leaves the page as it was.
- [ ] **T7.** Bump the version in `package.json` and `installer/vivarcdi/__init__.py` (a feature
  branch, minor), reading `main` right before. Run `make check`.
- [ ] **T8.** Write the manual verification checklist for Tore from the `manual` criteria (AC-11 to
  AC-13), in Italian, for macOS and Debian: a real Meet, Zoom, Discord and Teams call, switching tab
  and coming back.
