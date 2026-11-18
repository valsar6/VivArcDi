# 045 No downgrade: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

The installer already writes the VivArcDi version into each build's `build.json` and carries its
own version in `vivarcdi/__init__.py`. The fix reads those two numbers and compares them before
anything changes. Nothing new is stored on the machine (NFR-2).

One small class, `VersionGuard`, answers the three questions the commands need:

- the **installed version**: the highest `vivarcdiVersion` among the builds found;
- whether a given build holds a **newer payload** than the running installer;
- the **staged version**, read from the staged installer's `__init__.py` as text, without importing
  it.

The commands then add one guard each:

- `InstallCommand` asks the guard before the takeover and the staging. A lower version without
  `--allow-downgrade` reports one error and returns 1, so the existing exit path of every mode (CLI,
  deb, app) handles it.
- `InstallationState` gains `newer: bool`. `needs_reapply` becomes
  `not patched or (not current and not newer)`, so a newer payload counts as done (FR-5) and the
  macOS hook stays silent (AC-6).
- `InstallationPatcher.apply` gets a `keep_payload` flag. With it, only `window.html` is patched
  again and the payload is left as it is (FR-4). `ReapplyCommand` passes it for builds with a
  newer payload.
- `ReapplyCommand` warns once, through the reporter, when it deploys into a build with no payload
  while the installed version elsewhere is higher (FR-6).
- `StatusCommand` adds the version to each line and one line for the staged copy (FR-7).
- The window model gains the state `NEWER`, and the presenter shows the warning of FR-10.

Versions are parsed with `parse_version` from `releases.py`, which already turns `v1.2.3` or
`1.2.3` into a tuple and returns `None` for anything else. A `None` on either side means "not
comparable": not newer, not older (FR-9).

Rejected alternatives:

- **Store the last installed version in the data folder.** It is a new file that can itself go
  stale, and `build.json` already says what is deployed (NFR-2).
- **Make `reapply` restage from the newest payload.** The payload alone cannot rebuild the
  installer, and the hook must not write into the data folder of another installation.
- **Compare fingerprints instead of versions.** A fingerprint tells "different", not "older", which
  is the bug.

## Components

| Class or file | Change | Pattern |
|---|---|---|
| `installer/vivarcdi/versions.py` (new) | `VersionGuard(own_version, read_deployed, read_staged)`: `installed(installations) -> str \| None`, `is_newer(version) -> bool`, `is_older(version) -> bool`, `staged() -> str \| None`. `read_staged_version(data_dir)` reads `__version__ = "x"` from the staged `__init__.py` with a regular expression | Pure class with injected readers |
| `installer/vivarcdi/payload.py` | `deployed_version(installation) -> str \| None` from `build.json`; `None` when it is missing or broken | Query method |
| `installer/vivarcdi/patching.py` | `InstallationState.newer`; `needs_reapply` as above; `state()` fills `newer` through the guard; `apply(installation, keep_payload=False)` | Guard clause |
| `installer/vivarcdi/commands.py` | `InstallCommand`: downgrade check first. `ReapplyCommand`: `keep_payload` for newer builds, the warning of FR-6. `StatusCommand`: versions and the staged line. `InstallerContext.allow_downgrade` and `versions` | Guard clause |
| `installer/vivarcdi/cli.py` | `--allow-downgrade` on the `install` subcommand only; `context.allow_downgrade`; builds the `VersionGuard` | Composition root |
| `installer/vivarcdi/window/model.py` | `BuildState.NEWER` when the build is patched and its payload is newer | Enum value |
| `installer/vivarcdi/window/presenter.py` | `NEWER` enables no Install or Update; `_state` shows the warning of FR-10 when any row is `NEWER` and no other notice is on screen | Presenter |
| `installer/vivarcdi/window/tk_view.py` | Label `Newer version installed` for `NEWER` | View mapping |
| `packaging/debian/templates/postinst` | `vivarcdi install --mode deb --quiet --allow-downgrade \|\| true` | — |

### Texts

- Refused install (CLI and app, through the reporter):
  `VivArcDi 0.58.3 is already installed, newer than this VivArcDi (0.55.0): nothing changed. To install 0.55.0 anyway, run: python3 installer install --allow-downgrade`
  In the app, the window shows the first sentence only, without the command (the app has no
  downgrade).
- App warning on open (FR-10):
  `VivArcDi 0.58.3 is already installed, newer than this app (0.55.0). Nothing will change: download the latest app.`
- Older stage in `reapply` (FR-6):
  `Applied the staged VivArcDi 0.55.0 to <build>, but 0.58.3 is installed elsewhere: run install from VivArcDi 0.58.3 again`
- `status`: `<build>: patched, up to date (0.58.3)`, then `Staged copy: 0.58.3`. When the staged
  version differs from the installed one:
  `The staged copy (0.55.0) is older than the installed VivArcDi (0.58.3): run install from 0.58.3 again`.

### Tests

Python `unittest`, in the existing files, with the fakes of `tests/installer/support.py`.

| AC | Test | File |
|---|---|---|
| AC-1 | `test_install_refuses_an_older_version` | `tests/installer/test_commands.py` |
| AC-2 | `test_install_allows_an_older_version_on_request` | `tests/installer/test_commands.py` |
| AC-3 | `test_install_redeploys_the_same_version` | `tests/installer/test_commands.py` |
| AC-4 | `test_reapply_keeps_a_newer_payload` | `tests/installer/test_commands.py` |
| AC-5 | `test_reapply_restores_the_block_of_a_newer_payload` | `tests/installer/test_commands.py` |
| AC-6 | `test_background_reapply_ignores_newer_payloads` | `tests/installer/test_reapply_handoff.py` |
| AC-7 | `test_reapply_warns_when_the_stage_is_older` | `tests/installer/test_commands.py` |
| AC-8 | `test_status_shows_installed_and_staged_versions` | `tests/installer/test_commands.py` |
| AC-9 | `test_postinst_allows_downgrade` | `tests/packaging/test_deb.py` |
| AC-10 | `test_unreadable_versions_block_nothing` | `tests/installer/test_commands.py` |
| AC-11 | `test_window_warns_about_a_newer_installed_version` | `tests/installer/test_window.py` |

AC-1 checks that no file of the fake installation, the stage or the hook changed. AC-10 covers a
missing `build.json`, a broken one and a version like `dev`.

## Vivaldi interface

None. The installer only reads `vivarcdi/build.json`, which it already writes.

## Configuration

None in `config.json`. One new command line option, `install --allow-downgrade`.

## Risks

| Risk | Mitigation |
|---|---|
| A developer reinstalls a local build that still carries an older version number (a branch made before the last release) and is refused | The message names `--allow-downgrade`; the release check of CONTRIBUTING already forces a bump on every branch |
| An old installer without this spec (0.58.3 or earlier) still downgrades silently | Cannot be fixed backwards. From this version on, `status` shows the mismatch, and the console line has always shown the version |
| The app built before this spec keeps offering an install over a newer payload | Same as above; the packages are not published yet (CI `package-deb` fails), so no old app is in circulation |
| `apt install vivarcdi=<older>` is refused | `postinst` passes `--allow-downgrade` (FR-8) |
| A broken `build.json` hides a newer payload | FR-9 keeps today's behavior: the build is reapplied, as before this spec |
