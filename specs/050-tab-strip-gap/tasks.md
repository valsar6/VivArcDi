# 050 Tab strip gap: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `fix/tab-strip-gap` (patch), version read from `main` just
before opening the pull request.

- [ ] **T1.** Probe on the lab Vivaldi, read-only: markup of the separator, and what Vivaldi sets on a
  slot during a drag. Save the probe next to `~/Desktop/sonde-vivarci/050-tab-strip-gap/`. Satisfies
  AC-7. Done when the design's two open details are filled in.
- [ ] **T2.** Add the `separator` and `tabStripFrame` selectors to `src/selectors/8.1.json` and to
  `tests/live/selector-states.json`. Satisfies AC-8. Done when the selector check passes.
- [ ] **T3.** `GapShifts`, test first. Satisfies AC-1, AC-2, AC-11 to AC-20.
  1. Write the signature and an empty body that returns nothing useful, and the ten failing tests
     with the names of the criteria; see each one fail for the right reason.
  2. Make them pass one at a time, in the order AC-11, AC-1, AC-12, AC-13, AC-14, AC-15, AC-2, AC-16,
     AC-17, AC-20, AC-18, AC-19, with the smallest code each time.
  3. Refactor with the tests green.
  Done when all twelve tests pass and `GapShifts.ts` has no DOM access.
- [ ] **T4.** `StripGapCloser`: reads the strip, writes the shifts and the frame `max-height`,
  restores them, one pass per frame, leaves the strip when selectors do not match, skips a drag.
  Satisfies AC-3, AC-4, AC-7, AC-8. Done when the four matching tests pass.
- [ ] **T5.** Separator rule inside `StripGapCloser`. Satisfies AC-5, AC-6. Done when
  `hides the separator while no pinned tab is visible` and `shows the separator when a pinned tab is
  visible` pass.
- [ ] **T6.** Stylesheet `transform` with the shift in `src/styles/hidden-tabs.scss`; wire the closer
  into `HiddenTabMarker.start()`, `stop()` and `apply()`. Done when the existing marker tests and
  the style tests pass.
- [ ] **T7.** Live scenario `no gap above the first Today tab` in `tests/live/scenarios/`. Satisfies
  AC-9. Done when `npm run live` passes it on the lab copy.
- [ ] **T8.** Version bump (patch), `docs/manual` note if the tab bar page mentions the gap, tasks
  ticked, spec `Implemented` after Tore's manual check.
- [ ] **T9.** Write the manual verification checklist for Tore from the `manual` criterion (AC-10),
  in Italian, in `~/Desktop/sonde-vivarci/050-tab-strip-gap/`.
