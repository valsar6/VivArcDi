# Sync between computers

[Back to the manual](README.md)

If you use Vivaldi on two computers with the same Vivaldi account, VivArcDi keeps the workspaces and
their pinned tabs the same on both. It needs nothing but Vivaldi Sync, which you already use: VivArcDi has
no server and no account of its own.

## What follows you

| What | How |
|---|---|
| Favorites and the folders of each workspace | Vivaldi Sync carries them as bookmarks, with or without VivArcDi |
| The workspaces: name and order | VivArcDi keeps the list in `VivArcDi Sync/Spaces` and creates the missing ones |
| Pinned tabs of a workspace | VivArcDi keeps a copy in the bookmark folder `VivArcDi Sync` |
| The settings of a workspace, such as its theme color once that feature ships | Kept in the same folder |

What stays on each computer: Today tabs and their archive, the last opened tabs, the folders you left
open, the collapsed spaces and Little Arc windows.

## Pinned tabs

- **Pin a tab** on one computer and, after Vivaldi Sync runs, the other computer shows it in the same
  workspace. It is not loaded until you click it, like any pinned tab after a restart.
- **Unpin or close it for real** and the other computer lets it go. A tab you are looking at, or one that
  shows another page than its own, is unpinned and kept open instead, so nothing you read disappears.
- **Move pinned tabs** and the order follows. If you change the order on both computers before they sync,
  the order that reaches the copy last wins.

## Workspaces

Vivaldi Sync does not carry workspaces, so VivArcDi does.

- **Create a workspace** on one computer and, after Vivaldi Sync runs, the other computer gets one with
  the same name, at the end of its list, and its pinned tabs and folders arrive in it. VivArcDi creates
  it through Vivaldi's own workspace menu, so you may see the menu open for a moment. It does this only
  when the window is in focus and you are not typing, one workspace at a time.
- **Rename a workspace** and the other computer renames its own, and the folder of the workspace in the
  sync folder follows. If Vivaldi's menu cannot be driven for a rename, a message is logged once and the
  workspace keeps its name there.
- **The icon is not synced yet.** A workspace created by VivArcDi has Vivaldi's default icon; the icon
  is stored in the list for a later version.
- **Deleting is never automatic.** Delete a workspace on one computer and it is only dropped from the
  list; the other computer keeps it, with its tabs, until you delete it there.
- On the first run, workspaces with the same name on both computers are taken as the same one, and the
  others are added to the other computer, so both end up with all of them.

If the menu cannot be driven (a future Vivaldi changed it), VivArcDi names the missing workspaces once
in a message and does not try again until Vivaldi restarts. Create them by hand with the same name and
their pinned tabs arrive.

## The sync folder

Open the Bookmarks panel and look for `VivArcDi Sync`. It holds the list of workspaces (`Spaces`, one bookmark for each) and one folder for each workspace, with
`Pinned` (one bookmark for each pinned tab, in order) and `Settings`. You can look at it and repair it by
hand; a change you make there is treated like a change from your other computer. The folder is not part
of the folders VivArcDi shows in the tab bar.

## Options

Options of `workspace-sync` in `config.json`:

| Option | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Set to `false` and VivArcDi neither reads nor writes the sync folder |
| `folder` | `VivArcDi Sync` | The name of the bookmark folder |
| `renameFromOtherComputers` | `true` | Set to `false` and a workspace renamed on the other computer keeps its name here |

Without a Vivaldi Sync account the copy stays on your computer and nothing visible changes. Spec:
[030](../../specs/030-workspace-sync/spec.md).
