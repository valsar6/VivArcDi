# 010 Folders per workspace

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

## Summary

In Arc every space has its own folders of links. The folders section of
[009](../009-bookmark-folders-in-tab-bar/spec.md) shows the same bookmark folder in every Vivaldi
workspace. This spec lets each workspace have its own root folder, set in `config.json`, so that
Programming, Music or Hobbies appear only in the workspace they belong to. It is the second iteration
that Tore asked for when 009 was approved.

## User stories

- **US-1.** As a user, I want each workspace to show its own folders of links, so that my work
  workspace does not list my hobbies.
- **US-2.** As a user, I want to choose which bookmark folder each workspace shows in one place, the
  configuration file, without touching code.
- **US-3.** As a user, I want a workspace I did not configure to show no folders, so that nothing
  appears by surprise.
- **US-4.** As a user, I want the tab of a link to stay in the workspace where I opened it, so that
  switching workspace does not move or hide my open links.

## Expected behavior

`config.json` gets a map from workspace name to the path of its root folder, in the options of
`bookmark-folders`:

```json
"bookmark-folders": {
  "root": "",
  "workspaces": {
    "Work": "Importati da Firefox/Bookmarks Bar/Work",
    "Personal": "Importati da Firefox/Bookmarks Bar/Personal"
  }
}
```

Names come from Vivaldi's own list of workspaces (the preference `vivaldi.workspaces.list`, which
holds an id and a name for each, e.g. `Casetta`). Tabs outside any workspace, Vivaldi's default area,
have no name and use `root`. The section shows the root of the active workspace. When the user switches workspace, the section
changes to the folders of the new one, with its own open and closed folders remembered. A workspace
with no entry in the map uses `root`, the default root, which is empty out of the box: the section
shows nothing and takes no space. Tore's current setup (`root` set, no map) keeps working as before.

Links keep the rules of 009: a link has at most one tab in each workspace, the tab is linked to its
bookmark in `vivExtData` and hidden from the tab list, and stays in the workspace where it was opened.
The same bookmark shown by two workspaces has an independent tab in each. Bookmarks stay read-only.

## Requirements

### Functional

- **FR-1.** The option `workspaces` maps a workspace name to a root folder path; paths use the same
  title-path syntax as `root`.
- **FR-8.** Workspace names are read from `vivaldi.workspaces.list`; a workspace is matched by name,
  and a renamed workspace follows its new name.
- **FR-2.** The section shows the root of the active workspace and follows a change of workspace
  without a restart.
- **FR-3.** A workspace with no entry, and the area outside any workspace, use `root`; with an empty `root` the section is hidden.
- **FR-4.** Open folders are remembered for each workspace and restored after a restart.
- **FR-5.** The tab of a link belongs to the workspace in which it was opened, and a link looks for
  its tab only in the active workspace.
- **FR-6.** IF the root of a workspace does not exist, THEN the section is empty and the problem is
  logged once for that workspace.
- **FR-7.** The hover panel of [008](../008-folder-hover-preview/spec.md) and the other modules keep
  working in every workspace.

### Non-functional

- **NFR-1.** Switching workspace redraws the section in under 100 ms.
- **NFR-2.** Without `workspaces` the behavior is the same as 009.
- **NFR-3.** An invalid `workspaces` option is ignored and logged; Vivaldi is never blocked.
- **NFR-4.** Works on Vivaldi 8.1 and 8.2, on macOS and Debian.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE module SHALL read the root of each workspace from the option `workspaces`. | auto: `reads the root folder of each workspace from the options` |
| AC-13 | THE module SHALL find the name of the active workspace from the list of workspaces. | auto: `finds the name of the workspace of a tab` |
| AC-2 | WHEN the active workspace changes, THE section SHALL show the folders of the new workspace's root. | auto: `shows the folders of the active workspace` |
| AC-3 | WHEN a workspace has no entry or the tab is outside any workspace, THE section SHALL use `root`. | auto: `falls back to the default root for a workspace with no entry` |
| AC-4 | WHILE the root in use is empty, THE section SHALL be hidden. | auto: `hides the section when the root is empty` |
| AC-5 | THE module SHALL save the open folders separately for each workspace. | auto: `remembers the open folders of each workspace separately` |
| AC-6 | WHEN a link is clicked, THE module SHALL look for its tab only in the active workspace. | auto: `looks for the tab of a link only in the active workspace` |
| AC-7 | IF the root of a workspace is missing, THEN THE section SHALL stay empty and log the problem once. | auto: `logs a missing workspace root once` |
| AC-8 | IF `workspaces` is not an object of text paths, THEN THE module SHALL ignore it and log the problem. | auto: `ignores an invalid workspaces option` |
| AC-9 | WHEN Tore switches between two configured workspaces, THE section SHALL show different folders in each. | manual |
| AC-10 | WHEN Tore opens a link in one workspace and switches to another, THE tab list of the other SHALL show no tab of that link. | manual |
| AC-11 | WHILE a workspace has no entry and `root` is empty, THE tab bar SHALL show no folders and no gap. | manual |
| AC-12 | WHEN Tore restarts Vivaldi, THE open folders of each workspace SHALL be as he left them. | manual |

## Out of scope

- Choosing the folder from the interface: it is a `config.json` option only (Tore, 2026-10-28).
- Different Favorites per workspace: the grid of [003](../003-pinned-tabs-and-folders/spec.md) stays
  the same in every workspace, as in Arc.
- Creating, renaming or deleting workspaces or bookmarks.

## Open questions

- [x] **Where is the root set?** In `config.json`, as a map (Tore, 2026-10-28).
- [x] **Workspace without an entry?** Default root, empty out of the box (Tore, 2026-10-28).
- [x] **Tab of a link and workspace?** It stays in the workspace where it was opened (Tore,
  2026-10-28).
- [x] **How does the module know the name of a workspace?** Probe on Vivaldi 8.2 (Tore, 2026-10-28):
  `vivaldi.workspaces.list` holds `{ id, name, icon }` (workspace `Casetta`, id `1781382688540`), and a
  tab stores that id in `vivExtData.workspaceId`; tabs in the default area have none. The map uses names.

## References

- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md), out of scope
  and open questions.
- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section "Spazi".
