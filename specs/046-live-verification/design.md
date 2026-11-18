# 046 Live verification: design

| | |
|---|---|
| Status | Draft: amendment of 2026-11-18 awaits approval (approved 2026-11-17) |
| Spec | [spec.md](spec.md) |

## Approach

The harness is development tooling, like the release CLI: TypeScript under `scripts/live/`, run by
`tsx`, never shipped in `dist/` and never imported by the payload or the installer. One Python
helper prepares the lab Vivaldi, because finding and copying Vivaldi on disk, and removing a
VivArcDi patch, is the installer's knowledge and must not be written twice.

A run goes through fixed steps, each owned by one class and composed in `LiveRun`:

1. `npm run live` builds `dist/`, then `scripts/live/cli.ts` parses the options.
2. `LabVivaldi` runs `scripts/live/lab.py prepare`, which copies the installed Vivaldi into the lab
   folder (once per Vivaldi version), removes the VivArcDi block and payload the copy inherited
   with the installer's `WindowHtmlPatcher.revert` and `PayloadDeployer.remove`, and on macOS checks
   `codesign --verify --deep --strict`. It prints the executable, the Vivaldi version and the
   resources folder as JSON.
2a. `PayloadServer` serves `dist/` on a free port of `127.0.0.1`, with a generated `build.json`
   (`vivarcdiVersion`, `vivaldiVersion`, `payloadFingerprint: "live"`) and CORS open to the lab.
3. `ProfileDirectory` creates a temporary user data directory and seeds it with the fixture
   preferences of `tests/live/profile/`.
4. `VivaldiProcess` starts the lab executable on that profile with `--remote-debugging-port=0`,
   reads the port Chromium writes to `DevToolsActivePort`, and connects to the `window.html` target
   listed on `http://127.0.0.1:<port>/json/list`.
4a. `PayloadInjector` sends `Page.setBypassCSP`, adds `import('<server>/loader.js')` with
   `Page.addScriptToEvaluateOnNewDocument` and reloads `window.html`, so the payload boots as early
   as the installed one would. Everything the payload loads goes through its `ResourceLoader` base
   URL, page scripts included, so serving from `127.0.0.1` changes only the origin of the files.
5. `BootCheck`, `SelectorCheck` and the selected scenarios run against a `Driver` that wraps the
   CDP connection.
6. `Report` writes `build/live/report.json`, `build/live/report.md` and the failure screenshots.
7. `Cleanup` stops the process and deletes the profile, on success, on failure and on `SIGINT` or
   `SIGTERM`.

`--remote-debugging-port=0` lets Chromium pick a free port and bind it to `127.0.0.1`; together
with a non-default user data directory it is also what Chromium 136 and later require for remote
debugging to be enabled at all.

### Rejected alternatives

- **Patch the installed Vivaldi and restore it afterwards.** Simpler, but the user's browser would
  run a branch payload during the run and stay patched with it if the run crashed.
- **Patch the lab copy, as approved first.** The patch breaks the sealed resources of the macOS
  framework: Gatekeeper calls the copy damaged, and after an ad hoc signature it still rejects it
  and asks for approval on every run. Found on the first run, 2026-11-18.
- **Playwright `connectOverCDP`.** It expects page targets with a browser context; `window.html` is
  an extension page that Vivaldi owns. Raw CDP needs a few dozen lines and no dependency.
- **Scenarios as `*.test.ts` files.** `npm test` would pick them up and `make check` would need a
  Vivaldi. Scenarios use the `.live.ts` suffix instead.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `scripts/live/cli.ts` | Parses `--only <name or spec number>`, `--probe <file>`, `--vivaldi <path>`, `--channel stable\|snapshot`, builds `LiveRun` and sets the exit code | Composition root |
