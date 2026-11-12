# Live folders

[Back to the manual](README.md)

A live folder fills itself. VivArcDi lists in it the open pull requests you created on GitHub and the
ones whose review is asked from you, each with its title and, under it, the author and the
repository. A pull request that closes or merges leaves the folder. Its rows are not bookmarks:
nothing is written to your bookmarks.

## Connect GitHub

A live folder reads GitHub as you, so it needs a token. Until you give one, the folder shows a single
row, **Connect GitHub**, that opens this page.

1. On GitHub, create a personal access token that can read pull requests: a fine-grained token with
   read access to the repositories you follow, or a classic token with the `repo` scope.
2. Run the command and paste the token. Nothing shows while you type.

   ```
   vivarcdi live-folders token
   ```

   From a source checkout, use `python3 installer live-folders token`. On Debian use `sudo`.

3. The folder uses the token at its next refresh. Choose **Refresh** in its menu to see it at once.

The token stays on your computer, in a file only you can read, outside Vivaldi's storage. VivArcDi
never writes it to the browser's storage or to the console. Run `vivarcdi live-folders token --remove`
to delete it. Uninstalling VivArcDi deletes it too.

## Create a live folder

Right click the space header (the row with the name of the workspace), then choose **Live Folders**
and **GitHub**. A folder named **Pull Requests**, with a pull-request icon, opens at the end of the
folders of the workspace. Double click its name to rename it. You can have several in one workspace,
each with its own filters. The right click menu of the header also has **New Folder**, the same as the
`+` button.

## Filters

Right click the live folder and open **Pull Requests**:

| Item | Default | Shows |
|---|---|---|
| Created By Me | On | The open pull requests you created |
| Review Requests | On | The open pull requests whose review is requested from you |
| Drafts | On | Draft pull requests too; off hides them |
| Repositories… | Every repository | A field where you type `owner/repo`, one per line, to limit the folder to them |

With **Created By Me** and **Review Requests** both off the folder is empty. A change takes effect at
once and stays after a restart. **Refresh** in the same menu reads GitHub again now.

## Updates

The folder refreshes every five minutes (option `refreshMinutes` of the `live-folders` module), when
you open it and after a filter change. After a restart it shows its last rows at once. If a refresh
fails, because you are offline, the token was refused or GitHub's rate limit was reached, the folder
keeps its last rows and shows a warning mark; rest the pointer on it to read why.

## Delete a live folder

Right click it and choose **Delete Live Folder**. The folder, its filters and its rows go; no bookmark
changes.

## Click a row

A click on a row opens the pull request as a tab of the workspace, below the row like the link of a
bookmark folder. When the pull request leaves the folder, its tab goes back to the list of today's tabs.
