# 063 Minus closes folder link tabs: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/063-minus-closes-tabs` for the code, with a minor version change per CONTRIBUTING:
read the version on `origin/main` right before T4 and bump both `package.json` and
`installer/vivarcdi/__init__.py`. Each code task follows TDD: first the failing tests with the
verbatim `auto:` names of the criteria, then the code, then `make check`. There is no live scenario:
the module fakes can read the closed tabs and the row state.

## Order

```
T1 ──> T3 ──> T4 (lead: docs and version) ──> T5 (Tore: manual)
   └──> T2 ──┘
```

T1 owns the new closer. T2 owns the view and the labels; T3 owns the section wiring and can run
after T1. T4 runs last on the code and reads the version from `origin/main` at that point.

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `src/modules/folders/links/FolderCloser.ts`, `tests/modules/folders/links/FolderCloser.test.ts` |
| T2 | `src/modules/folders/view/FolderSectionView.ts`, `src/modules/folders/view/FolderRowElement.ts`, `tests/modules/folders/view/FolderSectionView.test.ts` |
| T3 | `src/modules/folders/FolderSection.ts`, `src/modules/folders/links/FolderClose.ts`, `src/modules/folders/links/FolderUnloader.ts`, `tests/modules/folders/BookmarkFolders.test.ts`, `tests/modules/pinned/PinnedTabs.test.ts` |
| T4 | `specs/061-pinned-minus-ui/spec.md`, `specs/062-minus-hover-and-indent/spec.md`, `specs/009-bookmark-folders-in-tab-bar/spec.md`, `docs/manual/tab-bar.md`, `README.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` |
| T5 | Nothing in the repository; the checklist comes from AC-6 |

## Tasks

- [x] **T1. The tab closer** (TDD). Add `tests/modules/folders/links/FolderCloser.test.ts` with
  `FolderTabs` and a logger fake: assert that each id is passed to `tabs.remove` in order, that no
  `discard` call is made, and that a failing removal logs and makes `close` return false without
  calling the later ids. Then add `FolderCloser` with a `CloserTabs` type, constructor dependencies
  and the failure result. Done when `make check` is green.
- [x] **T2. The view reports a close** (TDD; after T1). In
  `tests/modules/folders/view/FolderSectionView.test.ts`, rename
  `unloads a link tab from its minus` to `closes a link tab from its minus` (AC-1) and
  `unloads the link tabs of a folder from its minus` to
  `closes the open link tabs of a folder from its minus and closes the folder` (AC-2); assert the
  handler receives the tab ids and `undefined` for a link, the ids and the folder id for a folder.
  Add `does not drag or open a Favorites row from its minus` (AC-3) and
  `labels the row minuses for closing tabs` (AC-4) for `Close tab` and `Close tabs`, with no tooltip.
  Then change `SectionHandlers.onUnload` to `onClose(tabIds, folderId)`, pass the folder id from
  `#click`, and change the two labels in `FolderRowElement`. Keep the press swallowing and the
  delegated listener. Done when `make check` is green.
- [x] **T3. Wire the section and retire the unloader** (TDD; after T1). In
  `tests/modules/folders/BookmarkFolders.test.ts` add `closes a link tab from its minus` (AC-1),
  `closes the open link tabs of a folder from its minus and closes the folder` (AC-2) and
  `keeps the pinned minus unloading` (AC-5) in `tests/modules/pinned/PinnedTabs.test.ts`. Press the
  real minus of an open link row and assert `tabs.remove`, the loss of `data-vivarcdi-link-open` and
  the bookmark still in the tree; press a folder minus and assert every open tab is removed, the
  folder's id is no longer open and the rows redraw. Then add `FolderClose`, wire it into
  `FolderSection`, forget the folder only when every close succeeded, and delete `FolderUnloader.ts`.
  Done when `make check` is green.
- [x] **T4. Docs and version** (lead; after T2 and T3). Mark 061/FR-6, AC-11 and AC-12, 062/FR-3
  and 009/FR-12 and FR-15 as refined by 063, and rename their checks to 063's verbatim `auto:`
  names where the same test now proves the close. Keep 061's pinned criteria and checks untouched.
  In `docs/manual/tab-bar.md` and `README.md`, replace "unload" with "close" for folder and link
  rows, describe the folder's re-close and keep the pinned unload wording. In the three version
  files, make the minor bump read from `origin/main` right before editing. Done when `make check`
  is green.
- [x] **T5. Tore's manual check** (last). On macOS and Debian, with the Favorites grid on and off,
  replay the recording of 2026-11-25 at 10:30: press a link's minus and confirm its tab closes, the
  row loses the indent and returns among the folder's children, and the bookmark stays; press a
  folder's minus and confirm all open link tabs inside close, the folder closes, and nothing is
  renamed or deleted. Confirm the pinned row and tile minus still unload. Record the result in the
  checklist built from AC-6. Tore confirmed it on 2026-11-25; issue #283 tracks a separate
  workspace-sync anomaly seen during the check.
