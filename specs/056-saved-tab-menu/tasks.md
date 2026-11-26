# 056 Menu of a saved tab: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/saved-tab-menu` for the whole feature, minor bump of the version (read the version on
`main` right before bumping; the lead bumps once, in T9).

**TDD in every implementer task (T2 to T8).** The first step is to write the failing tests, with the
test names exactly as the `auto:` checks of the acceptance criteria the task covers (the table in the
design); run them and see them fail for the right reason; then write the code that makes them pass;
then `make check`. A task with no `auto:` AC (T2, T3, T7a) writes the tests of its own behavior first,
with names that say what they check. One commit per task, in its own worktree.

## Order and parallelism

```
T1 (lead, probe) ─┐
T2 ───────────────┼─> T4, T5, T6, T7a ─> T7b ─> T8 ─> T9 ─> T10 ─> T11
T3 ───────────────┘
```

- **T1, T2, T3** start at once from the same commit. T2 and T3 touch disjoint files. T2 and T3 are
  merged first, in the order T2, T3.
- **T4, T5, T6, T7a** run in parallel, each in its own worktree from the commit that has T2 and T3.
  T4 and T5 need no probe finding; T6 needs F-1 and F-2, and T7b needs F-3 to F-5, written into the
  design by the lead.
- **T7b** starts when T7a is merged (it imports `src/shared/spaces/`), and can run in parallel with T4,
  T5 and T6.
- **T8** runs alone after T4 to T7b are merged. T9 to T11 run alone.

**Merge order** of the parallel tasks: T4, T5, T6, T7a, T7b. Each of T4, T5, T6 and T7b adds one import
and fills one private slot method in `src/modules/folders/editing/FolderEditing.ts`, so the lead
merges in this order and resolves the one-line import conflicts; nobody else edits that file.

## Files each task owns

A task edits only its files. A file in two columns is shared: the owner is named.

| Task | Owns |
|---|---|
| T2 | `src/core/dom/ContextMenu.ts`, `Toast.ts`, `PromptDialog.ts`; `src/styles/_tokens.scss`, `toast.scss`, `dialog.scss`; `src/config.json` (styles list); `tests/core/dom/` |
| T3 | `src/modules/folders/editing/LinkMenuItems.ts`, `LinkedTab.ts`; `src/shared/tabs/CommandLabels.ts`; `RowMenu.ts`, `FolderDragDrop.ts`, `FolderEditing.ts` (the structure: `#linkActions` and five empty slot methods); their tests |
| T4 | `src/shared/linkmenu/LinkClipboard.ts`, `LinkTexts.ts`, `LinkDuplication.ts`, `LinkExtras.ts`, `BookmarkCopier.ts` (moved from the folders module); `FolderDuplication.ts` and `FolderEditing.ts` import line; the slots `#copyLink`, `#duplicate` |
| T5 | `src/core/browser/bookmarks/BookmarkWriter.ts`; `src/shared/linkmenu/PinnedAddress.ts`; the slot `#editPinnedPage` |
| T6 | `src/shared/tabs/TabTiler.ts` (moved from peek); `src/modules/peek/Peek.ts` import; `src/shared/linkmenu/SplitView.ts`; selector names for F-1 and F-2; the slot `#openInSplitView` |
| T7a | `src/shared/spaces/` (moved drivers); `src/modules/workspacesync/` imports; `tests/shared/spaces/`, `tests/modules/workspacesync/` |
| T7b | `src/modules/folders/editing/LinkRelocation.ts`, `WorkspaceSwitcher.ts`; selector names for F-5; the slot `#moveTo` |
| T8 | `tests/live/scenarios/` (two files); `specs/056-saved-tab-menu/spec.md` rows AC-10 and AC-11 |
| T9 to T11 | The lead: `package.json`, `installer/vivarcdi/__init__.py`, README, `docs/`; the checklist |

## Tasks

- [x] **T1.** Done 2026-11-21, findings in the design. Probes, read-only, run by the lead with `npm run live -- --probe <file>` on the throwaway
  profile, **only after Tore agrees**. Answers F-1 to F-7 of the design: how to tile two tabs from code
  (split view) and whether `TabTiler` is enough; how to open the address bar and catch the tab opened
  from it; how to create a workspace (New Space…) and whether `WorkspaceCreator` works from a menu
  command; how to move a tab between workspaces; how to switch to a workspace; how the link-row menu of
  031 is built in the lab window; which fields a bookmark node carries. The lead writes each finding
  into the "Probe findings" table of the design (a column "Finding" with the date and the Vivaldi
  version) and corrects the plan of T6 and T7b if a hypothesis failed. The probes stay outside the
  repository, as in 055.
- [x] **T2.** Core pieces: `ContextMenu` `disabled`, `Toast` click action, `PromptDialog`, their styles
  and the `styles/dialog.css` entry. Tests first for each: a disabled row ignores a click and keeps the
  menu open; a toast with an action runs it once on click and a toast without one is unchanged; the
  dialog resolves the value on Enter and the confirm button, `null` on Esc and Cancel, and stays open
  with the field marked on an invalid value. Runs in parallel with T1 and T3.
