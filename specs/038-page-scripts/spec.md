# 038 Page scripts

| | |
|---|---|
| Status | Draft |
| Phase | 0 |
| Owner | Tore |
| Approved | – |
| Amends | [002 Peek](../002-peek/spec.md) (AC-15, design: `executeScript` failures) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Five scripts run inside web pages, not in Vivaldi's interface: `peek-links`, `peek-keys`,
`pinned-keys`, `copy-keys` and `archive-keys` (`src/page/`). Each is bundled as an IIFE that defines
one global, and the interface injects it with `webview.executeScript`. Four of them are injected by
`PageScriptInjector` into every tab and removed again when their module stops; `peek-keys` is
injected by `PeekPanel` into the Peek page only.

The order of work approved by Tore on 2026-11-17 names this spec "page scripts and the uninstall of
`peek-keys`". The details were not written down, so this spec reconstructs them from the code at
`e5eb0b4` (0.59.3). Every finding below says whether it is **confirmed** in the code, with file and
line, or **inferred**. Nothing here is visible to users today; the spec closes gaps that become bugs
as soon as a module stops while pages are open, or when injection fails.

The changes: `peek-keys` can be uninstalled like the other page scripts; the injector never installs
a script after it was told to stop; injection failures are read and logged once instead of being lost;
and the page scripts get tests.

## User stories

- **US-1.** As a user, I want links and shortcuts in my pages to behave as without VivArcDi once a
  VivArcDi feature is stopped, so that a stopped feature never leaves a page half working.
- **US-2.** As a user, I want Esc, Cmd/Ctrl+W and Cmd/Ctrl+O inside a Peek to keep working exactly as
  today.
- **US-3.** As a developer, I want every page script to follow the same install and uninstall rules,
  with tests, so that a new page script cannot forget its cleanup.

## Expected behavior

### Today

**The page scripts.**

| Script | Injected by | Install | Uninstall |
|---|---|---|---|
| `peek-links` | `PageScriptInjector`, from `Peek` | replaces a previous install (`src/page/peek-links.ts:59-64`) | yes (`:69-73`) |
| `pinned-keys` | `PageScriptInjector`, from `PinnedClosing` | replaces (`src/page/pinned-keys.ts:22-23`) | yes (`:38-44`) |
| `copy-keys` | `PageScriptInjector`, from `CopyUrl` | replaces (`src/page/copy-keys.ts:23-24`) | yes (`:39-46`) |
| `archive-keys` | `PageScriptInjector`, from `ArchiveKeys` | replaces (`src/page/archive-keys.ts:15-16`) | yes (`:31-37`) |
| `peek-keys` | `PeekPanel`, on every top-level `loadcommit` of the Peek page | **first install wins**: a boolean flag on `globalThis` makes later installs do nothing (`src/page/peek-keys.ts:14-18`) | **none**: the bundle exports `install` only (`:13`), and `PageScripts` has no `uninstallKeys` (`src/modules/peek/PageScripts.ts:45-66`) |

Findings, confirmed in the code:

- **F-1. `peek-keys` cannot be removed.** Its `keydown` listener is an anonymous function
  (`peek-keys.ts:19-30`) that no code can detach, and a second install with another token is ignored
  (`:15-18`). Today this does no harm: the token is made once per module start (`Peek.ts:55`) and is
  the same for every panel (`Peek.ts:91`), and the panel's webview is thrown away when the Peek
  closes (`PeekController.ts:112-116`, `PeekPanel.ts:79-83`), including on Expand and Split, which
  open the address in a new tab (`PeekController.ts:83-95`). The listener can therefore not outlive
  its panel. It is the only page script that breaks the rule "`stop()` undoes everything `start()`
  did" (CONTRIBUTING, code style).
- **F-2. Late install after stop.** `PageScriptInjector.#inject` waits for `scriptFor` and then runs
  the result on the webview without checking that the injector is still attached
  (`src/core/browser/PageScriptInjector.ts:108-117`). `detach` runs the uninstall code at once
  (`:64-73`). A `scriptFor` still pending at that moment installs the script after the uninstall.
  `Peek` and `PinnedClosing` wait for `tabs.get` in `scriptFor` (`Peek.ts:107-113`,
  `PinnedClosing.ts:69-70`), so the window is real. For Peek the result would be a page that cancels
  the clicks it classifies as Peek and sends messages that nobody reads any more, since `Peek.stop`
  removed the listeners (`Peek.ts:68-79`): those links would do nothing.
- **F-3. Out-of-order installs.** Two injections into the same tab (a `loadcommit` and a `refresh`
  after a pin change, `Peek.ts:135-141`, `PinnedClosing.ts:79-85`) both wait for `tabs.get`; the
  one that resolves last wins, even when it read the older tab state.
- **F-4. Injection failures are lost.** Both injection points call `executeScript` without a
  callback (`PageScriptInjector.ts:121`, `PeekPanel.ts:137`). Only a synchronous throw is caught.
  `PageScriptInjector` logs that once per injector (`:119-128`); `PeekPanel` swallows it without a
  log (`PeekPanel.ts:136-140`), although the design of 002 says "Log once" for this case
  (`specs/002-peek/design.md:77`).
