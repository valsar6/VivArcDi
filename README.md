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

Phase 0 of the [roadmap](#roadmap): the module loader, the installer and the
[native settings guide](docs/native-settings.md). No Arc feature is implemented yet; the only module,
`activation-marker`, proves that VivArcDi is running.

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
3. Download VivArcDi:

   ```sh
   git clone https://github.com/valsar6/VivArcDi.git
   cd VivArcDi
   ```

4. Quit Vivaldi (Cmd+Q), then install:

   ```sh
   python3 installer install
   ```

   If macOS says Terminal is not allowed to modify apps, open System Settings > Privacy & Security >
   App Management, turn Terminal on, and run the command again.
5. Open Vivaldi.

### Debian

1. Install Vivaldi from the official `.deb` on [vivaldi.com](https://vivaldi.com). It also adds the
   Vivaldi apt repository, which keeps Vivaldi updated.
2. Install git if it is missing:

   ```sh
   sudo apt install git python3
   ```

3. Download VivArcDi:

   ```sh
   git clone https://github.com/valsar6/VivArcDi.git
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
`[VivArcDi] 0.1.0 active on Vivaldi …` in the console.

### Update VivArcDi

From the `VivArcDi` folder:

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

## Configuration

`src/config.json` lists the stylesheets to load and the modules to enable:

```json
{
  "styles": ["styles/base.css"],
  "modules": {
    "activation-marker": { "enabled": true }
  }
}
```

After editing it, run `install` again.

## Roadmap

| Phase | Content |
|---|---|
| 0 | Loader, installer, native settings guide |
| 1 | Favorites: icon grid with adaptive columns, closing unloads instead of removing |
| 2 | Peek: real overlay for Shift+click and for external links from pinned tabs and Favorites |
| 3 | Pinned tabs per workspace: reset to saved URL, folders that let the active tab peek out |
| 4 | Today tabs with auto-archive, Arc keyboard shortcuts |
| 5 | Little Arc, optional browser extension |

## Development

```sh
make test
```

Runs the JavaScript tests with Node 22 (`node --test`) and the installer tests with Python
(`unittest`). No dependencies to install. See [docs/architecture.md](docs/architecture.md).

## Credits

Inspired by [VivalArc](https://github.com/tovifun/VivalArc) by tovifun and by the mods collected in
[Awesome-Vivaldi](https://github.com/PaRr0tBoY/Awesome-Vivaldi). VivArcDi does not include their code.

## License

[MIT](LICENSE)
