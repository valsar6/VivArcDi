# Live folders

[Back to the manual](README.md)

A live folder fills itself. VivArcDi lists in it the open pull requests you created on GitHub and the
ones whose review is asked from you, each with its title and, under it, the author and the
repository. A pull request that closes or merges leaves the folder. Its rows are not bookmarks:
nothing is written to your bookmarks.

## Connect GitHub

A live folder reads GitHub as you, so you connect GitHub once, from the browser. You type nothing in a
terminal and copy no token. Until you connect, every live folder shows a single row, **Connect GitHub**.

1. Click **Connect GitHub**. A small panel opens below the folder and shows a code in large letters,
   for example `WDJB-MJHT`.
2. Press **Copy code and open GitHub**. VivArcDi copies the code and opens
   `https://github.com/login/device` in a new tab. If you are not signed in to GitHub, sign in there
   first.
3. Paste the code on that page. GitHub shows the name **VivArcDi** and the access it asks for. Press
   **Authorize**.
4. Go back to the panel. It checks with GitHub while it waits, and when you have authorized it says
   **Connected as** and your GitHub name, then closes after two seconds. The GitHub tab stays where it
   is, so close it when you like. Every live folder of every workspace refreshes and uses the connection.

The code lasts about fifteen minutes. If it expires, or you press **Cancel** on GitHub, the panel says
so and offers **Try again**, which asks for a new code. **Cancel** in the panel, or the Escape key, stops
connecting. A click elsewhere does not close it, so you can switch to the GitHub tab and come back.

If a folder says **GitHub is not set up in this VivArcDi**, this copy of VivArcDi has no client id for
its GitHub app (the `githubClientId` option of the `live-folders` module). The panel does not open.

### The access VivArcDi asks for

GitHub asks you to allow the scope `repo`. It is the only scope GitHub has that lets an app read the
pull requests of private repositories, and GitHub words it as access to read and write them. **VivArcDi
only reads**: it sends nothing but read requests, and only to `api.github.com`. The token stays in the
storage of VivArcDi in your browser profile; it is never written to the console or anywhere else.

### Disconnect

Right click a live folder and choose **Disconnect GitHub**. VivArcDi forgets the token, and every live
folder shows **Connect GitHub** again. The connection belongs to the browser profile, so it applies to
all live folders at once.

To take the access away on GitHub too, open GitHub, then **Settings**, **Applications**, **Authorized
OAuth Apps**, find **VivArcDi** and choose **Revoke**.

### Reconnect

If you revoke VivArcDi on GitHub, or GitHub stops accepting the connection, the folder keeps its last
rows, shows the warning mark, and its first row becomes **Reconnect GitHub**. Click it and follow the
same steps as above. A passing GitHub problem, such as no network, does not disconnect you.

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

## Row actions

Right click a pull request in the folder:

| Item | Does |
|---|---|
| Copy Link | Copies the address of the pull request and shows **Copied** at the bottom of the window |
| Archive Pull Request | Hides the pull request from the folder until it is updated on GitHub, then it comes back |

Archiving changes nothing on GitHub and no bookmark.

## Updates

The folder refreshes every five minutes (option `refreshMinutes` of the `live-folders` module), when
you open it and after a filter change. After a restart it shows its last rows at once. If a refresh
fails, because you are offline or GitHub's rate limit was reached, the folder keeps its last rows and
shows a warning mark; rest the pointer on it to read why.

## Delete a live folder

Right click it and choose **Delete Live Folder**. The folder, its filters and its rows go; no bookmark
changes. The connection to GitHub stays, because it belongs to the browser profile.

## Click a row

A click on a row opens the pull request as a tab of the workspace, below the row like the link of a
bookmark folder. When the pull request leaves the folder, its tab goes back to the list of today's tabs.

## Upgrading from 0.49 to 0.51

Those versions asked for a token with a terminal command. That command is gone: install or reapply
VivArcDi and the installer deletes the old token file it left on your computer. Then connect GitHub as
described above.
