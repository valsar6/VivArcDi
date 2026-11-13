# VivArcDi

Make [Vivaldi](https://vivaldi.com) behave like the late [Arc](https://arc.net) browser.

Other projects, such as [VivalArc](https://github.com/tovifun/VivalArc), restyle Vivaldi to look like Arc.
VivArcDi goes further and reproduces how Arc **behaves**: a Favorites grid, pinned tabs that reset to
their saved page, folders that let the active tab peek out, and a real Peek overlay for links.

It ships three things:

1. **Stylesheets** for the look.
2. **JavaScript modules** that run inside Vivaldi's own interface for the behavior.
3. **An installer** for macOS and Debian that applies both, and reapplies them on its own after every
   Vivaldi update. It comes as a downloadable app (macOS) and package (Debian), or as a
   [command line installer](#advanced-command-line-installer).

New here? Read the [user manual](docs/manual/README.md): what each feature does, with pictures, and
which Arc features come next.

## Status

Version 0.15.0 brings the downloadable app (macOS) and package (Debian): no terminal and no Python needed.

Phase 4 of the [roadmap](#roadmap) brings the [Today archive](#today-archive) and
[copy URL](#copy-url), after phase 3 with [reopening pinned tabs](#reopen-pinned-tabs),
[bookmark folders in the tab bar](#bookmark-folders), [Favorites from a bookmark folder](#favorites)
and [pinned tabs that reset and unload](#pinned-tabs), after
[Peek](#peek) of phase 2, the [Favorites grid](#favorites) of phase 1
and the module loader, the installer and the [native settings guide](docs/native-settings.md) of phase 0.

Tested against the Vivaldi 8.1 interface. Other versions stay untouched until they get a
[selector file](docs/architecture.md#selectors).

## Download

Use your package manager, or download the file from the
[Releases page](https://github.com/valsar6/VivArcDi/releases/latest):

- **macOS:**
  - Homebrew: `brew install --cask valsar6/vivarcdi/vivarcdi`
  - Direct download: `VivArcDi-<version>.dmg`
- **Debian:**
  - Apt repository: [set it up in the terminal](#debian-apt-repository), or install the `.deb` and it enrolls the repository for you.
  - Direct download: `vivarcdi_<version>_all.deb`

Replace `<version>` with the number of the release, for example `0.15.0`.

## Requirements

- Vivaldi stable or snapshot, from the official `.dmg` on macOS or the official `.deb` on Debian.
- Nothing else for the app and the package: they bring everything they need, Python included.
- Only the [command line installer](#advanced-command-line-installer) needs Python 3.9 or newer.
  Debian 13 ships it. On macOS run `xcode-select --install` if `python3` is missing.

## Install

VivArcDi is not a Vivaldi extension: there is nothing to add from Vivaldi's settings or from the Chrome
Web Store. The app (macOS) or the package (Debian) copies VivArcDi into Vivaldi's own files.
You do not need a terminal.

### macOS

1. Install Vivaldi from [vivaldi.com](https://vivaldi.com) and move it to `/Applications`.
2. Install VivArcDi with Homebrew:

   ```sh
   brew install --cask valsar6/vivarcdi/vivarcdi
   ```

   Or [download](#download) `VivArcDi-<version>.dmg`, open it and drag **VivArcDi** onto the
   **Applications** folder.
3. Open VivArcDi from Applications.
4. The first time, macOS says it cannot verify the developer. VivArcDi is free and is not signed with
   an Apple Developer ID. To open it anyway:
   - Open System Settings > Privacy & Security.
   - Scroll down to the message about VivArcDi and click **Open Anyway**.
   - Confirm with your password or Touch ID, then open VivArcDi again.
5. Click **Install**. If Vivaldi is open, VivArcDi offers to quit it for you.
6. If macOS blocks the change, VivArcDi says so and shows **Open Settings**:
   - Click **Open Settings**. It opens System Settings > Privacy & Security > App Management.
   - Turn VivArcDi on.
   - Go back to VivArcDi and click **Try again**.
7. Open Vivaldi.

Good to know:

- The window has a checkbox, "Also use Arc's keyboard shortcuts". Tick it if you want them.
  They are also covered in the [native settings guide](docs/native-settings.md).
- Homebrew keeps the macOS quarantine flag, so the "Open Anyway" step applies to it as well.
- After a VivArcDi update, macOS may ask for App Management again. VivArcDi has no Apple signature
  (only a local one), so macOS sees each new version as a new app. Do step 6 again.
- When Vivaldi updates, VivArcDi applies itself again and shows a notification that asks you to
  restart Vivaldi. If the permission is missing, the VivArcDi window opens by itself with **Try again**.

### Debian

1. Install Vivaldi from the official `.deb` on [vivaldi.com](https://vivaldi.com). It also adds the
   Vivaldi apt repository, which keeps Vivaldi updated.
2. [Download](#download) `vivarcdi_<version>_all.deb`, or set up the
   [apt repository](#debian-apt-repository) and run `sudo apt install vivarcdi`.
3. Double-click the `.deb`. Your software center (GNOME Software) opens. Click **Install** and type your password.
   If double-click does nothing, open a terminal in the download folder and run:

   ```sh
   sudo apt install ./vivarcdi_<version>_all.deb
   ```

4. Restart Vivaldi.

Open the **VivArcDi** entry in your application menu to see the state of each Vivaldi, and to apply
or restore Arc's keyboard shortcuts (**Use Arc's shortcuts**, **Restore my shortcuts**). When Vivaldi updates, VivArcDi applies itself again on its own.
Restart Vivaldi once more to load it.

### Debian apt repository

The `.deb` adds the VivArcDi apt repository by itself, so after the first install the software
updater and `sudo apt upgrade` bring every new version. To subscribe from a terminal before you
install anything:

```sh
curl -fsSL https://valsar6.github.io/vivarcdi/apt/vivarcdi-archive-keyring.gpg | sudo tee /usr/share/keyrings/vivarcdi-archive-keyring.gpg > /dev/null
printf 'Types: deb\nURIs: https://valsar6.github.io/vivarcdi/apt\nSuites: stable\nComponents: main\nSigned-By: /usr/share/keyrings/vivarcdi-archive-keyring.gpg\n' | sudo tee /etc/apt/sources.list.d/vivarcdi.sources > /dev/null
sudo apt update && sudo apt install vivarcdi
```

### Update VivArcDi

- **macOS with Homebrew:** `brew upgrade --cask vivarcdi`. macOS may ask for App Management again.
- **Debian:** the software updater, or `sudo apt update && sudo apt upgrade`.
- **Direct download:** download the new `.dmg` or `.deb` and install it as above.

The VivArcDi window tells you when a new version exists, and names the command that installs it.

### Coming from the command line installer

Install the app or the package as above. It takes over by itself: it removes the old update hook and
keeps your backups. You can delete the cloned folder afterwards.

### Uninstall

- **macOS:** click **Uninstall** in the VivArcDi window, restart Vivaldi, then delete VivArcDi from
  Applications, or run `brew uninstall --cask vivarcdi` if you installed it with Homebrew.
- **Debian:** remove VivArcDi in your software center, or run `sudo apt remove vivarcdi`.
  `sudo apt purge vivarcdi` also deletes the backups in `/var/lib/vivarcdi` and the apt repository entry.

Restart Vivaldi afterwards.

### Check that it works

The VivArcDi window should list your Vivaldi as installed. You can also open
`vivaldi://inspect/#apps`, click *inspect* under `vivaldi`, and look for the line
`[VivArcDi] <version> active on Vivaldi …` in the console.

## Advanced: command line installer

This is the way to install before 0.15.0, and it still works. It needs Python 3.9 or newer.
`install` stops with a message when the app or the package manages VivArcDi: use the app or the
package instead, or uninstall it first.

### Install

1. Install Vivaldi and make sure `python3 --version` works. On macOS, accept the offer to install the
   command line developer tools if it appears. On Debian run `sudo apt install git python3`.
2. Download VivArcDi (the `dist` branch holds the ready-to-install build, see
   [Release builds](#release-builds)):

   ```sh
   git clone -b dist https://github.com/valsar6/VivArcDi.git
   cd VivArcDi
   ```

3. Quit Vivaldi, then install:

   ```sh
   python3 installer install
   ```

   On Debian use `sudo python3 installer install`. On macOS do not use `sudo`: it does not help,
   and the update hook must be able to change Vivaldi as your user. If the installer stops with a
   permission error on macOS, it prints the steps:

   - **App Management.** macOS stops any program, even with `sudo`, from changing a signed app.
     Open System Settings > Privacy & Security > App Management, turn your terminal app on, quit
     it with Cmd+Q, reopen it and install again.
   - **Vivaldi belongs to another user**, often `root`. Only after allowing App Management, give it
     back to your user, then install again:

     ```sh
     sudo chown -R "$(whoami)" /Applications/Vivaldi.app
     ```

4. Open Vivaldi.

Check it with `python3 installer status`: it should list your Vivaldi as `patched, up to date` and
the update hook as `active`.

### Update and uninstall

From the `VivArcDi` folder (cloned from the `dist` branch):

```sh
git pull
python3 installer install
```

(with `sudo` on Debian), then restart Vivaldi. To remove VivArcDi, run `python3 installer uninstall`
(with `sudo` on Debian) and restart Vivaldi.

### Release builds

VivArcDi is written in TypeScript and SCSS and compiled to plain JavaScript and CSS. You do not need
Node to install it: on every push to `main`, the CI workflow builds the project and commits a
release-ready tree on top of the `dist` branch, which holds only what users need:

```text
installer/   the Python installer
dist/        the compiled payload that is copied into Vivaldi
docs/
README.md
LICENSE
```

`git clone -b dist` gives you that tree, and `git pull` brings it up to date. Each commit on `dist`
names the version it holds, and the first build of every version is tagged `dist-v<version>`
(`git checkout dist-v0.4.4` goes back to that release). Checkouts made before 0.4.4, when `dist`
was rewritten by every publish, need `git fetch origin && git reset --hard origin/dist` once. If
you clone `main` instead, the
installer stops and tells you to download a release build or to run `make build` (it needs Node 24).

### Commands

| Command | What it does |
|---|---|
| `install` | Backs up `window.html`, copies the payload, patches `window.html`, registers the update hook. Refuses when the app or the package manages VivArcDi |
| `reapply` | Patches again any Vivaldi build that an update reset; run automatically by the hook |
| `uninstall` | Removes the patch, the payload and the hook; keeps the backups |
| `status` | Shows which builds are patched and whether the hook is active |
| `shortcuts apply\|restore\|status` | Sets Arc's keyboard shortcuts and Quick Commands "Open Links In New Tab" in the Vivaldi profile, backs it up first and restores it on request |
| `theme apply\|restore\|status` | Adds the "VivArcDi Light" theme to the Vivaldi profile and selects it, backs it up first; `restore` selects the previous theme again; `apply --dry-run` lists the changes; `status --keys` prints the theme key names and ids |
| `window` | Opens the VivArcDi window, the same one as in the app and the package |

Add `--quiet` to print only warnings and errors. On Debian, every command but `status`, `shortcuts` and `theme` needs `sudo`; `shortcuts` and `theme` refuse it.

`--mode cli|app|deb` says who manages VivArcDi. The default is `cli`. The app and the package pass
`app` and `deb` themselves, so you do not need it. `window` needs a desktop and Tkinter.

At the end of `install` you are asked "Apply the VivArcDi Light theme? [Y/n]" (default yes; Vivaldi must be closed, otherwise run `theme apply` later). `install --yes` applies it without asking, `install --no-theme` skips it. The question is never asked by the update hook, the window or under `sudo`.

`shortcuts` is never part of `install`: quit Vivaldi, run `python3 installer shortcuts apply --dry-run` to see the differences, then `python3 installer shortcuts apply`. `shortcuts apply` also frees Cmd+Opt+N (Ctrl+Alt+N on Debian) for [Little Arc](#little-arc), taking it away from Vivaldi's Notes panel. `python3 installer shortcuts restore` puts the saved settings back, and `uninstall --restore-shortcuts` does the same while uninstalling.

### How updates are handled

Vivaldi overwrites `window.html` when it updates, which removes VivArcDi. The app and the package
handle this as described in [Install](#install). For the command line installer:

- **macOS:** a launchd agent (`~/Library/LaunchAgents/io.github.valsar6.vivarcdi.reapply.plist`)
  watches the Vivaldi app bundles and runs `reapply` when they change, plus every six hours.
- **Debian:** an apt hook (`/etc/apt/apt.conf.d/99vivarcdi`) runs `reapply` after every apt operation.

The hook runs a copy of the installer kept in `~/Library/Application Support/VivArcDi` on macOS and
`/usr/local/share/vivarcdi` on Debian, so you can move or delete the cloned repository.
After an update, restart Vivaldi once more to load the reapplied modules.

On macOS, App Management lets only the apps you allowed change Vivaldi, and the launchd agent is not
one of them. So after an update the agent opens a Terminal window that applies VivArcDi again; when
it says so, restart Vivaldi and close the window. If you installed a version older than 0.5.2, run
`python3 installer install` once more to update the agent.

## Configuration

`src/config.json` (`config.json` in a release build) lists the stylesheets to load and the modules to enable:

```json
{
  "styles": ["styles/base.css", "styles/favorites.css"],
  "modules": {
    "activation-marker": { "enabled": true },
    "favorites-grid": { "enabled": true, "folder": "Favorites", "maxTiles": 12 },
    "pinned-tabs": { "enabled": true }
  }
}
```

After editing it in a release build, run `install` again. In a source checkout, run `make build`
first.

## Favorites

With the tab bar on the left or right, the Favorites are a grid of square icon tiles at the top of the
tab bar, as in Arc. They are the web links of a bookmark folder, `Favorites` by default, and they are
the same in every workspace.

- Create a bookmark folder named `Favorites` anywhere in your bookmarks and put the sites in it.
  The order of the bookmarks is the order of the tiles. Renaming, moving or removing a bookmark
  updates the grid.
- A click on a tile brings you to the Favorite's tab of the current workspace, or opens it as a
  pinned tab the first time. Each workspace has its own tab per Favorite, hidden from the tab list.
- The tile of the current tab is the light pill, as the active tab; tiles whose tab is unloaded, or not open
  yet in this workspace, are dimmed.
- A click on the current tile, after browsing away, brings the tab back to the bookmark's page.
- Middle click, Cmd/Ctrl+W or the tab's close button unload the tab instead of closing it. The tile
  stays, and a click loads it again. If the tile was the active tab, the most recently used tab
  takes its place.
- At most three columns, whatever the width of the tab bar. Hovering a tile shows its title.

If the folder is missing or has no links, the first pinned tabs of the current workspace become the tiles, drawn the same way, and a click on a tile activates that tab. Their slots in Vivaldi's tab list are hidden
0.6.0, and the console says so. Removing a bookmark from the folder turns its tabs into ordinary
pinned tabs.

Options of `favorites-grid` in `config.json`:

| Option | Default | Meaning |
|---|---|---|
| `folder` | `Favorites` | The bookmark folder of the Favorites, as titles separated by `/`, compared exactly; the first match is used |
| `maxTiles` | `12` | How many Favorites become tiles |
| `minColumns` | `3` | Columns of a narrow tab bar |
| `tileMinWidth` | `64` | Narrowest tile, in pixels, before the grid drops a column |
| `tileHeight` | `44` | Tile height, in pixels |
| `gap` | `8` | Space between tiles and between their rows, in pixels |
| `unloadOnMiddleClick` | `true` | Middle click unloads a tile instead of closing it |

## Pinned tabs

Pinned tabs show as rows below the Favorites and the bookmark folders, followed by a separator and
the other tabs. Each workspace has its own pinned tabs.

- A pinned tab remembers the page it was pinned with, its own page. Unpinning forgets it.
- When it shows another page, its favicon turns into a back arrow: a click brings the tab back to
  its own page.
- Cmd/Ctrl+W and the close button unload a pinned tab instead of closing it, with the focus in the
  page or in the interface. "Close tab" in the context menu still closes it.

Options of `pinned-tabs` in `config.json`:

| Option | Default | Meaning |
|---|---|---|
| `resetButton` | `true` | The favicon of a pinned tab away from its own page brings it back |
| `unloadOnClose` | `true` | Cmd/Ctrl+W and the close button unload Favorites and pinned tabs |

Own pages are kept in the tab's own data in Vivaldi, so they survive a restart. Without VivArcDi,
Favorites' tabs and pinned tabs are ordinary pinned tabs.

## Peek

Some links open in Peek: a rounded panel over the current page, which stays visible and dimmed
behind it. The panel shows the real page, so you can scroll, type and follow links inside it.

- **Shift+click** on a link opens it in Peek instead of a new window.
- In a Favorite, a pinned tab or the tab of a [bookmark folder](#bookmark-folders) link, a link to **another site** opens in Peek, so the tab keeps its page.
  Subdomains count as the same site: from `mail.google.com`, `docs.google.com` opens in the tab.
- **Expand** (or Cmd/Ctrl+O) opens the page as a tab right after the current one.
- **Split** opens it as a tab and tiles it side by side with the current one.
- **Close**, a click on the dimmed area, Esc or Cmd/Ctrl+W closes the Peek, never the tab behind.
  Switching tab closes it too.

Options of `peek` in `config.json`:

| Option | Default | Meaning |
|---|---|---|
| `shiftClick` | `true` | Shift+click opens Peek |
| `pinnedCrossSite` | `true` | Links to another site in Favorites and pinned tabs open Peek |
| `anyCrossSite` | `false` | Links to another site in every other tab open Peek too |
| `pinnedNewTab` | `true` | Links that ask for a new tab (`target="_blank"`) in Favorites and pinned tabs open Peek, even on the same site |
| `anyNewTab` | `false` | Links that ask for a new tab in every other tab open Peek too |
| `widthPercent` | `90` | Panel width, as a percentage of the page area (40 to 100) |
| `heightPercent` | `94` | Panel height, as a percentage of the page area (40 to 100) |

## Little Arc

Little Arc is a small, minimal window for a quick lookup, like Arc's. It has no tab bar, no panels and
no workspace switcher, and nothing above the page but one slim bar in the colors of your workspace
(Vivaldi's own title and extension row of the window are hidden):

- **The window buttons** stay at the left end of the bar, which keeps their space free.
- **Back** (an arrow) shows only once the page has navigated inside the window. There is no reload
  button: Cmd/Ctrl+R reloads.
- **The address pill** takes the middle. At rest it shows the host of the page, for example
  `weather.com`; a click shows the full address, selected, for editing. Enter loads what you typed, Esc
  puts the host back. While the window is empty it shows "Search or Enter URL…".
- **Open in *workspace*** on the right, with the shortcut (⌘O or Ctrl+O), keeps the page.
- The page sits in a thin frame of the same color with rounded corners. The colors are the ones the
  main window uses for the sidebar (the `sidebar-look` palette, `arclight` by default), light or dark
  as Vivaldi is. Drag an empty part of the bar to move the window.

What it does:

- **Cmd+Opt+N** (Ctrl+Alt+N on Debian) shows the **command bar** over the window in front: a light
  card with a search field and a list of up to five rows, with the page left as it is (no dimming, no
  blur). With the field empty the list shows the pages you visited most recently; with text it shows
  what you typed first ("Search for ..." or "Open site"), then the best matches among your open tabs,
  bookmarks and history. Up and Down move the selection, Enter opens it in a Little Arc window that
  starts loading at once, and a text that is not an address is searched on DuckDuckGo. Esc, the x button,
  a click outside the card (which reaches nothing under it) or the shortcut again close the bar and
  open nothing. Long titles are cut at the end and long hosts in the middle (`membersh…platform.com`).
  With `commandBar` off, or if the bar cannot be shown, the shortcut opens an empty Little Arc window
  with the address field ready, as before.
- A **link opened from another app** (Mail, Slack, Notes) opens in Little Arc instead of a tab of the
  main window. VivArcDi recognizes it as a new, active tab with no opener that appears just as Vivaldi
  comes to the front.
- **Open in *workspace*** or Cmd/Ctrl+O turns the page into a tab of the workspace you last used and
  closes the small window. Esc in an empty address field and Cmd/Ctrl+W close it and forget the page.
- A Little Arc window nobody touched for six hours closes by itself.

Little Arc works while Vivaldi is open. A shortcut that works from other apps needs an operating
system hook and is not part of this version ([spec 005](specs/005-little-arc/spec.md)).

Options of `little-arc` in `config.json`:

| Option | Default | Effect |
|---|---|---|
| `commandBar` | `true` | The shortcut shows the command bar; `false` opens an empty window with the address field ready |
| `externalLinks` | `true` | Links opened from other apps open in Little Arc |
| `askWorkspace` | `false` | Reserved: the choice of workspace is not available yet, the most recent one is used |
| `idleCloseHours` | `6` | Closes an untouched window after this many hours; `0` never |
| `widthPercent` | `34` | Window width, as a percentage of the screen (20 to 100) |
| `heightPercent` | `60` | Window height, as a percentage of the screen (20 to 100) |

## Reopen pinned tabs

Opening from a new tab (Cmd/Ctrl+T or "+") the address of a Favorite, a pinned tab (its current page or its own page) or a link of the
[bookmark folders](#bookmark-folders) of the current workspace brings you to that tab instead of keeping a duplicate, like Arc's "Switch to Tab". The new
tab closes and the pinned tab is loaded again if it was unloaded. Two addresses match when they have
the same host, ignoring `www.`, and the same path, ignoring a trailing `/`, the query and the fragment.
Links clicked in pages are left alone.

VivArcDi also remembers when each Favorite, pinned tab and bookmark link was last opened. The folder panel of
[spec 008](specs/008-folder-hover-preview/spec.md) will show these dates.

The `reopen-pinned` module has only the `enabled` option. The links it also reopens are those under
the `root` of the `bookmark-folders` module, when that module is on.

## Space header

Shows a row between the Favorites grid and the [bookmark folders](#bookmark-folders), like the space
header of Arc: the icon and the name of the active workspace, and an arrow. A click anywhere on the
row collapses the workspace, and a second click opens it again. Resting the pointer on the row shows a
`+` button that adds a folder to the workspace (see [bookmark folders](#bookmark-folders)). While it is collapsed the arrow
points to the side and:

- the folders section shows only the links that have an open tab, without the folder rows;
- the pinned tabs of the workspace that are unloaded are hidden, while the loaded ones and the
  active one stay. Opening a hidden pinned tab or link another way shows it at once.

Each workspace remembers if you left it collapsed, also after a restart. Outside any workspace the
row is named `Tabs`, with no icon. A right click on the row opens a menu with `New Folder`, the same
as the `+` button, and `Live Folders` › `GitHub`, which adds a [live folder](#live-folders).
Renaming, changing the icon and deleting a workspace stay in Vivaldi's workspace menu, and a rename
shows in the row.

Vivaldi's `icon` field of a workspace has no documented format. The row shows it as text when it is
a short emoji or symbol (at most two characters), and otherwise draws the first letter of the name
in a circle. If the list of workspaces cannot be read, the row is named `Tabs` and the console says
so once.

The module has only the `enabled` option. Set it to `false` and no row is drawn and nothing is hidden.

## Bookmark folders

Shows a bookmark folder in the vertical tab bar, right below the Favorites grid, like the folders of
Arc. Each folder opens and closes on click, subfolders open inside their parent, and the folders you
left open stay open after a restart. A click on a link brings you to its tab if it is open in the
current window and workspace, and opens it otherwise. A link that is open shows a dot and stays
visible below its closed folder.

As in Arc, the link row is the tab. The tab a link opens is linked to its bookmark and hidden from
Vivaldi's list of tabs, so the list holds only the pages you opened outside the Favorites, the pinned
tabs and the folders. The row shows the dot, the look of an active tab while the tab is the active
one, a dimmed look while the tab is unloaded, and, on hover, a close button that closes the tab. The
tab stays linked while it navigates, so a redirect or a login page does not turn it into a stray tab,
and it keeps the link after a restart. Closing the tab, with the button, Cmd/Ctrl+W or Vivaldi's menu,
puts the link back inside its closed folder. A new tab becomes the tab of a link when it opens the
address of a link that has no tab, and when VivArcDi starts, an open tab with the address of a link
that has no tab becomes its tab. The Today archive never archives these tabs, and a click on a link to
another site inside one opens in [Peek](#peek), as for pinned tabs. When a bookmark is removed, its
tab goes back to the list.

The folders can be edited from the tab bar, and every change is a real bookmark, so it shows in
Vivaldi's Bookmarks panel and stays if you uninstall VivArcDi:

- **New folder.** Rest the pointer on the space header and click the `+`. A folder named `Untitled`
  is added at the end of the workspace's folder, with its name ready to type. Enter saves the name;
  Escape and an empty name keep `Untitled`.
- **Rename.** Double click a folder. A single click still opens and closes it, after a short wait.
- **Folder menu.** Right-click a folder row, at any depth, for **Rename…** (the same as the double
  click), **Duplicate**, **Move to** and **Delete**. Duplicate adds a closed copy, with the same name
  and content and no tabs, right below the folder. Move to lists your workspaces, the current one
  checked: choose another and the folder goes to the end of that workspace's folder, with its open
  tabs, and a toast says so; if both workspaces share one folder, nothing moves. Delete moves the
  folder with everything in it into Vivaldi's bookmark Trash, where the Bookmarks panel can restore
  it, closes the tabs of its links and shows a toast. If a move fails, nothing is closed or moved and
  a toast says so. The rows of a live folder keep their own menu.
- **Add a tab to a folder.** Drag a tab of the list onto a folder row and release: it becomes a link at
  the end of that folder and leaves the list. Released on the space header it becomes a link at the end
  of the workspace's folder, and released between two rows it goes there. A Favorite, a pinned tab, a
  tab that is already a link and a page that is not `http` or `https` are left alone. Dropping a tab on
  the Favorites grid pins it, as Vivaldi does.
- **Take a link out by dragging.** Drag a link row out of the section. Released below the separator, its
  page becomes a tab of today at that place; released on the Favorites grid, a Favorite there. The
  bookmark is removed when VivArcDi made it; a bookmark that existed before stays, and a toast says so.
  Released anywhere else, nothing changes and the link does not open.
- **The dragged tab.** While a tab of the list, a link row or a tile is dragged over the tab bar, a white
  pill with its icon and title follows the pointer and the row it came from fades; the pill goes away
  when the drag ends or leaves the tab bar.
- **Pin and tile commands.** Right-click a tab of today, and Vivaldi's menu gains **Pin tab** (a link at
  the end of the workspace's folder, as Cmd/Ctrl+D does) and **Tile tab** (a tile at the end of the
  Favorites grid) for web pages that are not yet a link or a Favorite. Right-click a link row for
  **Remove pin** (the page becomes the first tab of today) and **Tile tab**; right-click a tile for
  **Untile tab** (the page becomes the first tab of today, and the tile leaves every workspace) and
  **Pin tab**. The page is never lost, and the bookmark rule above applies to Remove pin and Untile tab.
  If Vivaldi's menu of a tab cannot be extended, the reason is logged and Cmd/Ctrl+D and the drags remain.
- **Copy from the Bookmarks panel.** Drag a bookmark or a folder from Vivaldi's Bookmarks panel onto the
  workspace's folders and release: a folder is copied with all its levels, a link is added as a link.
  The drop targets are the same as for tabs. The originals stay in the panel, separators are not
  copied, and a folder dropped into itself is ignored. The copies are ordinary bookmarks.
- **Cmd/Ctrl+D.** Adds the page you are on to the end of the workspace's folder, as Arc does with its
  favorites area; press it again and the tab goes back to the list. The bookmark is removed only if
  VivArcDi created it; a link that existed before keeps its bookmark and a message says so. Cmd/Ctrl+D
  replaces the Pin/Unpin mapping of [Arc's keyboard shortcuts](docs/native-settings.md); pinning to the Favorites grid is done by dragging.

Moving folders and removing links stays in the Bookmarks panel. A write that fails is logged in
the console and leaves the section as it was.

| Option | Default | Meaning |
|---|---|---|
| `root` | empty | The folder to show in every workspace that has no entry in `workspaces`, as titles separated by `/`, compared exactly; the first match is used. Empty uses `<workspacesBase>/<workspace name>` |
| `workspaces` | `{}` | The folder of each workspace: the name of the workspace (as in Vivaldi's workspace menu) and the path of its folder, written like `root` |
| `workspacesBase` | `VivArcDi` | The folder that holds the default folder of each workspace, written like `root`. It is created the first time you write in a workspace |
| `maxDepth` | `3` | How many levels of folders are shown |
| `maxHeightPercent` | `60` | The most the section takes of the window height before it scrolls (20 to 100) |

Each workspace can show its own folders, as the spaces of Arc do:

```json
"bookmark-folders": {
  "enabled": true,
  "root": "",
  "workspaces": {
    "Work": "Importati da Firefox/Bookmarks Bar/Work",
    "Personal": "Importati da Firefox/Bookmarks Bar/Personal"
  }
}
```

The section shows the folder of the active workspace and changes when you switch workspace. Each
workspace remembers which of its folders are open. A workspace with no entry uses `root` when it is
not empty, otherwise the folder `VivArcDi/<workspace name>` (the base is the option `workspacesBase`),
and the area outside any workspace uses `root`, otherwise `VivArcDi/Tabs`. Until that folder exists,
which happens the first time you write in the workspace, the section is hidden and takes no space. A
workspace renamed in Vivaldi is matched by its new name, so it looks for a new default folder and the
old one stays in the Bookmarks panel. An entry with an empty path hides the section in that workspace. A `workspaces` option that is not an object of text paths is ignored
and the console says so.

A link has at most one tab in each workspace: the tab stays in the workspace where it was opened, and
the same bookmark shown by two workspaces has its own tab in each.

Before 0.10.0 `root` was `Importati da Firefox/Bookmarks Bar`, shown in every workspace. To keep that
behavior, set `root` to your folder again in `config.json` (or write the same path for each workspace
in `workspaces`) and run `install` again; the installer copies `config.json` as it is and never
merges options from an older install.

If no folder matches the root of the active workspace, the section stays hidden and the console says
so once for that path.

## Live folders

A live folder in the tab bar fills itself, like the Live Folders of Arc
([spec 026](specs/026-live-folders/spec.md), [manual](docs/manual/live-folders.md)). The only source is
GitHub: the folder lists the open pull requests that you created or whose review is requested from
you, newest update first, each with its title and, under it, `author · owner/repo`. A click opens the
pull request as a link tab of the workspace; a pull request that closes leaves the folder.

- Right click the space header, then `Live Folders` › `GitHub`, to add a folder named `Pull Requests`.
  Several are allowed in one workspace, each with its own filters, and a double click renames one.
- Right click the folder: `Pull Requests` › `Created By Me`, `Review Requests` and `Drafts` (all on by
  default) and `Repositories…` (one `owner/repo` per line; empty means every repository), then
  `Refresh`, `Disconnect GitHub` and `Delete Live Folder`. Right click a pull request: `Copy Link` and
  `Archive Pull Request`, which hides it until it is updated on GitHub. Folders, filters and the last
  rows are kept per workspace, and the rows are not bookmarks: no bookmark is written or removed.
- It refreshes every `refreshMinutes`, when the folder is opened and after a filter change. If a
  refresh fails the folder keeps its rows and shows a warning mark that says why.
- You connect GitHub from the browser, with no terminal. Until then the folder shows one row,
  `Connect GitHub`: a click shows a code, `Copy code and open GitHub` copies it and opens GitHub's
  sign-in page, and you press `Authorize`. The token stays in the browser profile's storage of
  VivArcDi, is sent only to `api.github.com`, and is never written to the console. `Disconnect GitHub`
  forgets it.

| Option | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Set to `false` and no live folder is drawn or refreshed |
| `refreshMinutes` | `5` | Minutes between two refreshes of every live folder (1 or more) |
| `githubClientId` | `""` | The client id of the `VivArcDi` OAuth App on GitHub; empty, and the folder says GitHub is not set up |

## Folder panel

Resting the pointer on a closed folder of the [bookmark folders](#bookmark-folders), or on one of
its subfolders, opens a panel next to the tab bar, like Arc. It has a search field with the focus
and one row per link of the folder, subfolders included: favicon, title and the time since the link
was last opened ("23 minuti fa"), the most recent first and the never opened ones last. Typing
filters by title or address, Up and Down move the highlight, Enter or a click opens the link (or
brings you to its tab), Esc closes the panel. It also closes when the pointer leaves the folder and
the panel, and when the folder is opened. Expanded folders never open it.

The dates are the ones recorded by [reopen pinned tabs](#reopen-pinned-tabs). The module needs
`bookmark-folders` to be on.

| Option | Default | Meaning |
|---|---|---|
| `hoverDelayMs` | `400` | How long the pointer must rest, and may be away, in milliseconds (100 to 2000) |

## Today archive

Like Arc, closes the tabs of today that you have not looked at for a while and keeps them in an
archive, so the tab bar stays short without losing anything. A Today tab is a tab that is not pinned,
not a Favorite, not the tab of a [bookmark folder](#bookmark-folders) link and not in a stack.
The time a tab was last active is saved in the tab itself, so the hours Vivaldi was closed count as
well. The active tab and a tab playing audio are never archived.

The archive opens from the button at the bottom of the tab bar or with Cmd/Ctrl+Shift+A: a search
field, then the closed tabs grouped by day with favicon, title, host and time. Up and Down move the
highlight, Enter or a click reopens the tab in its workspace and removes it from the archive, Esc
closes the panel. Resting the pointer on the line under the pinned tabs shows **Clear**, which
archives every Today tab of the workspace except the active one; the panel has the same action.

The archive stays on your machine, in Vivaldi's extension storage.

| Option | Default | Meaning |
|---|---|---|
| `archiveAfterHours` | `12` | Hours without being active before a Today tab is archived (1 to 720) |
| `archiveLimit` | `500` | Entries kept; the oldest go first (50 to 5000) |

Set `enabled` to `false` and VivArcDi never closes a tab.

## Copy URL

Cmd/Ctrl+Shift+C copies the address of the active tab, also while the page has the focus, and shows
a small "Copied" toast at the bottom of the window.

| Option | Default | Meaning |
|---|---|---|
| `toastMs` | `2000` | How long the toast stays, in milliseconds (500 to 10000) |

## Incognito mode

A private window of Vivaldi gets the bare sidebar of Arc's incognito window. From top to bottom the
tab bar shows the title **Incognito Tabs**, with **Clear** on its right when the pointer rests on it,
a **New Tab** row, the private tabs as Vivaldi draws them, and a bottom bar with the Library button
on the left and the `+` button on the right. Vivaldi's own new tab button and workspace switcher are
hidden.

- **New Tab** and `+` open a blank tab in the private window and put the cursor in the address field
  with its text selected, so typing searches or opens a site. Cmd/Ctrl+T still opens Quick Commands,
  as set by the [keyboard shortcuts](docs/native-settings.md).
- **Library** opens Vivaldi's Downloads panel.
- **Clear** closes every tab of the private window except the active one. Nothing goes to the
  [Today archive](#today-archive).

In a private window VivArcDi stores nothing, whether this module is on or not. Only the activation
mark, [Peek](#peek) and [copy URL](#copy-url), which keep nothing, run there. The Favorites grid, the
space header, the folders and their preview, the pinned tab marks and the Today archive do not start.
A normal window open at the same time does not change.

The module has only the `enabled` option. Set it to `false` and a private window looks like plain
Vivaldi, with no VivArcDi section at all.

## Sidebar look

Gives the vertical tab bar Arc's look: rows without a background at rest, a light pill for the active
tab, tiles on a light veil, a thin line above `+ New Tab`, a thin scroll bar that shows only while
scrolling, and the space color as the background of the tab bar. The `+ New Tab` row opens a blank tab.
Vivaldi's own `+` button in the tab bar is hidden.

| Option | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Set to `false` and Vivaldi looks as it does without the module |
| `palette` | `arclight` | Colors of a workspace without a color of its own: `arclight` (a coral-to-aqua gradient behind the tab bar and around the page, with white pill and dark text), `sky`, `ice`, `powder`, `aqua`, `mist` or `lagoon` |

## Workspace sync

Keeps the pinned tabs of each workspace the same on every computer with the same Vivaldi account,
through Vivaldi Sync alone ([spec 030](specs/030-workspace-sync/spec.md)). VivArcDi mirrors the pinned
tabs of each workspace, in order, in the bookmark folder `VivArcDi Sync`, which Vivaldi Sync carries,
and merges the mirror with the tabs after every change:

- A tab pinned on one computer opens, not loaded, as a pinned tab of the workspace with the same name on
  the other. A tab unpinned or closed on one computer is closed on the other, unless it is the active
  tab or shows another page than its own: then it is only unpinned.
- Workspaces travel too: the list (name and order) is kept in `VivArcDi Sync/Spaces`, and a workspace
  this computer lacks is created through Vivaldi's own workspace menu, at a quiet moment, with its pinned
  tabs and folders. Renames follow. The icon is not synced yet, and a workspace deleted on one computer
  is never deleted on the other. If the menu cannot be driven, the missing names are shown once.
- The settings that VivArcDi keeps for a workspace are kept in the same folder.
- Favorites and bookmark folders already sync as bookmarks. Today tabs, their archive and the view
  states of the tab bar stay on each computer.
- Only one window of the browser merges, so two windows never open the same tab twice. A private window
  neither reads nor writes the folder.

| Option | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Set to `false` and the module neither reads nor writes the sync folder |
| `folder` | `VivArcDi Sync` | The title of the bookmark folder that carries the data |
| `renameFromOtherComputers` | `true` | Set to `false` and a workspace renamed elsewhere keeps its name here |

## Roadmap

| Phase | Content |
|---|---|
| 0 | Loader, installer, native settings guide |
| 1 | Favorites: icon grid with adaptive columns, closing unloads instead of removing |
| 2 | Peek: real overlay for Shift+click and for external links from pinned tabs and Favorites |
| 3 | Pinned tabs per workspace: reopen instead of duplicating, bookmark folders in the tab bar and their hover panel, reset to saved URL, folders that let the active tab peek out |
| 4 | Today tabs with auto-archive, Arc keyboard shortcuts |
| 5 | Little Arc, optional browser extension |

## Development

```sh
npm ci
make check
```

Needs Node 24 and Python 3.9+. `make check` lints (ESLint, Stylelint), type-checks (`tsc`), runs the
TypeScript tests (`node --test` through `tsx`) and the installer tests (`unittest`), then builds
`dist/` with esbuild and Sass. `make build` alone builds, and `python3 installer install` then deploys
your local `dist/`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the spec-driven workflow and the branch
and version rules, [specs/](specs/README.md) for what each feature must do, and
[docs/architecture.md](docs/architecture.md).

## Credits

Inspired by [VivalArc](https://github.com/tovifun/VivalArc) by tovifun and by the mods collected in
[Awesome-Vivaldi](https://github.com/PaRr0tBoY/Awesome-Vivaldi). VivArcDi does not include their code.

## License

[MIT](LICENSE)
