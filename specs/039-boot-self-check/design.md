# 039 Boot self-check: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

## Approach

One collector, three small changes where the facts are, and a boot that hands them over.

**One report per start.** `BootReport` (`src/core/boot/BootReport.ts`) is created at the top of
`VivArcDi.start` and is told, step by step, what the start reached: the stage it entered, the build
versions, the selector catalog, how many modules the registry left out, and the outcome of every
module it tried. At the end the boot calls `summarize(outcome)` once, which logs the problem lines of
the catalog and the summary line on the logger `VivArcDi:boot` (FR-1, FR-2, FR-4, FR-5, FR-7), and
`notify(outcome, notices)`, which shows the boot notice only for a severe start with the activation
mark (FR-9, FR-10). The report holds no DOM, no timer and no storage (NFR-2, NFR-3); it never stops,
restarts or retries anything (FR-11).

**The facts come from where they are known.** `SelectorCatalog.get` remembers the names it does not
define and the catalog tells whether it stands in for a newer Vivaldi (FR-7, FR-8);
`ModuleRegistry.createEnabled` counts the modules it leaves out by configuration and by window kind;
the code that starts one module returns whether it started, failed or stayed off by invalid options,
and logs `stays off: invalid options` (FR-5, FR-6).

**`start` owns its failure.** Today `boot` catches what `start` throws and logs `Startup failed`.
The summary must come after that line and must be logged by every call of `start` (FR-1), so the
`try`/`catch` moves into `start`: the same `Startup failed <error>` line, on the same `VivArcDi`
logger at `error`, then the summary at `error` with the stage. `start` no longer rejects, and `boot`
just awaits it.

**`VivArcDi.ts` makes room.** The file is at the 200-line limit today (200 counted lines). Starting
one module, which builds the whole `ModuleContext`, moves into `ModuleStarter`
(`src/core/boot/ModuleStarter.ts`), a pure extraction done first, with no change in behavior. The boot
keeps the sequence of stages; the starter knows how one module is started.

```text
VivArcDi.start
  ├─ BootReport (logger VivArcDi:boot) ◀── enter(stage), useBuild, useCatalog, skip, record
  │    ├─ SelectorCatalog: version, standsInFor(vivaldi), undefinedNames
  │    └─ summarize(outcome): selector warnings, summary line (info / warn / error)
  ├─ ModuleRegistry.createEnabled ──▶ modules, unknown, skipped { config, window }
  ├─ ModuleStarter.start(entry) ──▶ 'started' | 'failed' | 'invalid-options'
  └─ BootReport.notify(outcome, notices) ──▶ Notices.once('boot-failed', …, 'error')
```

### Rejected alternatives

- **Counting in `VivArcDi` itself**: six counters, the level rule and the line format would push the
  file far past its limit, and the rule could only be tested through a whole boot. The report is
  tested on its own and through the boot.
