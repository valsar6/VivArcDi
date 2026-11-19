# 039 Boot self-check

| | |
|---|---|
| Status | Approved |
| Phase | 0 |
| Owner | Tore |
| Approved | 2026-11-19 |
| Amends | [000 Foundations](../000-foundations/spec.md) (boot logging, AC-14, AC-15) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

When something goes wrong while VivArcDi starts in a window, the console holds scattered lines from
several places, some cases leave no line at all, and the user is never told. The only recorded
decision for this spec (Tore, order of work of 2026-11-17) is: **boot self-check, console always,
toast only for severe failures.**

This spec adds a self-check at the end of every start: one tagged summary line in the console that
says which modules started, failed or stayed off, which selector catalog stands in for the running
Vivaldi and which selectors were asked for but are not defined, plus one line per problem. When the
start is severely broken and the window can still show it, one toast of kind `error` says so, once
per window session, through the notice service of [041](../041-write-outcome/spec.md). The
self-check only reports: it stops, restarts or retries nothing.

## User stories

- **US-1.** As a user, I want to be told when a Vivaldi update or a broken install left most of
  VivArcDi off, instead of wondering why the sidebar looks half done.
- **US-2.** As a user, I want no toast when a single feature fails or when everything works, so that
  notices stay rare and mean something.
- **US-3.** As Tore, I want one console line that tells me how the start went in this window, and
  one line per problem, so that a bug report or a snapshot run starts from facts.

## Expected behavior

### Today

What happens at boot on `main` at `a174854`. Every line is confirmed in the code.

| Case | What happens | Where |
|---|---|---|
| The boot itself | `loader.ts` calls `VivArcDi.boot` and discards the promise and the instance | `src/loader.ts:4` |
| Storage open | `PersistentStorage.open` runs before the `try`; it catches its own errors and warns once when it falls back to memory | `src/core/boot/VivArcDi.ts:139`, `src/core/browser/PersistentStorage.ts:73-90` |
| `config.json` or `build.json` missing or not valid JSON | `ResourceLoader` throws (`Cannot load … HTTP …`, or a `SyntaxError`); `boot` logs `[VivArcDi] Startup failed <error>`; nothing is injected; no line says which file | `ResourceLoader.ts:56-61`, `VivArcDi.ts:141-145`, `:166-169` |
| `selectors/index.json` or the chosen catalog file unreadable | Same: `Startup failed` with the loader error | `SelectorCatalog.ts:30-37` |
| Every catalog is newer than the running Vivaldi | One warning `No selectors for Vivaldi <v>, staying inactive`; nothing is injected, no active line; deliberate (000/AC-14: "an unsupported version is left untouched") | `VivArcDi.ts:170-174`, `SelectorCatalog.ts:47-53` |
| The running Vivaldi is newer than every catalog, or its version is unknown | The newest catalog is used silently; only the active line shows both versions. This is the normal state today: `index.json` lists `8.1` only, Tore runs 8.3 | `SelectorCatalog.ts:47-53`, `src/selectors/index.json` |
| `#browser` never appears | `UiReadiness` rejects after 15 s with `Timed out waiting for #browser`; `Startup failed`; no styles, no modules | `UiReadiness.ts:1`, `:38-41`, `VivArcDi.ts:176` |
| A module asks for a selector the catalog does not define | `SelectorCatalog.get` throws `Selector "x" is not defined for Vivaldi 8.1`; if this happens in `start`, it surfaces as that module's start failure only; no list of missing names exists | `SelectorCatalog.ts:75-80` |
| A selector is defined but matches nothing in the window | The payload never checks it; modules that use `DomQuery.require` fail, others wait. Only the live selector check of 046/047 finds it, outside the payload | `scripts/live/checks/SelectorCheck.ts` |
| A module's `start` throws or rejects | `[VivArcDi:<id>] Failed to start <error>`; the other modules start (000/AC-15); the failed module's partial work is not undone | `VivArcDi.ts:247-249` |
| A module catches its own start error | It counts as started: `TodayArchive` stops itself and warns `the archive is off`, and still appears in the active line; the self-check cannot see it either | `src/modules/today/TodayArchive.ts:74-77` |
| A module is `"enabled": false` or has no `enabled` | Skipped without a line | `ModuleRegistry.ts:81-83` |
| `enabled` is not a boolean | One warning on the module's logger; the module stays off | `ModuleSettings.ts:74-78` |
| A required option is missing or wrong (036) | One warning per option from the schema, then the module is skipped without a line saying so | `OptionSchema.ts:59-81`, `VivArcDi.ts:221-223` |
| A module does not fit the window kind (`privateWindows`) | Skipped without a line | `ModuleRegistry.ts:89-91` |
| An id in `config.json` matches no module | `Unknown module "<id>" in config.json` | `VivArcDi.ts:183` |
| The start completes | `[VivArcDi] <version> active on Vivaldi <version> (selectors <v>, modules: <ids or none>)`, at info, even when modules failed | `VivArcDi.ts:188-191` |
| Toasts at boot | Only the storage notice of 041 when the storage works in memory | `WindowServices.ts:32-37` |

