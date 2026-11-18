# 038 Page scripts: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

Three pieces, one per side of `executeScript`, and small changes where they are used.

**One install registry for the page side.** `PageInstall` (`src/page/lib/PageInstall.ts`) holds,
under one `Symbol.for` key on `globalThis`, whatever a page script attached, and replaces or removes
it. `PageListener` in the same file is the common thing to attach: one capture-phase listener on
`globalThis`. Every page script becomes a few lines around them, and `peek-keys` gains `uninstall`
(FR-1 to FR-3, FR-8).

**One runner for every `executeScript`.** `ScriptRunner` (`src/core/browser/ScriptRunner.ts`) calls
`webview.executeScript` with a callback, reads `chrome.runtime.lastError` in it through
`BrowserRuntime`, logs a page that went away at debug level and warns once about any other failure
or a synchronous throw (FR-7). One runner exists per purpose and window session: one inside each
`PageScriptInjector`, one for the Peek keys built once by `Peek`. `PeekPanel` and the injector no
longer call `executeScript` themselves.

**The injector runs only the newest request.** Each tracked webview remembers the number of its
latest request. When `scriptFor` resolves, the code runs only if the webview is still tracked and the
number is still its latest. `detach` clears the tracked webviews, so the same check covers a late
install after stop (FR-5) and an older request that resolves last (FR-6).

**The panel uninstalls its key script.** `PageScripts.uninstallKeys()` builds the uninstall code;
`PeekPanel.remove()` runs it in its page before it removes its elements (FR-4). Every way a Peek
closes goes through `remove()`: Close, the backdrop, Esc, Expand, Split, a new Peek, a tab switch and
`Peek.stop` (`PeekController.ts:112-116`).

```text
page side                              interface side
peek-links  ─┐                         Peek ──────────┬─ PageScriptInjector ─┐
peek-keys   ─┤ install / uninstall     PinnedClosing ─┤  (request numbers)   │
pinned-keys ─┼─▶ PageInstall           CopyUrl ───────┤                      ├─▶ ScriptRunner ─▶ webview.executeScript
copy-keys   ─┤   └─ PageListener       ArchiveKeys ───┘                      │      │  callback: BrowserRuntime.lastError
archive-keys ┘                         PeekPanel (Peek keys, install/remove) ┘      └─ Logger.debug / warn once
```

### Rejected alternatives

- **Reading `globalThis.chrome.runtime.lastError` in the runner**: a hidden global that tests would
  have to patch. `BrowserRuntime` already owns `chrome.runtime` and reaches every module through
  `ModuleContext.runtime`; it gets one getter.
- **The warning flag in both the injector and the panel**: two copies of the once-per-purpose rule
  and of the benign-case rule (DRY). The runner holds both once.
- **Waiting for the uninstall callback before removing the panel**: the close would wait on the page,
  and the listener dies with the webview anyway (spec, F-1). The call is made first and not awaited.
- **An `AbortController` or a pending-promise map per webview**: a number on the tracked entry does
  the same with no cleanup, and `detach` already clears the entries.
- **A list of refusing pages, or matching their messages**: the probe found none (Q-4). Only the
  closed-tab message is named; anything else is a failure.
- **Logging the closed tab once, like the warnings**: it is a trace, hidden in Chromium's default
  console level (Verbose); each occurrence is useful when following a race.
- **New `Symbol.for` keys**: the five keys stay as they are, so nothing new appears on `globalThis`.

## Components

### Page registry (`src/page/lib/PageInstall.ts`, new)

```ts
export interface PageHook {
  attach(): void;
  detach(): void;
}

export class PageListener<K extends keyof WindowEventMap> implements PageHook {
  constructor(type: K, listener: (event: WindowEventMap[K]) => void);
  public attach(): void;
  public detach(): void;
}

export class PageInstall {
  constructor(key: string);
  public replace(hook: PageHook): void;
  public remove(): void;
}
```

- `PageListener.attach` and `detach` call `globalThis.addEventListener` and `removeEventListener`
  with `true` (capture), as the scripts do today.
- `PageInstall` keeps the hook at `globalThis[Symbol.for(key)]`. `replace(hook)` calls `remove()`,
  then `hook.attach()`, then stores it (FR-2). `remove()` calls `detach()` on the stored value when it
  has a `detach` function, and sets the key to `undefined` either way (FR-3). A value written by an
  older bundle (a bare listener, or `true` from the old `peek-keys`) is dropped without a call; see
  Risks.
