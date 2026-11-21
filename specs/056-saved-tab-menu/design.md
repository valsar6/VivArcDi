# 056 Menu of a saved tab: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-21 (pull request #241). It says **how**; the spec says
**what**. It builds on the link-row menu of [031](../031-pin-and-tile-commands/design.md), the folder
menu of [033](../033-folder-menu/design.md) and the label of [027](../027-rename-pinned-tabs/design.md).
It is written for the tiles too: [057](../057-tile-menu/spec.md) reuses the classes of `src/shared/links/`.

## Approach

### Today (verified in the code)

| Fact | Where |
|---|---|
| The menu of a link row is `RowMenu`: two commands (`Remove pin`, `Tile tab`) in VivArcDi's own `ContextMenu`; Vivaldi's menu is cancelled for bookmark rows | `src/modules/folders/editing/RowMenu.ts` 44-57 |
| `RowMenu` is built next to `FolderMenu` with `{ document, menu, removal }` | `src/modules/folders/dragdrop/FolderDragDrop.ts` 114 |
| The folder menu is `FolderMenuItems` (groups split by separators, empty group dropped) fed by `FolderActions` | `src/modules/folders/editing/FolderMenuItems.ts` 7-49; built in `FolderEditing.#folderActions` 165-198 |
| `ContextMenu` has command, submenu (`items`) and separator items; a command can be `checked`; no `disabled` | `src/core/dom/ContextMenu.ts` 4-22, `#commandRow` 108-120 |
| `Toast.show(text, kind)` has no click; the element is `pointer-events: none` | `src/core/dom/Toast.ts` 51-58, `src/styles/toast.scss` 32 |
| `BookmarkWriter.update(id, title)` changes the title only; `BookmarkChanges` has `title` and `description` | `src/core/browser/bookmarks/BookmarkWriter.ts` 14-18, 80-82 |
| `BookmarkCopier` copies `title` and `url` only; it lives in the folders module | `src/modules/folders/editing/BookmarkCopier.ts` 27-47, 74-76 |
| `FolderRelocation` moves a folder to the end of the root of a workspace and writes `workspaceId` into each open tab afterwards; the toast is `Moved "<name>" to <workspace>` | `src/modules/folders/editing/FolderRelocation.ts` 63-92, 101-109 |
| The open tab of a link is found as `TabData.ownOf(tab).bookmarkId === linkId`, in the current window, same workspace as the active tab, most recent first | `src/modules/folders/favoritelinks/LinkRemoval.ts` 158-163 |
| `TabTiler.tile(ids)` writes a shared `tiling` (`{ id, index, layout: 'row', type: 'selection' }`) into each tab's `vivExtData`; used by Peek only | `src/modules/peek/TabTiler.ts` 25-35 |
| `WorkspaceCreator.create(name)` drives Vivaldi's New Space form (open menu, `startCreate`, `writeName`, `save`, wait until listed) | `src/modules/workspacesync/WorkspaceCreator.ts` 20-30, `WorkspaceMenu.ts` |
| `NewTabOpener.open()` creates a blank tab and focuses the address field | `src/shared/newtab/NewTabOpener.ts` 28-33 |
| `TextCopier.for(document, clipboard).write(text)` copies with a fallback; the toast texts are `Copied` and `Copy failed` | `src/shared/clipboard/TextCopier.ts` 105-113, `src/modules/copyurl/CopyUrl.ts` 11-12 |
| Rename and Change icon (027) are **not implemented**: no code stores a name or icon on a bookmark | `specs/027-rename-pinned-tabs/` Approved, no `src` match |

Two consequences shape the design:

1. `src/shared/` cannot import a module and modules cannot import each other
   (`tools/eslint/module-boundaries.mjs`). Duplicate, Move to, Split View and the address change must
   serve the folders module now and the Favorites module in 057, so their classes go to
   `src/shared/links/`, and `BookmarkCopier`, `TabTiler` and the workspace-menu drivers move there
   first (tasks T4, T6, T7). Parts that only the folders module owns (`ClosingLinks`, `WorkspaceRoots`)
   are injected through small local interfaces, not imported.
