# 068 Shared page-message parser and timers

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-26 (PR #302) |
| Implemented | 2026-11-26 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

A tech-debt audit of 2026-11-26 found two copies that grew module by module. Five message files
repeat the same reader of page messages: a `parseXMessage(value)` with a private `fromConsole(line)`
and an `as unknown as` cast. Nine places redefine the same injectable timers: an interface with
`set` and `clear`, and a default object that wraps `setTimeout` and `clearTimeout`. This spec
removes both copies. One generic reader goes to `src/shared/`, one `Timers` interface and its
`systemTimers` go to `src/core/support/`. Every module keeps its own message type, its own field
check and the constructor injection that tests use. Nothing changes for the user, and no test
changes its name. The layer rules come from [034](../034-module-boundaries/spec.md) and
[035](../035-core-layout/spec.md).

## User stories

- **US-1.** As the maintainer, I want one reader of page messages, so that a fix to the prefix or
  JSON handling lands once and a new page script does not copy 20 lines.
- **US-2.** As the maintainer, I want one definition of injectable timers, so that I do not meet
  nine interfaces with the same two methods under several names.
- **US-3.** As the maintainer, I want a test that fails when a copy comes back.

## Expected behavior

The user sees no difference. The change is in the source tree only.

### Today: page messages

Each of these files exports `parseXMessage(value: unknown)`. A string is read as a console line:
it must start with the prefix, and the rest is parsed as JSON. Any other value is taken as a
runtime message. The result must be an object with the right `type`, a string `token` and the
fields of that message, then it is cast with `as unknown as`. The private `fromConsole` is the same
in all five.

| File | Parser | Fields it checks besides `type` and `token` |
|---|---|---|
| `src/modules/copyurl/CopyMessage.ts` | `parseCopyMessage` | `tabId` number, `action` is `copy` |
| `src/modules/pinned/PinnedMessage.ts` | `parsePinnedMessage` | `tabId` number, `action` is `close` |
| `src/modules/peek/PeekMessage.ts` | `parsePeekMessage` | `open` (url, tabId, disposition) or `command` (command) |
| `src/modules/today/ArchiveMessage.ts` | `parseArchiveMessage` | `action` is `open` (no `tabId`) |
| `src/modules/callpip/CallMessage.ts` | `parseCallMessage` | `tabId` number, `reason` in a list |

The callers are the modules `CopyUrl`, `PinnedClosing`, `Peek`, `ArchiveKeys` and `CallPip`, on the
module side. The page scripts in `src/page/` do not call the parsers: they import only the
constants (`*_MESSAGE_TYPE`, `*_CONSOLE_PREFIX`) and the types, and send through
`src/page/lib/PageChannel.ts`.

`src/modules/littlearc/LittleArcMessage.ts` has a sixth console reader, `pageLinkFromConsole`, inside
a file with four other message kinds. It does not fit the pattern (see Q-2).

### Today: timers

| File | Interface | Default object | Notes |
|---|---|---|---|
| `src/core/dom/Toast.ts` | `ToastTimers` | `defaultTimers` | `ConnectPanel` imports the type |
| `src/modules/livefolders/ConnectPanel.ts` | `ToastTimers` (imported) | `defaultTimers` | |
| `src/modules/livefolders/GithubDeviceFlow.ts` | `DeviceTimers` | `defaultTimers` | |
| `src/modules/workspacesync/Debounce.ts` | `DebounceTimers` | `defaultTimers` | |
| `src/modules/sidebarlook/ScrollMark.ts` | `ScrollTimers` | `SYSTEM_TIMERS` | its test imports the type |
| `src/modules/folderpreview/FolderHover.ts` | `HoverTimers` | `defaultTimers` | |
| `src/modules/folders/view/FolderSectionView.ts` | `ViewTimers` | `defaultTimers` | `FolderNameEditor` imports the type |
| `src/modules/favorites/FavoritesView.ts` | `HoverTimers` of `TileHoverName` | inline object in the constructor | `TileHoverName.ts` defines the interface only |
| `src/modules/littlearc/IdleTimer.ts` | `Scheduler` (`set(callback, ...)`) | `timerScheduler` | same shape, other parameter name; its test imports the type |

All nine have `set(run, delayMs): unknown` and `clear(handle: unknown): void`, and the same
`clearTimeout(handle as ReturnType<typeof setTimeout>)`. Two interfaces share the name
`HoverTimers` in different modules.

### After

| Piece | Place |
|---|---|
| `parsePageMessage` and the console-line reader | `src/shared/messages/PageMessage.ts` |
| `Timers` interface and `systemTimers` | `src/core/support/Timers.ts`, next to `FrameTask` |

```ts
export function parsePageMessage<T>(
  value: unknown,
  prefix: string,
  isMessage: (candidate: Record<string, unknown>) => candidate is T,
): T | null;
```

The exact signature is a design matter. Each message file keeps its type, its constants and a
guard with the field check, and exports `parseXMessage(value)` as a one-line call with the same
name and result as today. No file keeps `fromConsole` or `as unknown as`. Every class above takes
`Timers` and keeps its constructor parameter or dependency field, so tests still inject a fake. The
nine interface names and the nine default objects disappear.

## Requirements

### Functional

- **FR-1.** `src/shared/messages/PageMessage.ts` exports one function that reads a page message
  from a runtime value or a console line. A string must start with the prefix, and the rest must be
  JSON. Any other value that is an object is taken as it is. A guard given by the caller decides
  the shape. The result is the typed message or `null`; it never throws.
- **FR-2.** The five messages share an envelope: `type` and a string `token`. Each guard checks its
  own `type` constant and the fields of its message. The design fixes whether the `token` check
  sits in the reader or in the guards.
- **FR-3.** `parseCopyMessage`, `parsePinnedMessage`, `parsePeekMessage`, `parseArchiveMessage` and
  `parseCallMessage` keep their names, parameters, results and exported constants. They use the
  reader and contain no `fromConsole` and no `as unknown as`.
- **FR-4.** `src/core/support/Timers.ts` exports the `Timers` interface (`set(run, delayMs)` and
  `clear(handle)`) and `systemTimers`, built on `setTimeout` and `clearTimeout`.
- **FR-5.** `Toast`, `ConnectPanel`, `GithubDeviceFlow`, `Debounce`, `ScrollMark`, `FolderHover`,
  `FolderSectionView`, `FolderNameEditor`, `TileHoverName` and `FavoritesView` use `Timers` and
  `systemTimers`. The interfaces `ToastTimers`, `DeviceTimers`, `DebounceTimers`, `ScrollTimers`,
  `ViewTimers` and both `HoverTimers` are removed. `IdleTimer` follows the answer to Q-2.
- **FR-6.** A class keeps the way tests replace its timers (a dependency field or a constructor
  parameter). The default is `systemTimers`.
- **FR-7.** A structure test fails when a file other than `Timers.ts` wraps `clearTimeout` in a
  default timers object, and when a file other than `PageMessage.ts` defines `fromConsole`.

### Non-functional

- **NFR-1.** No behavior changes. Every existing test keeps its name and passes. A test body may
  change only an import or a type name (for example `ScrollTimers` to `Timers`).
- **NFR-2.** The reader lives in `src/shared/` because five modules use it. It imports only `core/`
  and `shared/`, so the lint rule `module-boundaries` and the structure tests pass. `Timers` lives
  in `src/core/support/` because `Toast` in core uses it, and core imports only core.
- **NFR-3.** The page scripts in `src/page/` stay IIFE bundles. They do not call the reader, but
  they import the message files, so the build must not grow their bundles with reader code that no
  page script calls. `npm run build` and the tests in `tests/page/` stay green.
- **NFR-4.** `ModuleContext`, `config.json`, selectors, styles and `data-vivarcdi-*` attributes do
  not change.
- **NFR-5.** `docs/architecture.md` lists the two helpers where it lists the shared folders and
  `core/support/`.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the reader receives an object that the guard accepts, THE reader SHALL return it | auto: `parsePageMessage returns a valid runtime message` |
| AC-2 | WHEN the reader receives a console line with the right prefix and a JSON object that the guard accepts, THE reader SHALL return the object | auto: `parsePageMessage returns a valid console line` |
| AC-3 | IF a console line has another prefix or none, THEN THE reader SHALL return null | auto: `parsePageMessage rejects a wrong prefix` |
| AC-4 | IF a console line has the prefix but broken JSON, THEN THE reader SHALL return null and not throw | auto: `parsePageMessage rejects broken JSON` |
| AC-5 | IF the value is null, a number or an object that the guard refuses, THEN THE reader SHALL return null | auto: `parsePageMessage rejects a wrong shape` |
| AC-6 | THE five parsers SHALL give the same result as before for the cases of their existing tests | auto: the existing tests of `CopyMessage`, `PinnedMessage`, `PeekMessage`, `ArchiveMessage` and `CallMessage`, names unchanged |
| AC-7 | WHEN `systemTimers.set` receives a function, THE function SHALL run after the delay | auto: `systemTimers set runs the function after the delay` |
| AC-8 | WHEN `systemTimers.clear` receives the handle of a pending timer, THE function SHALL not run | auto: `systemTimers clear cancels a pending timer` |
| AC-9 | THE payload SHALL define the default timers once | auto: `only Timers defines the system timers` |
| AC-10 | THE payload SHALL read the console line of a page message once | auto: `only PageMessage reads a console line` |
| AC-11 | THE tests of every class listed in FR-5 SHALL pass with their names unchanged | auto: the existing tests of `Toast`, `ConnectPanel`, `GithubDeviceFlow`, `Debounce`, `ScrollMark`, `FolderHover`, `FolderSectionView`, `FolderNameEditor`, `TileHoverName` and `FavoritesView` |
| AC-12 | IF a module imports another module, shared imports a module, or core imports shared, THEN THE tests SHALL report it | auto: `no module imports another module`, `shared imports only core and shared`, `core imports only core` (existing) |

There is no `manual` criterion: the change is internal and the existing criteria of the five
messages and the timer users prove the behavior. `make check` runs all of them, including the
build. AC-9 and AC-10 read the files under `src/` with a pattern, in `tests/structure/`, as
`ModuleBoundaries.test.ts` does. The lint rule `module-boundaries` is covered by `npm run lint` in
`make check`.

## Out of scope

- Other duplications (for example the permission or storage readers) and any change of behavior.
- Merging the message types, tokens or prefixes, or changing a wire format. The five type
  constants and prefixes stay as they are.
- Changing which timers a class uses, its delays, or how it clears them.
- Replacing the fake timers of the tests.

## Open questions

- [x] **Q-1. Where does the reader live?** Options: `src/shared/messages/PageMessage.ts` (five
  module users, the two-user rule of 034) or `src/core/support/`. Recommendation: `shared/messages/`.
  The reader knows the shape of VivArcDi's page messages (`type`, `token`), so it is a feature
  building block; `core/support/` is for helpers that know no feature, like `Timers`.
  Answered (Tore, 2026-11-26): the proposal.
- [x] **Q-2. Which near-duplicates join?** `IdleTimer`'s `Scheduler` has the same two methods under
  other parameter names, and `LittleArcMessage.ts` has `pageLinkFromConsole`, a console reader
  inside a file with four other message kinds, with its own `Number.isInteger` check on `tabId`
  and no `as unknown as`. Recommendation: include `IdleTimer` (identical shape; its test only
  changes an import). Leave `LittleArcMessage` out, but let it call the console-line reader if the
  design exports it, so the only `JSON.parse(line.slice(prefix))` is in `PageMessage.ts`. If that
  changes a case of its tests, it stays out and AC-10 excludes it by name.
  Answered (Tore, 2026-11-26): the proposal.
- [x] **Q-3. One pull request or two?** The two halves touch different files. Recommendation: two
  tasks in one branch and one pull request, run in parallel: the diff is mechanical and small, and
  the structure tests of FR-7 are easier to review together.
  Answered (Tore, 2026-11-26): the proposal.
- [x] **Q-4. Keep the old type names?** The tests import `ScrollTimers`, `ToastTimers` and
  `Scheduler`. Recommendation: remove the names and change those test imports to `Timers`
  (NFR-1 allows it), so no alias outlives the refactor.
  Answered (Tore, 2026-11-26): the proposal.
- [x] **Q-5. Type guard without a cast.** A guard `candidate is T` over `Record<string, unknown>`
  compiles for a type alias but may not for an `interface` such as `CopyMessage`. Recommendation:
  the design tries the guard first and, if TypeScript refuses, changes the `interface`s to `type`
  aliases (no change for callers), before it accepts a cast inside the reader. A cast inside the
  one helper is allowed only if both fail.
  Answered (Tore, 2026-11-26): the proposal.

## References

- Tech-debt audit of 2026-11-26 (Tore's decision).
- [034 Module boundaries](../034-module-boundaries/spec.md) and [035 Core layout](../035-core-layout/spec.md):
  the layers and the lint rule this spec respects.
