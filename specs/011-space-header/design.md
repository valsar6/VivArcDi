# 011 Space header: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-10-28. It says **how**; the spec says **what**.

## Approach

A new module `space-header` draws one row in the tab bar and owns one shared piece of state: whether
the active workspace is collapsed. The folders section of 009/010 and the pinned tabs read that state;
no module calls another directly.

1. **Which workspace.** `ActiveWorkspace` (today in `src/modules/folders`) moves to `src/core`, since
   two modules now follow the active workspace. Its behavior does not change.
2. **Its name and icon.** `WorkspaceNames` in `src/core` already parses `vivaldi.workspaces.list`. It
   also keeps the `icon` field of each entry and answers `iconOf(id)`. The format of `icon` is not known
   yet (probe of 2026-10-28 only showed that it exists): task T1 is a read-only probe on Tore's Vivaldi.
   The view shows an emoji or text icon as text, a known built-in icon as Vivaldi's own SVG copied from
   its workspace button if the probe finds one, and otherwise the first letter of the name in a circle.
3. **Collapsed or open.** A new `SpaceCollapse` in `src/core`, shared per window document like
   `HiddenTabs.of(document)`: `collapsed`, `set(value)`, `onChange(listener)`. The header module is the
   only writer.
4. **Remembering it.** `CollapsedSpaces` stores the state of each workspace in the shared store of
   0.7.1, under `vivarcdi.spaceCollapsed.<id>`, and `vivarcdi.spaceCollapsed` for the area outside
   workspaces (same key scheme as `OpenFolders` of 010). On every workspace switch the module reads the
   saved state and sets `SpaceCollapse`.
5. **Folders.** `FolderSection` listens to `SpaceCollapse` and passes `collapsed` to
   `FolderRows.build`. While collapsed, `FolderRows` returns only the links with an open tab, at the
   depth they have below a closed folder; no folder rows. A pure function, so AC-6 and AC-7 are unit
   tests.
6. **Pinned tabs.** `CollapsedPinned` follows the tabs of the window (`onUpdated` for `discarded` and
   `pinned`, `onActivated`, `onRemoved`). While collapsed it hides, with
   `HiddenTabs.set('space-header', ids)`, the pinned tabs of the active workspace that are unloaded and
   not active (`UnloadedTabs.isUnloaded`). When the state opens it clears its owner. `HiddenTabMarker`
   already collapses the slot with an inline style (009 AC-28), so NFR-3 needs no new code.
7. **The row.** `SpaceHeaderView` is a `div` with an arrow, the icon and the name, anchored with
   `TabBarAnchor` at order 15: below the Favorites grid (10), above the folders (20). It carries
   `-webkit-app-region: no-drag` (NFR-2), `data-vivarcdi-space-header` and
   `data-vivarcdi-collapsed`. A click anywhere on it toggles.

Rejected: hiding folder rows with a stylesheet rule on a mark of the tab bar (not testable without a
layout engine, and it couples the folders' markup to another module's mark); letting the header call
`FolderSection` (one module would depend on another's internals).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/core/ActiveWorkspace.ts` | Moved from `src/modules/folders`, unchanged | Observer |
| `src/core/WorkspaceNames.ts` | Adds `iconOf(id)` from the `icon` field | - |
| `src/core/SpaceCollapse.ts` | Shared collapsed state of the window, with listeners | Observer, shared instance per scope |
| `src/modules/spaceheader/SpaceHeader.ts` | The module: options, start and stop, wiring | Mediator |
| `src/modules/spaceheader/CollapsedSpaces.ts` | Reads and saves the state of each workspace | Repository |
| `src/modules/spaceheader/CollapsedPinned.ts` | Hides unloaded, inactive pinned tabs of the active workspace while collapsed | Observer |
| `src/modules/spaceheader/SpaceHeaderView.ts` | Draws the row, reports clicks | - |
| `src/modules/folders/FolderRows.ts` | `build` takes `collapsed` | - |
| `src/modules/folders/FolderSection.ts` | Follows `SpaceCollapse`, redraws | - |
| `src/styles/space-header.scss` | Row style from the folder rows of 009 and Vivaldi's theme colors, arrow rotation | - |

All of them take their dependencies in the constructor, so every one is tested with fakes.

## Vivaldi interface

- No new selector for the row: it uses `tabListHost`, like the Favorites and the folders.
- If the probe of T1 finds the icon of a workspace drawn by Vivaldi (its workspace button or popup), a
  selector `workspaceIcon` is added to the catalog of 8.2, and the view clones that SVG. Without it the
  fallback icon is used; nothing breaks.
- Private APIs: `vivaldi.prefs` through `BrowserPrefs`, as in 010.

## Configuration

```json
"space-header": {
  "enabled": true
}
```

and `styles/space-header.css` in the list of styles.

## Risks

| Risk | Mitigation |
|---|---|
| The `icon` of a workspace is an internal id with no public image | Fallback: first letter of the name in a circle; T1 decides |
| Vivaldi reports a pinned tab unloaded for a moment while it loads | `CollapsedPinned` never hides the active tab and recomputes on every `discarded` change |
| The header row takes clicks meant for Vivaldi's drag region | `no-drag` on the row only, as the folders section does |
| Folders section disabled | The header still works and still hides pinned tabs; `SpaceCollapse` just has no folder reader |
| Collapsed workspace with nothing open | Only the header shows, as in Arc |