2. FR-3 says the copy keeps the `vivExtData`, but `BookmarkNode` and `BookmarkWriter` have no such
   field and 027 has stored nothing yet (the spec asks for more than the code can do today). The design copies title
   and URL, and calls a `LinkExtras.copy(fromId, toId)` hook that does nothing until 027 stores the
   name and icon; 027 then fills the hook, and T1 reports which fields a bookmark node carries.

### Probe findings (T1)

T1 runs on the throwaway profile with `npm run live -- --probe <file>`, only after Tore agrees. A probe
is read-only for storage and bookmarks (spec 046 FR-9); it may create and move tabs of the lab profile.
The lead writes each finding here before the task that depends on it starts. Until then the plan is the
**hypothesis**, and the **fallback** is what that task does if the hypothesis fails.

| # | Question | Hypothesis | Fallback | Used by |
|---|---|---|---|---|
| F-1 | Tile two tabs from code | Writing the same `tiling` group into both tabs with `TabTiler` shows a split view on 8.1 and 8.2, with the selected tab left and the row's tab right | Vivaldi's command through `vivaldi.tabsPrivate` or the `Tile tabs` shortcut event, found by the probe; if none works, NFR-2: the item is not shown | T6 |
| F-2 | Tile a blank new tab with the row's tab and open the address bar on it | `NewTabOpener.open()` makes a blank tab with the address field focused; tiled with the row's tab at once, Enter navigates **that** tab inside the split; the blank tab, still blank when the field closes, is closed again by `chrome.tabs.onRemoved` or `onUpdated` handling, which undoes the split | Vivaldi's `Cmd/Ctrl+L` field on the selected tab and `onCreated`; the probe says which event fires and in what order | T6 |
| F-3 | Create a workspace | `WorkspaceCreator.create(name)` works when called by a menu command (not at a quiet moment from the sync): `vivaldi.workspaces.list` lists the new name within 3 s | A `deferred` result is retried once; a `failed` one gives the error toast and no move | T7 |
| F-4 | Move a tab between workspaces | Writing `workspaceId` with `TabData.withWorkspace` into the tab (as 033 does, `FolderRelocation` 101-109) shows the tab in the target and hides it in the source, without switching | None needed; the probe confirms 8.1 and 8.2 | T7 |
| F-5 | Switch to a workspace from code | Click the row of the workspace in Vivaldi's workspace popup (`workspaceMenuButton`, `workspaceRow` of the catalog), or activate a tab of the target | The toast click only activates the moved tab, which also switches | T7 |
| F-6 | How the link-row menu is built | From the code: `RowMenu` builds items for `ContextMenu` on a `contextmenu` event of an element with `data-vivarcdi-link-id` (`LINK_ATTRIBUTE`); the probe checks that the attribute is on the rows of the lab window and that Vivaldi's menu does not open | - | T3 |
| F-7 | Fields of a bookmark | `chrome.bookmarks.get` of a pinned link: whether it carries `vivExtData`, `nickname` or other Vivaldi fields besides `description`; `chrome.bookmarks.update(id, { url })` is a write, so it is covered by the scenario of T5 and the manual AC-13, not by a probe | `LinkExtras` stays a no-op (above) | T4, T5 |

## The menu (FR-1)