- [x] **T3.** Menu skeleton: `LinkMenuItems` (groups in Arc's order, separators, a group left empty is
  dropped), `LinkedTab`, labels, `RowMenu` rewired to `items`, `FolderDragDrop` with `linkActions`,
  `FolderEditing.#linkActions(toast)` with the five slot methods returning `null`. Tests first: the
  order and separators with every slot present, the order with some missing, the menu of today
  (`Remove pin`, `Tile tab`) unchanged when all slots are null; `LinkedTab` picks the most recent tab of
  the row in the active workspace of the current window. `RowMenu.test.ts` keeps passing. Runs in
  parallel with T1 and T2.
- [ ] **T4.** Copy Link and Duplicate. Tests first: `copies the saved link of a row`, `duplicates a
  saved tab right below it` (also: the copy has no tab, the `LinkExtras` hook is called with the two
  ids, a failed write gives the error toast and no copy stays). Then the move of `BookmarkCopier` and
  its test to `shared/links`, `LinkClipboard`, `LinkDuplication`, and the two slots. AC-1, AC-2. Reuses
  033 (`BookmarkCopier`, `FolderDuplication` 31-47).
- [ ] **T5.** Edit Pinned Page. Tests first: `edits the pinned url of a saved tab` (valid saves and
  keeps the title; invalid keeps the dialog open and writes nothing; Cancel writes nothing),
  `replaces the pinned url with the current one`, `disables replace pinned url when equal` (also: no
  open tab). Then `BookmarkWriter.setUrl`, `PinnedAddress` and the slot. AC-7, AC-8, AC-9. Uses
  `PromptDialog` of T2 and `LinkedTab` of T3.
- [ ] **T6.** Open in Split View. Starts when F-1 and F-2 are in the design. Tests first (names free, they
  cover FR-8, FR-9 and NFR-2): tiles the selected tab and the row's tab; opens a tab for a row with
  none; disabled when the row is the selected tab or already tiled with it; with no tab selected the
  row's tab and a blank tab are tiled at once, the address bar opens on the blank one, and closing it
  without a choice closes the blank tab and undoes the split; not shown, and logged once,
  when tiling cannot be driven. Then the move of `TabTiler` to `shared/tabs` (peek tests stay green),
  `SplitView` and the slot. Prepares AC-10, AC-11 (scenarios in T8).
- [ ] **T7a.** Extract the workspace-menu drivers (`Poll`, `ElementGestures`, `EditorOpener`,
  `ReactInternals`, `QuietMoment`, `MenuCommand`, `WorkspaceMenu`, `WorkspaceCreator`,
  `WorkspaceRenamer`) from `src/modules/workspacesync/` to `src/shared/spaces/`, with their tests
  (`git mv`). Test first: the moved tests, at their new path, fail on the missing import and pass after
  the move; `make check` shows no change of behavior. Runs alone on `workspacesync`, in parallel with
  T4 to T6.
- [ ] **T7b.** Move to, New Space and the toast. Starts when T7a is merged and F-3 to F-5 are in the
  design. Tests first: `moves a saved tab to another workspace`, `checks the current workspace in move
  to of a saved tab`, `switches to the workspace from the move toast`, `moves a saved tab to a new
  space` (confirmed name creates and moves; empty name and Esc create nothing); also: only the tab of
  the row moves, the same workspace says `is already there`, a failed write gives the error toast. Then
  `LinkRelocation`, `WorkspaceSwitcher` and the slot, reusing the rules of `FolderRelocation` 63-109.
  AC-3, AC-4, AC-5, AC-6.
- [ ] **T8.** Live scenarios `opens a saved tab in split view` and `opens a saved tab in split view with
  a new tab` in `tests/live/scenarios/`, and AC-10 and AC-11 of the spec change from `manual` to
  `live: \`opens a saved tab in split view\`` and `live: \`opens a saved tab in split view with a new
  tab\`` in the same pull request (the check `every live check has a scenario` fails a spec that names
  a scenario before it exists), as spec 055 did in its T6 ([055 tasks](../055-tile-web-panel/tasks.md)).
  The scenarios read the DOM and `chrome.tabs` after the command; the lead runs them with `npm run
  live`, only after Tore agrees. AC-10, AC-11.
- [ ] **T9.** The lead: version bump (minor) in `package.json` and `installer/vivarcdi/__init__.py`,
  README and `docs/manual/tab-bar.md`, `make check`.
- [ ] **T10.** Manual checklist in Italian for Tore from the criteria that stay `manual`: AC-12 (Copy
  Link, Duplicate and Move to as in the recording), AC-13 (edit the pinned URL, click the row, restart)
  and AC-14 (menu, submenus and dialog on macOS and Debian). AC-10 and AC-11 are `live:` after T8 and
  are not in the list.
- [x] **T11.** Manual checks by Tore on macOS and Debian, green 2026-11-22; the spec is `Implemented`.
