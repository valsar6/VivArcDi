# 000 Foundations

| | |
|---|---|
| Status | Implemented |
| Phase | 0 |
| Owner | Tore |
| Approved | 2026-10-25, written after the fact from PR #1 and PR #5 |

## Summary

The base every other feature stands on: an installer that puts VivArcDi inside Vivaldi on macOS and
Debian and keeps it there after Vivaldi updates, and a loader that runs inside Vivaldi's interface,
reads a configuration and starts feature modules without ever breaking the browser.

## User stories

- **US-1.** As a Vivaldi user, I want to install VivArcDi with one command, so that I do not edit
  Vivaldi's files by hand.
- **US-2.** As a Vivaldi user, I want VivArcDi to survive Vivaldi updates on its own, so that the
  Arc behavior does not disappear after every update.
- **US-3.** As a Vivaldi user, I want to remove VivArcDi completely, so that Vivaldi goes back to
  how it was.
- **US-4.** As a Vivaldi user, I want to see whether VivArcDi is installed and current.
- **US-5.** As a Vivaldi user, I want to turn each feature on or off in one file.
- **US-6.** As a Vivaldi user, I want a Vivaldi version that VivArcDi does not know to keep working,
  so that an update never leaves me with a broken browser.
- **US-7.** As a contributor, I want features to be independent modules with their own selectors,
  so that one feature or one Vivaldi update cannot break the others.

## Expected behavior

The user downloads the release build (`git clone -b dist`) and runs `python3 installer install`
(with `sudo` on Debian, without it on macOS). The installer finds every Vivaldi build on the machine,
stable and snapshot, keeps a copy of each original `window.html`, copies the payload next to it, adds
one script block to `window.html` and registers an update hook. After a restart, Vivaldi runs the
loader, which logs `[VivArcDi] <version> active on Vivaldi <version>` in the interface console.

When Vivaldi updates and rewrites `window.html`, the hook runs `reapply`, which patches again only
the builds that lost the patch or carry an outdated payload. `status` reports each build and the hook.
`uninstall` removes the block, the payload, the hook and the staged copy, and keeps the backups.

Inside Vivaldi the loader reads `config.json` and `build.json`, picks the selector file for the
running Vivaldi version, waits for the interface, injects the configured stylesheets and starts the
enabled modules. When no selector file fits, it stays inactive. A failing module is logged and
skipped.

Phase 0 also documents the native Vivaldi settings that already give Arc's behavior without code
([docs/native-settings.md](../../docs/native-settings.md)).

## Requirements

### Functional

- **FR-1.** The installer supports macOS (app bundles in `/Applications`, stable and snapshot) and
  Debian-based Linux (official `.deb`, stable and snapshot). Other systems are refused with a message.
- **FR-2.** `install` backs up each original `window.html` once per Vivaldi version, deploys the
  built payload as `vivarcdi/` next to it with a generated `build.json`, inserts the loader block
  between `<!-- vivarcdi:start -->` and `<!-- vivarcdi:end -->` before `</body>`, stages its own copy
  in the platform data folder and registers the update hook.
- **FR-3.** The update hook is a per-user launchd agent on macOS, watching the Vivaldi framework
  folders and running every six hours, and a `DPkg::Post-Invoke` rule on Debian. It runs the staged
  installer, so the cloned folder may be moved or deleted. On macOS the agent only checks the builds:
  when one needs reapplying, it opens Terminal with a script that runs `reapply`, because App
  Management lets only the apps the user allowed, such as the terminal used for `install`, change
  `Vivaldi.app`. On Debian the hook patches directly.
- **FR-4.** `reapply` touches only builds whose `window.html` lost the block or whose `build.json`
  differs from the current payload fingerprint and Vivaldi version.
- **FR-5.** `uninstall` removes the block, the payload, the hook and the staged copy, and keeps the
  backups. `status` reports `not patched`, `patched, up to date` or `patched, outdated payload` for
  each build, and whether the hook is active.
- **FR-6.** Every command accepts `--quiet`, which prints only warnings and errors.
- **FR-7.** The loader selects the newest selector file not newer than the running Vivaldi
  (major.minor). An unknown Vivaldi version gets the newest file.
