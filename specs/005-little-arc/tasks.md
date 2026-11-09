# 005 Little Arc: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable.

- [ ] **T1.** Probe, run by Tore: does `chrome.runtime.sendMessage` reach another `window.html`, and
  does `chrome.search.query` exist in the interface. Done when the design's two risk rows are settled.
- [x] **T2.** `AddressResolver`. Satisfies AC-4. Done when `address resolver tells URLs from searches`
  passes.
- [x] **T3.** `FocusHistory` and `ExternalLinkDetector`. Satisfies AC-6a and AC-6b. Done when
  `external link detector accepts a link that wakes the app` and `external link detector rejects tabs
  that are not external links` pass.
- [x] **T4.** `BrowserWindows` in `src/core`, with fakes for tests.
- [x] **T5.** `WindowKeys` extracted from `PeekKeys`, Peek moved onto it with no change of behavior.
  Done when the Peek tests pass unchanged.
- [x] **T6.** `LittleArcRegistry`, `LittleArcLauncher` and the shortcut, `isCommandOption` in
  `ShortcutKeys`. Satisfies AC-1 and AC-12. Done when `little arc falls back to the default action
  when the window fails` passes.
- [x] **T7.** External link flow: detector wired to the launcher, tab moved into the popup. Satisfies
  AC-5 and AC-6. Done when `little arc ignores external links when disabled` passes.
- [x] **T8.** `LittleArcBar` and `little-arc.scss`. Satisfies AC-2, AC-3 and AC-9.
- [x] **T9.** `WorkspaceAdopter`, destination picker, no-main-window case. Satisfies AC-7, AC-8 and
  AC-14. Done when `destination picker defaults to the most recent workspace` passes.
- [x] **T10.** `IdleTimer`. Satisfies AC-10 and AC-11. Done when `idle timer closes untouched
  windows` and `idle timer is off when set to zero` pass.
- [x] **T11.** Module wiring, `config.json`, stop and cleanup. Satisfies AC-13. Done when
  `little arc module cleans up on stop` passes.
- [x] **T12.** Version bump (minor, feature) in `package.json`, `package-lock.json` and
  `installer/vivarcdi/__init__.py`; README section.
- [x] **T13.** Write the manual verification checklist for Tore from the `manual` criteria, macOS
  and Debian.
- [ ] **T14.** Manual checks by Tore, including Vivaldi minimized and the flash of the tab.

Change request of 2026-11-09, the look of the window (Draft, waits for Tore's approval of the spec and
the design):

- [ ] **T15.** Probe, run by Tore in the popup's `window.html`: the selectors of Vivaldi's title and
  extension row, whether `display: none` hides them, where the window buttons sit (macOS and Debian),
  whether the `webviewContainer` selector matches and accepts a padding and a radius, and whether
  Cmd/Ctrl+R reloads. Done when the three new risk rows of the design are settled.
- [ ] **T16.** `AddressDisplay`. Satisfies AC-18. Done when `address display shows the host of a
  loaded page` passes.
- [ ] **T17.** `BackButtonState`. Satisfies AC-20. Done when `back button appears after the first
  navigation` passes.
- [ ] **T18.** `KeepLabel` and the `little-arc:destination` question answered by `WorkspaceAdopter`.
  Satisfies AC-21. Done when `keep label names the destination workspace` passes.
- [ ] **T19.** `LittleArcBar` with the new parts, reload removed, pill behavior; tokens and
  `little-arc.scss` for the bar, the hidden popup header, the frame and the colors. Satisfies AC-15,
  AC-16, AC-17, AC-19, AC-22, AC-23 and AC-24.
- [ ] **T20.** Version bump (minor) in `package.json`, `package-lock.json` and
  `installer/vivarcdi/__init__.py`; README section updated with the new look.
- [ ] **T21.** Add AC-15 to AC-24 to the manual verification checklist for Tore, in Italian, macOS and
  Debian, with the review frames of `little-arc/look/` to compare.
- [ ] **T22.** Manual checks by Tore.
