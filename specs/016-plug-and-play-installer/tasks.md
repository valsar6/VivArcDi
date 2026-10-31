# 016 Plug-and-play installer: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/plug-and-play-installer`, next minor version
(0.15.0). The work may land in two pull requests: T1 to T8 (core, window, Debian package), then T9 to
T13 (macOS app, release upload, docs).

- [x] **T1.** Add `InstallMode` with `CommandLineMode`, `MacAppMode`, `DebPackageMode`, the `--mode`
  option and a mode-aware `build_context`. `CommandLineMode` must keep today's behavior, so the
  existing tests pass unchanged. Satisfies FR-2, FR-13. Done when `make test-py` passes.
- [x] **T2.** Write the `managed-by` marker in package modes and make the command line `install`
  refuse when a marker exists. Satisfies AC-13. Done when `test_command_line_install_defers_to_the_package`
  passes.
- [x] **T3.** Add `LegacyTakeover` for both systems. Satisfies AC-12. Done when
  `test_package_takes_over_a_command_line_installation` passes.
- [x] **T4.** Add `StatusModel`, `WindowPresenter`, `WindowState` and `CollectingReporter`, with the
  log file. Satisfies AC-6, AC-7, AC-14. Done when `test_window_state_lists_each_build`,
  `test_window_enables_only_applicable_actions` and `test_packages_leave_shortcuts_alone_by_default`
  pass.
- [x] **T5.** Add `VivaldiQuitter` and the quit confirmation in the presenter. Satisfies AC-8. Done
  when `test_running_vivaldi_is_quit_only_after_confirmation` passes.
- [x] **T6.** Add `AppManagementAdvisor` and the Open Settings / Try again flow. Satisfies AC-9. Done
  when `test_app_management_denial_offers_the_settings_page` passes.
- [ ] **T7.** Add `TkWindow`, `ReleaseChecker` and the `window` command. Satisfies FR-4, FR-10, Q5.
  Done when the window opens with `python3 installer window` on Tore's machines (checked in T13).
- [x] **T8.** Add `PackageTriggerHook`, `packaging/debian/` with `build_deb.py`, the templates, the
  launcher, the desktop entry and the icon, and the `package-deb` CI job. Satisfies AC-3, AC-4, AC-5.
  Done when `test_deb_declares_vivaldi_triggers_and_python_dependency`,
  `test_deb_postinst_installs_and_reapplies_on_trigger` and `test_deb_prerm_uninstalls_and_keeps_backups`
  pass and `lintian` reports no error.
- [x] **T9.** Make `LaunchAgentHook` accept the app executable and `AssociatedBundleIdentifiers`, and
  add `MacNotifier` and `AppOpener` for background reapply in app mode. Satisfies AC-10, AC-11. Done
  when `test_launch_agent_runs_the_app_executable` and
  `test_denied_background_reapply_notifies_instead_of_terminal` pass.
- [ ] **T10.** Add `packaging/macos/` (entry point, PyInstaller spec, pinned requirements,
  `build_dmg.py`, icon) and the `package-macos` CI job with the bundle test. Satisfies AC-2, NFR-3.
  Done when `test_app_bundle_contains_runtime_installer_and_payload` passes in CI and the `.dmg` is
  under 40 MB.
- [ ] **T11.** Upload both packages to the GitHub release from `main`, and add the Download section
  to the release notes. Satisfies AC-1. Done when the workflow passes `actionlint` and a dry run on a
  pull request builds both artifacts.
- [x] **T12.** Update the README: a Download section first, the macOS "Open Anyway" and App Management
  steps with screenshots, the Debian double click and the `apt install ./…` fallback; move the
  terminal install under "Advanced: command line". Bump the version in `package.json`,
  `package-lock.json` and `installer/vivarcdi/__init__.py`. Done when `make check` passes.
- [x] **T13.** Write the manual verification checklist for Tore, in Italian, from AC-15 to AC-22 (`installer/verifica-installer-plug-and-play.md` in the project files),
  using the `.dmg` and `.deb` artifacts of the pull request.
