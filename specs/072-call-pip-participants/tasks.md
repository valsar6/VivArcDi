# 072 Call Picture in Picture with the participants: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Tests keep the names of the `auto:` checks.

- [ ] **T1.** Probes in a real Meet call, by Tore, with a presentation, some cameras off and the tab
  switched: the six questions at the end of `design.md`. The lab run of 2026-11-27 answered the hidden-tab
  refresh, the taint and the Media Session registration (see `design.md`); the real Meet call of the same day answered the selectors, the
  hidden-tab refresh and the Media Session registration; still open: the buttons and keys of the window,
  the microphone jsname when unmuted, Meet's decoding of hidden camera tiles. Records the answers there and replaces the
  initial selectors and the choices they decide (avatar form, ticker, paging keys). Done when each
  question has an answer in `design.md`.
- [x] **T2.** `CallSelectors` and the policy: `CallSites.ts` carries the five selector keys, the four
  new keys in `src/selectors/8.1.json`, `maxTiles` in `CallPipOptions.ts` and `src/config.json`,
  `CallPagePolicy` and the new warning reasons in `CallMessage.ts`; `CallDetector` and `CallPipHook`
  read `selectors.inCall`. Satisfies AC-9. Done when the tests of 054 pass unchanged.
- [x] **T3.** `CallTiles.ts` and `TileLayout.ts` with `SpotlightLayout`, `GridLayout` and the primary
  tile rule, tests in `tests/page`. Satisfies AC-1 to AC-4b. Done when
  `floats the shared screen and the participants together`, `gives the shared screen the larger area`,
  `lays the cameras out in a grid without a presentation`,
  `shows the avatar of a participant without a live video` and `shows the own tile with the camera off`
  pass.
- [x] **T4.** `TilePager.ts`. Satisfies AC-7, AC-7b, AC-7d. Done when
  `limits the picture to the configured number of tiles`,
  `pages the tiles with the previous and next actions` and
  `stops the paging at the first and last page` pass.
- [x] **T5.** `PipPicture.ts` with its 66 ms interval and `CredentialedAvatars.ts`.
  Satisfies AC-5, AC-8. Done when `updates the picture while the window is open` and
  `keeps refreshing the picture while the page is hidden` pass.
- [x] **T6.** `PipSource.ts` and `OpenPipCommand` taking a source, the fallback to the largest video.
  Satisfies AC-6. Done when `falls back to the largest video when the picture fails` passes.
- [x] **T7.** `CallControls.ts` and its wiring in `CallPipHook`: the Media Session actions, the state
  observer, the paging actions and the two arrow keys while the window is open. Satisfies AC-7c, AC-15
  to AC-18. Done when `pages the tiles with the arrow keys`, `registers the call actions`,
  `drives the call controls from the window`, `reports the microphone and camera state` and
  `warns when a call control is not found` pass.
- [x] **T8.** Update `specs/054-call-pip/spec.md` (FR-2 and AC-6 point to 072) and the entry in
  `specs/README.md`. Done when the two specs agree.
- [x] **T9.** Bump the version in `package.json` and `installer/vivarcdi/__init__.py` (a feature
  branch, minor), reading `main` right before. Run `make check`.
- [ ] **T10.** Write the manual verification checklist for Tore from the `manual` criteria (AC-10 to
  AC-14, AC-19), in Italian, for macOS and Debian: a call with a presentation, my own camera on and
  off, someone joining and leaving, more than nine participants, the buttons of the window, one minute
  on another tab.
