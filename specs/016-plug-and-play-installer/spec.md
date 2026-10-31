# 016 Plug-and-play installer

| | |
|---|---|
| Status | Draft |
| Phase | 0 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Today VivArcDi installs from a terminal: `git clone -b dist`, then `python3 installer install`, with
`sudo` on Debian and an App Management permission for the terminal on macOS. This spec adds a
self-contained package per system, built by CI and attached to every GitHub release: a `VivArcDi.app`
in a `.dmg` for macOS and a `vivarcdi.deb` for Debian. The user downloads one file, opens it with a
double click and clicks Install. No terminal, no Python to install, no git, no commands to copy. The
existing command line installer stays for advanced users and contributors.

## User stories

- **US-1.** As a Vivaldi user who never opens a terminal, I want to install VivArcDi by downloading
  one file and double-clicking it, so that I do not need Python, git or shell commands.
- **US-2.** As a Vivaldi user, I want every blocking situation (Vivaldi running, a macOS permission
  missing) explained in a window with a button that fixes it or opens the right settings page, so
  that I never have to guess what to do.
- **US-3.** As a Vivaldi user, I want VivArcDi to come back on its own after Vivaldi updates, without
  windows popping up, so that I can forget it is there.
- **US-4.** As a Vivaldi user, I want to apply or restore Arc's shortcuts (spec 014) from the same
  window, so that I do not need the `shortcuts` command.
- **US-5.** As a Vivaldi user, I want to uninstall from the same place I installed, so that Vivaldi
  goes back to how it was.
- **US-6.** As a user of the command line installer, I want the new package to take over my existing
  installation cleanly, so that I do not end up with two update hooks.

## Expected behavior

### Download

The README and every GitHub release page have a **Download** section with two links: macOS and
Debian. They point to the files of the latest release, built by CI from the same commit as the
`dist` branch, with the same version number.

### macOS

The user opens `VivArcDi-<version>.dmg` and drags `VivArcDi.app` into Applications, as with any Mac
app, then opens it.

1. The first time, macOS may refuse to open an app downloaded from the internet. What the user sees
   depends on how the app is signed, see the open questions. The README shows this step with a
   screenshot.
2. The app opens a small window that lists each Vivaldi build found (stable, snapshot) with its
   state: not installed, installed and current, installed but outdated, needs reapplying.
3. **Install** applies VivArcDi to every build. If Vivaldi is running, the app asks to quit it and
   quits it on confirmation. If macOS blocks the change to `Vivaldi.app`, the app explains App
   Management in one sentence and a button opens System Settings at Privacy & Security > App
   Management, where the user turns `VivArcDi` on. Back in the app, **Try again** finishes the job.
   Since the permission belongs to `VivArcDi.app` and not to a terminal, it is given once.
4. At the end the app offers a checkbox, off by default: "Also use Arc's keyboard shortcuts"
   (spec 014). Then **Open Vivaldi**.
5. Opened again later, the same window shows the state and offers **Update** (when the app carries a
   newer VivArcDi than the one installed), **Reapply**, **Shortcuts: apply / restore** and
   **Uninstall**.

After a Vivaldi update, a background agent that belongs to the app reapplies VivArcDi. Because the
agent runs the app's own executable, it uses the App Management permission of `VivArcDi.app` and no
Terminal window opens. A notification says "VivArcDi was applied again: restart Vivaldi".

### Debian

The user downloads `vivarcdi_<version>_all.deb` and opens it with a double click. The system's
software installer (GNOME Software on Debian 13) shows it and installs it after the administrator
password, like any package. `sudo apt install ./vivarcdi_<version>_all.deb` is the documented
fallback.

1. Installing the package applies VivArcDi to every Vivaldi build. If Vivaldi is running, the
   package still applies it and the change takes effect at the next Vivaldi start.
2. The package asks the package manager to run it again whenever the Vivaldi packages change, so a
   Vivaldi update reapplies VivArcDi with no apt hook of its own and no user action.
3. A **VivArcDi** entry in the applications menu opens a small window with the state and the
   **Shortcuts: apply / restore** buttons, which act on the user's own profile.
4. Removing the package (`Remove` in the software installer, or `apt remove vivarcdi`) restores
   Vivaldi as `uninstall` does today. Installing a newer `.deb` updates VivArcDi.

Python stays the language of the installer: macOS gets it inside the app bundle, and on Debian the
package depends on the system `python3`, which every Debian 13 desktop already has and which the
package manager installs by itself otherwise. Either way the user never installs or runs Python.

### Coming from the command line installer

If the package finds an installation made with `python3 installer install`, it takes it over: it
removes the old update hook (the launchd agent and its Terminal script on macOS, the apt hook on
Debian) and the staged copy, keeps the backups, and registers its own. The command line installer,
when run on a machine that has the package, refuses `install` and points to the app or the package,
so the two never fight.

## Requirements

### Functional