| `scripts/live/LiveRun.ts` | Runs the steps of a run in order and hands every result to `Report` | Template method |
| `scripts/live/PayloadServer.ts` | Serves `dist/` and the generated `build.json` on `127.0.0.1` only; refuses paths outside `dist/` | |
| `scripts/live/PayloadInjector.ts` | Bypasses CSP for the lab window, injects the loader before the page loads, reloads | |
| `scripts/live/lab.py` | `prepare`: finds the installation through the installer's `PlatformFactory`, copies it into the lab folder, removes any VivArcDi patch from the copy, verifies the macOS signature; refuses any target inside a real installation | Facade over the installer |
| `scripts/live/LabVivaldi.ts` | Runs `lab.py` and parses its JSON into a `LabBuild` (executable, Vivaldi version, resources folder) | Adapter |
| `scripts/live/ProfileDirectory.ts` | Creates, seeds and deletes the temporary user data directory; refuses a directory that holds `Local State` or a `Default/Preferences`, or that is one of the platform's profile roots | Guard |
| `scripts/live/VivaldiProcess.ts` | Spawns the executable with the lab flags, waits for `DevToolsActivePort`, stops only its own child (`SIGTERM`, then `SIGKILL` after 5 s) | |
| `scripts/live/Cleanup.ts` | Last-in first-out list of async disposers, run exactly once on end, error or signal | |
| `scripts/live/cdp/CdpConnection.ts` | JSON-RPC over the WebSocket of Node 24: `send(method, params)`, `on(event, listener)`, timeouts; takes a socket factory so tests pass a fake | |
| `scripts/live/cdp/WindowTarget.ts` | Lists the targets and picks the one whose URL ends with `/window.html` | |
| `scripts/live/Driver.ts` | The scenario API: `find`, `click`, `press`, `drag`, `waitFor`, `evaluate`, `storage`, `selector(name)`, `screenshot`; clicks and drags use the element's centre from `getBoundingClientRect` and `Input.dispatchMouseEvent` | Facade |
| `scripts/live/ConsoleLog.ts` | Keeps the `Runtime.consoleAPICalled` entries whose first argument starts with `[VivArcDi` | |
| `scripts/live/checks/BootCheck.ts` | Waits up to 30 s for the `active on Vivaldi` line, compares its module list with the modules enabled in `dist/config.json`, fails on any `VivArcDi` error | |
| `scripts/live/checks/SelectorCheck.ts` | Picks the selector file with `SelectorCatalog.bestMatch`, groups selectors by state, enters each state and checks `document.querySelector` for every selector | |
| `scripts/live/checks/SelectorStates.ts` | Enters the states named in `tests/live/selector-states.json`: `default`, `workspace-popup` (click `workspaceButton`), `workspace-editor` (click `workspaceCreate`), `pinned-tab` (`chrome.tabs.update` with `pinned: true`); a selector listed with `notChecked` and a reason is reported as such | Strategy |
| `scripts/live/scenarios/ScenarioCatalog.ts` | Loads `tests/live/scenarios/*.live.ts`; each default-exports `{ name, spec, run(driver) }`; filters by `--only` | |
| `scripts/live/probe/ProbeGuard.ts` | Rejects a probe whose source calls `chrome.storage.*.set/remove/clear`, `chrome.bookmarks.create/update/move/remove/removeTree`, `vivaldi.prefs.set` or `localStorage.setItem/removeItem/clear` | Guard |
| `scripts/live/probe/ProbeRunner.ts` | Wraps the probe in an async function, evaluates it with `awaitPromise` and `returnByValue`, prints the value as JSON | |
| `scripts/live/Report.ts` | Collects `CheckResult` (`pass`, `fail`, `not checked`, detail, screenshot path) and writes the JSON and Markdown files | |
| `tests/live/profile/Preferences.json` | Fixture preferences of the lab profile: tab bar on the left, no welcome page | |
| `tests/live/selector-states.json` | Selector name to state, or to `notChecked` with a reason | |
| `tests/live/scenarios/space-header-shows-each-workspace-name.live.ts` | First scenario: creates a second workspace, switches between the two and reads the header; proves 011/AC-13 | |
| `tests/live/*.test.ts` | Unit tests of the harness with `FakeCdp`, `FakeSpawner` and a temporary folder | |
| `tests/live/test_lab.py` | Unit tests of `lab.py` on fake installations, in the style of `tests/installer/support.py` | |

