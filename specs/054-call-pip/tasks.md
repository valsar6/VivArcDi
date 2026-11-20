# 054 Call Picture in Picture: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Tests keep the names of the `auto:` checks. The probes of the
first version (can the interface open PiP, does Vivaldi open it on tab switch) are done and recorded
in `design.md`.

- [ ] **T1.** Real calls, by Tore: on Meet, Zoom, Discord and Teams, is the call a `<video>` with a
  live track, which selector is the in-call view, and does `disablePictureInPicture` appear? The probe is
  `sonda-t1-call.js` (kept with Tore's probes, outside the repo, because lint covers every script in it),
  pasted in the DevTools console of the call page. Records the answers in `design.md` and replaces the
  initial selectors. Satisfies Q-2. Done when each site has a confirmed selector or is moved out of
  the spec. Meet is done (selector `button[jsname="CQylAd"]`, the leave button); Zoom, Discord and
  Teams are open, and each is added to `CallSites.ts`, the options and the selectors when confirmed.
- [x] **T2.** `CallSites.ts`, `CallPipOptions.ts`, the four selector keys in `src/selectors/8.1.json`
  and the `call-pip` entry in `src/config.json`. Satisfies AC-7, AC-8, AC-9. Done when
  `skips a disabled site`, `injects the call script on the supported sites only` and
  `uses the configured shortcut letter` pass.
- [x] **T3.** `CallVideo.ts` and `CallDetector.ts` with tests in `tests/page`. Satisfies AC-5, AC-6.
  Done when `ignores the shortcut without a call` and `floats the largest live video` pass.
- [x] **T4.** `src/page/call-pip.ts` added to the page script build: keydown, `visibilitychange`,
  call end, `install` and `uninstall`. Satisfies AC-1 to AC-4, AC-10. Done when
  `opens the call PiP on the shortcut`, `closes the call PiP on the shortcut`,
  `closes the call PiP when the tab is shown again`, `closes the call PiP when the call ends` and
  `leaves an unexpected call page untouched` pass on a fake page.
- [x] **T5.** `CallMessage.ts` and `CallPip.ts`, registered in `src/modules/index.ts`; the module keeps
  `privateWindows = 'never'`. Satisfies AC-11. Done when `does not run in private windows` passes.
- [x] **T6.** Bump the version in `package.json` and `installer/vivarcdi/__init__.py` (a feature
  branch, minor), reading `main` right before. Run `make check`.
- [ ] **T7.** Write the manual verification checklist for Tore from the `manual` criteria (AC-12 to
  AC-14), in Italian, for macOS and Debian: a real call on each site, the shortcut, switching tab,
  coming back.
- [x] **T8.** Opening on a tab switch (FR-9, FR-10): `OpenPipCommand` and `ClosePipCommand`, the
  `open` export of the page script, `CallPip` following `onActivated`, the option `openOnTabSwitch`.
  Satisfies AC-15 to AC-18. Done when `asks the left tab to open the call PiP`,
  `opens the call PiP on a tab switch after an interaction`,
  `does not open the call PiP on a tab switch without a recent interaction` and
  `does not open the call PiP on a tab switch when the option is off` pass.
- [x] **T9.** A held shortcut acts once and installing again keeps the window open (FR-11, FR-12).
  Satisfies AC-19, AC-20. Done when `ignores a held shortcut` and
  `keeps the call PiP open when the script is installed again` pass.
- [ ] **T10.** Manual checklist for AC-21 and the held key, from Tore's own call on Meet.
