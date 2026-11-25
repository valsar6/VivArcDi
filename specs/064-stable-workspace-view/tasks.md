# 064 Stable workspace view: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/064-stable-workspace-view` for the code, with a patch version change per CONTRIBUTING:
read the version on `origin/main` right before T4 and bump `package.json`, `package-lock.json` and
`installer/vivarcdi/__init__.py`. Each code task follows TDD: first the failing tests with the
verbatim `auto:` names of the criteria, then the code, then `make check`. There is no live
scenario: the live harness drives `window.html` and cannot open `vivaldi://inspect/#apps`, so AC-7
stays in Tore's hands.

## Order

```
T1 ─┐
T2 ─┼──> T4 (lead: docs and version) ──> T6 (hold through a close) ──> T5 (Tore: manual)
T3 ─┘
```

T1, T2 and T3 run in parallel, each in its own worktree from the same `origin/main` commit. They
touch different files, except `src/modules/folders/FolderSection.ts`, where each changes a
different hunk: T1 the state, T2 the `OpenLinks` call, T3 the close handler. Merge them one after
the other and run `make check` after each merge. T4 runs last on the code and reads the version
from `origin/main` at that point.

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `src/core/tabs/InspectionTarget.ts`, `src/core/workspaces/ActiveWorkspace.ts`, `src/core/workspaces/WorkspaceNames.ts`, `src/core/boot/Module.ts`, `src/core/boot/ModuleStarter.ts`, `src/core/boot/WindowServices.ts`, `src/core/boot/VivArcDi.ts`, `src/modules/folders/FolderSection.ts` (state), `src/modules/spaceheader/SpaceHeader.ts`, `src/modules/livefolders/LiveFolders.ts`, `src/modules/littlearc/MainWindowRole.ts`, `tests/core/tabs/InspectionTarget.test.ts`, `tests/core/workspaces/ActiveWorkspace.test.ts`, `tests/loader/VivArcDi.test.ts`, `tests/modules/folders/BookmarkFolders.test.ts` (setup and AC-4), `tests/modules/folders/LinkTabHiding.test.ts`, `tests/modules/spaceheader/SpaceHeader.test.ts`, `tests/modules/livefolders/LiveFolders.test.ts`, `tests/modules/littlearc/module.test.ts` |
| T2 | `src/shared/links/OpenLinks.ts`, `src/modules/folderpreview/FolderPreview.ts`, `src/modules/folders/FolderSection.ts` (the `OpenLinks` call), `tests/shared/links/OpenLinks.test.ts`, `tests/shared/links/LinkActivator.test.ts` |
| T3 | `src/modules/folders/links/FolderClose.ts`, `src/modules/folders/tree/OpenFolders.ts`, `src/modules/folders/editing/FolderDeletion.ts`, `src/modules/folders/editing/FolderRelocation.ts`, `src/modules/folders/editing/FolderActionsFactory.ts`, `src/modules/folders/FolderSection.ts` (the close handler), `tests/modules/folders/links/FolderClose.test.ts`, `tests/modules/folders/tree/OpenFolders.test.ts`, `tests/modules/folders/editing/FolderDeletion.test.ts`, `tests/modules/folders/editing/FolderRelocation.test.ts` |
| T4 | `specs/063-minus-closes-folder-tabs/design.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` |
| T6 | `src/core/workspaces/ActiveWorkspace.ts`, `src/modules/folders/links/FolderClose.ts`, `src/modules/folders/FolderSection.ts`, `tests/core/workspaces/ActiveWorkspace.test.ts`, `tests/modules/folders/BookmarkFolders.test.ts`, `tests/modules/folders/links/FolderClose.test.ts`, `tests/modules/folders/links/FolderCloser.test.ts`, this design |
| T5 | Nothing in the repository; the checklist comes from AC-7 |

## Tasks

