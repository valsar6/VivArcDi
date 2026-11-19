# 050 Tab strip gap: tasks

| | |
|---|---|
| Status | Draft |
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
- [ ] **T3.** `GapShifts`: the arithmetic of shifts and hidden height. Satisfies AC-1, AC-2. Done when
  `offsets the visible slots by the heights of the hidden slots before them` and
  `shrinks the strip by the heights of the hidden slots` pass.
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
