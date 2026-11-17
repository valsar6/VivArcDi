# 045 No downgrade

| | |
|---|---|
| Status | Draft |
| Phase | 0 |
| Owner | Tore |
| Approved | – |
| Amends | [000 Foundations](../000-foundations/spec.md), [016 Plug-and-play installer](../016-plug-and-play-installer/spec.md) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

On 2026-11-17 Tore merged 0.58.3 and installed it, but Vivaldi ran 0.55.0. The payload in
Vivaldi.app and the staged copy in `~/Library/Application Support/VivArcDi` had both been written at
23:21 by an installer of version 0.55.0, and no copy of that installer could be found afterwards.
The manual checks of that evening therefore ran on old code without anyone noticing, until the
console line showed the version.

Nothing in the installer compares versions. `install` deploys and stages whatever it carries, and
the staged copy is what the update hook deploys into every new Vivaldi build. `reapply` calls a
payload "outdated" when it differs from its own, so an older staged copy also overwrites a newer
payload. This spec makes the installer refuse to go back to an older VivArcDi unless the user asks
for it, and makes `status` show which versions are where.

## User stories

- **US-1.** As Tore, I want an old copy of VivArcDi (an old clone, an old `dist` checkout, a stale
  staged copy) to never replace a newer one silently, so that what I test is what I installed.
- **US-2.** As Tore, I want to go back to an older version on purpose when a release breaks, with one
  explicit option.
- **US-3.** As Tore, I want `status` to tell me the version of the payload in each Vivaldi build and
  of the staged copy, so I can spot a mismatch without opening the console.

## Expected behavior

### Today

| Command | What it does with versions | Where |
|---|---|---|
| `install` | Deploys its own payload into every build and replaces the staged copy, whatever versions are already there | `commands.py:73`, `staging.py:69` |
| `reapply` | Reapplies to every build whose `build.json` differs from its own (version, Vivaldi version or fingerprint), so an older stage overwrites a newer payload | `commands.py:126-133`, `payload.py:51-60`, `patching.py:21-23` |
| `status` | Says whether each build is patched and current, without the versions | `commands.py:180` |

### After

The **installed version** is the highest VivArcDi version among the `build.json` files of the
Vivaldi builds on the machine. Versions are compared as `X.Y.Z` numbers.

- `install` with a version **lower** than the installed version changes nothing: no payload, no
  `window.html`, no staged copy, no hook. It prints which version is installed, which one it carries,
  and the option that forces it, and exits with an error.
- `install --allow-downgrade` does what `install` does today.
- `install` with the **same or a higher** version works as today. The same version with different
  files (a local rebuild) is not a downgrade.
- `reapply` never replaces a payload whose version is higher than its own. For such a build it only
  puts the loader block back in `window.html` when an update removed it, and it does not count the
  build as needing work, so the macOS hook does not open Terminal for it every six hours.
- `reapply` into a build with no payload (a new Vivaldi version) deploys the staged copy, as today.
  When the staged copy is older than the installed version in another build, it still deploys it,
  because a working older VivArcDi is better than none, and says so in one warning.
- `status` lists, for each build, the VivArcDi version of its payload, and the version of the staged
  copy. When they differ, it says which command fixes it.
- The Debian package runs `install --allow-downgrade`, because apt already chose that version.
- A version that cannot be read (missing or malformed `build.json`, a version that is not `X.Y.Z`)
  never blocks anything: the command behaves as today.

## Requirements

### Functional

- **FR-1.** IF `install` carries a VivArcDi version lower than the installed version, THEN it
  changes nothing on the machine, names both versions and the option `--allow-downgrade`, and exits
  with a non-zero code.
- **FR-2.** `install --allow-downgrade` installs whatever version it carries, as `install` does
  today.
- **FR-3.** `install` with the same or a higher version behaves as today.
- **FR-4.** `reapply` never deploys its payload into a build whose payload has a higher VivArcDi
  version. If that build lost the loader block, `reapply` restores only the block.
- **FR-5.** A build whose payload has a higher version than the running installer does not count as
  needing a reapply.
- **FR-6.** IF `reapply` deploys a staged copy older than the installed version into a build that
  has no payload, THEN it logs one warning that names both versions and says to run `install` again.