- **F-5. No tests of the page side.** No test imports `src/page/`, and `PageScriptInjector` has no
  test of its own (`tests/core/browser/` has none); it is covered only through the module tests.
  `tests/modules/peek/PageScripts.test.ts:6-12` checks the generated strings only.
- **F-6. Four copies of one pattern.** The four removable scripts each repeat the same registry on
  `globalThis` under a `Symbol.for` key, with the same install-replaces and uninstall code.

Confirmed context: `VivArcDi.stop` exists (`src/core/boot/VivArcDi.ts:197-208`) but nothing in `src/`
calls it (`src/loader.ts:4` discards the instance), and `Peek` never stops itself. `TodayArchive`
stops itself when its start fails (`TodayArchive.ts:74-76`), but `ArchiveKeys` starts last and catches
its own errors. So in a shipped build no page-script module stops while its window is open, and F-1
to F-3 are latent: they show only in tests today, and will show once anything stops a module at run
time (spec 039, or a later on/off switch).

Inferred, not confirmed: when `executeScript` fails asynchronously (pages that refuse extension
scripts, such as `vivaldi://`, `chrome://` and the Chrome Web Store), Chromium reports it through
`chrome.runtime.lastError`, which nobody reads, so the console shows "Unchecked runtime.lastError" on
every navigation of such a page, and the module never learns that the shortcut is missing there. To
be checked on a lab Vivaldi (Q-4).

### After

**Every page script has the same two entry points.** `install(policy)` removes a previous
installation of the same script in that page and installs the new one, so the newest policy and token
win. `uninstall()` removes every listener the script added and leaves the page as before; it does
nothing when the script is not installed. `peek-keys` follows these rules: a second install with a new
token replaces the first, and `PageScripts` offers the code to uninstall it.

**The Peek page removes its key script.** When the Peek closes, the panel runs the uninstall code of
`peek-keys` in its page before it removes the webview. When `Peek` stops, an open Peek closes this way
(002/AC-15).

**Nothing is installed after stop.** Once `PageScriptInjector.detach` has run, a `scriptFor` that
resolves later executes nothing. For each webview only the newest injection request is executed;
an older one that resolves later is dropped.

**Failures are read and logged once.** Both injection points pass a callback to `executeScript`, read
`chrome.runtime.lastError`, and log the first failure of each purpose (for example `Peek links`,
`Peek keys`) once per window session with `logger.warn`, as `PageScriptInjector` already does for a
synchronous throw. The page goes on without the script; links and keys behave as without VivArcDi
there. No toast: nothing is lost, and the interface shortcuts keep working (Q-5).

**One helper.** The install and uninstall registry lives once in `src/page/lib/`, and every page
script uses it (Q-3).

## Requirements

### Functional

- **FR-1.** Every bundle in `src/page/` exports `install` and `uninstall`.
- **FR-2.** `install` replaces a previous installation of the same script in the page; after it, only
  the newest policy and token are in effect.
- **FR-3.** `uninstall` removes every listener the script added and does nothing when the script is
  not installed.
- **FR-4.** `PageScripts` builds the uninstall code of `peek-keys`, and the Peek panel runs it in its
  page before the panel is removed.
- **FR-5.** After `PageScriptInjector.detach`, no install code reaches any page, however late its
  `scriptFor` resolves.
- **FR-6.** For one webview, an injection request that resolves after a newer request for the same
  webview is dropped.
- **FR-7.** Every `executeScript` call reads `chrome.runtime.lastError`; the first failure of each
  purpose is logged once per window session with `logger.warn`, including in `PeekPanel`.
- **FR-8.** The install and uninstall registry of the page scripts is written once, in
  `src/page/lib/`.

### Non-functional

- **NFR-1.** No change users can see: the same links open in Peek, the same shortcuts work in pages
  and in the Peek, with the same options.
- **NFR-2.** No new message type, token rule or permission; the channel of `PageChannel` stays as it
  is.
