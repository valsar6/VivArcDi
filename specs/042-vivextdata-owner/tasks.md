# 042 vivExtData owner: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/vivextdata-owner`, with a patch version change in `package.json`, `package-lock.json`
and `installer/vivarcdi/__init__.py` (NFR-4). Each task ends green on `make check` and every
existing test keeps its name (NFR-3).

Order and parallel work: T1 changes `BrowserTabs`, `TabDataWriter` and the shared `FolderTabs`
fake, so it runs alone. T2, T3, T4 and T5 touch different files and can run in parallel, each in
its own `vivarcdi-implementer` worktree from the commit that has T1. T6 and T7 come last.

- [x] **T1. Window id and guard.** `BrowserTabs.ownWindowId`; `TabDataWriter` with the optional
  `ownWindowId`, the logger and the guard in `#apply`; `FolderTabs` in `tests/modules/folders/fakes.ts`
  gains `windowId`, `ownWindowId` and a `query` that honors `currentWindow`. Satisfies AC-1 to AC-5
  in `tests/core/tabs/TabDataWriter.test.ts`: `writes the tab of its own window`,
  `skips a tab of another window`, `judges the window from the tab as just read`,
  `writes as before when the window is unknown`, `two windows never both write the same tab`; and
  the two `BrowserTabs.ownWindowId` tests of the design.
- [ ] **T2. Pin watcher.** `PinWatcher` and the tabs fake of `tests/modules/pinned/`. Satisfies
  AC-6 to AC-8 in `tests/modules/pinned/PinnedTabs.test.ts`:
  `does not save the own page of a tab pinned in another window`,
  `does not forget the own page of a tab unpinned in another window`,
  `saves at start only the pinned tabs of its own window`.
- [ ] **T3. Folder links.** `LinkTabAdopter` and `TabLinks.unlinkExcept`. Satisfies AC-9 and AC-11:
  `does not adopt a new tab of another window` in `LinkTabAdopter.test.ts`,
  `unlinks only the tabs of its own window` in `TabLinks.test.ts`.
- [ ] **T4. Favorites and stamps.** `LinkedTabs.sync` and `ActivityStamps` with their test fakes.
  Satisfies AC-10 and AC-13: `syncs only the tabs of its own window`,
  `stamps only tabs of its own window before it knows the window`.
- [ ] **T5. Folder relocation.** `FolderLinkTabs.ownTabsOf` and `FolderRelocation`; `tabsOf` and
  `FolderDeletion` stay. Satisfies AC-12 in `FolderRelocation.test.ts`:
  `moves only the tabs of its own window with the folder`.
- [ ] **T6. Docs and version (lead).** `docs/architecture.md`: `TabDataWriter` writes only tabs of
  its own window, and `BrowserTabs.ownWindowId`. Patch version bump after 0.59.5, checked with
  `npm run release -- check --base origin/main --branch fix/vivextdata-owner`.
- [ ] **T7. Manual check.** Italian checklist for AC-14 under
  `~/Desktop/sonde-vivarci/042-vivextdata-owner/`: with two windows open, pin a tab, tile two tabs
  and link a tab to a folder in one window, restart Vivaldi, and see that the tabs keep their own
  page, tiling, link and workspace; also drag a folder to another workspace while a tab of it is
  open in the second window and check that it stays linked. When Tore reports it green, the spec
  becomes `Implemented`.
