# 010 Folders per workspace: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-10-28. It says **how**; the spec says **what**.

## Approach

The section of 009 keeps one `FolderTreeSource` and one `OpenFolders`. They become dependent on the
active workspace, and nothing else in the section changes.

1. **Which workspace is active.** The workspace of the active tab of the window, read with
   `TabData.of` (the same rule `OpenLinks` already uses to decide which link tabs are visible).
   `null` means the area outside any workspace.
2. **Its name.** A new `WorkspaceNames` in `src/core` reads the preference `vivaldi.workspaces.list`
   (`[{ id, name, icon }]`, probe of 2026-10-28) and follows its changes, so a renamed or new
   workspace is picked up without a restart.
3. **Its root.** A new `WorkspaceRoots` class holds the option `workspaces` and `root` and answers
   `rootFor(workspaceId)`: the entry of the workspace's name, else `root`; an empty path means "no
   section".
4. **React.** `FolderSection` listens to `onActivated` and to tab `vivExtData` changes (a tab moved to
   another workspace), asks `WorkspaceRoots` for the root of the active workspace, and when it differs
   from the one on screen calls `FolderTreeSource.useRoot(path)` and `OpenFolders.useWorkspace(id)`,
   then redraws. An empty root hides the element (`display: none` through the data mark of 009's
   styles), so the tab bar has no gap.
5. **Links and tabs** need no change: `OpenLinks` already shows only tabs that share the active tab's
   workspace, and `LinkActivator` already opens a new tab in the workspace of the active tab with the
   bookmark id (AC-6, AC-10 are proven by tests on the existing behavior plus the new switching).

Rejected: storing the folder in `chrome.storage` from a context menu (Tore chose `config.json`,
2026-10-28); matching workspaces by numeric id in the configuration (the names are readable, probe of
2026-10-28, and ids are opaque to the user).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/BrowserPrefs.ts` | Read-only access to Vivaldi's preferences (`get`, `onChange`), `available` flag; the only place that touches `vivaldi.prefs` | Adapter |
| `src/core/WorkspaceNames.ts` | Id to name of the workspaces from `vivaldi.workspaces.list`; follows changes | Observer |
| `src/modules/folders/WorkspaceRoots.ts` | Parses the options `root` and `workspaces`, answers the root path for a workspace name, logs invalid entries once | Value object |
| `src/modules/folders/FolderTreeSource.ts` | New `useRoot(path)`: switches the root and rebuilds; the missing-root warning is once per path | - |
| `src/modules/folders/OpenFolders.ts` | New `useWorkspace(id)`: the open ids are kept under `vivarcdi.openFolders` for the area outside workspaces (existing key, so nothing is lost) and `vivarcdi.openFolders.<id>` for a workspace | - |
| `src/modules/folders/ActiveWorkspace.ts` | Follows the active tab of the window and reports the workspace id when it changes | Observer |
| `src/modules/folders/FolderSection.ts` | Wires the above; hides the element while the root is empty | Mediator (existing) |
| `src/modules/folders/BookmarkFolders.ts` | Builds `WorkspaceRoots` from the options | - |

All of them take their dependencies in the constructor, so every one is tested with fakes.

## Vivaldi interface

- No new selectors. The element of 009 is hidden with a `data-vivarcdi-empty` mark set by the view, not
  with a class (Vivaldi rewrites classes of its own elements, our element is ours but the rule of
  marks is kept for consistency).
- Private APIs: `vivaldi.prefs.get('vivaldi.workspaces.list', callback)` returns
  `{ defaultValue, store, value }`; `vivaldi.prefs.onChanged` is used if present. When the prefs API or
  the list is missing, `WorkspaceNames` reports no names, every workspace uses `root`, and the problem
  is logged once; Vivaldi is never blocked (NFR-3).
- The workspace id of a tab is the number in `vivExtData.workspaceId` (`TabData.of`).

## Configuration

```json
"bookmark-folders": {
  "enabled": true,
  "root": "",
  "workspaces": {},
  "maxDepth": 3,
  "maxHeightPercent": 60
}
```

- `workspaces`: name of a workspace to a title path, like `root`. Default `{}`.
- `root` default changes from `Importati da Firefox/Bookmarks Bar` to an empty text, as decided with
  Tore (2026-10-28): the default root is empty. Tore's installed `config.json` keeps his own `root`
  when he reinstalls, because the installer merges user options; if it does not, the README tells him to
  copy his path into `workspaces` or `root`. Task T9 checks which one happens.

## Risks

| Risk | Mitigation |
|---|---|
| `vivaldi.prefs` is not reachable from the module (the probe used `window.vivaldi.prefs`) | `BrowserPrefs` takes the object from the window as the probe did; if it is missing the module falls back to `root` for all workspaces and logs it |
| A workspace is renamed while Vivaldi runs | `WorkspaceNames` follows `onChanged`; if the event is missing it re-reads the list on every workspace switch |
| Active tab is `undefined` for a moment during a switch | `ActiveWorkspace` keeps the last known workspace until a tab is active, no flicker |
| Two workspaces with the same name | The first one in Vivaldi's list wins, logged once |
| Changing `root`'s default surprises an existing install | T9 checks the merge and the README says how to keep the old behavior |
