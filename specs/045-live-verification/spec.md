# 045 Live verification

| | |
|---|---|
| Status | Approved |
| Phase | Tooling |
| Owner | Tore |
| Approved | Tore, 2026-11-17 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Every feature ends with a checklist that Tore runs by hand on a real Vivaldi, and every unknown
Vivaldi internal needs a probe script that Tore pastes into the DevTools of `window.html`. Vivaldi is
built on Chromium, so a script can start it with remote debugging and drive `window.html` through the
Chrome DevTools Protocol (CDP). This spec adds a live verification harness: one command starts a
throwaway Vivaldi with the payload of the working tree, checks that the selectors of the running
Vivaldi version resolve, runs scripted scenarios that replace part of the `manual` criteria, and
writes a report. Tore stays the judge of what only a person can see; he stops being the test runner.

This is the first step of a roadmap: a scheduled run against Vivaldi snapshots builds on it (a later
spec), then running several specs in parallel and measuring where the maintainer's time goes.

## User stories

- **US-1.** As Tore, I want the checks that only need a real Vivaldi to run without me, so that I
  verify by hand only what needs human eyes.
- **US-2.** As Tore, I want to know which selectors of the catalog a given Vivaldi build breaks,
  so that a Vivaldi update never reaches me as a broken sidebar.
- **US-3.** As an agent working on a feature, I want to run the probe I would have asked Tore to
  paste, so that I get the answer in the same session.
- **US-4.** As Tore, I want the harness to never touch my profile, my tabs or my installed Vivaldi,
  so that I can run it while I browse.

## Expected behavior

`npm run live` builds the payload, prepares a lab Vivaldi with that payload, starts it on a fresh
profile with remote debugging bound to `127.0.0.1`, attaches to `window.html` and runs, in order:

1. **Boot check.** The payload loaded, every enabled module started, no `VivArcDi` error appeared in
   the console.
2. **Selector check.** Every selector of the catalog for the running Vivaldi version is resolved in
   `window.html`. Selectors that exist only in a given state (an open popup, a pinned tab) are
   resolved after the harness brings Vivaldi into that state, or reported as `not checked` with the
   reason.
3. **Scenarios.** Scripted user flows, one file each, that act on the interface (clicks, keys,
   drags, tab and workspace changes through CDP) and assert on the DOM, on `chrome.tabs` data and on
   storage. A scenario has the name of the acceptance criterion it proves.

The run ends by closing the lab Vivaldi and deleting its profile. It writes a report with one line
per check (`pass`, `fail`, `not checked`), the Vivaldi version, the payload version, the
`VivArcDi` console lines and a screenshot of `window.html` for every failure. The exit code is
non-zero when a check fails.

`npm run live -- --probe <file>` runs a read-only probe script in `window.html` and prints its
result, the automated twin of the probe scripts Tore pastes today.

Acceptance criteria gain a third kind of check, `live: <scenario name>`, next to `auto` and `manual`.
A `live` criterion is proven by the harness on a real Vivaldi; `manual` stays for what needs a
person: visual judgement, macOS permission dialogs, behavior across a restart of the user's own
profile, and anything the harness cannot reach.

## Requirements

### Functional

- **FR-1.** `npm run live` runs the boot check, the selector check and all scenarios; options select
  a subset by scenario name or spec number.
- **FR-2.** The harness never uses the user's Vivaldi profile: it creates a temporary
  `--user-data-dir`, refuses any directory that holds an existing Vivaldi profile, and deletes the
  temporary one at the end, also after a failure or an interruption.
- **FR-3.** The harness never patches the user's installed Vivaldi. It uses a lab copy of Vivaldi in
  a cache directory, patched with the `dist/` of the working tree through the installer's own
  patching code.
- **FR-4.** The remote debugging port is a free port bound to `127.0.0.1` and lives only as long as
  the run.
- **FR-5.** The harness stops only the processes it started.
- **FR-6.** The selector check reads the same `src/selectors/` files and the same version matching as
  `SelectorCatalog`, so the harness and the payload never disagree on which selectors apply.
- **FR-7.** A scenario is a TypeScript file under `tests/live/` named after the `live:` check it
  proves, built on a small driver API (find, click, press, drag, wait for, evaluate, read storage)
  that hides CDP.
- **FR-8.** The report is written as JSON and as a short Markdown summary under `build/live/`.
- **FR-9.** `--probe <file>` evaluates the file in `window.html` and prints the value it returns;
  the harness rejects a probe that calls storage or bookmark write APIs.
- **FR-10.** `specs/README.md`, `CONTRIBUTING.md`, `AGENTS.md` and the verification skill describe
  the `live` check and when to prefer it over `manual`.

### Non-functional