**`LinkMenuItems`** in `src/shared/links/` builds the items of a link row from a `LinkActions` object,
as `FolderMenuItems` does for folders: groups, a separator between two non-empty groups, a group left
empty is dropped, an item shows from the release that implements it. Order (Arc's, with 027 and 031):

| Group | Items |
|---|---|
| 1 | `Copy Link` |
| 2 | `Change icon…`, `Rename…` (027, absent until implemented), `Edit Pinned Page ▸` |
| 3 | `Open in Split View`, `Duplicate`, `Move to ▸` |
| 4 | `Remove pin`, `Tile tab` (031) |

```ts
interface LinkActions {
  /** Each member is null where the command is not available: the item is left out. */
  copyLink: (linkId: string) => MenuItem | null;
  editPinnedPage: (linkId: string) => Promise<MenuItem | null>;
  openInSplitView: (linkId: string) => Promise<MenuItem | null>;
  duplicate: (linkId: string) => MenuItem | null;
  moveTo: (linkId: string) => MenuItem | null;
  removePin: (linkId: string) => MenuItem;
  tileTab: (linkId: string) => MenuItem;
}
```

Disabled states need the tab (`Replace Pinned URL with Current`, `Open in Split View`), which is read
asynchronously, so `LinkMenuItems.for(linkId)` returns `Promise<MenuItem[]>`; `RowMenu` opens the menu
when it resolves (one `chrome.tabs.query`, under a frame). `RowMenu` takes `items: Pick<LinkMenuItems,
'for'>` instead of `removal` (`RowMenu.ts` 11, 51-55); `FolderDragDrop` builds `LinkMenuItems` from a new
`linkActions: LinkActions` dependency, next to `folderActions` (`FolderDragDrop.ts` 45, 114).
`FolderEditing` builds it in `#linkActions(toast)`, one private method per slot, next to
`#folderActions` (`FolderEditing.ts` 165): `#copyLink`, `#editPinnedPage`, `#openInSplitView`,
`#duplicate`, `#moveTo`. T3 writes them all as `return null`; T4 to T7 each fills its own.

## New and changed core pieces (T2)

- **`ContextMenu`**: `CommandItem` gains `disabled?: boolean`. A disabled row has `aria-disabled="true"`
  and the attribute `data-vivarcdi-disabled`, ignores click and hover, and does not close the menu.
  A submenu row stays openable. `src/styles/_tokens.scss` and the menu styles grey the row.
- **`Toast.show(text, kind?, onClick?)`**: with `onClick`, the toast element takes the attribute
  `data-vivarcdi-actionable`, gets `pointer-events: auto` and `cursor: pointer` (`toast.scss`), and a
  click runs `onClick` once and hides the toast. Without it nothing changes (the 2 s toast of 041 and
  the existing callers are untouched).
- **`PromptDialog`** in `src/core/dom/`: a small modal in `#browser`, no-drag, closed on Esc, Cancel or
  a click on the backdrop. `ask({ title, text?, label, value, confirm, validate? }): Promise<string | null>`
  resolves the trimmed value on Enter or the confirm button, `null` on cancel. When `validate(value)`
  returns a reason, the dialog stays open, the field gets `aria-invalid="true"` and
  `data-vivarcdi-invalid`, and the reason is read out (`role="alert"`). The field is focused and its text
  selected when the dialog opens. Only one dialog is open; a second `ask` cancels the first. Styles in
  `src/styles/dialog.scss`, listed as `styles/dialog.css` in `src/config.json`.

## Copy Link (FR-2)

**`LinkClipboard.copy(linkId)`** in `src/shared/links/`: reads the bookmark (`writer.get`), copies its
`url` with `TextCopier.write`, then `notify('Copied')`; a refused copy or a missing url logs and
`notify('Copy failed', 'error')` (NFR-1). The texts are the constants `COPIED_TEXT` and `FAILED_TEXT` of
`copy-url`, repeated in `src/shared/links/LinkTexts.ts` because a module cannot import another. The
module `copy-url` and `LiveRowMenu` keep their own.

## Duplicate (FR-3)

`BookmarkCopier` moves from `src/modules/folders/editing/` to `src/shared/links/` (its test moves to
`tests/shared/links/`; `FolderDuplication` and `FolderEditing` change their import). **`LinkDuplication`**
`duplicate(linkId)`: `writer.get(linkId)` for `parentId` and `index`, then
`copier.copy([linkId], parentId, index + 1)` (the call `FolderDuplication` makes, `FolderDuplication.ts`
39), then `extras.copy(linkId, copyId)`. The copy has no tab (Q-3), so it is closed. A failure logs and
shows `Could not duplicate "<title>"` as an error toast, as 033 does. The folder
Duplicate of 033 does not change.

## Move to (FR-4, FR-5)

**`LinkedTab.of(linkId)`** in `src/shared/links/`: the open tab of a bookmark, with the rule of
`LinkRemoval.#tabOf` (`LinkRemoval.ts` 158-163): current window, shares the workspace of the active tab,
`TabData.ownOf(tab).bookmarkId === linkId`, most recently accessed first. `LinkRemoval` is not changed
(a later cleanup may use `LinkedTab`). Move, Replace and Split View use it.

**`LinkRelocation`** in `src/shared/links/`, the link twin of `FolderRelocation`:

- `submenu(linkId)` returns `Move to` with one command per entry of `names.entries`, the current one
  `checked` and doing nothing, then a separator and `New Space…` (AC-4). Null when Vivaldi lists no
  workspace.
- `move(linkId, workspace)`: `ensurePath(roots.rootFor(workspace.name))`; when that is the current root,
  toast `"<title>" is already there`; else `hold.add([linkId])`, `writer.move(linkId, { parentId })`
  (end of the root, `FolderRelocation.ts` 82), then **only** the tab of `LinkedTab.of(linkId)` gets
  `TabData.withWorkspace(...)` through `TabDataWriter` (Q-1; 033 moves all linked tabs, the link row
  moves one), `hold.clear` in `finally`. Then `toast.show('Tab moved! Click to go there.', 'ok', () =>
  switcher.to(workspace))`. A failure logs and shows `Could not move "<title>"` as an error toast and
  leaves the bookmark where it was.
- `moveToNewSpace(linkId)`: `PromptDialog.ask({ title: 'New Space', label: 'Name', confirm: 'Create',
  validate: reason for an empty name or a name Vivaldi already lists })`; `null` or an empty name creates
  nothing (FR-5, AC-6); else `creator.create(name)`; when it returns `done`, find the entry with
  `names.idOf(name)` and `move(linkId, entry)`; any other result gives `Could not create the space` as an
  error toast and moves nothing.
- `WorkspaceSwitcher.to(workspace)` (F-5): the way the probe finds; it reads and writes nothing else.

Injected, not imported (shared cannot see the folders module): `hold: { add(ids: Iterable<string>): void;
clear(ids: Iterable<string>): void }` (shape of `ClosingLinks.add`/`clear`, `ClosingLinks.ts` 15, 24),
`roots: { rootFor(name: string | null): string[] }` (shape of `WorkspaceRoots.rootFor`, `WorkspaceRoots.ts`
39), `names`, `active`, `writer`, `tabData`, `creator`, `switcher`, `dialog`, `toast`, `logger`.

The workspace-menu drivers move from `src/modules/workspacesync/` to `src/shared/spaces/`: `Poll`,
`ElementGestures`, `EditorOpener`, `ReactInternals`, `QuietMoment`, `MenuCommand`, `WorkspaceMenu`,
`WorkspaceCreator` (and `WorkspaceRenamer`, which shares `MenuCommand`); their tests move to
`tests/shared/spaces/`; `workspacesync` imports them from there. A move of files and imports, no change of
behavior (T7a).

## Edit Pinned Page (FR-6, FR-7)

`BookmarkChanges` gains `url?: string`; `BookmarkWriter.setUrl(id, url)` calls
`chrome.bookmarks.update(id, { url })` through the same serialized queue (`BookmarkWriter.ts` 80-82).

**`PinnedAddress`** in `src/shared/links/`:

- `submenu(linkId)` returns `Edit Pinned Page ▸` with `Replace Pinned URL with Current` and `Edit…`.
  `Replace…` is `disabled` when `LinkedTab.of(linkId)` is undefined or `sameAddress(tab.url, bookmark.url)`
  (AC-9; `sameAddress` compares the `href` of `new URL(...)` of both, so a trailing slash does not count).
- `replace(linkId)`: `setUrl(linkId, tab.url)` (AC-8).
- `edit(linkId)`: `PromptDialog.ask({ title: 'Edit Pinned URL', text: 'This is what opens first when
  you click this tab or its favicon.', label: 'URL', value: bookmark.url, confirm: 'Save',
  validate })`, where `validate` accepts a string `new URL(value)` parses with an `http`, `https`,
  `file` or `vivaldi` protocol and returns `Enter a valid address` otherwise (FR-6, AC-7); on `null`
  nothing is written; else `setUrl`. Name and icon are never written (the title is not passed).
- A failed write logs and shows `Could not change the address` as an error toast (NFR-1).

AC-13 (the new address opens first, also after a restart) rests on the bookmark url being what a click
on the row opens (`OpenLinks`, `LinkActivator` read the bookmark); the manual check confirms it.

## Open in Split View (FR-8, FR-9)

`TabTiler` moves from `src/modules/peek/` to `src/shared/tabs/` (`Peek.ts` 19, 99 and
`tests/modules/peek/LinkOpener.test.ts` 4 change their import; its tests are untouched). **`SplitView`**
in `src/shared/links/`:

- `item(linkId)` returns `Open in Split View`, or null when the probe F-1 found no way to tile (NFR-2:
  logged once, `Open in Split View is off: <reason>`). It is `disabled` when the selected tab is the tab
  of the row, or both carry the same `tiling.id` (FR-8). It stays enabled when no ordinary tab is selected (FR-9); a tile of the Favorites grid does not count as one (the tab is linked to a Favorites bookmark: `LinkedTabs` of the favorites module, or the same test the tile module uses; the implementer finds and cites it).
- `open(linkId)`: with a selected tab, `LinkedTab.of(linkId)` or, when the row has no tab, a new
  tab opened from the bookmark url and linked to it with `WorkspaceTabs.open(url, workspaceId, { bookmarkId })`, as `LinkActivator.#open` does (`LinkActivator.ts` 70-73); T6 checks that it opens without taking the selection; then
  `tiler.tile([rowTabId, selectedId])` (the tab that asked for the split is the left pane, Tore 2026-11-21).
- Without a selected ordinary tab (FR-9), as in Arc's recording of 2026-11-21: Vivaldi's New Tab command runs, and the tab of the row and the new blank tab
  are tiled at once, `tiler.tile([rowTabId, newId])` (row left, blank right), and the address bar is opened
  on the blank tab (`NewTabOpener`); what the user chooses navigates that tab, so it loads in the right
  pane and nothing else is needed. When the blank tab is closed while still blank (Esc, a click elsewhere),
  a one-shot listener of `chrome.tabs.onRemoved` or `onUpdated` undoes the split (Q-5); a second command or
  `stop()` remove the listener. Details of the events are F-2.
- A failure logs and shows `Could not open the split view` as an error toast.

## Components

| Class or file | Responsibility | Task |
|---|---|---|
| `src/core/dom/ContextMenu.ts`, `src/styles/_tokens.scss` | `disabled` item | T2 |
| `src/core/dom/Toast.ts`, `src/styles/toast.scss` | Click action on a toast | T2 |
| `src/core/dom/PromptDialog.ts`, `src/styles/dialog.scss`, `src/config.json` | The small dialog | T2 |
| `src/shared/links/LinkMenuItems.ts`, `src/shared/tabs/CommandLabels.ts` | Menu groups, labels | T3 |
| `src/shared/links/LinkedTab.ts` | Open tab of a bookmark | T3 |
| `src/modules/folders/editing/RowMenu.ts`, `FolderDragDrop.ts`, `FolderEditing.ts` | Menu rewired, five empty slots | T3 |
| `src/shared/links/LinkClipboard.ts`, `LinkTexts.ts` | Copy Link | T4 |
| `src/shared/links/BookmarkCopier.ts` (moved), `LinkDuplication.ts`, `LinkExtras.ts` | Duplicate | T4 |
| `src/core/browser/bookmarks/BookmarkWriter.ts`, `src/shared/links/PinnedAddress.ts` | Edit Pinned Page | T5 |
| `src/shared/tabs/TabTiler.ts` (moved), `src/shared/links/SplitView.ts` | Open in Split View | T6 |
| `src/shared/spaces/` (moved drivers), `src/modules/workspacesync/` imports | Extraction | T7a |
| `src/shared/links/LinkRelocation.ts`, `WorkspaceSwitcher.ts` | Move to, New Space, toast | T7b |
| `src/selectors/8.1.json`, `tests/live/selector-states.json` | Names found by F-1, F-2 and F-5, if any | T6, T7b |
| `tests/live/scenarios/opens-a-saved-tab-in-split-view.live.ts`, `...-with-a-new-tab.live.ts` | AC-10, AC-11 | T8 |

## Selectors

Only what the probes need and `context.selectors` does not give yet; each new name goes to
`src/selectors/8.1.json` and to the selector check of spec 047. Existing names used:
`addressField`, `workspaceMenuButton`, `workspacePopup`, `workspaceCreate`, `workspaceTitle`,
`workspaceSave`, `workspaceRow`, `tabWrapper`, `browser` (`src/selectors/8.1.json`).

## Configuration

None: the items follow the folders module (`bookmark-folders`) and appear from the release that
implements them (a task that lands first does not wait for the others).

## Acceptance criteria to tests

Names are the `auto:` texts, verbatim.

| AC | Test name | File |
|---|---|---|
| AC-1 | `copies the saved link of a row` | `tests/shared/links/LinkClipboard.test.ts` |
| AC-2 | `duplicates a saved tab right below it` | `tests/shared/links/LinkDuplication.test.ts` |
| AC-3 | `moves a saved tab to another workspace` | `tests/shared/links/LinkRelocation.test.ts` |
| AC-4 | `checks the current workspace in move to of a saved tab` | `tests/shared/links/LinkRelocation.test.ts` |
| AC-5 | `switches to the workspace from the move toast` | `tests/shared/links/LinkRelocation.test.ts` |
| AC-6 | `moves a saved tab to a new space` | `tests/shared/links/LinkRelocation.test.ts` |
| AC-7 | `edits the pinned url of a saved tab` | `tests/shared/links/PinnedAddress.test.ts` |
| AC-8 | `replaces the pinned url with the current one` | `tests/shared/links/PinnedAddress.test.ts` |
| AC-9 | `disables replace pinned url when equal` | `tests/shared/links/PinnedAddress.test.ts` |
| AC-10 | `live: opens a saved tab in split view` (from `manual`, T8) | `tests/live/scenarios/` |
| AC-11 | `live: opens a saved tab in split view with a new tab` (from `manual`, T8) | `tests/live/scenarios/` |
| AC-12 to AC-14 | `manual`, the checklist of T10 | - |

Further tests, named freely, not tied to an AC: the menu order and the separators
(`LinkMenuItems.test.ts`, `RowMenu.test.ts`); a disabled row ignores a click (`ContextMenu.test.ts`);
the toast action (`Toast.test.ts`); the dialog (`PromptDialog.test.ts`: Enter, Esc, invalid keeps it
open); the one tab that moves, an empty name, a failed write giving an error toast; `Open in Split
View` disabled when already tiled, enabled with no tab selected, and the address-bar path with a fake
`onUpdated` (`SplitView.test.ts`, which also covers FR-8, FR-9 and NFR-2).

## Risks

- Vivaldi may not accept a hand-written `tiling` on 8.2, or may show it half drawn; F-1 decides, and
  NFR-2 hides the item rather than leaving a broken one.
- The New Space form is driven through the interface (as 055 does for the web panel form): a Vivaldi
  restyle fails one named step, `creator.create` returns `failed`, the user sees the error toast, and
  the move does not happen.
- Duplicate with no `vivExtData` support copies less than Arc's copy until 027 lands; the hook keeps
  the change small.
- Two windows: a tab of another window is never written (`LinkedTab` reads the current window only,
  042), so a saved tab open elsewhere stays where it is.
- Merge conflicts: T4 to T7b all add a line to `FolderEditing` (imports and one slot method); the merge
  order in [tasks.md](tasks.md) makes them trivial.