Three facts bound what a toast can do at boot:

- **The notice service exists only late.** `WindowServices.open` builds the window's toast after the
  configuration, the catalog and `#browser` are ready (`VivArcDi.ts:178-179`). Every failure before
  that line has no toast to show.
- **The toast is styled only while `activation-marker` runs.** `toast.scss` styles the toast under
  `$root`, which is `#browser[data-vivarcdi-active]` (`src/styles/toast.scss:12`,
  `src/styles/_tokens.scss:1`), and only `ActivationMarker.start` sets that attribute
  (`src/modules/ActivationMarker.ts:18-22`). Without it the toast would be an unstyled `div` inside
  `#browser`.
- **The active line is a contract.** 000/AC-17, the live boot check
  (`scripts/live/checks/BootCheck.ts:8`, regex `active on Vivaldi .*modules: ([^)]*)\)`) and
  `docs/manual/getting-started.md:46` read it. The boot check also fails on any `[VivArcDi` line
  logged as an error (`BootCheck.ts:37-41`).

So the cases where the payload "cannot run at all" (no configuration, no catalog, no `#browser`) are
exactly the ones where a toast cannot be shown or styled. They stay console only (see Q-2).

### After

**Summary line.** Every start ends with exactly one line from the logger `VivArcDi:boot`, whether it
went well, stayed inactive or failed. It comes after the active line when there is one, which keeps
its text and place. It carries:

- the outcome: `active`, `inactive` or `failed at <stage>`, where the stage is `config` (reading
  `config.json` or `build.json`), `selectors` (reading the catalog), `interface` (waiting for
  `#browser`) or `modules` (anything after the notices exist);
- the VivArcDi version, the Vivaldi version and the catalog in use, when known;
- `<started> of <tried> modules started`, where *tried* are the enabled modules that fit the window
  and have valid options;
- the ids of the modules that failed;
- the number of modules off in `config.json`, left out for this kind of window, and off because of
  invalid options;
- the number of selectors asked for but not defined.

For example, on a clean start in a normal window:

```text
[VivArcDi:boot] self-check: active, 14 of 14 modules started, 0 failed (VivArcDi 0.60.1, Vivaldi 8.3.4191.44, selectors 8.1); off: 0 in config, 1 for this window, 0 by options; undefined selectors: 0
```

The line is `info` when there is no problem, `warn` when there is at least one, and `error` when the
start is severe (below) or failed.

**Problem lines.** Each problem has one line of its own, logged once per start:

- a module that failed keeps its existing `[VivArcDi:<id>] Failed to start <error>` line;
- a module off because of invalid options gets `[VivArcDi:<id>] stays off: invalid options`, after
  the warnings of 036, which stay;
- each selector name a module asked for with `get` during `start` that the catalog does not define
  gets one warning with the name and the catalog version;
- a failed start keeps its `Startup failed <error>` line; the summary names the stage.

**Catalog stand-in.** When the catalog in use is older than the running Vivaldi's major.minor, or the
Vivaldi version cannot be read, one `info` line names both versions, for example
`Vivaldi 8.3 has no selector catalog of its own: using 8.1`. It is not a problem: it is the normal
state between a Vivaldi release and its catalog, and it does not count toward any toast.

**Severe start and the toast.** A start is **severe** when two or more of the tried modules failed to
start. Then, if `activation-marker` started (so the toast is styled and visible), the window shows
one notice of kind `error`, once per window session, through `notices.once`:

`VivArcDi could not start 3 of 15 features: details are in the console`

with the real counts. Everything else is console only:

- a single module that fails: the other features work, the console names it;
- modules off by configuration, by window kind or by invalid options: the user chose it, or 036
  already warns;