- **NFR-1.** `make check` stays offline and needs no Vivaldi: the harness logic is unit tested
  against a fake CDP endpoint, and `npm run live` is a separate command.
- **NFR-2.** The harness runs on macOS and Debian, the two platforms Tore verifies on.
- **NFR-3.** No new runtime dependency in the payload or the installer; the harness talks CDP over
  the WebSocket built into Node 24.
- **NFR-4.** A full run on the current scenarios finishes within five minutes.
- **NFR-5.** The harness works whether or not the user's own Vivaldi is running.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria) and verifiable one by one. `Check` says how:
`auto` names the test that proves it, `manual` is a step Tore performs on a real Vivaldi.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the harness starts Vivaldi, THE harness SHALL pass a new temporary user data directory and a port bound to 127.0.0.1 | auto: `harness starts Vivaldi on a temporary profile and a local port` |
| AC-2 | IF the user data directory holds an existing Vivaldi profile, THEN THE harness SHALL refuse to start | auto: `harness refuses a directory that holds a profile` |
| AC-3 | WHEN a run ends, fails or is interrupted, THE harness SHALL stop the Vivaldi it started and delete the temporary profile | auto: `harness cleans up after a failed run` |
| AC-4 | THE harness SHALL patch only the lab copy of Vivaldi and never the installed one | auto: `test_harness_patches_only_the_lab_copy` |
| AC-5 | WHEN attached to window.html, THE selector check SHALL report every catalog selector of the running version as pass, fail or not checked | auto: `selector check reports every selector of the version` |
| AC-6 | THE selector check SHALL pick the selector file with the same version matching as SelectorCatalog | auto: `selector check matches versions like the catalog` |
| AC-7 | IF a check fails, THEN THE harness SHALL save a screenshot of window.html and exit with a non-zero code | auto: `harness saves a screenshot and fails on a failed check` |
| AC-8 | THE report SHALL list the Vivaldi version, the payload version, every check result and the VivArcDi console lines | auto: `report lists versions, results and console lines` |
| AC-9 | IF a probe calls a storage or bookmark write API, THEN THE harness SHALL reject it without running it | auto: `probe with a write call is rejected` |
| AC-10 | WHEN Tore runs npm run live on macOS with his own Vivaldi open, THE run SHALL pass and leave his windows, tabs and profile unchanged | manual |
| AC-11 | WHEN Tore runs npm run live on Debian, THE run SHALL pass | manual |
| AC-12 | WHEN a selector of the catalog is renamed in a local copy, THE run SHALL report that selector as failed | manual |

## Out of scope

- The scheduled run against Vivaldi snapshots and nightly builds, and the draft fix of broken
  selectors: the next spec, built on this harness.
- Running the harness in CI: GitHub runners would need a Vivaldi with a display; decided with the
  scheduled run.
- Converting the `manual` criteria of existing specs into `live` scenarios: done spec by spec in
  later pull requests; this spec ships the harness, the selector check and one scenario per check
  kind as examples.
- Pixel comparison of screenshots.
- Running several specs in parallel and measuring the maintainer's time (later steps of the roadmap).

## Open questions

- [x] **Lab copy of Vivaldi.** Decided: the harness copies the installed Vivaldi into
  `~/.cache/vivarcdi/lab/<version>/` (macOS: the `.app` bundle; Debian: `/opt/vivaldi`) and patches
  the copy; a `--vivaldi <path>` option points to another build, which the snapshot spec will use.
  Alternative: patch the installed Vivaldi and restore it after the run, which is simpler but touches
  the user's browser.
- [x] **Raw CDP or Playwright.** Decided: raw CDP over Node's WebSocket (NFR-3), with a small driver
  of our own. Playwright's `connectOverCDP` gives richer waiting and input but adds a large dev
  dependency and is built for page targets, not for an extension window like `window.html`.
- [x] **A third check kind.** Decided: `live: <scenario name>` in the `Check` column, with test-name
  rules identical to `auto`. Alternative: keep `manual` and add a "covered by" note, which changes no
  format but hides what is automated.
- [x] **State-only selectors.** Decided: the selector check opens the workspace popup and pins a tab
  itself, and lists any other state-only selector in a small map in `tests/live/` so it is reported
  as `not checked` with a reason instead of failing.
- [x] **Vivaldi on Debian without a display.** Decided: run under the user's desktop session; a
  headless or `xvfb` run is decided with CI in the snapshot spec.

## References

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Chrome 136: remote debugging needs a non-default user data directory](https://developer.chrome.com/blog/remote-debugging-port)
- [Spec 006, versioning and releases](../006-versioning-and-releases/spec.md): a `docs/` branch, no
  version change.
- The `vivarcdi-verifica-vivaldi` skill: the manual checklist and the probe scripts this spec
  automates.
