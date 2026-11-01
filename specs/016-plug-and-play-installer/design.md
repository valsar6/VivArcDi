# 016 Plug-and-play installer: design

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |

Written only after the spec is `Approved`. It says **how**; the spec says **what**.

## Approach

The installer core stays as it is: `InstallationPatcher`, `PayloadDeployer`, `BackupStore`,
`ShortcutService` and the platforms. Three things are added around it:

1. An **install mode** that tells the core who manages VivArcDi: the command line, the macOS app or
   the Debian package. The mode decides the data folder, the update hook, whether the installer stages
   a copy of itself, and how permission problems are explained (FR-2).
2. A **window**, one for both systems, written with Tkinter from the Python standard library and split
   into a testable presenter and a thin view.
3. **Packaging** under `packaging/`: a PyInstaller build that freezes the installer, the payload and
   Python into `VivArcDi.app`, and a `.deb` built with `dpkg-deb`. CI builds both on every pull request
   and attaches them to every release.

### Install modes

| | Command line (today) | macOS app | Debian package |
|---|---|---|---|
| Code and payload | the clone, staged to the data folder | inside `VivArcDi.app/Contents` | `/usr/share/vivarcdi` |
| Data folder (backups) | `~/Library/Application Support/VivArcDi`, `/usr/local/share/vivarcdi` | `~/Library/Application Support/VivArcDi` | `/var/lib/vivarcdi` |
| Update hook | launchd agent running the staged Python, Terminal handoff; apt hook | launchd agent running the app executable, no handoff | dpkg trigger, declared in the package |
| Staging | yes | no | no |
| Permission advice | terminal steps | App Management, with a button to open its settings | not needed (root) |

`InstallMode` is a strategy with three implementations (`CommandLineMode`, `MacAppMode`,
`DebPackageMode`); `build_context` asks the mode for these parts instead of hard-coding them. A mode
also writes a marker, `<data folder>/managed-by` holding `app` or `deb`. The command line `install`
looks for both markers and stops with "VivArcDi is managed by the VivArcDi app / the vivarcdi package"
(AC-13). `status`, `shortcuts` and `uninstall` still work from the command line.

The Debian package moves the data folder to `/var/lib/vivarcdi`, because a package must not own files
in `/usr/local`. Taking over a command line installation moves the backups there.

### Taking over a command line installation

`LegacyTakeover` runs at the start of `install` in a package mode (AC-12):

- macOS: if the launchd agent exists and its `ProgramArguments` do not point to the app, it is booted
  out and deleted, with `reapply.command` and the staged `installer/` and `dist/` folders. Backups stay
  where they are, since the data folder is the same.
- Debian: `/etc/apt/apt.conf.d/99vivarcdi` is deleted, the backups move from
  `/usr/local/share/vivarcdi/backups` to `/var/lib/vivarcdi/backups`, and `/usr/local/share/vivarcdi`
  is removed.

Vivaldi does not need to be reverted first: `install` patches idempotently (000/AC-4) and the payload
is replaced by the new one.

### macOS app

PyInstaller (`--windowed`, `--target-arch universal2`) freezes `packaging/macos/app_main.py` with the
`installer` package, `dist/` as data, and Tcl/Tk. The build uses the universal2 Python 3.13 from
python.org, installed on the macOS runner, because PyInstaller needs every binary to be universal.
PyInstaller signs the bundle ad hoc (Q1). `hdiutil create` puts it in a `.dmg` with a link to
`/Applications`. The bundle id is `io.github.valsar6.vivarcdi`.

The same executable serves two purposes. Opened by the user, with no arguments, it shows the window.
Started with arguments, it runs the command line: the launchd agent calls
`VivArcDi.app/Contents/MacOS/VivArcDi reapply --background --quiet`. The agent plist adds
`AssociatedBundleIdentifiers` so macOS lists it under the app in Login Items. Since launchd starts
the app's own signed executable, macOS gives it the app's App Management permission (AC-10). Every
time the window opens, it registers the agent again with the bundle's current path, so moving the app
does not break the hook.

Background reapply in app mode (AC-11):

- Success: a notification through `osascript -e 'display notification …'`, "VivArcDi was applied
  again. Restart Vivaldi."
- `PermissionDeniedError` (App Management lost, for example after a VivArcDi update re-signed the
  app): the agent opens the app with `open -b io.github.valsar6.vivarcdi --args --needs-reapply`,
  so the window comes up with the App Management message and the Try again button. This is more
  direct than a notification the user has to click, and it never opens Terminal.