- **FR-8.** Modules are classes registered by id and enabled with `"enabled": true` under that id in
  `config.json`, which also carries their options and the list of stylesheets.
- **FR-9.** Modules get, through their start context, the document, the selector catalog, a logger
  tagged with their id, their options, the build versions and a promise-based `chrome.tabs` wrapper.
- **FR-10.** `activation-marker` marks the browser root with the `data-vivarcdi-active` attribute
  and the VivArcDi version, so stylesheets apply only while VivArcDi runs. The mark is a data
  attribute because Vivaldi rewrites the root's `class` attribute whenever it re-renders.
- **FR-11.** On every push to `main`, CI publishes the release tree (`installer/`, `dist/`, `docs/`,
  `README.md`, `LICENSE` and a `.gitignore` of its own that ignores only Python bytecode and
  `.DS_Store`) as one new commit on top of the `dist` branch, never rewriting it, so `git pull`
  updates a `dist` checkout. The commit names the version and the `main` commit, is authored by
  Tore, and is skipped when the tree did not change.

### Non-functional

- **NFR-1.** Vivaldi is never blocked: startup errors and module errors are logged, never thrown.
- **NFR-2.** Users need Python 3.9+ and nothing else; the installer uses the standard library only
  and the payload ships compiled. Node is needed only to build.
- **NFR-3.** Running as `root` on macOS is refused, and running without it on Debian is refused,
  with the exact command to use.
- **NFR-4.** Permission errors explain the fix: on macOS, App Management first, then `chown` only
  when the bundle belongs to another user; on Debian, `sudo`.
- **NFR-5.** No selector of Vivaldi's interface is hard-coded in a module.
- **NFR-6.** `reapply` is cheap when nothing changed, because the Debian hook runs after every apt
  operation.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN `install` runs, THE installer SHALL back up `window.html`, deploy the payload, patch `window.html` and register the hook. | auto: `test_install_patches_deploys_backs_up_and_hooks` |