- **FR-1.** CI builds `VivArcDi-<version>.dmg` (macOS, Apple Silicon and Intel in one universal app)
  and `vivarcdi_<version>_all.deb` (Debian) for every release and attaches them to the GitHub release
  `v<version>`. Users never need Node, Python or git to install.
- **FR-2.** Both packages reuse the existing installer services (patching, backups, payload,
  shortcuts) instead of duplicating them; only the user interface and the update hook differ.
- **FR-3.** The macOS app embeds its own Python runtime and the compiled payload, and needs nothing
  else on the Mac.
- **FR-4.** The macOS app shows the state of each Vivaldi build and offers Install, Update, Reapply,
  Shortcuts apply/restore and Uninstall, enabled only when they make sense.
- **FR-5.** IF Vivaldi is running when the macOS app has to change it, THEN the app asks to quit it
  and quits it only on confirmation.
- **FR-6.** IF macOS denies a write to `Vivaldi.app`, THEN the app explains App Management and opens
  System Settings at the App Management page; it never suggests `sudo` or Terminal.
- **FR-7.** The macOS app registers a per-user launchd agent that runs the app's own executable in
  background mode when a Vivaldi bundle changes; it reapplies silently and notifies the user once.
- **FR-8.** IF the background agent is still denied by App Management, THEN it shows a notification
  that opens the app, instead of a Terminal window.
- **FR-9.** The Debian package applies VivArcDi in its post-install step, reapplies it through a dpkg
  trigger on the Vivaldi installation folders (`/opt/vivaldi`, `/opt/vivaldi-snapshot`), and restores
  Vivaldi in its pre-removal step, keeping the backups.
- **FR-10.** The Debian package installs a desktop entry that opens the state and shortcuts window
  as the user, never as root (spec 014 FR-9).
- **FR-11.** Both packages take over an installation made by the command line installer (US-6), and
  the command line installer refuses `install` where a package manages VivArcDi.
- **FR-12.** Shortcuts stay opt-in (spec 014): nothing in the packages changes `Preferences` unless
  the user asks.
- **FR-13.** The command line installer and the `dist` branch keep working as today.

### Non-functional

- **NFR-1.** No step of install, update, reapply or uninstall needs a terminal, on either system.
- **NFR-2.** Every message is in plain words, names the problem and the button that solves it, and
  hides stack traces (they go to a log file the window can open).
- **NFR-3.** The macOS download stays under 40 MB, the Debian one under 2 MB.
- **NFR-4.** The packages are reproducible from the tagged commit by CI alone, with no manual step.
- **NFR-5.** Vivaldi is never left half patched: a failure restores the build it was changing, as
  `install` does today.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a version is released, CI SHALL attach a `.dmg` and a `.deb` with that version to its GitHub release. | manual: the release page of the new tag lists both files |
| AC-2 | THE macOS app bundle SHALL contain the Python runtime, the installer and the compiled payload. | auto: `test_app_bundle_contains_runtime_installer_and_payload` |
| AC-3 | THE Debian package SHALL declare a dpkg trigger on `/opt/vivaldi` and `/opt/vivaldi-snapshot` and depend on `python3 (>= 3.9)`. | auto: `test_deb_declares_vivaldi_triggers_and_python_dependency` |
| AC-4 | WHEN the Debian package is configured, THE post-install step SHALL run `install`; WHEN the trigger fires, it SHALL run `reapply`. | auto: `test_deb_postinst_installs_and_reapplies_on_trigger` |
| AC-5 | WHEN the Debian package is removed, THE pre-removal step SHALL run `uninstall` and keep the backups. | auto: `test_deb_prerm_uninstalls_and_keeps_backups` |
| AC-6 | THE window SHALL list each Vivaldi build with one of the states not installed, current, outdated, needs reapplying. | auto: `test_window_state_lists_each_build` |
| AC-7 | THE window SHALL enable only the actions that apply to the current state. | auto: `test_window_enables_only_applicable_actions` |
| AC-8 | IF Vivaldi is running, THEN the macOS app SHALL ask before quitting it and change nothing when the user declines. | auto: `test_running_vivaldi_is_quit_only_after_confirmation` |
| AC-9 | IF macOS denies a write, THEN the app SHALL explain App Management and offer to open its settings page, without mentioning sudo or Terminal. | auto: `test_app_management_denial_offers_the_settings_page` |
| AC-10 | THE macOS launchd agent SHALL run the app's own executable in background mode. | auto: `test_launch_agent_runs_the_app_executable` |
| AC-11 | IF the background agent is denied, THEN it SHALL post a notification that opens the app, and SHALL NOT open Terminal. | auto: `test_denied_background_reapply_notifies_instead_of_terminal` |
| AC-12 | WHEN a package finds a command line installation, IT SHALL remove the old hook and staged copy and keep the backups. | auto: `test_package_takes_over_a_command_line_installation` |
| AC-13 | WHERE a package manages VivArcDi, THE command line `install` SHALL refuse and name the package. | auto: `test_command_line_install_defers_to_the_package` |
| AC-14 | THE packages SHALL change `Preferences` only when the user chooses to apply or restore shortcuts. | auto: `test_packages_leave_shortcuts_alone_by_default` |
| AC-15 | WHEN the user opens the `.dmg`, drags the app to Applications and clicks Install, Vivaldi SHALL show the console line of 000/AC-17 after a restart, with no terminal used. | manual |
| AC-16 | WHEN the app is blocked by App Management, THE button SHALL open System Settings at App Management, and Try again SHALL succeed after the user allows VivArcDi. | manual |
| AC-17 | WHEN Vivaldi updates itself on macOS, VivArcDi SHALL be reapplied without any Terminal window, and a notification SHALL ask to restart Vivaldi. | manual |
| AC-18 | WHEN the user double-clicks the `.deb` on Debian 13, the software installer SHALL install it after the password, and Vivaldi SHALL show the console line after a restart. | manual |
| AC-19 | WHEN Vivaldi is updated through apt on Debian, VivArcDi SHALL be reapplied with no user action. | manual |
| AC-20 | WHEN the user uninstalls from the app (macOS) or removes the package (Debian), Vivaldi SHALL look and behave as before. | manual |
| AC-21 | WHEN the user applies shortcuts from the window, Vivaldi SHALL show them after a restart as in 014/AC-13. | manual |
| AC-22 | WHEN a newer `.dmg` or `.deb` is installed over an older one, the window SHALL report the new version as current. | manual |