- [x] **T1. One workspace state, started by the boot** (TDD; parallel with T2 and T3). Add
  `tests/core/tabs/InspectionTarget.test.ts` for the helper. In
  `tests/core/workspaces/ActiveWorkspace.test.ts` rewrite the setup for `onChange` listeners and add
  `keeps the selected workspace when an internal tab becomes active` (AC-1),
  `selects the Tabs area for a tab outside any workspace` (AC-2),
  `keeps the last workspace when the active tab is removed` (AC-3) and
  `keeps the last workspace when the tab names a workspace Vivaldi does not list` (NFR-3). In
  `tests/modules/folders/BookmarkFolders.test.ts` add
  `renders the header and folder rows from one workspace` (AC-4) with `SpaceHeader` and
  `BookmarkFolders` on one context, and put a real `ActiveWorkspace` in `setup` and
  `workspaceSetup`. In `tests/loader/VivArcDi.test.ts` assert that the module context carries the
  state. Then add `InspectionTarget`, give `ActiveWorkspace` many listeners, `onRemoved`, the
  inspection and unlisted rules and the idempotent `start`, add `has` and `listed` to
  `WorkspaceNames`, put `activeWorkspace` in `StartServices` and `ModuleContext`, build and start
  the state in `VivArcDi`, and switch the four modules to it without stopping it. Update the
  `LinkTabHiding`, `SpaceHeader`, `LiveFolders` and `littlearc` setups; in the one test that counts
  the tab listeners after `module.stop()` in `BookmarkFolders.test.ts`, stop the state first. Done
  when `make check` is green.
- [x] **T2. Open-link rows follow the shown workspace** (TDD; parallel with T1 and T3). In
  `tests/shared/links/OpenLinks.test.ts` make the helper pass a shown workspace, add
  `does not show other workspaces' tabs when no tab is active` (AC-6) and a test where an older
  read lands after a newer one; update the constructor calls in `LinkActivator.test.ts`. Then give
  `OpenLinks` the `shownWorkspace` function, filter `#update` by it instead of by the active tab,
  add the refresh generation, and pass the function from `FolderSection` (`this.#workspace`) and
  `FolderPreview` (`context.activeWorkspace.current`). Done when `make check` is green.
- [x] **T3. A folder minus saves under the press workspace** (TDD; parallel with T1 and T2). In
  `tests/modules/folders/links/FolderClose.test.ts` add
  `saves the folder state in the workspace active at press time` (AC-5) with a real `OpenFolders`
  over a `MemoryStorage` and a `FolderCloser` whose fake `CloserTabs.remove` loads another
  workspace, and give the existing `apply` call a workspace. In
  `tests/modules/folders/tree/OpenFolders.test.ts` prove `forget` writes the key of its workspace
  while another is loaded; update the `FolderDeletion` and `FolderRelocation` setups for the new
  argument. Then add the workspace argument to `FolderClose.apply` and `OpenFolders.forget`, capture
  `active.current` in `FolderDeletion.delete` and `FolderRelocation.move` before their awaits, pass
  `sources.active` in `FolderActionsFactory`, and pass `this.#workspace ?? null` from the section's
  close handler. Done when `make check` is green.
- [x] **T4. Docs and version** (lead; after T2 and T3). In
  `specs/063-minus-closes-folder-tabs/design.md`, amend the `FolderClose` paragraph so it no longer
  prescribes forgetting the folder on whatever workspace is current after the awaits: the section
  captures the shown workspace at the press and passes it to `apply` and `forget`, refined by 064.
  In the three version files, make the patch bump read from `origin/main` right before editing. Done
  when `make check` is green.
- [x] **T6. Keep the shown workspace through a folder minus close** (TDD; after T4). In
  `tests/core/workspaces/ActiveWorkspace.test.ts` add
  `keeps the shown workspace during a hold and follows the next activation after it` and
  `drops a read that lands after a hold starts`. In
  `tests/modules/folders/links/FolderClose.test.ts` add
  `holds the shown workspace while the tabs close and releases it after` and
  `releases the shown workspace when a tab cannot be closed`. In
  `tests/modules/folders/BookmarkFolders.test.ts` add
  `keeps the workspace of a folder minus when Vivaldi activates another workspace`. Then add
  `hold`/`release` to `ActiveWorkspace` and call them around `FolderClose.apply`, releasing after
  the task that follows the last close. Done when `make check` is green.
- [x] **T5. Tore's manual check** (last; after T6). On macOS and Debian, on Vivaldi 8.1, 8.2 and
  8.3, with the Favorites grid on and off: select a dedicated workspace, expand a folder, click a
  link inside it, then press the folder's minus. Confirm the tab and the folder close while the
  header, the Favorites and the folder rows stay in that workspace: the view must not move to the
  `Tabs` area when Vivaldi activates another tab after the removal. Switch workspace away and back
  and confirm the folder stays closed. Also replay the 2026-11-25 12:30 recording with
  `vivaldi://inspect/#apps`: the header and rows keep the selected workspace, the pinned tiles stay,
  and no `Tabs` row or label appears mid-gesture. Confirm a normal tab outside any workspace still
  selects the `Tabs` area (043/FR-4), and check the console for one warning at most about an
  unlisted workspace. Record the result in the checklist built from AC-7. Tore confirmed the
  reported four-step case on 2026-11-25 with 0.72.2 and closed issue #283.