- **NFR-3.** Every existing test keeps its name and passes.
- **NFR-4.** Ships on a `fix/` branch with a patch version change (Q-6).

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names the test, `manual` is a step Tore
performs.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE bundles in `src/page/` SHALL each export `install` and `uninstall` | auto: `every page script exports install and uninstall` |
| AC-2 | WHEN a page script is installed twice, THE page SHALL hold one listener, with the newest policy | auto: `a second install replaces the first` |
| AC-3 | WHEN a page script is uninstalled, THE page SHALL hold none of its listeners | auto: `uninstall leaves the page as before` |
| AC-4 | IF a page script is not installed, THEN its uninstall SHALL do nothing | auto: `uninstall without install does nothing` |
| AC-5 | WHEN `peek-keys` is installed again with a new token, THE forwarded keys SHALL carry the new token | auto: `peek keys use the newest token` |
| AC-6 | WHEN the Peek closes, THE panel SHALL run the uninstall code of `peek-keys` in its page before removing it | auto: `peek panel uninstalls its key script before closing` |
| AC-7 | IF `scriptFor` resolves after the injector detached, THEN THE injector SHALL execute nothing in that page | auto: `injector installs nothing after detach` |
| AC-8 | IF an older injection request for a webview resolves after a newer one, THEN THE injector SHALL drop it | auto: `injector keeps the newest request of a webview` |
| AC-9 | IF `executeScript` reports a failure through `chrome.runtime.lastError`, THEN THE injector SHALL log one warning for its purpose per session | auto: `injector warns once when a page refuses the script` |
| AC-10 | IF injecting the Peek key script fails, THEN THE panel SHALL log one warning per session and the Peek SHALL stay usable with its buttons | auto: `peek panel warns once when its key script fails` |
| AC-11 | WHEN the module stops with a Peek open, THE module SHALL remove the panel, its listeners and the page scripts of every tab | auto: `peek module cleans up on stop` |
| AC-12 | WHEN Tore uses Esc, Cmd/Ctrl+W and Cmd/Ctrl+O inside a Peek, Cmd/Ctrl+W in a pinned tab, Cmd/Ctrl+Shift+C and Cmd/Ctrl+Shift+A in a page, on macOS and Debian, THE shortcuts SHALL work as before | manual |
| AC-13 | WHEN Tore opens `vivaldi://settings` and the Chrome Web Store in tabs, THE interface console SHALL show at most one VivArcDi warning per page script and no "Unchecked runtime.lastError" | manual |

AC-11 is the existing test of 002/AC-15, extended to the Peek key script; it keeps its name. AC-12 and
AC-13 are manual until the lab harness of 046 can send keys into a tab page and read the interface
console (Q-7).

## Out of scope

- Calling `VivArcDi.stop`, or stopping and starting a module while the window is open: no code does
  it today, and spec 039 decides what happens after a failed self-check.
- Turning a module or a Peek trigger off without reloading the window.
- The `consolemessage` fallback channel and its token check (`PageChannel.ts:19-23`, `Peek.ts:151-161`).
- The page scripts of spec 024 (`boost-apply`, `zap-picker`), which do not exist yet; they follow
  FR-1 to FR-3 when they are written.
- Notices (041): no toast for a missing page script (Q-5).

## Open questions

- [x] **Q-1. Scope confirmed.** The approved title names only the `peek-keys` uninstall. This draft
  adds F-2 (late install), F-3 (out-of-order installs), F-4 (lost failures) and tests. Keep them in
  038? Recommendation: yes; they live in the same two files, are small, and F-2 is the same kind of
  leak as F-1.
- [x] **Q-2. Is the `peek-keys` uninstall worth it?** F-1 shows the listener dies with the panel's
  webview today. Alternatives: (a) add `uninstall` and run it on close, as FR-4 says; (b) only make
  `install` replace and export `uninstall`, without running it on close; (c) leave `peek-keys` as it
  is and document why. Recommendation: (a); it costs one `executeScript` per close and keeps one rule
  for all page scripts, so a later change (a reused or kept panel webview) cannot leak.
- [x] **Q-3. Shared helper.** FR-8 removes four copies of the registry (F-6). It changes four page
  scripts that work today. Recommendation: yes, in the same `fix/` branch, covered by AC-1 to AC-4.
- [x] **Q-4. What fails, and how.** It is inferred, not confirmed, that `vivaldi://` pages and the Web
  Store refuse `executeScript` asynchronously and print "Unchecked runtime.lastError". Recommendation:
  check it with a probe before the design and adjust FR-7 if Vivaldi behaves otherwise. Tore's
  answer: a probe that Tore runs himself on his own Vivaldi, not `npm run live`.
- [x] **Q-5. Toast.** Should a page script that cannot be injected anywhere show a notice of 041?
  Recommendation: no; nothing is lost, the interface shortcuts still work, and a toast on every
  `vivaldi://` page would be noise. 039 can decide on a toast if no page at all accepts scripts.
- [x] **Q-6. Branch and version.** Recommendation: `fix/page-scripts`, patch version, after 037 is
  merged.
- [x] **Q-7. Live checks.** AC-12 and AC-13 could become `live:` scenarios if the harness of 046 can
  dispatch keys into a tab's webview and collect the interface console. Recommendation: keep them
  `manual` in 038 and open a follow-up for the harness, rather than grow 046 inside this spec.

## References

- [002 Peek](../002-peek/spec.md) and its design: page scripts, `PageScriptInjector`, AC-15.
- [003 Favorites and pinned tabs](../003-pinned-tabs-and-folders/spec.md): `pinned-keys`, the generic
  injector.
- [004 Today tabs and keyboard](../004-today-tabs-and-keyboard/spec.md): `archive-keys` and `copy-keys`.
- [041 Write outcome](../041-write-outcome/spec.md): the notice service, not used here (Q-5).
- [046 Live verification](../046-live-verification/spec.md): probes and `live:` checks.
- `docs/architecture.md`: how page scripts are built and injected.
- Order of work approved by Tore on 2026-11-17: "038 page scripts and the uninstall of `peek-keys`".
