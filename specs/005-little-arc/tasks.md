# 005 Little Arc: tasks

| | |
|---|---|
| Status | Approved |
| Change request | 2026-11-10, the shortcut option and the command bar (T23 to T36): Draft, nothing below starts before Tore approves the spec and the design |
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

Change request of 2026-11-09, the look of the window (Approved by Tore 2026-11-09):

- [ ] **T15.** Probe, run by Tore in the popup's `window.html`: the selectors of Vivaldi's title and
  extension row, whether `display: none` hides them, where the window buttons sit (macOS and Debian),
  whether the `webviewContainer` selector matches and accepts a padding and a radius, and whether
  Cmd/Ctrl+R reloads. Done when the three new risk rows of the design are settled.
- [x] **T16.** `AddressDisplay`. Satisfies AC-18. Done when `address display shows the host of a
  loaded page` passes.
- [x] **T17.** `BackButtonState`. Satisfies AC-20. Done when `back button appears after the first
  navigation` passes.
- [x] **T18.** `KeepLabel` and the `little-arc:destination` question answered by `WorkspaceAdopter`.
  Satisfies AC-21. Done when `keep label names the destination workspace` passes.
- [x] **T19.** `LittleArcBar` with the new parts, reload removed, pill behavior; tokens and
  `little-arc.scss` for the bar, the hidden popup header, the frame and the colors. Satisfies AC-15,
  AC-16, AC-17, AC-19, AC-22, AC-23 and AC-24.
- [x] **T20.** Version bump (minor) in `package.json`, `package-lock.json` and
  `installer/vivarcdi/__init__.py`; README section updated with the new look.
- [x] **T21.** Add AC-15 to AC-24 to the manual verification checklist for Tore, in Italian, macOS and
  Debian, with the review frames of `little-arc/look/` to compare.
- [ ] **T22.** Manual checks by Tore.

Change request of 2026-11-10, the shortcut option and the command bar (Draft; the branch for the
implementation is `features/little-arc-command-bar-code`, next minor version):

- [ ] **T23.** Probe, run by Tore in a normal window's DevTools console, before any code: the nine
  unknowns of the spec's "Unknowns for the command bar probe" (history, topSites, bookmarks search,
  favicon in an overlay, backdrop blur over the page, focus and click in an overlay, popup created with an
  address and search in its tab, which command holds Cmd+Shift+Opt+N and how Vivaldi writes Shift and
  Alt in `Preferences`). Done when each answer is written in the spec's Probe results and the risk rows
  of the design are settled. Tore also chooses the final key here.
- [ ] **T24.** `ShortcutChord` and the `shortcut` option in `LittleArcSettings` and `config.json`,
  `MainWindowRole` on it, `isCommandOption` no longer used. Satisfies FR-18, AC-1, AC-25, AC-26 and
  AC-27. Done when `shortcut chord parses the option string`, `shortcut chord matches only its own
  modifiers and key`, `little arc falls back to the default shortcut when the option is invalid` pass.
- [ ] **T25.** Installer: reserve the key of `little-arc.shortcut` in `shortcuts apply` and `status`
  (014 T10), `shortcuts.json` `reserved` emptied. Done when the 014 tests of T10 pass.
- [ ] **T26.** `Suggestion`, `SuggestionSource`, `SuggestionRanker`. Satisfies AC-32, AC-33, AC-34 and
  AC-35. Done when `suggestion ranker puts the best match first`, `suggestion ranker removes duplicate
  addresses`, `suggestion ranker keeps web addresses and limits the list` and `suggestion list for an
  empty field uses the most visited then the recent` pass.
- [ ] **T27.** `SelectionCursor`. Satisfies AC-36. Done when `selection cursor wraps around and resets
  with the list` passes.
- [ ] **T28.** Sources: `TabSuggestions`, `BookmarkSuggestions`, `BrowserHistory` and
  `HistorySuggestions`, `BrowserTopSites` and `TopSiteSuggestions` (the last two only where T23 says the
  API exists), `SuggestionList` with failures skipped. Satisfies AC-43. Done when `suggestion sources
  survive a failing source` passes.
- [ ] **T29.** `LittleArcLauncher.openAddress` and `openSearch`. Satisfies FR-24. Done when the launcher
  tests pass with a fake `BrowserWindows`.
- [ ] **T30.** `CommandBarController`. Satisfies AC-38, AC-39 and AC-40. Done when `command bar opens
  the typed text in little arc`, `command bar opens the selected suggestion in little arc` and `command
  bar opens nothing when it is dismissed` pass.
- [ ] **T31.** `CommandBarView`, `CommandBarMount`, the tokens in `_tokens.scss` and the overlay in
  `little-arc.scss`, wired in `MainWindowRole` with the `commandBar` option and the fallback to the blank
  window. Satisfies AC-29 to AC-31, AC-37, AC-41 to AC-45 and AC-47. Done when `little arc opens the
  blank window when the command bar is off or cannot mount` and `command bar removes its elements and
  listeners on stop` pass.
- [ ] **T32.** Version bump (minor) in `package.json`, `package-lock.json` and
  `installer/vivarcdi/__init__.py`.
- [ ] **T33.** README (section Little Arc, the shortcut and its option, the 014 paragraph),
  `docs/manual/little-arc.md`, `docs/manual/today-and-keyboard.md`, `docs/manual/assets.md` and
  `docs/native-settings.md`: every mention of Cmd+Opt+N for Little Arc becomes the option's default, with
  the mockup `little-arc/look/barra-comandi.png` in the manual. Done when no document names
  Cmd+Opt+N for Little Arc.
- [ ] **T34.** Add AC-28 to AC-31, AC-37, AC-41, AC-42, AC-45 and AC-47 to the manual verification
  checklist for Tore, in Italian, macOS and Debian, with Tore's screenshot and the mockup to compare.
- [ ] **T35.** `make check` passes.
- [ ] **T36.** Manual checks by Tore, including the history of a real profile (speed), the focus
  after closing, dark mode, and Notes keeping Cmd+Opt+N after `shortcuts apply`.