`MacAppMode` uses `AppManagementAdvisor`, whose message names App Management and VivArcDi and never
sudo or Terminal (AC-9). The window shows it with **Open Settings**, which runs
`open "x-apple.systempreferences:com.apple.preference.security?Privacy_AppBundles"`, and **Try again**.

Quitting Vivaldi (AC-8): the presenter asks; on yes, `VivaldiQuitter` runs
`osascript -e 'tell application id "com.vivaldi.Vivaldi" to quit'` (and the snapshot id) and waits up
to 15 seconds for `ProcessGuard` to see no Vivaldi process. On no, or on time out, nothing changes.

### Debian package

`packaging/debian/build_deb.py` assembles a tree and calls `dpkg-deb --build --root-owner-group`:

```text
DEBIAN/control      Package: vivarcdi, Version: <version>, Architecture: all,
                    Depends: python3 (>= 3.9), python3-tk
DEBIAN/triggers     interest-noawait /opt/vivaldi
                    interest-noawait /opt/vivaldi-snapshot
DEBIAN/postinst     configure: vivarcdi install --mode deb --quiet
                    triggered: vivarcdi reapply --mode deb --quiet
DEBIAN/prerm        remove: vivarcdi uninstall --mode deb --quiet
DEBIAN/postrm       purge: rm -rf /var/lib/vivarcdi
usr/share/vivarcdi/ installer/ and dist/
usr/bin/vivarcdi    launcher: exec python3 /usr/share/vivarcdi/installer "$@"
usr/share/applications/io.github.valsar6.vivarcdi.desktop   Exec=vivarcdi window
usr/share/icons/hicolor/256x256/apps/io.github.valsar6.vivarcdi.png
```

The maintainer scripts are a few lines of `/bin/sh` generated from templates; the logic stays in
Python. `|| true` keeps a VivArcDi failure from blocking an apt transaction, as the apt hook does
today. The trigger fires when the Vivaldi package changes files under `/opt/vivaldi*`, also with
`dpkg -i`, which the apt hook missed. `prerm upgrade` does nothing: the new version's `postinst`
installs over it. `python3-tk` is the one extra dependency, about 1 MB, so the same window serves
both systems instead of a separate `zenity` front end (Q4 asked for a small window run as the user,
not for a toolkit).

`vivarcdi window` runs as the user from the menu. On Debian it shows the state and the shortcut
buttons only; Install, Update and Uninstall are hidden in `DebPackageMode`, because the package
manager owns them (Q4).

### The window

Model-view-presenter, so all decisions are tested without a display (Humble Object):

- `StatusModel` reads every build and returns `BuildStatus(label, state)` with the states of AC-6:
  `not_installed`, `current`, `outdated`, `needs_reapply`. `outdated` means the payload of an older
  VivArcDi; `needs_reapply` means `window.html` lost the patch.
- `WindowPresenter` turns the model and the mode into `WindowState`: the rows, which actions are
  enabled (AC-7), the message and its buttons. It runs actions through the existing commands with a
  `CollectingReporter`, catches `VivArcDiError` and maps it to a plain message; tracebacks go to
  `<data folder>/logs/vivarcdi.log` (NFR-2), which **Show log** opens.
- `TkWindow` draws `WindowState`: a list of builds, a row of buttons, a message area and the shortcut
  checkbox. It has no logic and no tests of its own.
- `ReleaseChecker` asks `https://api.github.com/repos/valsar6/VivArcDi/releases/latest` with `urllib`,
  at most once a day (the time of the last check is kept in the data folder), and silently gives up
  on any error. A newer tag shows "VivArcDi <x> is available" with a link (Q5).

Actions by state:

| Action | Enabled when | Mode |
|---|---|---|
| Install | some build is `not_installed` | app |
| Update | some build is `outdated` | app |
| Reapply | some build is `needs_reapply` | app |
| Uninstall | some build is installed | app |
| Shortcuts: apply | always | app, deb |
| Shortcuts: restore | a shortcuts backup exists | app, deb |

