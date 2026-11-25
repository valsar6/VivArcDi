# 063 Minus closes folder link tabs: design

| | |
|---|---|
| Status | Approved (2026-11-25, PR #280) |
| Spec | [spec.md](spec.md) |

Tore approved the spec on 2026-11-25 (PR #280) and chose the proposed names in Q-1. This document
says **how**; the spec says **what**. It keeps the look and visibility of
[062](../062-minus-hover-and-indent/design.md) and the pinned unload of
[061](../061-pinned-minus-ui/design.md), and changes only the press on the two Favorites row
minuses.

## Approach

The section already collects the right tab ids in `FolderMinus` and swallows the press in
`FolderSectionView`. What changes is the handler behind the button: `TabUnloader.discard` becomes
`tabs.remove`, and a folder press also closes the folder in `OpenFolders`. The bookmark tree is not
written.

| Area | What changes | Where |
|---|---|---|
| Close | A `FolderCloser` calls `tabs.remove` for every id and reports success | `modules/folders/links/FolderCloser.ts` |
| Folder state | `FolderClose` forgets the folder and redraws only after every close succeeded | `modules/folders/links/FolderClose.ts` |
| Wiring | The view's `onUnload` becomes `onClose`, carrying the folder id of a folder press | `modules/folders/view/FolderSectionView.ts`, `modules/folders/FolderSection.ts` |
| Folder state | A successful folder press forgets its id in `OpenFolders` and redraws | `modules/folders/FolderSection.ts` |
| Labels | `Close tab` and `Close tabs` replace `Unload tab` and `Unload tabs` on the two rows | `modules/folders/view/FolderRowElement.ts` |
| Retired code | `FolderUnloader` is removed; the pinned path keeps `core/tabs/TabUnloader` | `modules/folders/links/FolderUnloader.ts` |
| Docs | The manual, README and superseded criteria in 009, 061 and 062 name a close, not an unload | `docs/manual/tab-bar.md`, `README.md`, `specs/` |

### Closing the tabs

`FolderCloser` mirrors the small shape of `FolderUnloader` with the opposite API:

```ts
export type CloserTabs = Pick<BrowserTabs, 'remove'>;

export class FolderCloser {
  #tabs: CloserTabs;
  #logger: Pick<Logger, 'error'>;

  constructor(tabs: CloserTabs, logger: Pick<Logger, 'error'>) {
    this.#tabs = tabs;
    this.#logger = logger;
  }

  public async close(tabIds: number[]): Promise<boolean> {
    for (const tabId of tabIds) {
      try {
        await this.#tabs.remove(tabId);
      } catch (error) {
        this.#logger.error(`Could not close tab ${tabId}`, error);
        return false;
      }
    }
    return true;
  }
}
```

It stops at the first failure and returns false; `FolderSection` then leaves the folder open, so no
folder is hidden while one of its tabs is still there. `tabs.remove` fires the same removal event
that Cmd/Ctrl+W fires, so `OpenLinks`, `HiddenTabs` and the row redraw follow the existing path: the
link loses its tab, the row loses its extra indent and its minus, and it returns to the bookmark's
depth.

The class uses constructor dependencies so the fakes in `tests/modules/folders/fakes.ts` can prove
which ids were removed and can make one removal fail. No toast is added.

### The view's close handler

`SectionHandlers.onUnload(tabIds)` becomes
`onClose(tabIds: number[], folderId: string | undefined)`. In `#click`, after `FolderMinus.tabIds`
collects the ids, the view reads `data-vivarcdi-folder-id` from the row and passes it as the second
argument: a defined id for a folder minus, `undefined` for a link minus. The delegated listener,
`FolderMinus.swallow` and the drag/click routing stay as they are, so a press still opens nothing.

`FolderSection` builds one `FolderClose` from a `FolderCloser`, the section's `OpenFolders` and a
redraw callback, and wires:

```ts
onClose: (tabIds, folderId): void => void this.#close.apply(tabIds, folderId);
```

`FolderClose.apply` awaits `closer.close(tabIds)`. On success it calls
`openFolders.forget(folderId)` when the id is defined — the same save-backed removal that folder
deletion and relocation use — and requests one redraw. On failure it only logs through
`FolderCloser`; no folder state changes. Virtual folders keep their source's behavior: a later click
opens them again through the existing `#toggle` path.

The pinned path is untouched: `PinnedMinus` and `PinnedTileMinus` still call `TabUnloader.discard`
through their own modules.

### Labels and retired code

`LINK_LABEL` and `FOLDER_LABEL` in `FolderRowElement` become `Close tab` and `Close tabs`, matching
the new action (Q-1). No tooltip or title is added beyond the row's existing title.

`FolderUnloader` has no caller after the wiring change, so the file is deleted rather than left as
dead code. `core/tabs/TabUnloader` stays for the pinned path and for other modules.

### Superseded criteria and docs

In the implementation's docs task:

- 061/FR-6 and AC-11 and AC-12 are marked as refined by 063, with their checks renamed to 063's
  verbatim `auto:` names; 061's pinned criteria keep their names.
- 062/FR-3 is marked as refined by 063 for the folder and link rows only, and 009/FR-12 and FR-15
  say the row minus now closes rather than unloads.
- `docs/manual/tab-bar.md` and `README.md` replace "unload" for folder and link rows with "close",
  and describe the folder's re-close. The pinned sections keep "unload".

### Version

The implementation runs on `features/063-minus-closes-tabs` and makes a minor version bump, read
from `origin/main` right before that task.

## Files

| File | Role |
|---|---|
| `src/modules/folders/links/FolderCloser.ts` | Closes tab ids, reports failure |
| `src/modules/folders/links/FolderClose.ts` | Forgets the folder and redraws after success |
| `src/modules/folders/links/FolderUnloader.ts` | Removed; no caller left |
| `src/modules/folders/view/FolderSectionView.ts` | `onClose` with the folder id |
| `src/modules/folders/view/FolderRowElement.ts` | Close labels |
| `src/modules/folders/FolderSection.ts` | Wire the closer; forget the folder on success |
| `tests/modules/folders/links/FolderCloser.test.ts` | New close tests |
| `tests/modules/folders/view/FolderSectionView.test.ts` | AC-1, AC-2, AC-3, AC-4 |
| `tests/modules/folders/BookmarkFolders.test.ts` | AC-1, AC-2, AC-5 through the module |
| `specs/061-pinned-minus-ui/spec.md`, `specs/062-minus-hover-and-indent/spec.md`, `specs/009-bookmark-folders-in-tab-bar/spec.md` | Refined criteria |
| `docs/manual/tab-bar.md`, `README.md` | User-facing wording |
| `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` | Minor version bump |

## Risks

| Risk | Answer |
|---|---|
| Closing a tab makes its row flash into today's list | The tab removal event feeds the existing `OpenLinks` and `HiddenTabs` redraw path |
| A folder closes while one of its tabs fails to close | `FolderCloser` returns false on the first failure, so the folder state is untouched |
| A press on a link's minus toggles or drags its row | The view keeps swallowing pointer and click events before the row handler |
| The close misuses the pinned unload path | Only the folder section handler changes; `PinnedMinus` and `PinnedTileMinus` stay |
| A stale `Unload tab` assertion keeps passing | The docs task renames the checks and the tests together; `make check` proves it |
| A virtual folder stays open after its tabs close | `OpenFolders.forget` closes it for this workspace; its source path reopens it on click |