- an inactive start on a Vivaldi older than every catalog: left untouched by design (000/AC-14);
- a failed start before the notices exist, or a severe start without `activation-marker`: no toast
  can be shown or styled (Q-2).

The boot notice uses the shared toast of 041. If the storage notice of 041 is still visible, the boot
notice replaces its text, as two notices always do (`Toast.show`); both stay in the console.

## Requirements

### Functional

- **FR-1.** Every call of `VivArcDi.start`, and every `boot` whose start throws, logs exactly one
  summary line on the logger `VivArcDi:boot`, with the fields of [After](#after).
- **FR-2.** The summary is `info` without problems, `warn` with at least one problem, `error` when the
  start is severe or failed.
- **FR-3.** The active line keeps its text, its level and its place before the summary.
- **FR-4.** A failed start names its stage: `config`, `selectors`, `interface` or `modules`.
- **FR-5.** The self-check counts the enabled modules that start, that fail, and that stay off by
  configuration, by window kind or by invalid options; the summary lists the ids of failed modules.
- **FR-6.** A module skipped because of invalid options logs one `stays off: invalid options` line on
  its own logger.
- **FR-7.** The selector catalog records each name asked for with `get` that it does not define; the
  self-check logs each recorded name once and counts them. `has` returning false is not recorded.
- **FR-8.** When the catalog in use is older than the running Vivaldi's major.minor, or that version
  is unknown, the boot logs one `info` line with both versions.
- **FR-9.** When two or more tried modules fail and `activation-marker` started, the window shows the
  boot notice with `notices.once`, kind `error`, with the counts of FR-5.
- **FR-10.** No other boot outcome shows a toast.
- **FR-11.** The self-check stops, restarts and retries nothing; failed modules stay as they are today.

### Non-functional

- **NFR-1.** On a clean start the user sees nothing new; the console gains the summary line only.
- **NFR-2.** The self-check adds no DOM query, no timer and no wait to the start.
- **NFR-3.** No new storage key and no change to the stored values.
- **NFR-4.** Every existing test keeps its name and passes; the live boot check of 046 keeps working
  unchanged.
- **NFR-5.** Ships on a `fix/` branch with a patch version change.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names the test, `manual` is a step Tore
performs.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a start completes, THE boot SHALL log one `VivArcDi:boot` summary line after the active line, at `info` when there is no problem | auto: `summarizes a clean start in one line` |
| AC-2 | THE boot SHALL keep the text and level of the active line | auto: `keeps the active line as it is` |
| AC-3 | WHEN a module fails to start, THE summary SHALL list its id, be logged at `warn`, and the module's own error line SHALL stay | auto: `names failed modules in the summary` |
| AC-4 | THE summary SHALL count the modules off in `config.json`, left out for the window kind and off by invalid options | auto: `counts the modules that stay off` |
| AC-5 | IF a module stays off because of invalid options, THEN THE boot SHALL log `stays off: invalid options` on that module's logger | auto: `says when invalid options keep a module off` |
| AC-6 | IF a module asks for a selector the catalog does not define, THEN THE boot SHALL log that name once with the catalog version and count it in the summary | auto: `lists selectors the catalog does not define` |
| AC-7 | WHEN the catalog in use is older than the running Vivaldi, THE boot SHALL log one `info` line with both versions | auto: `says which catalog stands in for a newer Vivaldi` |
| AC-8 | WHEN no catalog fits the running Vivaldi, THE boot SHALL log an `inactive` summary, keep its warning, inject nothing and show no toast | auto: `summarizes an inactive start without a toast` |
| AC-9 | IF `config.json`, `build.json`, the catalog or `#browser` cannot be had, THEN THE summary SHALL say `failed at` the right stage, at `error`, with no toast | auto: `names the stage where startup failed` |
| AC-10 | WHEN two or more modules fail and `activation-marker` started, THE window SHALL show the boot notice once, kind `error`, with the counts | auto: `shows the boot notice when two modules fail` |
| AC-11 | IF exactly one module fails, THEN THE window SHALL show no boot notice | auto: `keeps a single failure in the console` |
| AC-12 | IF `activation-marker` fails, THEN THE window SHALL show no boot notice, whatever else failed | auto: `shows no boot notice without the activation mark` |
| AC-13 | WHILE every tried module starts, THE window SHALL show no boot notice | auto: `shows no boot notice after a clean start` |
| AC-14 | WHEN Tore opens a window on macOS and Debian with the shipped configuration, THE console SHALL show the active line, then the summary at `info` with every enabled module started, and THE window SHALL show no toast | manual |

AC-14 is manual because the live scenarios of 046 receive the driver only, not the console (Q-6);
the failure paths cannot be produced on a real Vivaldi without breaking the install, so the tests
cover them. Existing criteria 000/AC-14, 000/AC-15 and 000/AC-17 keep their checks.

## Out of scope

- Checking in the payload whether defined selectors match the DOM: many need a state first
  (`tests/live/selector-states.json`), and the live selector check of 046 with the snapshot watch of
  047 already does it with those states (Q-3).
- A toast, or any visible sign, for failures before the notice service exists (Q-2).
- Stopping a module whose `start` failed, or undoing its partial work (Q-5).
- Failures after `start` resolves (listeners, observers, page scripts; 038 Q-5).
- Remembering across windows or restarts that the notice was shown (no new storage key).
- Changing the live boot check of 046, or the installer.

## Open questions

- [x] **Q-1. A separate summary line, or a longer active line?** The active line already holds the
  versions and the started ids. Answered (Tore, 2026-11-19): a separate `VivArcDi:boot` line after it; the active
  line is read by 000/AC-17, the live boot check and the user manual, and a second line can change
  level (`warn`, `error`) without touching that contract.
- [x] **Q-2. Severity boundary.** The recorded decision says "toast only for severe failures". The
  code shows that the worst cases (no configuration, no catalog, no `#browser`, `activation-marker`
  down) happen before the toast exists or without its styles. Options: (a) severe = two or more
  modules failed, toast only when `activation-marker` runs, everything else console only; (b) as
  (a), plus a fallback toast with its own inline styles for pre-notice failures; (c) severe = at
  least half the tried modules failed. Answered (Tore, 2026-11-19): (a). Two failures in one start almost always
  share a cause (a Vivaldi update that moved the interface), while one failure leaves the rest of
  VivArcDi working; (b) would put an unstyled or self-styled element into a Vivaldi that VivArcDi
  could not read, against "an unsupported version is left untouched"; (c) waits until 7 of 15
  features are gone.
- [x] **Q-3. Missing selectors.** Answered (Tore, 2026-11-19): count only names asked for with `get` that the
  catalog does not define (FR-7), and leave DOM presence to the live selector check of 046/047,
  which knows the states a selector needs. A boot-time DOM check would report state-dependent
  selectors such as `workspacePopup` as missing on every start.
- [x] **Q-4. Toast text.** Answered (Tore, 2026-11-19):
  `VivArcDi could not start 3 of 15 features: details are in the console`, in English like the
  notices of 041, "features" rather than "modules" because that is the user's word.
- [x] **Q-5. Stop failed modules?** 038 left "what happens after a failed self-check" to this spec.
  Calling `stop()` on a module whose `start` threw half way is untested for all fifteen modules and
  `TodayArchive` already does it for itself (`TodayArchive.ts:74-76`). Answered (Tore, 2026-11-19): report only
  (FR-11); a later spec can stop failed modules once each one has a test for a stop after a partial
  start.
- [x] **Q-6. Live check.** The summary could be checked on a lab Vivaldi by extending the live boot
  check of 046 to require an `info` summary. Answered (Tore, 2026-11-19): not in this spec; keep AC-14 manual and
  extend `BootCheck` in a `docs/` or tooling branch afterwards, so this `fix/` branch touches only
  the payload.
- [x] **Q-7. One notice per window.** Each window, including private and Little Arc windows, boots on
  its own, so a severe start shows the notice once in each new window. Answered (Tore, 2026-11-19): accept it; it
  matches 041 and needs no storage key.

## References

- Order of work of 2026-11-17: "039 boot self-check: console always, toast only for severe failures".
- [000 Foundations](../000-foundations/spec.md): FR-7, AC-14, AC-15, AC-17.
- [036 Module options](../036-module-options/spec.md): option warnings; "toasts are kept for severe
  failures (spec 039)".
- [038 Page scripts](../038-page-scripts/spec.md): Out of scope and Q-5, left to this spec.
- [041 Write outcome](../041-write-outcome/spec.md): `ModuleContext.notices`, `src/core/dom/Notices.ts`.
- [046 Live verification](../046-live-verification/spec.md) and
  [047 Snapshot watch](../047-snapshot-watch/spec.md): the boot check and the selector check.