- About 45 counted lines; `src/page/lib/` is already excluded from the bundle entries
  (`scripts/build.mjs`, `PageScriptBuilder.run`) and bundled into each script that imports it.

### Page scripts (`src/page/*.ts`)

Each script keeps its file, its global name, its `Symbol.for` key and its `install` parameter, and
becomes:

```ts
const INSTALL = new PageInstall('vivarcdi.archive.keys');

export function install(token: string): void {
  INSTALL.replace(new PageListener('keydown', (event) => { … }));
}

export function uninstall(): void {
  INSTALL.remove();
}
```

| Script | Change |
|---|---|
| `archive-keys.ts`, `copy-keys.ts`, `pinned-keys.ts` | The `Registry` type and the hand-written registry code go; the listener body is unchanged |
| `peek-links.ts` | `PeekLinkListener` implements `PageHook` (it has `attach` and `detach` already); `install` is `INSTALL.replace(new PeekLinkListener(policy))` |
| `peek-keys.ts` | The boolean flag goes. `install(token)` replaces, so the newest token wins (AC-5); new `uninstall()`. The listener body is unchanged |

Each keeps its JSDoc; `peek-keys`'s `install` says that it replaces a previous installation.

### Runner (`src/core/browser/ScriptRunner.ts`, new)

```ts
export const TAB_CLOSED_ERROR = 'The tab was closed.';

export interface LastErrorSource {
  /** The message of `chrome.runtime.lastError`, read inside an API callback, or null. */
  readonly lastError: string | null;
}

export class ScriptRunner {
  constructor(purpose: string, errors: LastErrorSource, logger: Logger);
  public run(webview: WebviewElement, code: string): void;
}
```

- `run` calls `webview.executeScript({ code }, () => this.#report(webview))` inside `try`. A
  synchronous throw goes to `#warnOnce('Cannot inject into pages: <purpose> are off', error)`, the
  text the injector logs today.
- `#report(webview)` reads `errors.lastError` first, synchronously inside the callback, which is
  what marks the error as checked for Chromium. `null`: nothing. `TAB_CLOSED_ERROR`, or any message
  while `webview.isConnected` is false: `logger.debug('<purpose>: the page went away before the
  script ran (<message>)')`, every time (AC-14). Anything else: `#warnOnce('<purpose> could not run
  in a page: <message>')` (AC-9, AC-10).
- `#warnOnce` shares one `#warned` flag for both kinds of failure, so a runner warns once in its life,
  which is one window session (FR-7).
- About 50 counted lines, complexity under 4 per method.

### Runtime and logger

| File | Change |
|---|---|
| `src/core/browser/BrowserRuntime.ts` | `public get lastError(): string \| null`: `this.#chrome?.runtime?.lastError`, its `message`, or `'unknown error'` when it has none; `null` when there is no error. `BrowserRuntime` satisfies `LastErrorSource`. JSDoc: read it only inside the callback of a `chrome` call |
| `src/core/support/Logger.ts` | `LogSink` becomes `Pick<Console, 'info' \| 'warn' \| 'error'> & Partial<Pick<Console, 'debug'>>`; new `debug(...message)` calls `this.#sink.debug?.(tag, ...message)`. The member is optional so every existing sink, including the inline ones in the tests, still compiles; `console` has it |

### Injector (`src/core/browser/PageScriptInjector.ts`)

