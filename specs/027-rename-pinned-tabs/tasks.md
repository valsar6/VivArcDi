# 027 Rename and re-icon pinned tabs: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Rewritten on 2026-11-22 from the revised spec; the tasks of the first version (2026-11-09) are void.

Branch `features/rename-pinned-tabs` for the whole feature, minor bump of the version (read the version
on `main` right before bumping; the lead bumps once, in T8). The tasks are merged into that branch, which
goes to `main` in one pull request after T6 (T7 may follow it).

**TDD in every implementer task (T2 to T7).** The first step is to write the failing tests, with the
test names exactly as the `auto:` checks of the acceptance criteria the task covers (the table in the
design); run them and see them fail for the right reason; then write the code that makes them pass; then
`make check`. The tests of behavior that is not an acceptance criterion get names that say what they
check (the list in the design). One commit per task, in its own worktree from the commit named below.

## Order and parallelism

```
T1 (lead, probe) ──> T2 ─────────┐
T3 (emoji)  ─────────────────────┤
T4 (editor) ─────────────────────┼─> T6 ─> T8 ─> T9 ─> T10
T5 (picker) ─────────────────────┤        ^
057 T3, T4, T5 merged in main ───┘        |
T2 ──> T7 (sync, plan B only) ────────────┘
```

- **T1** (lead) and **T3, T4, T5** start at once from the same commit. T3, T4 and T5 need nothing from T1
  or from each other: the picker declares the structural types it needs and the editor stands alone.
- **T2** starts when T1 has written its findings into the design (the plan of the storage).
- **T6** starts when T2, T3, T4 and T5 are merged **and** 057 (its T3, T4 and T5: the move to `shared`,
  `TileLinkCommands`, the new `TileMenu`) is merged into `main` and `main` into the feature branch. So
  027 T2 to T5 run in parallel with 057, and 027 T6 comes after it; they never write the same file (table
  in the design, "Ordering with 057 and with 056").
- **T7** starts after T2, in parallel with T6 (it only touches `workspacesync`); only if T1 chose plan B.
- **T8 to T10** run alone, after T6 (and T7 if it is done).

**The structure tests.** T3, T4 and T5 add files to `src/shared/` that no module uses until T6, so
`every shared file is used by two modules` lists them. Each of these tasks runs `make check`, expects only
that test to fail, and says so in its report; it is green again at T6. The lead merges T3, T4 and T5 into
the feature branch, and `main` is not touched before T6.

**Merge order:** T2, T3, T4, T5 (any order; the one-line conflicts in the `styles` list of
`src/config.json` and in `_tokens.scss` between T4 and T5 are resolved by the lead), then T6, then T7.

## Files each task owns

A task edits only its files. A file in two rows has its owners named.

| Task | Owns |
|---|---|
| T1 | Nothing in the repository: the probe stays outside, as in 055; the lead writes the findings into `design.md` |
| T2 | `src/core/browser/LinkLabels.ts`; `src/shared/icons/LabelIcon.ts`, `IconSymbols.ts`; `src/modules/folders/FolderSection.ts`, `view/FolderRows.ts`, `view/FolderRowElement.ts`; `src/modules/favorites/FavoritesFolder.ts`, `BookmarkFavorites.ts`, `FavoritesView.ts`, `FavoritesGrid.ts`; `tests/core/browser/LinkLabels.test.ts`, `tests/shared/icons/` (not `IconPicker.test.ts`), `tests/modules/folders/view/FolderRowLabels.test.ts`, `tests/modules/favorites/TileLabels.test.ts`; `tests/structure/StoredKeys.test.ts` (the new key) |
| T3 | `src/shared/emoji/EmojiCatalog.ts`, `src/shared/emoji/emoji.json`; `tests/shared/emoji/` |
| T4 | `src/shared/links/InPlaceEditor.ts`; `src/styles/inline-editor.scss`; `src/styles/_tokens.scss` (its own block); `src/config.json` (its `styles` line); `tests/shared/links/InPlaceEditor.test.ts` |
| T5 | `src/shared/icons/IconPicker.ts`; `src/styles/icon-picker.scss`; `src/styles/_tokens.scss` (its own block); `src/config.json` (its `styles` line); `tests/shared/icons/IconPicker.test.ts` |
| T6 | `src/shared/links/LabelCommands.ts`; `src/shared/tabs/CommandLabels.ts`; `LinkMenuItems.ts`, `SavedTabActions.ts`, `LinkExtras.ts` (where 057 T3 left them); `src/modules/favorites/TileLinkCommands.ts`, `GridDragging.ts`; `specs/057-tile-menu/design.md` (the table of groups); `tests/shared/links/LabelCommands.test.ts`, `tests/modules/favorites/LabelMenus.test.ts` and the tests of the files above |
| T7 | `src/modules/workspacesync/LabelSync.ts` and its start in `WorkspaceSync.ts`; `tests/modules/workspacesync/LabelSync.test.ts` |
| T8 to T10 | The lead: `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py`, README, `docs/`; the checklist |