Shortcuts first show the `--dry-run` differences in a confirmation dialog; nothing changes
`Preferences` without that click (AC-14).

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `installer/vivarcdi/modes.py` `InstallMode`, `CommandLineMode`, `MacAppMode`, `DebPackageMode` | Data folder, hook, staging, advisor and visible actions per mode; the `managed-by` marker | Strategy |
| `installer/vivarcdi/takeover.py` `LegacyTakeover` | Removes a command line hook and staged copy, moves Debian backups | |
| `installer/vivarcdi/hooks.py` `PackageTriggerHook` | The dpkg trigger: nothing to install or remove, always reported active | Null object |
| `installer/vivarcdi/hooks.py` `LaunchAgentHook` | Gains `AssociatedBundleIdentifiers` when given a bundle id | |
| `installer/vivarcdi/notifier.py` `Notifier`, `MacNotifier`, `AppOpener` | Success notification and opening the app on denial | Adapter |
| `installer/vivarcdi/permissions.py` `AppManagementAdvisor` | App Management message without sudo or Terminal | Strategy |
| `installer/vivarcdi/quitter.py` `VivaldiQuitter` | Asks Vivaldi to quit and waits for it | Adapter |
| `installer/vivarcdi/window/model.py` `StatusModel`, `BuildStatus` | State of each build | |
| `installer/vivarcdi/window/presenter.py` `WindowPresenter`, `WindowState` | Enabled actions, messages, running commands | Presenter |
| `installer/vivarcdi/window/tk_view.py` `TkWindow` | Tkinter drawing only | Humble object |
| `installer/vivarcdi/releases.py` `ReleaseChecker` | Daily check for a newer release | |
| `installer/vivarcdi/reporter.py` `CollectingReporter` | Keeps messages for the window | |
| `installer/vivarcdi/cli.py` | `--mode`, the `window` command, mode-aware `build_context` | Factory |
| `packaging/macos/app_main.py`, `VivArcDi.spec`, `build_dmg.py` | Frozen entry point, PyInstaller spec, `.dmg` | |
| `packaging/debian/build_deb.py`, `templates/` | Control file, triggers, maintainer scripts, launcher, desktop entry | Builder |
| `packaging/assets/icon.png`, `icon.icns` | The app icon | |
| `.github/workflows/tests.yml` | `package-macos` and `package-deb` jobs; upload to the release | |

Tests: `tests/installer/` for modes, takeover, presenter and quitter; `tests/packaging/` for the
`.deb` tree (AC-3 to AC-5, run on Linux) and for the built app bundle (AC-2, run in the
`package-macos` job right after the build). `make test-py` runs both folders.

## Vivaldi interface

Not touched: no selector and no change to the loader. The macOS bundle ids
`com.vivaldi.Vivaldi` and `com.vivaldi.Vivaldi.snapshot` are used only to ask Vivaldi to quit.

## Configuration

None in `config.json`. CI reads the version from `package.json` for the file names, as the `dist`
publish does.

## CI and releases

- `package-deb` (ubuntu): `npm run build`, `python3 packaging/debian/build_deb.py`, `lintian` on the
  result, then the packaging tests. Uploads the `.deb` as a workflow artifact on pull requests, so Tore
  can try a build before merging.
- `package-macos` (macos-latest): installs the python.org universal2 Python and PyInstaller pinned in
  `packaging/macos/requirements.txt`, builds the app and the `.dmg`, runs the bundle test, uploads the
  `.dmg` as an artifact.
- On `main`, the `release` job reports whether it created the release; when it did, both package jobs
  run `gh release upload v<version>` (AC-1). Release notes get the Download section with the two links.
- Signing is a separate step that runs only if the `MACOS_SIGNING_IDENTITY` secret exists, so a Developer
  ID can be added later without changing the design (Q1).

## Risks

| Risk | Mitigation |
|---|---|
| launchd does not give the app's App Management permission to the agent | The agent opens the window with Try again (AC-11); AC-17 proves it on Tore's Mac. Fallback: the agent opens the app normally with `open`, which macOS always attributes to the app |
| App Management is lost after each VivArcDi update (ad-hoc signature, Q1) | The window explains it on the first denied write and opens the right settings page; the README says so |
| Gatekeeper blocks the first open | README section with screenshots of "Open Anyway"; the `.dmg` window has a short text file with the same steps |
| PyInstaller cannot build universal2 with the runner's Python | python.org universal2 installer in CI; fallback: two `.dmg` files, Apple Silicon and Intel |
| GNOME Software on Debian 13 does not open a local `.deb` | AC-18 checks it; README documents `sudo apt install ./vivarcdi_<version>_all.deb` |
| A failing VivArcDi breaks an apt upgrade | Every maintainer script call ends with `|| true`, as the apt hook does |
| The `.dmg` is larger than 40 MB (NFR-3) | Exclude unused stdlib modules in the spec file; the size is printed by CI |
| Users with both the CLI and a package | Markers and AC-13 keep one owner; `LegacyTakeover` cleans the CLI parts |
