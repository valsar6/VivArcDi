# 005 Little Arc: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable.

- [ ] **T1.** Probe, run by Tore: does `chrome.runtime.sendMessage` reach another `window.html`, and
  does `chrome.search.query` exist in the interface. Done when the design's two risk rows are settled.
- [ ] **T2.** `AddressResolver`. Satisfies AC-4. Done when `address resolver tells URLs from searches`
  passes.
- [ ] **T3.** `FocusHistory` and `ExternalLinkDetector`. Satisfies AC-6a and AC-6b. Done when
  `external link detector accepts a link that wakes the app` and `external link detector rejects tabs
  that are not external links` pass.
- [ ] **T4.** `BrowserWindows` in `src/core`, with fakes for tests.
- [ ] **T5.** `WindowKeys` extracted from `PeekKeys`, Peek moved onto it with no change of behavior.
  Done when the Peek tests pass unchanged.
- [ ] **T6.** `LittleArcRegistry`, `LittleArcLauncher` and the shortcut, `isCommandOption` in
  `ShortcutKeys`. Satisfies AC-1 and AC-12. Done when `little arc falls back to the default action
  when the window fails` passes.
- [ ] **T7.** External link flow: detector wired to the launcher, tab moved into the popup. Satisfies
  AC-5 and AC-6. Done when `little arc ignores external links when disabled` passes.
- [ ] **T8.** `LittleArcBar` and `little-arc.scss`. Satisfies AC-2 and AC-3.
- [ ] **T9.** `WorkspaceAdopter`, destination picker, no-main-window case. Satisfies AC-7, AC-8 and
  AC-14. Done when `destination picker defaults to the most recent workspace` passes.
- [ ] **T10.** `IdleTimer`. Satisfies AC-10 and AC-11. Done when `idle timer closes untouched
  windows` and `idle timer is off when set to zero` pass.
- [ ] **T11.** Module wiring, `config.json`, stop and cleanup. Satisfies AC-9 and AC-13. Done when
  `little arc module cleans up on stop` passes.
- [ ] **T12.** Version bump (minor, feature) in `package.json`, `package-lock.json` and
  `installer/vivarcdi/__init__.py`; README section.
- [ ] **T13.** Write the manual verification checklist for Tore from the `manual` criteria, macOS
  and Debian.
- [ ] **T14.** Manual checks by Tore, including Vivaldi minimized and the flash of the tab.
