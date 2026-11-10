# Sync between computers

[Back to the manual](README.md)

If you use Vivaldi on two computers with the same Vivaldi account, VivArcDi keeps the pinned tabs of
each workspace the same on both. It needs nothing but Vivaldi Sync, which you already use: VivArcDi has
no server and no account of its own.

## What follows you

| What | How |
|---|---|
| Favorites and the folders of each workspace | Vivaldi Sync carries them as bookmarks, with or without VivArcDi |
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

Workspaces are matched by **name**, because Vivaldi gives each workspace a different id on each computer.
Rename a workspace on one computer and the other one finds it again only when its own workspace has the
same name.

## A workspace the other computer lacks

VivArcDi does not create workspaces. When your other computer has a workspace this one lacks, a message
names it once. Create a workspace with the same name and its pinned tabs arrive.

## The sync folder

Open the Bookmarks panel and look for `VivArcDi Sync`. It holds one folder for each workspace, with
`Pinned` (one bookmark for each pinned tab, in order) and `Settings`. You can look at it and repair it by
hand; a change you make there is treated like a change from your other computer. The folder is not part
of the folders VivArcDi shows in the tab bar.

## Options

Options of `workspace-sync` in `config.json`:

| Option | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Set to `false` and VivArcDi neither reads nor writes the sync folder |
| `folder` | `VivArcDi Sync` | The name of the bookmark folder |

Without a Vivaldi Sync account the copy stays on your computer and nothing visible changes. Spec:
[030](../../specs/030-workspace-sync/spec.md).
