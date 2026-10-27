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

Phase 3 of the [roadmap](#roadmap) has started with [reopening pinned tabs](#reopen-pinned-tabs), after
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

Add `--quiet` to print only warnings and errors. On Debian, every command but `status` needs `sudo`.

### How updates are handled

Vivaldi overwrites `window.html` when it updates, which removes VivArcDi.

- **macOS:** a launchd agent (`~/Library/LaunchAgents/io.github.valsar6.vivarcdi.reapply.plist`)
  watches the Vivaldi app bundles and runs `reapply` when they change, plus every six hours.
- **Debian:** an apt hook (`/etc/apt/apt.conf.d/99vivarcdi`) runs `reapply` after every apt operation.

The hook runs a copy of the installer kept in `~/Library/Application Support/VivArcDi` on macOS and
`/usr/local/share/vivarcdi` on Debian, so you can move or delete the cloned repository.
After an update, restart Vivaldi once more to load the reapplied modules.

> **macOS limitation.** The launchd agent runs outside your terminal, so App Management may block
> it too. Until this is solved, run `python3 installer install` again after a Vivaldi update.

## Configuration

`src/config.json` (`config.json` in a release build) lists the stylesheets to load and the modules to enable:

```json
{
  "styles": ["styles/base.css", "styles/favorites.css"],
  "modules": {
    "activation-marker": { "enabled": true },
    "favorites-grid": { "enabled": true, "maxTiles": 12 }
  }
}
```

After editing it in a release build, run `install` again. In a source checkout, run `make build`
first.

## Favorites

With the tab bar on the left or right, the first pinned tabs become a grid of square icon tiles, as in
Arc. Pinned tabs past the limit, and every other tab, keep their normal rows below the grid.

- Three columns in a narrow tab bar, more as it gets wider.
- The active tile is lighter; tiles of unloaded (hibernated) tabs are dimmed.
- Middle click on a tile unloads the tab instead of closing it. The tile stays, and a click loads it
  again. If the tile was the active tab, the most recently used tab takes its place.
- Hovering a tile shows its title in Vivaldi's tooltip.

Tiles are the pinned tabs of the current workspace: Vivaldi 8.2 cannot show one tab in every
workspace. Favorites shared by every workspace come with
[spec 003](specs/003-pinned-tabs-and-folders/spec.md).

Options of `favorites-grid` in `config.json`:

| Option | Default | Meaning |
|---|---|---|
| `maxTiles` | `12` | How many pinned tabs become tiles |
| `minColumns` | `3` | Columns of a narrow tab bar |
| `tileMinWidth` | `64` | Narrowest tile, in pixels, before the grid drops a column |
| `tileHeight` | `44` | Tile height, in pixels |
| `gap` | `8` | Space between tiles and between their rows, in pixels |
| `unloadOnMiddleClick` | `true` | Middle click unloads a tile instead of closing it |

## Peek

Some links open in Peek: a rounded panel over the current page, which stays visible and dimmed
behind it. The panel shows the real page, so you can scroll, type and follow links inside it.

- **Shift+click** on a link opens it in Peek instead of a new window.
- In a Favorite or pinned tab, a link to **another site** opens in Peek, so the tab keeps its page.
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
| `widthPercent` | `80` | Panel width, as a percentage of the page area (40 to 100) |
| `heightPercent` | `90` | Panel height, as a percentage of the page area (40 to 100) |

## Reopen pinned tabs

Opening from a new tab (Cmd/Ctrl+T or "+") the address of a Favorite or a pinned tab of the current
workspace brings you to that tab instead of keeping a duplicate, like Arc's "Switch to Tab". The new
tab closes and the pinned tab is loaded again if it was unloaded. Two addresses match when they have
the same host, ignoring `www.`, and the same path, ignoring a trailing `/`, the query and the fragment.
Links clicked in pages are left alone.

VivArcDi also remembers when each Favorite and pinned tab was last opened. The folder panel of
[spec 008](specs/008-folder-hover-preview/spec.md) will show these dates.

The `reopen-pinned` module has only the `enabled` option.

## Roadmap

| Phase | Content |
|---|---|
| 0 | Loader, installer, native settings guide |
| 1 | Favorites: icon grid with adaptive columns, closing unloads instead of removing |
| 2 | Peek: real overlay for Shift+click and for external links from pinned tabs and Favorites |
| 3 | Pinned tabs per workspace: reopen instead of duplicating, reset to saved URL, folders that let the active tab peek out |
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