## Out of scope

- Windows, Flatpak/Snap Vivaldi, other Linux families (spec 000 FR-1 still applies).
- Automatic updates of VivArcDi itself (a Debian apt repository, an in-app updater): a later spec.
  The app may only say that a newer release exists, see the open questions.
- Editing `config.json` from the window: modules stay configured by file.
- Removing the command line installer or the `dist` branch.
- Publishing on the Mac App Store (it cannot change other apps).

## Open questions

Each question has a proposed answer. Approving the spec without comments accepts the proposals.

- [ ] **Q1. Apple signing.** An app that is not signed with an Apple Developer ID and notarized is
  blocked by Gatekeeper the first time: on recent macOS the user must go to System Settings > Privacy
  & Security and click "Open Anyway". The Developer ID costs 99 USD a year and needs your Apple
  account; CI would sign and notarize with secrets you add to the repository. There is a second
  effect: macOS ties the App Management permission to the signature, and an unsigned (ad-hoc signed)
  app gets a new signature with every build, so **after every VivArcDi update the user would have
  to allow App Management again**. *Proposal:* start ad-hoc signed, with the "Open Anyway" step and
  the App Management step shown in the README and in the app; design CI so that Developer ID signing
  and notarization switch on as soon as the secrets exist. Do you plan to get a Developer ID?
- [ ] **Q2. How the macOS app is built.** *Proposal:* freeze the existing Python installer with a
  standard bundler (PyInstaller or Briefcase, chosen in the design) and a minimal native window, so
  the code that already works is reused. The alternative, a rewrite in Swift, gives a smaller and
  more native app but duplicates the installer logic.
- [ ] **Q3. Debian: Python from the system.** *Proposal:* the `.deb` depends on the system
  `python3`, already present on Debian 13 desktops and installed automatically by the package
  manager otherwise. The user never sees it. Bundling a frozen Python instead would make the package
  about 15 MB for no visible gain. OK?
- [ ] **Q4. Debian window.** The Debian package installs as root, but shortcuts belong to the user's
  profile. *Proposal:* a menu entry "VivArcDi" that opens a small window (state + shortcuts) run as
  the user, built with the GTK dialogs that GNOME already ships (`zenity`, declared as a dependency).
  Install, update and removal stay in the software installer. Or do you want install/uninstall
  buttons in that window too (they would ask for the password)?
- [ ] **Q5. Notice of new VivArcDi versions.** *Proposal:* no automatic update in this spec; the
  window shows "VivArcDi <x> is available" with a link to the release page, by checking the GitHub
  releases at most once a day. Or nothing at all, to keep the app fully offline?
- [ ] **Q6. When Vivaldi is running on Debian.** *Proposal:* the package applies anyway and the
  change shows at the next Vivaldi start, because a package install cannot ask questions in GNOME
  Software. Same as the apt hook today.
- [ ] **Q7. Language of the window.** *Proposal:* English only, like the rest of the project. Italian
  could follow as a translation file if you want it.

## References

- [Spec 000 Foundations](../000-foundations/spec.md): installer, update hook, macOS App Management
  (AC-12, AC-25 to AC-28).
- [Spec 006 Versioning and releases](../006-versioning-and-releases/spec.md): release tags and the
  `dist` branch.
- [Spec 014 Arc shortcuts](../014-arc-shortcuts/spec.md): opt-in shortcuts, run as the user.
- [Debian Policy: dpkg triggers](https://www.debian.org/doc/debian-policy/ch-maintainerscripts.html)
- [Apple: notarizing macOS software](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
