# 064 Stable workspace view: design

| | |
|---|---|
| Status | Approved (2026-11-25, PR #285) |
| Spec | [spec.md](spec.md) |

Tore approved the spec on 2026-11-25 (PR #285) and accepted the recommendation of every open
question: an inspection page does not change the shown workspace, a removal with no usable active
tab keeps the last workspace, every surface shares one state, and a folder minus saves under the
workspace active at press time. This document says **how**; the spec says **what**.

## Approach

One `ActiveWorkspace` per window, created and started by the boot, replaces the four instances that
`FolderSection.ts:79`, `SpaceHeader.ts:80`, `LiveFolders.ts:115` and `MainWindowRole.ts:118` build
today. The inference ignores Vivaldi's inspection pages, re-reads when a tab is removed and treats
a workspace id Vivaldi does not list as no change. `OpenLinks` filters the tabs of the links by the
workspace the section shows, and a folder press captures that workspace before the first await.

| Area | What changes | Where |
|---|---|---|
| One state | One `ActiveWorkspace` in `ModuleContext`, started by the boot | `core/boot/Module.ts`, `ModuleStarter.ts`, `WindowServices.ts`, `VivArcDi.ts` |
| The inference | Many listeners, `onRemoved`, inspection pages, missing or unlisted workspace kept | `core/workspaces/ActiveWorkspace.ts` |
| Inspection pages | A helper names Vivaldi's inspect page and the DevTools windows it opens | `core/tabs/InspectionTarget.ts` |
| The list | The boot tells the state which workspace ids Vivaldi lists; one warning on an unknown id | `core/workspaces/WorkspaceNames.ts` |
| Surfaces | The four modules read and follow the shared state and no longer stop it | `folder…/FolderSection.ts`, `spaceheader/SpaceHeader.ts`, `livefolders/LiveFolders.ts`, `littlearc/MainWindowRole.ts` |
| Open-link rows | Filtered by the shown workspace; refreshes guarded by a generation | `shared/links/OpenLinks.ts`, `folderpreview/FolderPreview.ts` |
| Folder minus | The workspace at press time is captured and saved under it | `folder…/links/FolderClose.ts`, `tree/OpenFolders.ts`, `editing/FolderDeletion.ts`, `editing/FolderRelocation.ts`, `editing/FolderActionsFactory.ts` |

Nothing in `WorkspaceRoots.ts` changes: a normal tab outside any workspace still resolves to
`null`, so the header keeps the `Tabs` name (`SpaceHeader.ts:161-164`) and the section keeps the
reserved `Tabs` root (043/FR-4).

### The one workspace state

`ActiveWorkspace` keeps its name and gains three things: a list of listeners, the `onRemoved`
event, and the rules that keep the last workspace.

```ts
export type ActiveWorkspaceTabs = Pick<BrowserTabs, 'query' | 'onActivated' | 'onUpdated' | 'onRemoved'>;
export type WorkspaceListener = (workspaceId: string | null) => void;

export class ActiveWorkspace {
  constructor(tabs: ActiveWorkspaceTabs, logger: Logger, listed: (workspaceId: string) => boolean = () => true);
  public get current(): string | null;
  public onChange(listener: WorkspaceListener): () => void;
  public async start(): Promise<void>;
  public stop(): void;
  public async refresh(): Promise<void>;
}
```

- `onChange` adds a listener and returns the function that removes it; `#onChange` as a constructor
  callback goes away, so the modules that follow a change subscribe from their own `start` and push
  the unsubscribers in their existing `#stops` lists (`LiveFolders` and `MainWindowRole` only read
  `current`).
- `start` subscribes `onActivated`, `onUpdated` when `vivExtData` changes, and `onRemoved`, then
  reads once without reporting. It returns at once when it already subscribed, so the boot starts
  it first and a module that starts on its own starts it too. A missing event still throws, so the
  module that catches it keeps staying off, as today. Only the boot calls `stop`.
- `refresh` reads and reports a change to every listener, keeping the generation check of today:
  an older read does not overwrite a newer one.

The read keeps the last workspace (`undefined` means no report):

```ts
async #read(): Promise<string | null | undefined> {
  try {
    const [active] = await this.#tabs.query({ active: true, currentWindow: true });
    if (active === undefined || InspectionTarget.is(active.url ?? active.pendingUrl)) {
      return undefined;
    }
    const workspace = TabData.of(active);
    if (workspace !== null && !this.#listed(workspace)) {
      this.#warnUnlisted(workspace);
      return undefined;
    }
    return workspace;
  } catch (error) {
    this.#logger.warn('could not read the active workspace', error);
    return undefined;
  }
}
```

The rules in order:

| Active tab | What the state does |
|---|---|
| An inspection page (`vivaldi://inspect/#apps` or a DevTools window) | Keeps the last workspace (FR-1) |
| No active tab, or no tab returned | Keeps the last workspace (FR-4) |
| A normal tab with `vivExtData.workspaceId` in Vivaldi's list | Reports that id |
| A normal tab with no `workspaceId` | Reports `null`, the `Tabs` area (FR-2, 043/FR-4) |
| A tab naming an id Vivaldi does not list | Keeps the last workspace and warns once (NFR-3) |

The warning goes through the logger once per state: `warn('the active tab names a workspace
Vivaldi does not list', `${workspaceId}: keeping the last one`)`. The state starts with
`current = null`, so the very first inspection page leaves the `Tabs` area.

### Inspection pages

`InspectionTarget.is(url)` parses the address and returns true for:

- a `vivaldi:` address whose host or first path segment is `inspect` (`vivaldi://inspect/#apps`,
  `vivaldi:inspect/#apps`), and
- the DevTools frontends the targets open: the `devtools:` and `chrome-devtools:` schemes.

It returns false for a missing or malformed address and for every other internal page, so
`vivaldi://settings` in a workspace still selects that workspace. The helper is deliberately
narrow: the manual check of AC-7 is what confirms the addresses Vivaldi opens on 8.1 to 8.3, and
the list grows if Tore sees one more.

### Boot

`StartServices` in `WindowServices.ts` and `ModuleContext` in `Module.ts` gain:

```ts
/** The one workspace state of this window: which workspace every surface shows. */
activeWorkspace: ActiveWorkspace;
```

`ModuleStarter.start` destructures it from `start` and passes it into the context next to
`selectors`, `storage` and `notices`.

`VivArcDi` keeps `tabs` and `prefs`, builds the state once and gives it the list of workspaces:

```ts
this.#workspaces = new WorkspaceNames(prefs, (): void => undefined, logger.child('workspaces'));
this.#activeWorkspace = new ActiveWorkspace(tabs, logger.child('workspaces'), (workspaceId): boolean =>
  !this.#workspaces.listed || this.#workspaces.has(workspaceId));
```

In `#run`, after `WindowServices.open` and before the module loop, it starts the list and the
state, only when `chrome.tabs` is there, and a failure is a warning, never a failed start:

```ts
if (this.#tabs.available) {
  await this.#workspaces.start();
  await this.#activeWorkspace.start().catch((error: unknown) =>
    this.#logger.warn('the workspace cannot follow the tabs', error));
}
```

The context is built with `activeWorkspace: this.#activeWorkspace`. `stop` stops the state after
the modules, so every listener is removed with the module listeners (NFR-2).

`WorkspaceNames` gains `has(workspaceId): boolean` and `listed: boolean`, true once a read of
`vivaldi.workspaces.list` succeeded. A failed read leaves `listed` false, so the state accepts any
id, exactly as today. The boot does not start the list when `chrome.tabs` is missing, so no warning
is added to a window that has no tabs.

### Surfaces

Each module stops building its own state and reads the shared one. None of them stops it.

| Module | Change |
|---|---|
| `FolderSection.ts` | `this.#active = context.activeWorkspace`; subscribe in `start` before `#useWorkspace(this.#active.current)`; drop `() => this.#active.stop()` from `#stops` |
| `SpaceHeader.ts` | `active: context.activeWorkspace` in `#build`; subscribe in `#run`; drop `() => active.stop()` |
| `LiveFolders.ts` | `active: context.activeWorkspace` in `#build`; drop `() => active.stop()`; `start` still awaits `parts.active.start()` |
| `MainWindowRole.ts` | `const workspace = this.#context.activeWorkspace` in `#listenForPages`, no own instance and no cleanup |
| `FolderPreview.ts` | Only its `OpenLinks` changes, below |

`FolderSection.#show` and `SpaceHeader.#show` keep their bodies; they now run for a change of the
shared state rather than for one module's read. `#useWorkspace(this.#workspace)` after a rename,
`CollapsedPinned` (`SpaceHeader.ts:94`), `WorkspaceTabs` and `FolderEditing` keep their contracts.

### Open-link rows

`OpenLinks` receives the shown workspace as a function and filters by it instead of by the active
tab, which is what puts the rows of the shown workspace next to its folder rows even when the
active tab is an inspection page (AC-1, FR-3) or there is no active tab (FR-6):

```ts
constructor(tabs: OpenLinksTabs, onChange: () => void, logger: Logger,
  shownWorkspace: () => string | null, timing: FrameTiming = {});
```

```ts
#update(tabs: chrome.tabs.Tab[]): void {
  const workspace = this.#shownWorkspace();
  const linkedTabIds = tabs.filter((tab) => OpenLinks.#bookmarkIdOf(tab) !== undefined).flatMap(…);
  const visible = tabs.filter((tab) => tab.id !== undefined
    && (TabData.of(tab) === null || TabData.of(tab) === workspace));
  …
}
```

A tab outside any workspace stays visible in every workspace, as `TabData.shares` does today. The
refresh carries the generation of the state:

```ts
async refresh(): Promise<void> {
  const generation = ++this.#generation;
  try {
    const tabs = await this.#tabs.query({ currentWindow: true });
    if (generation === this.#generation) {
      this.#update(tabs);
    }
  } catch (error) {
    this.#logger.warn('could not read the open tabs', error);
  }
}
```

`stop` increments the generation as well, so a read that lands after the stop changes nothing. The
call sites pass the function: `FolderSection.ts:88` passes `(): string | null => this.#workspace ??
null` and `FolderPreview.ts:29` passes `(): string | null => context.activeWorkspace.current`. The
tests pass a constant or a variable.

### The folder minus

The section captures the workspace while the press is still synchronous and hands it through
`FolderClose` to the storage, so a key change during the awaited `tabs.remove` calls cannot mis-file
the state (FR-5, Q-4):

```ts
onClose: (tabIds, folderId): void => void this.#close.apply(tabIds, folderId, this.#workspace ?? null),
```

`FolderClose.apply(tabIds, folderId, workspace)` passes `workspace` to `openFolders.forget`. A
failed close still leaves the folder state alone, as 063 decided.

`OpenFolders` saves under the key of the given workspace, whichever one is loaded now:

```ts
public forget(id: string, workspaceId: string | null): void {
  const key = OpenFolders.#keyFor(workspaceId);
  const loaded = key === this.#key;
  const ids = loaded ? this.#ids : new Set(this.#storage?.read(key, FORMAT).value);
  if (!ids.delete(id)) {
    return;
  }
  if (loaded) {
    this.#ids = ids;
  }
  this.#save(key, ids);
}
```

`useWorkspace` uses the same `#keyFor`, and `#save(key = this.#key, ids = this.#ids)` keeps the
existing warning. The keys stay those of `OPEN_FOLDERS_STORAGE_KEY` (NFR-4). Folder deletion and
relocation capture `active.current` when they start and pass it:

- `FolderDeletionDependencies` gains `active: Pick<ActiveWorkspace, 'current'>`; `delete` reads it
  into a local before the first await; `FolderActionsFactory` passes `sources.active`.
- `FolderRelocation.move` already has `active`; it captures it at the top of `move`.

### Tests

Every acceptance criterion has its test, with the name verbatim.

| AC | Test file | Test name |
|---|---|---|
| AC-1 | `tests/core/workspaces/ActiveWorkspace.test.ts` | `keeps the selected workspace when an internal tab becomes active` |
| AC-2 | `tests/core/workspaces/ActiveWorkspace.test.ts` | `selects the Tabs area for a tab outside any workspace` |
| AC-3 | `tests/core/workspaces/ActiveWorkspace.test.ts` | `keeps the last workspace when the active tab is removed` |
| AC-4 | `tests/modules/folders/BookmarkFolders.test.ts` | `renders the header and folder rows from one workspace` |
| AC-5 | `tests/modules/folders/links/FolderClose.test.ts` | `saves the folder state in the workspace active at press time` |
| AC-6 | `tests/shared/links/OpenLinks.test.ts` | `does not show other workspaces' tabs when no tab is active` |

AC-7 has no test: it is Tore's manual check, because the live harness drives `window.html` and
cannot open `vivaldi://inspect/#apps`.

What each one does:

- AC-1: start on a tab in workspace `7`, activate `{ url: 'vivaldi://inspect/#apps', vivExtData:
  { workspaceId: 9 } }` and then a `devtools://devtools/bundled/inspector.html?ws=…` tab, and
  assert that nothing is reported and `current` stays `7`.
- AC-2: from workspace `7`, activate a tab with no `vivExtData`; assert `current` becomes `null`.
- AC-3: start on workspace `7`, mark its tab inactive, fire `onRemoved`; assert no report and
  `current` stays `7`.
- AC-4: start `SpaceHeader` and `BookmarkFolders` with one context and one state; activate an
  inspection tab in another workspace; assert the header still reads the workspace name and the
  rows are that workspace's folders.
- AC-5: with a `MemoryStorage`, `OpenFolders` loaded on `7` and the folder `10` open, a real
  `FolderCloser` over a fake `CloserTabs` whose `remove` loads `8` before it resolves; assert
  `vivarcdi.openFolders.7` lost `10` and no other key changed. The existing test
  `reports the folder only after every tab closed` passes a workspace as its third argument.
- AC-6: two links open in workspaces `7` and `8`, no tab active, shown workspace `7`; assert the
  row for `7` finds its tab and the row for `8` does not.

Extra tests, not tied to a criterion: `tests/core/tabs/InspectionTarget.test.ts` for the helper,
`keeps the last workspace when the tab names a workspace Vivaldi does not list` for NFR-3, a
cross-workspace case in `tests/modules/folders/tree/OpenFolders.test.ts`, and a refresh that
lands after a newer one in `OpenLinks.test.ts`.

The module tests follow the real state rather than a stub, so `start` in the module starts it:
`tests/modules/folders/BookmarkFolders.test.ts`, `tests/modules/folders/LinkTabHiding.test.ts`,
`tests/modules/spaceheader/SpaceHeader.test.ts` and `tests/modules/livefolders/LiveFolders.test.ts`
add `activeWorkspace: new ActiveWorkspace(tabs, silentLogger())` to their context. The one test
that counts the tab listeners after `module.stop()` in `BookmarkFolders.test.ts` stops the state
first. `tests/modules/littlearc/module.test.ts` gets a stub with `current: null` and no-op
`start`, `onChange`, `refresh` and `stop`.

## Files

| File | Role |
|---|---|
| `src/core/tabs/InspectionTarget.ts` | Tells Vivaldi's inspect page and its DevTools windows from a normal page |
| `src/core/workspaces/ActiveWorkspace.ts` | The one state: many listeners, `onRemoved`, inspection pages, unlisted ids |
| `src/core/workspaces/WorkspaceNames.ts` | `has` and `listed` for the state's check |
| `src/core/boot/Module.ts` | `activeWorkspace` in `ModuleContext` |
| `src/core/boot/ModuleStarter.ts` | Passes the state into the context |
| `src/core/boot/WindowServices.ts` | `activeWorkspace` in `StartServices` |
| `src/core/boot/VivArcDi.ts` | Builds, starts and stops the state; keeps `tabs` and `prefs` |
| `src/modules/folders/FolderSection.ts` | Follows the shared state; passes the shown workspace to the close |
| `src/modules/spaceheader/SpaceHeader.ts` | Follows the shared state |
| `src/modules/livefolders/LiveFolders.ts` | Follows the shared state |
| `src/modules/littlearc/MainWindowRole.ts` | Reads the shared state |
| `src/shared/links/OpenLinks.ts` | Shown-workspace filter and refresh generation |
| `src/modules/folderpreview/FolderPreview.ts` | Gives `OpenLinks` the shown workspace |
| `src/modules/folders/links/FolderClose.ts` | Saves the folder under the workspace of the press |
| `src/modules/folders/tree/OpenFolders.ts` | `forget` by workspace key |
| `src/modules/folders/editing/FolderDeletion.ts`, `FolderRelocation.ts`, `FolderActionsFactory.ts` | Capture the shown workspace for `forget` |
| `tests/core/tabs/InspectionTarget.test.ts` | New helper tests |
| `tests/core/workspaces/ActiveWorkspace.test.ts` | AC-1, AC-2, AC-3, NFR-3 |
| `tests/modules/folders/BookmarkFolders.test.ts` | AC-4 and the real state in the setup |
| `tests/modules/folders/links/FolderClose.test.ts` | AC-5 |
| `tests/shared/links/OpenLinks.test.ts` | AC-6 and the generation |
| `tests/modules/folders/tree/OpenFolders.test.ts` | `forget` by workspace key |
| `tests/modules/folders/editing/FolderDeletion.test.ts`, `FolderRelocation.test.ts` | The workspace passed to `forget` |
| `tests/modules/folders/LinkTabHiding.test.ts`, `tests/modules/spaceheader/SpaceHeader.test.ts`, `tests/modules/livefolders/LiveFolders.test.ts`, `tests/modules/littlearc/module.test.ts` | Setups carry the state |
| `tests/loader/VivArcDi.test.ts` | The context carries the state |

## Risks

| Risk | Answer |
|---|---|
| The inspection page shows an address the helper does not match | AC-7 finds it; the helper grows with the scheme Tore sees |
| Ignoring every DevTools window hides a real workspace | DevTools windows never belong to a chosen workspace |
| A module that starts alone finds no state | `start` is idempotent: the first caller subscribes, the boot normally does it |
| A module stops the state and the others go blind | No module calls `stop`; `VivArcDi.stop` does, after every module |
| No `chrome.tabs` in a boot test adds a warning | The list and the state start only when `tabs.available`, so the existing boot warnings stay |
| A test now counts the state's listeners after `stop` | The test stops the state first; the other listener counts never start it |
| `OpenLinks` trusts a state that lags behind Vivaldi | The state re-reads on activation, update and removal without polling |
| An unlisted id empties the sidebar | The state keeps the last workspace and warns once |
| The folder state is saved while another workspace shows | `forget` writes the key of the press workspace and leaves the loaded one alone |
| A read lands after a newer one | The generation check drops it, and `stop` invalidates the pending reads |
| The boot cannot read the workspace list | `listed` stays false, so every id is accepted, as today |

## Version

The implementation runs on `fix/064-stable-workspace-view` and makes a patch version bump, read from
`origin/main` right before that task, in `package.json`, `package-lock.json` and
`installer/vivarcdi/__init__.py`.
