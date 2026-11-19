# 042 vivExtData owner: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

One rule, enforced in one place, and filters where a module scans several windows. No change to
the stored values (FR-9) and no message between windows (NFR-2).

**The window id comes with the tabs API.** The spec's open point: `TabDataWriter.of(tabs)` is
called with a `BrowserTabs` (or a `Pick` of it) at about ten call sites, and none of them has a
window id. The id is therefore a capability of `BrowserTabs`, not a new argument: `BrowserTabs`
gains `ownWindowId(): Promise<number | null>`, which asks `chrome.windows.getCurrent` through a
`BrowserWindows` it builds from the same `chromeApi` (Q-2), keeps the answer, and resolves `null`
when the id cannot be read. `TabDataWriter` asks the object it already receives. No call site of
`TabDataWriter.of` changes, and no module needs `context.windows`.

`TabDataTabs` becomes `Pick<BrowserTabs, 'get' | 'update'> & Partial<Pick<BrowserTabs, 'ownWindowId'>>`.
The method is optional in the type so that narrower `Pick`s and test fakes that do not know the
window keep compiling (NFR-3); a tabs object without it is treated as "no guard configured" and the
writer behaves as today, without a warning. Real `BrowserTabs` always has it. A tabs object whose
`ownWindowId` resolves `null` is the case of AC-4 and logs one warning.

**The guard.** In `TabDataWriter.#apply`, after the fresh `get` and before `change`, the writer
compares `tab.windowId` with its own id. Different: it logs one debug line and returns, so the
promise resolves as for a write whose change returned `null` (FR-2, FR-3). Because the comparison
uses the tab just read, a tab that moved while the write waited is judged by the window it is in now
(AC-3). The `get` and the `update` stay two calls: Q-5 accepts that gap.

**Scanners and followers** ask for their own window instead of all windows. Scans use
`query({ currentWindow: true })`, the form `LinkedTabs.snapshot` and `LinkTabAdopter.adoptOpenTabs`
already use against real Vivaldi. Event handlers compare `tab.windowId` with
`await tabs.ownWindowId()`; when that is `null` they accept the tab, as before.

```text
module ──write──▶ TabDataWriter ──get──▶ tab.windowId == ownWindowId? ──yes──▶ update
                        │                           │ no: debug line, resolve
                        └── ownWindowId ──▶ BrowserTabs ──▶ BrowserWindows.current ──▶ chrome.windows.getCurrent
```

### Rejected alternatives

- **A `windowId` argument of `TabDataWriter.of` or of its constructor**: touches the ten call
  sites and every module that builds the writer, for a value the tabs API can give.
- **`context.windows` injected into the writer by the boot**: the writer is built inside modules
  and core classes from `tabs`, not from the context; it would need a global registration.
- **Only filters, no guard**: Q-1 asked for both; a new writer would be one forgotten filter away
  from breaking the rule.
- **`tab.windowId` against `lastFocused`**: the focused window is not the window of this document.

## Components

### Core (`src/core/`)

| Class or file | Change |
|---|---|
| `browser/BrowserTabs.ts` | `public ownWindowId(): Promise<number \| null>`. Builds `new BrowserWindows(chromeApi)` in the constructor (a type-only import goes the other way, so there is no cycle). The first call runs `windows.current()`; a result with an `id` is kept and returned from then on; a missing API, a `lastError`, or no `id` resolves `null` and is not kept, so a later call tries again. Never rejects. JSDoc says the id of the window of this document |
| `tabs/TabDataWriter.ts` | `TabDataTabs` as above. The constructor takes `logger: Logger = new Logger('VivArcDi:tab-data')` as second argument (`of` unchanged). `#apply` after the `get`: `const own = await this.#own()`; when `own !== null && tab.windowId !== own`, `this.#logger.debug(\`skipped tab ${tabId}: it belongs to window ${tab.windowId}\`)` and `return`. `#own()` returns `null` without a warning when `ownWindowId` is absent, and when it resolves `null` warns once per writer (`#warned`): `cannot read the window id: writing tabs of any window` |

`TabDataWriter.ts` stays far under the line limit.

### Modules

| Class or file | Change | AC |
|---|---|---|
| `pinned/PinWatcher.ts` | `PinWatcherTabs` adds `'ownWindowId'`. `start` reads `#windowId = await ownWindowId()` first, then subscribes; the `query` becomes `{ pinned: true, currentWindow: true }`. `#follow` returns at once when `#windowId !== null && tab.windowId !== #windowId` (before `needsAddress` and before `forget`) | AC-6, AC-7, AC-8 |
| `folders/links/LinkTabAdopter.ts` | `AdopterTabs` adds `'ownWindowId'`. `#adoptNew` returns after `get` when the tab's `windowId` is not the own id (null accepts). `adoptOpenTabs` is unchanged (already `currentWindow`). `#fresh` may hold a tab of another window until it is removed: it is read only here | AC-9 |
| `favorites/LinkedTabs.ts` | `sync`: `query({})` becomes `query({ currentWindow: true })`; JSDoc says own window | AC-10 |
| `folders/links/TabLinks.ts` | `unlinkExcept`: `query({})` becomes `query({ currentWindow: true })`; JSDoc says own window | AC-11 |
| `folders/editing/FolderLinkTabs.ts` | New `ownTabsOf(linkIds)`: as `tabsOf` with `query({ currentWindow: true })`. `tabsOf` is not changed (see Contradictions in the hand-off and below) | AC-12 |
| `folders/editing/FolderRelocation.ts` | `linkTabs: Pick<FolderLinkTabs, 'linkIds' \| 'ownTabsOf'>`; `relocate` calls `ownTabsOf`. Tabs of the folder in other windows are skipped (Q-3) | AC-12 |
| `today/ActivityStamps.ts` | `StampTabs` adds `'ownWindowId'`. `start` sets `#windowId = await ownWindowId()` before the active-tab step, and the `#active` entry only when an active tab is found; `#isOwnWindow` is unchanged (null accepts, as before, now only when the id is unreadable, not when no tab is active) | AC-13 |