- **Logging the summary in `boot`**: `start` is what the tests and the spec call (FR-1: "every call
  of `VivArcDi.start`"); `boot` is not unit-tested.
- **Keeping `start` rejecting and logging the summary before rethrowing**: the summary would come
  before `Startup failed`, so the last line of a failed start would not be the summary.
- **Reading the activation mark from the DOM** (`#browser[data-vivarcdi-active]`): a DOM query at
  boot (NFR-2). The report already knows which modules started.
- **Importing `ActivationMarker` to read its id**: `src/core/` never imports `src/modules/` (spec 034).
  The id is one constant in the report, documented as the module whose mark styles the toast.
- **Moving `VivArcDiDependencies` out to save lines**: it saves 15 lines; the boot would still sit at
  the limit after this spec. The module starter is a real responsibility and frees about 35.
- **Recording undefined names outside the catalog** (a wrapper around `selectors`): every module
  would receive a different object than today, and `ActivationMarker` and the boot itself ask the
  catalog directly. One `Set` inside `get` is the smallest change.

## Components

### Module starter (`src/core/boot/ModuleStarter.ts`, new)

```ts
export interface ModuleServices {
  document: Document;
  tabs: BrowserTabs;
  bookmarks: BrowserBookmarks;
  bookmarkWriter: BookmarkWriter;
  runtime: BrowserRuntime;
  windows: BrowserWindows;
  search: BrowserSearch;
  history: BrowserHistory;
  prefs: BrowserPrefs;
  payload: PayloadSource;
}

export class ModuleStarter {
  constructor(services: ModuleServices, logger: Logger);
  public async start(entry: EnabledModule, start: StartServices): Promise<ModuleOutcome>;
}
```

- Each field of `ModuleServices` has a one-line doc taken from `VivArcDiDependencies`.
- `start` is today's `VivArcDi.#startModule` (`VivArcDi.ts:219-250`): it takes the module logger
  `logger.child(entry.id)` first, reads `settings.optionsOf(entry.id)`, builds the `ModuleContext`
  from the services and from `start`, and awaits `entry.module.start(context)`.
- In T1 it returns `Promise<boolean>` (`true` when the module started), so the extraction changes
  nothing. In T5 it returns `ModuleOutcome` (type from `BootReport.ts`): `invalid-options` after
  logging `logger.info('stays off: invalid options')` on the module logger (FR-6, AC-5); `failed`
  after the existing `logger.error('Failed to start', error)` (AC-3); `started` otherwise.
- `VivArcDi` builds it in its constructor with the services it receives (`windows` and `search`
  defaulting to `new BrowserWindows(undefined)` and `new BrowserSearch(undefined)` there, as
  `#startModule` does today, and `payload: loader`). The fields `#tabs`, `#bookmarks`,
  `#bookmarkWriter`, `#windows`, `#search`, `#history` and `#prefs` leave `VivArcDi`; `#runtime`
  stays for `#isPrivateWindow`. `VivArcDiDependencies` is unchanged.
- About 75 lines. `VivArcDi.ts` goes from 200 to about 165 counted lines after T1, about 187 after
  T6.

### Selector catalog (`src/core/dom/SelectorCatalog.ts`)

| Member | Change |
|---|---|
| `#undefined = new Set<string>()` | New private field |
| `get(name)` | Before throwing, adds `name` to `#undefined`. The error text is unchanged |
| `public get undefinedNames(): string[]` (new) | The names `get` was asked for and does not define, in the order first asked, each once. JSDoc: `has` returning false is not recorded (FR-7) |
| `public standsInFor(vivaldiVersion: string): boolean` (new) | `true` when the catalog has a version and either `vivaldiVersion` cannot be parsed or the catalog's major.minor is older (`compareVersions(version, vivaldiVersion) < 0`); `false` for a matching catalog and for an empty catalog (FR-8) |

About 10 more lines; the file stays near 110.

### Module registry (`src/core/boot/ModuleRegistry.ts`)

```ts
export interface SkippedModules {
  /** Registered modules named in `config.json` whose `enabled` is not `true`. */
  config: number;
  /** Enabled modules whose `privateWindows` policy does not fit the window. */
  window: number;
}

public createEnabled(settings, privateWindow = false): {
  modules: EnabledModule[];
  unknown: string[];
  skipped: SkippedModules;
};
```

- The loop looks the class up first: an unregistered id goes to `unknown` when it is enabled and is
  ignored otherwise (as today); a registered id whose `enabled` is not `true` counts in
  `skipped.config`; one that does not fit the window counts in `skipped.window`.
- Registered modules that `config.json` does not name at all are not counted: there is nothing to
  read. A non-boolean `enabled` (`"yes"`) counts as off in `config.json`, after the warning of 036,
  which stays.
- `modules` and `unknown` keep their content and order; callers that destructure two fields still
  compile.

### Boot report (`src/core/boot/BootReport.ts`, new)

```ts
export type BootStage = 'config' | 'selectors' | 'interface' | 'modules';
export type BootOutcome = 'active' | 'inactive' | 'failed';
export type ModuleOutcome = 'started' | 'failed' | 'invalid-options';

export interface CatalogFacts {
  readonly version: string | null;
  readonly undefinedNames: readonly string[];
  standsInFor(vivaldiVersion: string): boolean;
}

export const BOOT_NOTICE_KEY = 'boot-failed';
export const MARKING_MODULE = 'activation-marker';
export const SEVERE_FAILURES = 2;

export function bootNoticeText(failed: number, tried: number): string;

export class BootReport {
  constructor(logger: Logger);
  public enter(stage: BootStage): void;
  public useBuild(build: BuildInfo): void;
  public useCatalog(catalog: CatalogFacts): void;
  public skip(config: number, window: number): void;
  public record(id: string, outcome: ModuleOutcome): void;
  public summarize(outcome: BootOutcome): void;
  public notify(outcome: BootOutcome, notices: Pick<NoticeBoard, 'once'> | null): void;
}
```

`CatalogFacts` is what the report needs of `SelectorCatalog`, which satisfies it structurally once T2
is merged; the report's own tests pass a plain object. `skip` takes two numbers rather than
`SkippedModules`, so T3 and T4 share no file. Each export has JSDoc.

**State.** The stage starts at `config`. `useBuild` keeps the build; `useCatalog` keeps the catalog
and, when the build is known and `catalog.standsInFor(build.vivaldiVersion)` is true, logs at `info`:

```text
[VivArcDi:boot] Vivaldi 8.3 has no selector catalog of its own: using 8.1
```

The Vivaldi part is the first two dot-separated parts of `build.vivaldiVersion`, or the whole value
when it has fewer (`Vivaldi unknown has no selector catalog of its own: using 8.1`) (FR-8, AC-7). It
counts as no problem. `record` keeps the ids by outcome in three arrays, in start order; *tried* is
started plus failed.

**`summarize(outcome)`**, called exactly once per `start` (FR-1):

1. When a catalog is known, one `warn` per name of `catalog.undefinedNames`:
   `selector "<name>" is not defined in catalog <version>` (AC-6). The set in the catalog already
   holds each name once.
2. One summary line at the level below:

```text
self-check: <result>, <started> of <tried> modules started, <failed> failed[: <ids>] (VivArcDi <v>, Vivaldi <v>, selectors <v>); off: <c> in config, <w> for this window, <o> by options; undefined selectors: <n>
```

| Field | Value |
|---|---|
| `<result>` | `active`, `inactive`, or `failed at <stage>` with the stage entered last (FR-4) |
| `: <ids>` | Only when at least one module failed: the ids joined with `, ` (AC-3) |
| VivArcDi and Vivaldi | From the build; `unknown` before `build.json` is read |
| selectors | The catalog version; `none` for an empty catalog; `unknown` before the catalog is read |
| `off` | `skip` counts and the number of `invalid-options` records; `0` when the start never got there |
| undefined selectors | The length of `undefinedNames` (`0` without a catalog) |

Clean start in the tests (AC-1):

```text
[test:boot] self-check: active, 1 of 1 modules started, 0 failed (VivArcDi 0.1.0, Vivaldi 8.1.3740.12, selectors 8.1); off: 0 in config, 0 for this window, 0 by options; undefined selectors: 0
```

**Level** (FR-2), in a private `#level(outcome)` with a `#problems()` count to keep complexity low:

| Level | When |
|---|---|
| `error` | `failed`, or `active` with at least `SEVERE_FAILURES` failed modules (severe) |
| `warn` | `inactive`; or any problem: a failed module, a module off by invalid options, an undefined selector |
| `info` | Otherwise: modules off in `config.json` or for this window and a stand-in catalog are not problems |

`inactive` is `warn` because the warning `No selectors for Vivaldi <v>, staying inactive` already is;
the spec does not name a level for it.

**`notify(outcome, notices)`** calls
`notices.once(BOOT_NOTICE_KEY, bootNoticeText(failed, tried), 'error')` only when the outcome is
`active`, at least `SEVERE_FAILURES` modules failed, and `MARKING_MODULE` is among the started ids
(FR-9). Every other case does nothing (FR-10): one failure (AC-11), a clean start (AC-13), the marker
failed or off (AC-12), `inactive` and `failed` (AC-8, AC-9), where `notices` may also be `null`.

`bootNoticeText(3, 15)` is `VivArcDi could not start 3 of 15 features: details are in the console`
(Q-4). `MARKING_MODULE` has the JSDoc "The module whose mark styles the toast; without it the notice
would be an unstyled element" (`src/styles/toast.scss:12`).

About 120 lines, no method over 15 lines, complexity under 6.

### Boot (`src/core/boot/VivArcDi.ts`)

`start` becomes:

```ts
public async start(): Promise<void> {
  const report = new BootReport(this.#logger.child('boot'));
  let outcome: BootOutcome;
  try {
    outcome = await this.#run(report);
  } catch (error) {
    this.#logger.error('Startup failed', error);
    outcome = 'failed';
  }
  report.summarize(outcome);
  report.notify(outcome, this.#notices);
}
```

`#run(report): Promise<'active' | 'inactive'>` is today's body of `start` with these calls:

| Where | Call |
|---|---|
| After `config.json` and `build.json` resolve | `report.useBuild(build)`, `report.enter('selectors')` |
| After `SelectorCatalog.load` | `report.useCatalog(selectors)`; the inactive branch keeps its warning and returns `'inactive'` |
| Before `UiReadiness.waitFor` | `report.enter('interface')`; the styles and `WindowServices.open` belong to this stage |
| After `this.#notices = services.notices` | `report.enter('modules')` (the spec's "anything after the notices exist") |
| After `createEnabled` | `report.skip(skipped.config, skipped.window)` |
| For each entry | `const outcome = await this.#starter.start(entry, …)`; `report.record(entry.id, outcome)`; `this.#started.push(entry)` when `started` |
| End | the active line, unchanged in text, level and place (FR-3, AC-2), then `return 'active'` |

- `boot` loses its `try`/`catch` and awaits `app.start()`; its JSDoc keeps "Startup errors are
  logged, never thrown". `start`'s JSDoc says it never rejects: a failure is logged as
  `Startup failed` and in the summary.
- `notify` is added in T6; until then `start` ends with `summarize`.
- The window kind is still asked after the notices exist; `#isPrivateWindow` keeps its own catch.

Lines at the end of a start, in order:

| Start | Lines (tag, level) |
|---|---|
| Clean | `[VivArcDi]` active line (info), `[VivArcDi:boot]` summary (info) |
| Catalog stands in | `[VivArcDi:boot]` stand-in (info) right after the catalog is read, …, summary (info) |
| One module fails | `[VivArcDi:<id>] Failed to start` (error), active line, summary (warn) |
| Invalid options | the 036 warnings, `[VivArcDi:<id>] stays off: invalid options` (info), active line, summary (warn) |
| Undefined selector | active line, `selector "x" is not defined in catalog 8.1` (warn), summary (warn) |
| Two modules fail | two `Failed to start` (error), active line, summary (error), boot notice |
| Inactive | `No selectors for Vivaldi …, staying inactive` (warn), summary `inactive` (warn) |
| Failed | `[VivArcDi] Startup failed <error>` (error), summary `failed at <stage>` (error) |

`stays off: invalid options` is `info`: the warnings of 036 already carry the problem at `warn` on the
same logger, and the existing test `module without a required option stays off with a warning`
expects exactly one warning there.

## Tests

Names identical to the `auto:` checks.

| AC | Test | File |
|---|---|---|
| AC-1 | `summarizes a clean start in one line` | `tests/loader/BootSelfCheck.test.ts` |
| AC-2 | `keeps the active line as it is` | `tests/loader/BootSelfCheck.test.ts` |
| AC-3 | `names failed modules in the summary` | `tests/loader/BootSelfCheck.test.ts` |
| AC-4 | `counts the modules that stay off` | `tests/loader/BootSelfCheck.test.ts` |
| AC-5 | `says when invalid options keep a module off` | `tests/loader/BootSelfCheck.test.ts` |
| AC-6 | `lists selectors the catalog does not define` | `tests/loader/BootSelfCheck.test.ts` |
| AC-7 | `says which catalog stands in for a newer Vivaldi` | `tests/loader/BootSelfCheck.test.ts` |
| AC-8 | `summarizes an inactive start without a toast` | `tests/loader/BootSelfCheck.test.ts` |
| AC-9 | `names the stage where startup failed` | `tests/loader/BootSelfCheck.test.ts` |
| AC-10 | `shows the boot notice when two modules fail` | `tests/loader/BootSelfCheck.test.ts` |
| AC-11 | `keeps a single failure in the console` | `tests/loader/BootSelfCheck.test.ts` |
| AC-12 | `shows no boot notice without the activation mark` | `tests/loader/BootSelfCheck.test.ts` |
| AC-13 | `shows no boot notice after a clean start` | `tests/loader/BootSelfCheck.test.ts` |

Every AC test boots a real `VivArcDi` over the fakes of `tests/loader/fakes.ts`, reads `SilentSink`
lines and the toast elements under the fake `#browser`, as `warns once when nothing can be saved`
does.

- **Shared boot fixture.** `createApp`, `AppOptions`, `savingStorage`, `runtimeAnswering`, `seen` and
  the fixture modules `Broken`, `Hidden`, `Private`, `Configured` and `Follower` move from
  `tests/loader/VivArcDi.test.ts` to `tests/loader/boot.ts` and are exported; `VivArcDi.test.ts`
  imports them and keeps every test body. `AppOptions` gains, all optional so no existing call
  changes: `missing?: string[]` (payload files the loader leaves out), `browser?: boolean` (`false`
  for a document without `#browser`), and in T6 `marker?: ModuleClass` (the class registered under
  `activation-marker`, `ActivationMarker` by default). New fixture modules: `Asker` (id `asker`,
  asks `get('missing')` twice inside its own `try`/`catch` and starts), in T6 `AlsoBroken`
  (id `also-broken`, throws) and `BrokenMarker` (id `activation-marker`, throws). Helpers
  `linesOf(sink, tag)` and `summaryOf(sink)` (the `[test:boot]` line whose text starts with
  `self-check:`, with its level).
- **AC-1** default app: the last two lines are the active line on `[test]` and the summary above,
  both `info`; exactly one `self-check:` line in all.
- **AC-2** with `broken` and the marker: the active line is
  `0.1.0 active on Vivaldi 8.1.3740.12 (selectors 8.1, modules: activation-marker)` at `info`, and
  it precedes the summary.
- **AC-3** with `broken` and the marker: the summary is `warn`, contains `1 failed: broken`, and the
  `[test:broken]` `Failed to start` error line is still there.
- **AC-4** with `hidden` off, `private` enabled in a normal window, `configured` enabled without
  `clientId`, and the marker: `off: 1 in config, 1 for this window, 1 by options`, and
  `1 of 1 modules started`.
- **AC-5** with `configured` enabled without `clientId`: one `info` line `stays off: invalid options`
  on `[test:configured]`, after its 036 warning; `startedModules` is empty.
- **AC-6** with `asker` and the marker: one `warn` line
  `selector "missing" is not defined in catalog 8.1` on `[test:boot]`, before the summary, which is
  `warn` and ends with `undefined selectors: 1`.
- **AC-7** with `vivaldiVersion: '8.3.4191.44'`: one `info` line
  `Vivaldi 8.3 has no selector catalog of its own: using 8.1`, and the summary stays `info`; again
  with `'unknown'`: `Vivaldi unknown has no selector catalog of its own: using 8.1`. With the default
  `8.1.3740.12`, no such line.
- **AC-8** with `vivaldiVersion: '7.0.1.1'`: the `staying inactive` warning, then a `warn` summary
  starting `self-check: inactive` with `selectors none`; no style in `document.head`, no toast under
  `#browser`.
- **AC-9** four boots: `missing: ['config.json']` and `missing: ['build.json']` give
  `failed at config`, `missing: ['selectors/8.1.json']` gives `failed at selectors`, and
  `browser: false` gives `failed at interface`. Each logs `Startup failed` at `error` on `[test]`,
  then the summary at `error`, and `app.start()` resolves. The interface case puts a no-op
  `MutationObserver` on `globalThis` and enables `mock.timers` for `setTimeout`, lets the loader's
  promises settle with `setImmediate`, ticks 15 000 ms, and restores both. No toast element exists in
  any of the four.
- **AC-10** with `broken`, `also-broken` and the marker: one toast under `#browser`, kind `error`,
  text `VivArcDi could not start 2 of 3 features: details are in the console`; the summary is
  `error`. `app.stop()` removes it.
- **AC-11** with `broken` and the marker: no toast, summary `warn`.
- **AC-12** with `marker: BrokenMarker`, `broken` and `also-broken`: three failures, summary `error`,
  no toast.
- **AC-13** default app and `follower`: no toast, summary `info`.

Unit tests with their own names, not tied to an AC:

| Test | File | Task |
|---|---|---|
| `get records the names it does not define` | `tests/loader/SelectorCatalog.test.ts` | T2 |
| `standsInFor tells an older catalog from a matching one` | `tests/loader/SelectorCatalog.test.ts` | T2 |
| `createEnabled counts the modules it leaves out` | `tests/loader/ModuleRegistry.test.ts` | T3 |
| `summary line has the same fields for every result` | `tests/core/boot/BootReport.test.ts` (new) | T4 |
| `summary level follows the problems` | `tests/core/boot/BootReport.test.ts` | T4 |
| `boot notice needs two failures and the activation mark` | `tests/core/boot/BootReport.test.ts` | T4 |

Existing tests:

- Every existing test keeps its name and body (NFR-4). Only the imports of
  `tests/loader/VivArcDi.test.ts` change, in T5.
- `start stays inactive on a Vivaldi older than every catalog` still finds the `staying inactive`
  warning as `sink.lines[0]`: nothing is logged before the catalog, and an empty catalog stands in for
  nothing.
- `treats an unreadable window as normal` still counts one warning: `private` off for a normal window
  is not a problem, so the summary is `info`.
- `module without a required option stays off with a warning` still finds one warning on
  `[test:configured]`, since `stays off` is `info`.
- `tests/loader/PrivateWindow.test.ts` boots the real registry over a catalog with `browser` only, so
  most modules fail and the normal-window run is severe: it now logs an `error` summary and shows the
  boot notice, which `app.stop()` removes with its timer. Its three tests read storage attempts, the
  started ids and the private mark, none of which change.

## Vivaldi interface

None new. The notice uses the shared toast of 041 under the `browser` selector, styled by
`toast.css` while `activation-marker` runs.

## Configuration

None. No option, no storage key (NFR-3).

## Limits

| File | Lines today | After | Note |
|---|---|---|---|
| `src/core/boot/VivArcDi.ts` | 200 | about 187 | at the limit today; T1 frees about 35 |
| `src/core/boot/ModuleStarter.ts` | new | about 75 | |
| `src/core/boot/BootReport.ts` | new | about 120 | `max-params` 2 at most, complexity under 6 |
| `src/core/dom/SelectorCatalog.ts` | 99 | about 110 | |
| `src/core/boot/ModuleRegistry.ts` | 96 | about 110 | the loop at complexity 5 |

## Risks

| Risk | Mitigation |
|---|---|
| A severe start logs its summary at `error`, which the live boot check of 046 counts as a failure | Such a start already logs two `Failed to start` errors, so the check fails today as well; on a clean start nothing new is at `error` (NFR-4) |
| The summary line is mistaken for the active line by the boot check's regex `active on Vivaldi .*modules: ([^)]*)\)` | The summary says `active,` and never `active on Vivaldi`; the active line also comes first |
| `ModuleStarter` changes the context a module receives | T1 moves the code without editing it and runs alone on `VivArcDi.ts`; every module and boot test keeps passing |
| A name asked for with `get` after `start` (in a listener) is recorded but never logged | Failures after `start` are out of scope (spec); the set is read once, at the summary |
| A Vivaldi without `#browser` waits 15 s before the summary appears | Unchanged timing (NFR-2); the summary names `interface` |
| The boot notice replaces the storage notice of 041 in a window where both apply | As the spec says: one toast per window, both stay in the console |
| `PrivateWindow.test.ts` now shows a toast in its normal-window run | `app.stop()` removes it and cancels its timer; the test reads nothing the toast touches |

## Open questions

- [ ] **Level of `stays off: invalid options`.** The spec names the line but not its level. The
  design uses `info`, because the 036 warning on the same logger already says `the module stays off`
  at `warn`, and the summary turns `warn`. Alternative: `warn`, which needs the body of
  `module without a required option stays off with a warning` changed to expect two warnings.
- [ ] **Level of an inactive summary.** The spec does not say whether `inactive` is a problem. The
  design uses `warn`, matching the existing `staying inactive` warning. Alternative: `info`, since
  000/AC-14 makes inactivity deliberate.
