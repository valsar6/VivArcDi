# Getting started

[Back to the manual](README.md)

## What you need

- Vivaldi stable or snapshot, installed from the official `.dmg` on macOS or the official `.deb` on
  Debian.
- macOS or Debian. Windows is not supported.
- The vertical tab bar: VivArcDi draws its sections in a tab bar on the left or the right. See the
  [native settings guide](../native-settings.md) for the Vivaldi settings that bring Vivaldi close to
  Arc before VivArcDi starts.

## Install

| System | Package manager | Direct download |
|---|---|---|
| macOS | `brew install --cask valsar6/vivarcdi/vivarcdi` | `VivArcDi-<version>.dmg` from the [Releases page](https://github.com/valsar6/VivArcDi/releases/latest) |
| Debian | the VivArcDi apt repository | `vivarcdi_<version>_all.deb` from the same page |

On macOS, open VivArcDi from Applications and click **Install**. Two macOS prompts can show up the
first time:

- VivArcDi is free and has no Apple Developer ID, so macOS cannot verify it. Open System Settings >
  Privacy & Security and click **Open Anyway**.
- VivArcDi writes inside `Vivaldi.app`, so it needs App Management. Click **Open Settings** in the
  VivArcDi window, turn VivArcDi on, and click **Try again**.

On Debian the package installs everything. Open **VivArcDi** from the applications menu to see its
state.

At the end the window offers **Also use Arc's keyboard shortcuts**. Tick it to get Cmd/Ctrl+T for
Vivaldi's Quick Commands, Cmd/Ctrl+S for the tab bar and the other keys listed in
[Today tabs, archive and keyboard](today-and-keyboard.md#arc-keyboard-shortcuts). Your own shortcuts
are saved and can be restored from the same window.

Restart Vivaldi. The step-by-step instructions, the command line installer and the apt setup are in
the [README](../../README.md#install).

## Check that it works

- The VivArcDi window lists your Vivaldi as installed.
- With the tab bar on the left, the Favorites grid appears at the top of the tab bar once a bookmark
  folder named `Favorites` exists, or shows your first pinned tabs as tiles.
- For details, open `vivaldi://inspect/#apps`, click *inspect* under `vivaldi`, and look for
  `[VivArcDi] <version> active on Vivaldi …` in the console, followed by
  `[VivArcDi:boot] self-check: active, …`. Send that line with any bug report.

## Updates

- **Vivaldi updates.** An update replaces Vivaldi's files. VivArcDi notices it, applies itself again
  and asks you to restart Vivaldi. On macOS, if the App Management permission is missing, the VivArcDi
  window opens with **Try again**.
- **VivArcDi updates.** `brew upgrade --cask vivarcdi` on macOS, the software updater or `apt upgrade`
  on Debian. The VivArcDi window says when a newer release exists. On macOS, a new version may ask for
  App Management again.

## Saved data

VivArcDi keeps its data under `vivarcdi.*` keys. After you go back to an older version, data written
by the newer one is shown but not changed, and a notice says so. A value that cannot be read is copied
once to `vivarcdi.recovery.<name>` before VivArcDi overwrites it. With the GitHub connection, that
copy may hold the token.

To put a copy back, open the console of `window.html`, read it with `chrome.storage.local.get` and
write it under the original key with `chrome.storage.local.set`, then restart Vivaldi. To remove a
copy, use `chrome.storage.local.remove` on its key.

## Turn a feature off

Each feature is a module in `config.json` with an `enabled` option. Set it to `false` and run the
install again. The options of every module are in the [README](../../README.md#configuration).

A value that a module does not accept (a word where a number goes, a size out of its range, a name
that is not among the choices) is replaced by the module's default, so a mistake never breaks the
interface. The reason is in the console: open `vivaldi://inspect/#apps`, inspect `window.html`, and
look for lines like `option "widthPercent" is 500, not a number from 40 to 100: using 90`. A module
starts only when `enabled` is exactly `true`.

## Uninstall

- **macOS:** click **Uninstall** in the VivArcDi window, restart Vivaldi, then delete VivArcDi from
  Applications, or run `brew uninstall --cask vivarcdi`.
- **Debian:** `sudo apt remove vivarcdi`, or `sudo apt purge vivarcdi` to also delete the backups and
  the apt repository entry.

Your bookmarks, including the folders and Favorites you made with VivArcDi, stay in Vivaldi.