- `InjectorDependencies` gains `errors: LastErrorSource` ("Reads `chrome.runtime.lastError` after each
  injection"). The constructor builds `this.#runner = new ScriptRunner(purpose, errors, logger)`;
  `#warned` and `#execute` (`:119-128`) go, and `detach` (`:70`) calls `this.#runner.run`.
- `Tracked` gains `request: number`, `0` in `#track`. A private counter `#requests` is shared by all
  webviews.
- `#inject(webview)` (`:108-117`) returns when the webview is not tracked or has no tab id; else it
  increments `#requests`, stores the number in the entry and, once `scriptFor` resolves, calls
  `#runLatest(webview, request, code)`.
- `#runLatest` runs `code ?? uninstallScript` only when `this.#tracked.get(webview)?.request ===
  request`. After `detach` the map is empty (FR-5, AC-7); after a newer request the number differs
  (FR-6, AC-8); a webview dropped by `#scan` and tracked again has a new entry, so its old request is
  dropped too.
- The rejection of `scriptFor` stays logged with `logger.error`, as today.
- The file goes from 129 to about 135 lines; no method over 15 lines.

The four users pass `errors: runtime`, which each already destructures from its context:
`Peek.ts:102-118`, `PinnedClosing.ts:64-75`, `CopyUrl.ts:72-83`, `ArchiveKeys.ts:57-68`. One line
each.

### Peek (`src/modules/peek/`)

| File | Change |
|---|---|
| `PageScripts.ts` | `uninstallKeys(): string` returns `globalThis.VivArcDiPeekKeys?.uninstall();`, beside `uninstallLinks` |
| `PeekPanel.ts` | `PanelDependencies` gains `runner: Pick<ScriptRunner, 'run'>` ("Runs the Peek key script in the panel page"). `#onLoadCommit` (`:131-141`) calls `runner.run(this.#webview, scripts.installKeys(token))`; its `try`/`catch` goes. `remove()` (`:79-83`) first calls `runner.run(this.#webview, scripts.uninstallKeys())`, then removes the three elements. About 150 lines |
| `Peek.ts` | `#createController` (`:81-100`) builds `new ScriptRunner('Peek keys', runtime, logger)` once, before the controller, and passes it to every panel, so the once-per-session rule holds across panels. `#createInjector` passes `errors: runtime`. About 176 lines |

Order on `Peek.stop` stays as today (`Peek.ts:68-79`): the injector detaches, then the controller
closes the panel, which runs the key uninstall. The callback of that uninstall usually finds the
webview gone and logs at debug level, not a warning.

## Tests

Names identical to the `auto:` checks.

| AC | Test | File |
|---|---|---|
| AC-1 | `every page script exports install and uninstall` | `tests/page/PageScripts.test.ts` |
| AC-2 | `a second install replaces the first` | `tests/page/PageScripts.test.ts` |
| AC-3 | `uninstall leaves the page as before` | `tests/page/PageScripts.test.ts` |
| AC-4 | `uninstall without install does nothing` | `tests/page/PageScripts.test.ts` |
| AC-5 | `peek keys use the newest token` | `tests/page/PageScripts.test.ts` |
| AC-6 | `peek panel uninstalls its key script before closing` | `tests/modules/peek/PeekPanel.test.ts` |
| AC-7 | `injector installs nothing after detach` | `tests/core/browser/PageScriptInjector.test.ts` |
| AC-8 | `injector keeps the newest request of a webview` | `tests/core/browser/PageScriptInjector.test.ts` |
| AC-9 | `injector warns once when a page refuses the script` | `tests/core/browser/PageScriptInjector.test.ts` |
| AC-10 | `peek panel warns once when its key script fails` | `tests/modules/peek/PeekPanel.test.ts` |
| AC-11 | `peek module cleans up on stop` | `tests/modules/peek/Peek.test.ts` (existing) |
| AC-14 | `injector logs a closed tab at debug level` | `tests/core/browser/PageScriptInjector.test.ts` |

- **Page side.** `tests/page/` is new and mirrors `src/page/`. A `FakePageWindow` records
  `addEventListener` and `removeEventListener` calls (type, listener, capture); `beforeEach` puts its
  two methods and a `chrome.runtime.sendMessage` recorder on `globalThis` with `Reflect.set`,
  `afterEach` restores them and deletes the five `Symbol.for` keys. A table lists each script with its
  event type (`click` for `peek-links`, `keydown` for the others) and a valid `install` argument; the
  tests loop over it with `await import(...)`.
  - AC-1 reads the `*.ts` files of `src/page/` (not `lib/`), so a new script is checked without
    editing the test, and expects `install` and `uninstall` to be functions.
  - AC-2 installs twice and expects one live listener, the second one. AC-3 installs and uninstalls
    and expects no live listener. AC-4 uninstalls first and expects no call at all.
  - AC-5 installs `peek-keys` with `old`, then `new`, sends the live listener an Escape key event with
    `preventDefault` and `stopImmediatePropagation` stubs, and expects one message carrying `new`.
- **Injector.** The tests drive `PageScriptInjector` directly, with the `FakeElement` of
  `tests/modules/peek/fakes.ts`, a `FakeObserver` swapped in as in `Peek.test.ts`, a
  `BrowserRuntime` over a `chrome` stub whose `runtime.lastError` the test sets, and a
  `Logger` over `SilentSink`. `scriptFor` returns deferred promises the test resolves by hand.
  - AC-7: attach, detach, then resolve; `executed` holds only the uninstall code.
  - AC-8: attach (request 1), `refresh(tabId)` (request 2), resolve 2 with `NEW`, then 1 with `OLD`;
    `executed` is `['NEW']`.
  - AC-9: two webviews, both callbacks answered with `lastError` "Cannot access contents of the page",
    then a webview whose `executeScript` throws; one `warn` line in all.
  - AC-14: one callback answered with "The tab was closed.", another with any message after its
    webview was removed; two `debug` lines, no `warn`.
- **Panel.** `tests/modules/peek/PeekPanel.test.ts` is new. It builds a panel over `FakeDocument`
  with `new PageScripts('L', 'K')` and a real `ScriptRunner`.
  - AC-6: a top-level `loadcommit`, then `remove()`; the panel webview's `executed` is
    `[installKeys(token), uninstallKeys()]`, and the fake records that the webview was still connected
    when the uninstall code was run.
  - AC-10: two top-level `loadcommit`s, both callbacks answered with a non-closed message while
    connected; one `warn` line; then a click on the Close button still calls `onCommand('close')`.
- **AC-11** keeps its name and body and adds: the panel webview, taken before `stop`, ends with
  `globalThis.VivArcDiPeekKeys?.uninstall();`.

Shared fakes and existing tests:

- `tests/modules/peek/fakes.ts`: `FakeElement.executeScript(details, callback?)` also stores the
  callback in `callbacks` and pushes `isConnected` to `connectedAtRun`; a `throwOnExecute` flag makes it
  throw. A helper `answer(webview, host, message)` sets `host.runtime.lastError`, calls the oldest
  pending callback and clears it. Tests that ignore callbacks keep their bodies: an unanswered
  callback logs nothing.
- `tests/loader/fakes.ts`: `SilentSink.debug` records `['debug', ...]`.
- `tests/modules/peek/PageScripts.test.ts`: `page scripts call the bundle globals after the bundles`
  keeps its name and adds the `uninstallKeys()` string.
- Two plain tests with their own names cover the new members: `logger writes debug lines when the sink
  has them` (`tests/core/support/Logger.test.ts`, new) and `browser runtime reads the message of the
  last error` (`tests/core/browser/BrowserRuntime.test.ts`).
- Every other existing test keeps its name and body (NFR-3); module tests that build contexts with
  `new BrowserRuntime(...)` already provide `errors`.

## Vivaldi interface

None. The scripts, their globals and their messages are unchanged (NFR-1, NFR-2).

## Configuration

None.

## Limits

| File | Lines today | After | Note |
|---|---|---|---|
| `src/page/lib/PageInstall.ts` | new | about 45 | |
| `src/core/browser/ScriptRunner.ts` | new | about 50 | |
| `src/core/browser/PageScriptInjector.ts` | 129 | about 135 | `#inject` about 12 lines |
| `src/modules/peek/PeekPanel.ts` | 148 | about 150 | |
| `src/modules/peek/Peek.ts` | 172 | about 176 | under 200 |
| each page script | 31 to 73 | 20 to 60 | |

`max-params` stays at three for `ScriptRunner`; `complexity` stays under 8 everywhere, the largest
being `#report` at 3.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi changes the text "The tab was closed." | The webview check still catches a page that really went away; any other case warns once per purpose, which is visible but harmless |
| On Vivaldi's settings page, "The tab was closed." may be how Vivaldi turns the script away rather than a race (spec, Q-4), so a real refusal is logged at debug level | The page needs no VivArcDi script: the shortcuts there are Vivaldi's own. A debug line every navigation of that page is hidden at the default console level |
| A page keeps a listener from an older bundle under the same key, which the new `remove()` cannot detach | Only possible if the interface reloads without its pages after an update; Vivaldi restarts after an update and reloads every page. The value is dropped and the new install adds its own listener; the old one sends an old token, which the interface ignores. AC-12 checks the normal path after an update |
| The panel's uninstall runs after the webview is gone and never reaches the page | The listener dies with the webview (F-1); the callback is logged at debug level |
| A synchronous throw on the uninstall at close is reported as "Peek keys are off" | It is still one warning per session, and it is true: the panel page cannot take scripts |
| Contexts cast with `as unknown as ModuleContext` pass a `runtime` without `lastError` | All module tests build `new BrowserRuntime(...)`, which has it; an object without it reads `undefined`, which the runner treats as no error |

## Open questions

- [x] **Debug level for the closed tab.** The design adds `Logger.debug` (`console.debug`, hidden by
  default in Chromium). Alternative: `logger.info`, which is always shown. Tore's answer: debug, as
  designed; it is for developers checking the behavior, and the same level applies on the settings
  page.
- [x] **A second probe for `Unchecked runtime.lastError`.** Skipped: every call passes a callback, so
  the answer no longer changes the design.