## Tasks

- [ ] **T1. Probe of the bookmark fields (Q-2)**, read-only, run by the lead with `npm run live --
  --probe <file>` on the throwaway profile, **only after Tore agrees**. It answers F-1 to F-3 of the
  design: the methods of `chrome.bookmarks` and `vivaldi.bookmarksPrivate`; the members of every node of
  the tree (permanent folders and Trash); whether an id is stable between runs. `ProbeGuard` rejects
  `chrome.bookmarks.update` and `create` in a probe and the lab profile has no bookmarks, so the probe
  cannot prove a write: if it finds a candidate field, the lead tries `create` and `update` with it in a
  temporary scenario on the throwaway profile (not committed), and the panel and the sync are checked by
  Tore on his two computers, never by the lab. The lead writes the findings under "The probe" in the
  design, states the plan (B unless A is proven in the lab and confirmed by Tore) and, for plan B, says
  whether T7 is part of this feature or waits for a spec of its own. The probes stay outside the
  repository.
- [ ] **T2. The label store and the display of name and icon** (starts after T1). Tests first:
  `resets name and icon` (set a name and an icon, `clear`: `get` is undefined and the saved text keeps no
  entry); `shows the chosen symbol of a saved tab` (a row with a symbol label draws the svg and the
  name, without it the favicon `img`); `shows the name and icon of a tile in every workspace` (the same
  tile list drawn with two different current workspaces shows the same name and emoji; a label change
  redraws the tiles); also the free tests of the design for the store, the symbols and `LabelIcon`. Then
  `LinkLabels`, `LabelIcon`, `IconSymbols`, the display in `FolderSection`, `FolderRows`,
  `FolderRowElement` and in `FavoritesFolder`, `BookmarkFavorites`, `FavoritesView`, `FavoritesGrid`, and
  the key in `StoredKeys.test.ts`. AC-3, AC-8, AC-10. Both modules import its files, so the boundary
  tests stay green.
- [ ] **T3. The emoji data and the search.** Tests first (names free): eight categories in the order of
  the design; every entry has a character, an English name and at least one keyword; no duplicate
  character; `search` finds by name and by keyword, needs every word, ignores case and gives none for an
  empty text; a missing file gives an empty catalog and one warning. Then `emoji.json` (Unicode 15.1 base
  emoji, one-off generation named in the pull request, no dependency added) and `EmojiCatalog`. Runs in
  parallel with T1, T4 and T5; the shared-file test lists its two files until T6.
- [ ] **T4. The in-place editor.** Tests first (names free): the field opens over the anchor with the
  text selected; Enter resolves the trimmed text; an emptied field resolves `''`; Escape resolves `null`;
  a click elsewhere (blur) resolves the text; a second `edit` cancels the first; `reposition` follows a
  moved anchor and cancels when the anchor is gone; the field is `no-drag` and stops the keys. Then
  `InPlaceEditor`, its style and the `styles` line. Runs in parallel with T1, T3 and T5.