**`tabsOf` stays for the folder deletion.** `FolderDeletion` uses `tabsOf` to close the tabs of a
deleted folder in every window; the spec's FR-7 says `tabsOf` considers its own window, which
would also stop closing tabs in other windows on deletion, a change the spec does not mention. The
design keeps deletion as it is and gives relocation the new `ownTabsOf`; the tabs of other windows
that relocation skips keep their workspace (Q-3). Tore decides if deletion should follow.

### Writers that need no change

Each goes through `TabDataWriter` and is covered by the guard; none scans other windows.

| Writer | Why |
|---|---|
| `shared` / `TabLinks.link`, `unlink` | acts on a tab the user handled in this window |
| `peek/TabTiler` | tiles tabs of this window |
| `favorites/FavoriteRemoval`, `LinkedTabs.link` | user action in this window |
| `pinned/SavedAddresses.load`, `save`, `forget` | called by `PinWatcher` (filtered) and by this window's own actions |
| `core/workspaces/WorkspaceTabs` | writes the tab it just created; `openPinned(…, windowId)` is called by `PinnedApplier` with this window's own id (`SyncPass` reads it from `WindowOwner.ownId()`) |
| `littlearc/WorkspaceAdopter` | writes after `tabs.move` into this window; the fresh read shows the new window |

### Test fakes (`tests/`)

`tests/modules/folders/fakes.ts`, `FolderTabs`: `public windowId = 1` (the window of the fake),
`ownWindowId = async () => this.windowId`, and `query` honors `currentWindow: true` as
`tab.windowId === this.windowId`. Tabs of other windows are `{ id, windowId: 2 }`. The 1 default of
tabs keeps every existing test in the own window. The `FakeTab` in `tests/modules/pinned` and
`tests/modules/today` (or whatever those tests use) gains the same `ownWindowId`. Any test that
reads a tab of another window through `currentWindow` is found by running the suite; it must not
change its name (NFR-3).

## Tests

Names identical to the `auto:` checks.

| AC | Test | File |
|---|---|---|
| AC-1 | `writes the tab of its own window` | `tests/core/tabs/TabDataWriter.test.ts` |
| AC-2 | `skips a tab of another window` | `tests/core/tabs/TabDataWriter.test.ts` |
| AC-3 | `judges the window from the tab as just read` | `tests/core/tabs/TabDataWriter.test.ts` |
| AC-4 | `writes as before when the window is unknown` | `tests/core/tabs/TabDataWriter.test.ts` |
| AC-5 | `two windows never both write the same tab` | `tests/core/tabs/TabDataWriter.test.ts` |
| AC-6 | `does not save the own page of a tab pinned in another window` | `tests/modules/pinned/PinnedTabs.test.ts` |
| AC-7 | `does not forget the own page of a tab unpinned in another window` | `tests/modules/pinned/PinnedTabs.test.ts` |
| AC-8 | `saves at start only the pinned tabs of its own window` | `tests/modules/pinned/PinnedTabs.test.ts` |
| AC-9 | `does not adopt a new tab of another window` | `tests/modules/folders/links/LinkTabAdopter.test.ts` |
| AC-10 | `syncs only the tabs of its own window` | the `LinkedTabs` test in `tests/modules/favorites/` |
| AC-11 | `unlinks only the tabs of its own window` | `tests/modules/folders/links/TabLinks.test.ts` |
| AC-12 | `moves only the tabs of its own window with the folder` | `tests/modules/folders/editing/FolderRelocation.test.ts` |
| AC-13 | `stamps only tabs of its own window before it knows the window` | the `ActivityStamps` test in `tests/modules/today/` |
| AC-14 | manual | checklist in tasks T7 |

Test shapes:

- AC-1 and AC-2: `FolderTabs` with `windowId = 1`, tabs `{ id: 1 }` and `{ id: 2, windowId: 2 }`;
  the first is written, the second leaves `calls` without an `update`, and the promise resolves.
- AC-3: `SlowTabs`; queue a write, change the tab's `windowId` to 2 before its turn; no `update`.
- AC-4: a tabs object with `ownWindowId` resolving `null`, and a logger that records warnings:
  the tab is written, one warning after two writes.
- AC-5: two `FolderTabs` views over the same `tabs` map, with `windowId` 1 and 2, and a writer on
  each; both write the same tab concurrently; only window 1's keys are applied and the tab keeps
  the keys it had.
- AC-6 to AC-13: the tab of the other window carries `windowId: 2`; the assertion is on the calls
  of the writer or of the saved addresses fake, never on a log line.
- `BrowserTabs.ownWindowId` gets its own tests in `tests/core/browser/BrowserTabs.test.ts`
  (`reads the window id once`, `resolves null when the window id cannot be read`), named by the
  implementer from those texts; they cover no AC.

## Risks

- `currentWindow: true` in a scan: Vivaldi's `window.html` document is the window, as it already is
  for `LinkedTabs.snapshot`. AC-14 and `npm run live` with two windows confirm it.
- A window whose `getCurrent` fails writes as today: the old race stays for that window, with one
  warning in the console.