- **FR-7.** `status` shows the VivArcDi version of each build's payload and of the staged copy, and
  when they differ it names the command that aligns them.
- **FR-8.** The Debian `postinst` runs `install` with `--allow-downgrade`.
- **FR-9.** A version that cannot be read or parsed is never treated as higher or lower: the
  command behaves as today.

### Non-functional

- **NFR-1.** Standard library only, Python 3.9+, as the rest of the installer.
- **NFR-2.** No new file on the machine: versions come from the `build.json` already deployed and
  from the staged installer's `__init__.py`.
- **NFR-3.** Every existing installer test keeps its name and passes.
- **NFR-4.** Ships on a `fix/` branch with a patch version change.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names the test, `manual` is a step Tore
performs.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | IF `install` carries a lower version than the installed one, THEN THE installer SHALL change no file and SHALL exit with an error that names both versions and `--allow-downgrade` | auto: `test_install_refuses_an_older_version` |
| AC-2 | WHEN `install --allow-downgrade` carries a lower version, THE installer SHALL deploy and stage it | auto: `test_install_allows_an_older_version_on_request` |
| AC-3 | WHEN `install` carries the same version with other files, THE installer SHALL deploy it | auto: `test_install_redeploys_the_same_version` |
| AC-4 | WHILE a build holds a newer payload, THE `reapply` command SHALL leave its payload as it is | auto: `test_reapply_keeps_a_newer_payload` |
| AC-5 | IF a build with a newer payload lost the loader block, THEN THE `reapply` command SHALL restore only the block | auto: `test_reapply_restores_the_block_of_a_newer_payload` |
| AC-6 | WHILE every build holds the same or a newer payload and keeps its block, THE macOS hook SHALL open nothing | auto: `test_background_reapply_ignores_newer_payloads` |
| AC-7 | WHEN `reapply` deploys an older staged copy into a build without payload, THE installer SHALL deploy it and log one warning naming both versions | auto: `test_reapply_warns_when_the_stage_is_older` |
| AC-8 | THE `status` command SHALL show the payload version of each build and the staged version, and the fix when they differ | auto: `test_status_shows_installed_and_staged_versions` |
| AC-9 | THE Debian `postinst` SHALL run `install` with `--allow-downgrade` | auto: `test_postinst_allows_downgrade` |
| AC-10 | IF a version cannot be read, THEN THE installer SHALL behave as without this spec | auto: `test_unreadable_versions_block_nothing` |
| AC-11 | WHEN Tore runs `python3 installer install` from a checkout of an older tag (for example `git worktree add /tmp/old v0.58.2`) on the Mac, THE installer SHALL refuse, and Vivaldi SHALL still log `0.58.x active` with the newer version after a restart | manual |
| AC-12 | WHEN Tore runs `python3 installer status` on the Mac and on Debian, THE output SHALL show the same version for every build and for the staged copy | manual |

## Out of scope

- The macOS app of 016: it installs the version it ships with. Whether its **Install** button
  should refuse an older version is [open question](#open-questions) Q-1.
- Finding which installer of 0.55.0 ran on 2026-11-17. Its copy is gone; this spec makes a repeat
  visible and harmless instead.
- The failing `package-deb` job on `main` (missing apt signing key), which also skips the apt, tap
  and package uploads. It is a separate setup task.
- Checking the version inside Vivaldi (a loader warning when `build.json` is older than expected).

## Open questions

- [ ] **Q-1. The macOS app.** The app (016) shows `outdated` and offers **Install**. Proposed: its
  install also refuses an older version and shows the same message in the window; the app has no
  downgrade button, because a downgrade from the app means an old app was opened by mistake.
- [ ] **Q-2. Option name.** Proposed: `--allow-downgrade`, as apt's `--allow-downgrades` but singular
  like the other options of the installer.

## References

- [000 Foundations](../000-foundations/spec.md): FR-2, FR-4, AC-6 to AC-8 (install and reapply).
- [016 Plug-and-play installer](../016-plug-and-play-installer/spec.md): staged copy, background
  agent, macOS app.
- [017 Package managers](../017-package-managers/spec.md): Debian `postinst`.