- [ ] **T5. The icon picker.** Tests first: `opens the icon picker with emoji and icons` (an `Emoji` tab,
  a search field that has the focus, an `Icons` tab with the 24 symbols), `filters the emoji by the
  search text` (typing shows only the matching cells, clearing shows the categories again); also the free
  tests of the design (reset; Escape and a click outside resolve `null`; a symbol resolves `{ icon: {
  symbol } }`; an emoji resolves `{ icon: { emoji } }`; `tabs: ['icons']` has no emoji tab; a failing
  catalog leaves the `Icons` tab; a second `pick` closes the first; `no-drag`). The tests use fake
  catalogs and symbols, so T5 needs neither T2 nor T3. Then `IconPicker`, its style and the `styles`
  line. AC-6, AC-7. Runs in parallel with T1, T3 and T4.
- [ ] **T6. The two commands in both menus** (starts after T2 to T5 and after 057 T3 to T5). Tests first:
  `rename keeps the url` (a `BookmarkWriter` that fails on any call: renaming and choosing an icon never
  call it), `renames a saved tab in place` (the field opens with the text selected, Enter saves the
  name, Escape saves nothing, an empty text brings back the page title), `adds rename and change icon to
  the menus of a row and a tile` (both menus list `Change Icon…` and `Rename…` after the first group and
  before `Edit Pinned Page`; no label items for a tile without a bookmark); also: the choices of the
  picker reach `LinkLabels` (an emoji, a symbol, reset clears name and icon), a `failed` save gives the
  error toast, `Duplicate` copies the label, the order of `LinkMenuItems` with the slots absent. Then
  `LabelCommands`, the labels, the two slots of `LinkActions` filled in `SavedTabActions`, `LinkExtras.copy`
  calling `LinkLabels.copy`, the two items in group 2 of `TileLinkCommands`, and the construction in
  `GridDragging`; the table of groups in `specs/057-tile-menu/design.md` is amended in the same commit.
  AC-4, AC-5, AC-9.
- [ ] **T7. Labels through Vivaldi Sync** (plan B only, decided in T1; the one task Tore may defer).
  Tests first (names free): a label of a row in a workspace and a label of a tile are written to the sync
  store through `WorkspaceSettings` under the key `labels`, keyed by the address key; a label that arrives
  from the store is applied to the bookmark with the same address key on this computer; a change that the
  sync applied is not written back (030 FR-4); a reset removes the entry. Then `LabelSync` and its start
  in `WorkspaceSync`. The lead amends the design of this task after T1 if plan B is chosen: the mapping
  from a bookmark id to its workspace and address key is not in the code today.
- [ ] **T8. Docs and version** (the lead): minor bump in `package.json`, `package-lock.json` and
  `installer/vivarcdi/__init__.py`, checked with `npm run release -- check --base origin/main --branch
  features/rename-pinned-tabs`; the README row to `Implemented` when everything is green; a section on
  the two commands and the picker in `docs/manual/tab-bar.md`; `make check`.
- [ ] **T9. Manual checklist in Italian for Tore**, under `~/Desktop/sonde-vivarci/027-rename-pinned-tabs/`,
  from the criteria that stay `manual`: AC-1 (rename a saved row, restart Vivaldi, the name is still
  there; the same for a tile), AC-2 (choose an emoji for a row and for a tile, the favicon is replaced;
  then a symbol of `Icons`; then reset) and AC-11 (rename with Enter, Esc and an empty name; Change Icon
  with a search such as `heart`, the category buttons, the `Icons` tab and reset, compared with the
  recording of 2026-11-21, on macOS and Debian). If T7 is done, one more line: the label made on one
  computer appears on the other after Vivaldi Sync.
- [ ] **T10. Manual checks by Tore** on macOS and Debian. When he reports them green, the spec becomes
  `Implemented`.
