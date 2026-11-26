# 068 Shared page-message parser and timers: design

| | |
|---|---|
| Status | Approved (2026-11-26, PR #302) |
| Spec | [spec.md](spec.md) |

Tore approved the spec on 2026-11-26 (PR #302) and accepted every proposal of Q-1 to Q-5. This
document says **how**; the spec says **what**. Nothing changes for the user: the diff replaces
copies with calls to two helpers.

## Approach

| Area | What changes | Where |
|---|---|---|
| Reader | One generic `parsePageMessage` and a small `hasEnvelope` check | `src/shared/messages/PageMessage.ts` |
| Messages | Five files keep their type, constants and `parseXMessage`; each gets a guard | `src/modules/{copyurl,pinned,peek,today,callpip}/*Message.ts` |
| Timers | One `Timers` interface and `systemTimers`; nine copies removed | `src/core/support/Timers.ts` and eleven files |
| Structure | Two tests that fail when a copy comes back | `tests/structure/` |
| Docs | The two helpers named in the architecture page | `docs/architecture.md` |

The messages half (T1) and the timers half (T2) touch disjoint files.

## The reader

`src/shared/messages/PageMessage.ts`:

```ts
export function parsePageMessage<T>(
  value: unknown,
  prefix: string,
  isMessage: (candidate: Record<string, unknown>) => candidate is T,
): T | null;

export function hasEnvelope(candidate: Record<string, unknown>, type: string): boolean;
```

Rules of `parsePageMessage`, the same as the five private copies today:

1. A `string` is a console line. It must start with `prefix`; the rest goes to `JSON.parse`. A line
   without the prefix gives `null`. A `SyntaxError` is caught and gives `null`: the function never
   throws.
2. Any other value is a runtime message and is used as it is.
3. If the result is not an object, or is `null`, return `null`. Arrays and other objects go to the
   guard, which refuses them by their fields, as today.
4. Return the object when `isMessage` accepts it, otherwise `null`. There is no cast: the return
   type comes from the guard.

`hasEnvelope(candidate, type)` is `candidate['type'] === type && typeof candidate['token'] === 'string'`.
The token check sits in this helper, not in the reader (FR-2): the reader knows no field of a
message. Each guard calls `hasEnvelope` first.

The file has two function declarations and no other top-level statement, so esbuild drops it from
every page bundle that imports a message file only for its constants (NFR-3).

### Guards and the cast (Q-5)

A predicate `candidate is T` needs `T` assignable to `Record<string, unknown>`. An `interface` is
not (it has no index signature). The lint rule `@typescript-eslint/consistent-type-definitions`
forbids turning them into `type` aliases, so `CopyMessage`, `PinnedMessage`, `ArchiveMessage`,
`CallMessage` and peek's `Envelope` stay interfaces and extend `Record<string, unknown>`, which adds
the index signature; callers do not notice. `parsePageMessage` constrains
`T extends Record<string, unknown>` and checks a shallow copy (`{ ...parsed }`) of the parsed object,
so the guard result is the same and no cast is needed. If
TypeScript still refuses a case, the implementer stops and reports it: a cast inside
`parsePageMessage` is the last resort of Q-5, and only the lead allows it.

### The five messages

Each file keeps its exports and shape. Example, `CopyMessage.ts`:

```ts
const isCopyMessage = (candidate: Record<string, unknown>): candidate is CopyMessage =>
  hasEnvelope(candidate, COPY_MESSAGE_TYPE) && typeof candidate['tabId'] === 'number' && candidate['action'] === 'copy';

export function parseCopyMessage(value: unknown): CopyMessage | null {
  return parsePageMessage(value, COPY_CONSOLE_PREFIX, isCopyMessage);
}
```

| File | Prefix constant | Guard checks after `hasEnvelope` |
|---|---|---|
| `copyurl/CopyMessage.ts` | `COPY_CONSOLE_PREFIX` | `tabId` number, `action === 'copy'` |
| `pinned/PinnedMessage.ts` | `PINNED_CONSOLE_PREFIX` | `tabId` number, `action === 'close'` |
| `peek/PeekMessage.ts` | `CONSOLE_PREFIX` (name kept) | `isOpen(candidate)` or `isCommand(candidate)` |
| `today/ArchiveMessage.ts` | `ARCHIVE_CONSOLE_PREFIX` | `action === 'open'`; there is no `tabId` |
| `callpip/CallMessage.ts` | `CALL_CONSOLE_PREFIX` | `tabId` number, `REASONS.includes(reason)` |

- **Peek's two shapes.** `isPeekMessage` is `hasEnvelope(...)` and then `isOpen(c) || isCommand(c)`.
  `isOpen` (url string, `tabId` number, `disposition` in `DISPOSITIONS`) and `isCommand`
  (`command` in `COMMANDS`) keep their bodies and return `boolean`; only the outer guard is a
  predicate. `PeekMessage` stays `Envelope & (open | command)`.
- **Today.** `ArchiveMessage` has no `tabId`, so its guard checks `type`, `token` and `action`
  only, as now.
- The five `parseXMessage` functions keep their JSDoc, name, parameter and result, and lose
  `fromConsole` and `as unknown as`. Their callers (`CopyUrl`, `PinnedClosing`, `Peek`,
  `ArchiveKeys`, `CallPip`) and the page scripts do not change.
- `LittleArcMessage.ts` is not touched (Q-2): its `pageLinkFromConsole` has another name, builds a
  fresh object and checks `tabId` with `Number.isInteger`. AC-10 looks for the name `fromConsole`,
  so it does not match.

## Timers

`src/core/support/Timers.ts`:

```ts
export interface Timers {
  set(run: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

export const systemTimers: Timers = {
  set: (run, delayMs) => setTimeout(run, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
```

The arrows read the global `setTimeout` at call time, so Node's `mock.timers` still controls them,
as in `TileHoverName.test.ts`. The one cast moves here from nine places.

| User | Before | After |
|---|---|---|
| `core/dom/Toast.ts` | `ToastTimers`, `defaultTimers` | `timers?: Timers`; `dependencies.timers ?? systemTimers` |
| `livefolders/ConnectPanel.ts` | imports `ToastTimers`, own `defaultTimers` | imports `Timers` and `systemTimers` from `core/support/Timers.js` |
| `livefolders/GithubDeviceFlow.ts` | `DeviceTimers`, `defaultTimers` | `timers?: Timers`; `?? systemTimers` |
| `workspacesync/Debounce.ts` | `DebounceTimers`, `defaultTimers` | parameter `timers: Timers = systemTimers` |
| `sidebarlook/ScrollMark.ts` | `ScrollTimers`, `SYSTEM_TIMERS` | parameter `timers: Timers = systemTimers` |
| `folderpreview/FolderHover.ts` | `HoverTimers`, `defaultTimers` | parameter `timers: Timers = systemTimers` |
| `folders/view/FolderSectionView.ts` | `ViewTimers`, `defaultTimers` | parameter `timers: Timers = systemTimers` |
| `folders/editing/FolderNameEditor.ts` | imports `ViewTimers` | imports `Timers` from core |
| `favorites/TileHoverName.ts` | own `HoverTimers` | `timers: Timers` in its dependencies |
| `favorites/FavoritesView.ts` | inline object of two arrows | `timers: systemTimers` |
| `littlearc/IdleTimer.ts` | `Scheduler`, `timerScheduler` | parameter `scheduler: Timers = systemTimers`; names unchanged |

`ToastTimers`, `DeviceTimers`, `DebounceTimers`, `ScrollTimers`, `ViewTimers`, `Scheduler` and both
`HoverTimers` (folderpreview and favorites) are deleted with no alias (Q-4). Constructor
parameters and dependency fields keep their names, so every test still injects its fake. Three
test files import a removed type and change only that import (NFR-1):

| Test file | Change |
|---|---|
| `tests/modules/sidebarlook/ScrollMark.test.ts` | `ScrollTimers` to `Timers`, from `src/core/support/Timers.js` |
| `tests/modules/copyurl/fakes.ts` | `ToastTimers` to `Timers` (`ManualTimers` serves Toast, FolderSectionView and workspacesync tests) |
| `tests/modules/littlearc/logic.test.ts` | `Scheduler` to `Timers` |

`Timers.ts` is used by core (`Toast`), so the structure test "every core file is used by core or by
two modules" passes, and core still imports only core.

## Structure tests

Two new files in `tests/structure/`, modeled on `ModuleBoundaries.test.ts` (same `ROOT` and `SRC`
constants and recursive `typescriptFiles` walk, copied into each file as `StoredKeys.test.ts`
does) and reading each file with `readFileSync`. Separate files keep the two tasks disjoint.

| Test | File | Rule |
|---|---|---|
| `only Timers defines the system timers` (AC-9) | `tests/structure/OneTimers.test.ts` | No file of `src/` except `core/support/Timers.ts` matches `/\bclear\s*:\s*\([^)]*\)[^=]*=>\s*clearTimeout\(/` |
| `only PageMessage reads a console line` (AC-10) | `tests/structure/OnePageReader.test.ts` | No file of `src/` except `shared/messages/PageMessage.ts` matches `/\bfromConsole\b/` |

Each test collects the offending files as relative paths and asserts `deepEqual(offending, [])`,
like the boundary tests. The AC-9 pattern also catches the inline object of `FavoritesView`; it does
not match direct calls such as `clearTimeout(timer)` in `UiReadiness`.

## Tests

| AC | Test (name verbatim) | File |
|---|---|---|
| AC-1 | `parsePageMessage returns a valid runtime message` | `tests/shared/messages/PageMessage.test.ts` |
| AC-2 | `parsePageMessage returns a valid console line` | same |
| AC-3 | `parsePageMessage rejects a wrong prefix` | same |
| AC-4 | `parsePageMessage rejects broken JSON` | same |
| AC-5 | `parsePageMessage rejects a wrong shape` | same |
| AC-6 | existing tests of the five messages, names unchanged | `tests/modules/{copyurl,pinned,peek,today,callpip}/*Message.test.ts` |
| AC-7 | `systemTimers set runs the function after the delay` | `tests/core/support/Timers.test.ts` |
| AC-8 | `systemTimers clear cancels a pending timer` | same |
| AC-9 | `only Timers defines the system timers` | `tests/structure/OneTimers.test.ts` |
| AC-10 | `only PageMessage reads a console line` | `tests/structure/OnePageReader.test.ts` |
| AC-11 | existing tests of the ten classes, names unchanged | `tests/core/dom/Toast.test.ts`, `tests/modules/{livefolders,workspacesync,sidebarlook,folderpreview,folders,favorites}/` |
| AC-12 | `no module imports another module`, `shared imports only core and shared`, `core imports only core` | `tests/structure/ModuleBoundaries.test.ts` (existing) |

The helper tests use a guard on a small local type, `{ type: 'x'; n: number }`, built with
`hasEnvelope`. AC-5 covers `null`, a number, an array and an object the guard refuses. The
`systemTimers` tests use `t.mock.timers.enable({ apis: ['setTimeout'] })` and `t.mock.timers.tick`:
the first asserts the function ran once after the tick and not before; the second clears the handle
and asserts it never ran.

## NFR-3: the page bundles do not grow

The page scripts import the message files for constants and types. With the new import of
`parsePageMessage` in those files, tree shaking must still drop the reader. The check is a byte
comparison, run by T1 and again by the lead:

1. On the base commit: `npm run build`, then write `wc -c dist/page/*.js` to a scratch file.
2. After the change: `npm run build` again, write the sizes to a second file and `diff` them.
3. The two lists must be identical. If a bundle grew, T1 changes the import so that the page script
   no longer pulls `PageMessage.ts` in (for example by moving a guard out of the constants' file),
   and reports it.

No size test is added: it would need a built `dist/`, which the unit tests do not have.

## Docs

`docs/architecture.md`: add `messages/` to the shared folders in the layers table and the timers to
the `support/` row ("the logger, running work once per frame or one at a time, and injectable
timers").

## Branch and version

CONTRIBUTING gives a version change only to `features/` (minor) and `fix/` (patch); any other
branch keeps the version, and the `branch-policy` job fails a bump there. This is a refactor with no
change of behavior, like 034 and 035 (`refactor/module-boundaries`, `refactor/core-layout`). The
work runs on `refactor/068-shared-page-messages-and-timers` with **no version change**.

## Files

| File | Role |
|---|---|
| `src/shared/messages/PageMessage.ts` | `parsePageMessage`, `hasEnvelope` |
| `src/modules/{copyurl/CopyMessage,pinned/PinnedMessage,peek/PeekMessage,today/ArchiveMessage,callpip/CallMessage}.ts` | Guards; interfaces extend `Record<string, unknown>` |
| `src/core/support/Timers.ts` | `Timers`, `systemTimers` |
| The eleven users in the timers table | Use `Timers` |
| `tests/shared/messages/PageMessage.test.ts`, `tests/core/support/Timers.test.ts` | New helper tests |
| `tests/structure/OnePageReader.test.ts`, `tests/structure/OneTimers.test.ts` | AC-10, AC-9 |
| `tests/modules/sidebarlook/ScrollMark.test.ts`, `tests/modules/copyurl/fakes.ts`, `tests/modules/littlearc/logic.test.ts` | Import changes only |
| `docs/architecture.md`, `specs/068-shared-page-messages-and-timers/spec.md`, `specs/README.md` | Docs and status |

## Risks

| Risk | Answer |
|---|---|
| The guard does not compile for an interface | The interfaces extend `Record<string, unknown>`; a cast needs the lead |
| A page bundle grows | The byte comparison of NFR-3 on `dist/page/*.js` before and after |
| `mock.timers` stops controlling `systemTimers` | The arrows call the global at call time; `TileHoverName.test.ts` proves it |
| A removed type name stays in a test | `make check` typechecks `tests/` |
| A user keeps an inline default | The AC-9 pattern also matches inline `clear:` arrows |