`scripts/` may import from `src/` for pure logic, as the selector check does with
`SelectorCatalog.bestMatch`; `src/` and `installer/` never import `scripts/`.

### The `live` check

`specs/README.md` gains the third kind next to `auto` and `manual`:

- `live: <scenario name>`: a scenario under `tests/live/scenarios/` whose `name` is that exact text
  proves the criterion on a lab Vivaldi with `npm run live`.

A unit test, `every live check has a scenario`, reads all `spec.md` files and fails when a `live:`
name has no scenario or a scenario names no criterion. 000/AC-17 becomes
`live: boot check finds the active line` and 011/AC-13 becomes
`live: space header shows each workspace name`; both stay in their specs' `manual` checklists
until a first green run on macOS and Debian.

## Vivaldi interface

No selector is added. The harness reads `src/selectors/` as it is. It relies on:

- the `window.html` target in `/json/list` and its URL suffix;
- `chrome.tabs`, `chrome.storage.local` and `vivaldi.prefs.get` in `window.html`, read-only except
  for what a scenario does in the lab profile;
- the boot line written by `VivArcDi.boot`: `<version> active on Vivaldi <version> (selectors
  <version>, modules: <ids>)`.

## Configuration

| Place | Change |
|---|---|
| `package.json` | Script `"live": "npm run build && tsx scripts/live/cli.ts"` |
| `Makefile` | Target `live`; `test-py` also discovers `tests/live` |
| Lab folder | `~/.cache/vivarcdi/lab/<channel>-<version>/` on both platforms, as the spec decided |
| Reports | `build/live/`, already ignored by `.gitignore` |

`src/config.json` does not change.

## Risks

| Risk | Mitigation |
|---|---|
| Copying Vivaldi.app takes 1 GB and time | `cp -c` makes an APFS clone on macOS; the copy is made once per Vivaldi version and reused; the payload is never copied, it is served |
| The unpatched copy differs from the shipped build, so its signature fails | `WindowHtmlPatcher.revert` gives back the original bytes (checked against the installer backup on Tore's Mac: identical, `codesign` ok, `spctl` accepted as Notarized Developer ID); `lab.py` verifies the signature and refuses the copy otherwise |
| The payload behaves differently when served from `127.0.0.1` | The payload builds every URL from its `ResourceLoader` base, page scripts included; the first injected run started all 14 enabled modules and 15 stylesheets with no VivArcDi error |
| CSP bypass hides a CSP problem of the real install | The installed payload is same-origin with `window.html` and never hit CSP; the bypass applies only to the lab window |
| On Debian the copied `chrome-sandbox` loses its setuid bit | Chromium uses the user namespace sandbox when the kernel allows it, as Debian 13 does; if Vivaldi refuses to start, `lab.py` reports it and the harness adds `--no-sandbox` for the lab only, printing a warning; scenarios load only local pages |
| A fresh profile shows a welcome page or a dialog | `--no-first-run`, `--no-default-browser-check` and the fixture preferences; the boot check does not depend on the active tab |
| The preference key of the tab bar position is unknown | T2 reads it from Tore's profile with a probe before writing the fixture |
| Node's WebSocket sends an `Origin` header that Chromium rejects | Start with `--remote-allow-origins=http://127.0.0.1`; the fake CDP test checks that the flag is passed |
| A probe bypasses `ProbeGuard` with an indirect call | The guard catches mistakes, not intent; probes are ours and still run only in the lab profile |
| A scenario leaves Vivaldi in a state the next one does not expect | Scenarios do not share state assumptions: each starts with `driver.reset()`, which closes all tabs but one and returns to the first workspace |
