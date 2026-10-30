# VivArcDi

Make [Vivaldi](https://vivaldi.com) behave like the late [Arc](https://arc.net) browser.

Other projects, such as [VivalArc](https://github.com/tovifun/VivalArc), restyle Vivaldi to look like Arc.
VivArcDi goes further and reproduces how Arc **behaves**: a Favorites grid, pinned tabs that reset to
their saved page, folders that let the active tab peek out, and a real Peek overlay for links.

It ships three things:

1. **Stylesheets** for the look.
2. **JavaScript modules** that run inside Vivaldi's own interface for the behavior.
3. **An installer** for macOS and Debian that applies both, and reapplies them on its own after every
   Vivaldi update.

## Status

Phase 4 of the [roadmap](#roadmap) brings the [Today archive](#today-archive) and
[copy URL](#copy-url), after phase 3 with [reopening pinned tabs](#reopen-pinned-tabs),
[bookmark folders in the tab bar](#bookmark-folders), [Favorites from a bookmark folder](#favorites)
and [pinned tabs that reset and unload](#pinned-tabs), after
[Peek](#peek) of phase 2, the [Favorites grid](#favorites) of phase 1
and the module loader, the installer and the [native settings guide](docs/native-settings.md) of phase 0.

Tested against the Vivaldi 8.1 interface. Other versions stay untouched until they get a
[selector file](docs/architecture.md#selectors).

## Requirements

- Vivaldi stable or snapshot, from the official `.dmg` on macOS or the official `.deb` on Debian.
- Python 3.9 or newer. Debian 13 ships it. On macOS run `xcode-select --install` if `python3` is missing.

## Install

VivArcDi is not a Vivaldi extension: there is nothing to add from Vivaldi's settings or from the Chrome
Web Store. The installer copies VivArcDi into Vivaldi's own files, so you run it once from a terminal.

### macOS

1. Install Vivaldi from [vivaldi.com](https://vivaldi.com) and move it to `/Applications`.
2. Open Terminal and check that Python is there:

   ```sh
   python3 --version
   ```

   If macOS offers to install the command line developer tools, accept and wait for it to finish.
3. Download VivArcDi (the `dist` branch holds the ready-to-install build, see
   [Release builds](#release-builds)):

   ```sh
   git clone -b dist https://github.com/valsar6/VivArcDi.git
   cd VivArcDi
   ```

4. Quit Vivaldi (Cmd+Q), then install:

   ```sh
   python3 installer install
   ```

   Do not use `sudo` here: it does not help on macOS, and the update hook must be able to change
   Vivaldi as your user. If the installer stops with a permission error, it prints the steps:

   - **App Management.** macOS stops any program, even with `sudo`, from changing a signed app.
     Open System Settings > Privacy & Security > App Management, turn your terminal app on, quit
     it with Cmd+Q, reopen it and install again.
   - **Vivaldi belongs to another user**, often `root`. Only after allowing App Management, give it
     back to your user, then install again:

     ```sh
     sudo chown -R "$(whoami)" /Applications/Vivaldi.app
     ```

5. Open Vivaldi.

### Debian

1. Install Vivaldi from the official `.deb` on [vivaldi.com](https://vivaldi.com). It also adds the
   Vivaldi apt repository, which keeps Vivaldi updated.
2. Install git if it is missing:

   ```sh
   sudo apt install git python3
   ```

3. Download VivArcDi (the `dist` branch holds the ready-to-install build, see
   [Release builds](#release-builds)):

   ```sh
   git clone -b dist https://github.com/valsar6/VivArcDi.git
   cd VivArcDi
   ```

4. Close Vivaldi, then install:

   ```sh
   sudo python3 installer install
   ```

5. Open Vivaldi.

### Check that it works

```sh
python3 installer status
```

should list your Vivaldi as `patched, up to date` and the update hook as `active`.
You can also open `vivaldi://inspect/#apps`, click *inspect* under `vivaldi`, and look for the line
`[VivArcDi] <version> active on Vivaldi …` in the console.

### Update VivArcDi

From the `VivArcDi` folder (cloned from the `dist` branch):

```sh
git pull
python3 installer install
```

(with `sudo` on Debian), then restart Vivaldi. Vivaldi's own updates need nothing from you: see
[How updates are handled](#how-updates-are-handled).

### Uninstall

```sh
python3 installer uninstall
```

(with `sudo` on Debian), then restart Vivaldi.

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

## Commands

| Command | What it does |
|---|---|
| `install` | Backs up `window.html`, copies the payload, patches `window.html`, registers the update hook |
| `reapply` | Patches again any Vivaldi build that an update reset; run automatically by the hook |
| `uninstall` | Removes the patch, the payload and the hook; keeps the backups |
| `status` | Shows which builds are patched and whether the hook is active |
| `shortcuts apply\|restore\|status` | Sets Arc's keyboard shortcuts and Quick Commands "Open Links In New Tab" in the Vivaldi profile, backs it up first and restores it on request |

Add `--quiet` to print only warnings and errors. On Debian, every command but `status` and `shortcuts` needs `sudo`; `shortcuts` refuses it.

`shortcuts` is never part of `install`: quit Vivaldi, run `python3 installer shortcuts apply --dry-run` to see the differences, then `python3 installer shortcuts apply`. `python3 installer shortcuts restore` puts the saved settings back, and `uninstall --restore-shortcuts` does the same while uninstalling.

### How updates are handled

Vivaldi overwrites `window.html` when it updates, which removes VivArcDi.

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
- The tile of the current tab has a thin glowing border; tiles whose tab is unloaded, or not open
  yet in this workspace, are dimmed.
- A click on the current tile, after browsing away, brings the tab back to the bookmark's page.
- Middle click, Cmd/Ctrl+W or the tab's close button unload the tab instead of closing it. The tile
  stays, and a click loads it again. If the tile was the active tab, the most recently used tab
  takes its place.
- Three columns in a narrow tab bar, more as it gets wider. Hovering a tile shows its title.

If the folder is missing, the first pinned tabs of the current workspace become the tiles, as before
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
row collapses the workspace, and a second click opens it again. While it is collapsed the arrow
points to the side and:

- the folders section shows only the links that have an open tab, without the folder rows;
- the pinned tabs of the workspace that are unloaded are hidden, while the loaded ones and the
  active one stay. Opening a hidden pinned tab or link another way shows it at once.

Each workspace remembers if you left it collapsed, also after a restart. Outside any workspace the
row is named `Tabs`, with no icon. The row has no menu: renaming, changing the icon and deleting a
workspace stay in Vivaldi's workspace menu, and a rename shows in the row.

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

The bookmarks are only read: they are created, renamed, moved and deleted in Vivaldi's Bookmarks
panel, and the tab bar follows.

| Option | Default | Meaning |
|---|---|---|
| `root` | empty | The folder to show in every workspace that has no entry in `workspaces`, as titles separated by `/`, compared exactly; the first match is used. Empty shows nothing |
| `workspaces` | `{}` | The folder of each workspace: the name of the workspace (as in Vivaldi's workspace menu) and the path of its folder, written like `root` |
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
workspace remembers which of its folders are open. A workspace with no entry, and the area outside
any workspace, use `root`; since `root` is empty by default, the section is then hidden and takes no
space. A workspace renamed in Vivaldi is matched by its new name. An entry with an empty path hides
the section in that workspace. A `workspaces` option that is not an object of text paths is ignored
and the console says so.

A link has at most one tab in each workspace: the tab stays in the workspace where it was opened, and
the same bookmark shown by two workspaces has its own tab in each.

Before 0.10.0 `root` was `Importati da Firefox/Bookmarks Bar`, shown in every workspace. To keep that
behavior, set `root` to your folder again in `config.json` (or write the same path for each workspace
in `workspaces`) and run `install` again; the installer copies `config.json` as it is and never
merges options from an older install.

If no folder matches the root of the active workspace, the section stays hidden and the console says
so once for that path.

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