| AC-2 | IF no Vivaldi installation is found, THEN `install` SHALL fail with a message naming the system. | auto: `test_install_fails_without_vivaldi` |
| AC-3 | IF the payload was not built, THEN the installer SHALL fail before touching anything and say how to get a release build. | auto: `test_install_raises_installer_error_when_dist_is_missing`, `test_stager_fails_before_touching_the_data_folder` |
| AC-4 | THE patcher SHALL insert exactly one loader block before `</body>`, however often it runs. | auto: `test_apply_adds_the_loader_before_closing_body`, `test_apply_is_idempotent` |
| AC-5 | IF `window.html` has no `</body>`, THEN the patcher SHALL refuse to patch. | auto: `test_apply_requires_a_body` |
| AC-6 | WHEN a Vivaldi update removes the block, THE `reapply` command SHALL restore it. | auto: `test_reapply_restores_a_patch_lost_in_an_update` |
| AC-7 | WHEN the Vivaldi version changes, THE `reapply` command SHALL deploy the payload again. | auto: `test_reapply_redeploys_after_a_vivaldi_version_change` |
| AC-8 | WHILE every build is up to date, THE `reapply` command SHALL change nothing. | auto: `test_reapply_does_nothing_when_up_to_date` |
| AC-9 | WHEN `uninstall` runs, THE installer SHALL restore `window.html`, remove payload, hook and staged copy, and keep the backups. | auto: `test_uninstall_restores_vivaldi_and_keeps_backups` |
| AC-10 | WHEN `status` runs, THE installer SHALL report the state of each build and of the hook. | auto: `test_status_reports_each_state` |
| AC-11 | THE installer SHALL choose macOS on Darwin and Debian on Debian-based Linux, and refuse Fedora and Windows. | auto: `test_darwin_is_macos`, `test_debian_trixie_is_debian`, `test_ubuntu_counts_as_debian_based`, `test_fedora_is_unsupported`, `test_windows_is_unsupported` |
| AC-12 | IF macOS denies a write, THEN the installer SHALL explain App Management first and add `chown` only for a foreign owner. | auto: `test_app_management_always_comes_first`, `test_foreign_owner_also_gets_a_chown_after_app_management`, `test_own_bundle_needs_no_chown` |
| AC-13 | THE loader SHALL use the newest selector file not newer than the running Vivaldi. | auto: `bestMatch picks the exact major.minor`, `bestMatch falls back to the newest older catalog` |
| AC-14 | IF every selector file is newer than the running Vivaldi, THEN THE loader SHALL stay inactive and log a warning. | auto: `start stays inactive on a Vivaldi older than every catalog` |
| AC-15 | WHEN a module fails to start, THE loader SHALL log it and start the other modules. | auto: `a failing module does not stop the others` |
| AC-16 | THE loader SHALL start only modules enabled in `config.json` and warn about unknown ids. | auto: `createEnabled instantiates only enabled modules` |
| AC-17 | WHEN Vivaldi starts after `install`, THE interface console SHALL show `[VivArcDi] <version> active on Vivaldi <version>`. | manual |
| AC-18 | WHEN Vivaldi updates itself, THE hook SHALL reapply VivArcDi: on Debian without user action, on macOS by opening a Terminal window that does it. | manual: update Vivaldi (or replace `window.html` with the backup), wait for the Terminal window, restart Vivaldi and look for the console line of AC-17 |
| AC-19 | WHEN `uninstall` runs and Vivaldi restarts, THE browser SHALL look and behave as before the install. | manual |
| AC-20 | WHEN Vivaldi rewrites the classes of the browser root, THE activation mark SHALL stay. | auto: `the activation mark survives a rewrite of the browser classes` |
| AC-21 | WHEN the installer runs from a `dist` checkout, THE checkout SHALL stay clean in `git status`, because the `dist` branch carries the `.gitignore` that ignores Python bytecode. | manual: install from `git clone -b dist`, then `git status` shows nothing to commit |
| AC-22 | WHEN `main` publishes a new build, THE `dist` branch SHALL grow by one commit on top of the previous one, so `git pull` on a `dist` checkout fast-forwards. | manual: after a merge into `main`, `git pull` on the `dist` checkout succeeds without hints about divergent branches |
| AC-23 | THE `dist` branch SHALL contain the compiled payload `dist/`, so `install` works from a fresh `git clone -b dist`. | manual: `git clone -b dist`, then `python3 installer install` finds the payload |
| AC-24 | WHEN CI publishes on `dist`, THE commit SHALL be authored by Tore and its message SHALL name the VivArcDi version and the `main` commit. | manual: `git log -1 origin/dist` shows `Salvatore` and `Publish the dist build of VivArcDi <version> from main at <sha>` |
| AC-25 | WHEN the macOS hook finds a build that needs reapplying, THE installer SHALL open Terminal with a script that runs `reapply`, instead of writing to Vivaldi itself. | auto: `test_the_hook_runs_reapply_in_background_mode`, `test_background_reapply_on_macos_hands_off_to_terminal`, `test_terminal_script_runs_an_interactive_reapply` |
| AC-26 | WHILE every build is up to date, THE macOS hook SHALL open nothing. | auto: `test_background_reapply_opens_nothing_when_up_to_date` |
| AC-27 | WHEN `reapply` runs from the terminal, THE installer SHALL patch directly and delete the Terminal script, and `uninstall` SHALL delete it too. | auto: `test_interactive_reapply_on_macos_patches_and_clears_the_script`, `test_uninstall_removes_the_terminal_script` |
| AC-28 | WHEN the Debian hook runs, THE installer SHALL patch directly. | auto: `test_background_reapply_without_handoff_patches_directly` |

## Out of scope

- Windows.
- Vivaldi installed from Flatpak, Snap or a distribution package other than the official `.deb`.
- A graphical installer or a settings page inside Vivaldi.
- Downloading VivArcDi updates automatically: the user updates the `dist` checkout.

## Open questions

- [x] AC-18 on macOS: the launchd agent runs outside the terminal, so App Management may block it.
  Resolved 2026-10-26 with Tore: the agent hands `reapply` to Terminal (FR-3, AC-25 to AC-27).

## References

- [Strategy and roadmap](https://claude.ai/artifact/4JHR28H3euKSPbQZPNhY38), sections "Architettura
  del repo" and "L'installer".
- [docs/architecture.md](../../docs/architecture.md)
