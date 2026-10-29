# 014 Arc shortcuts: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/arc-shortcuts`, next minor version.

- [x] **T1.** Add `shortcuts.json` and `PreferencesDocument` with `ShortcutTable`: read and set
  options and shortcuts, keep `gestures`, remove conflicting keys, write atomically. Satisfies AC-6,
  AC-7, AC-8, AC-9, AC-10. Done when their tests pass.
- [x] **T2.** Add `ProfileLocator` and `profile_roots()` on both platforms. Satisfies AC-11. Done
  when `test_profiles_are_found_on_both_systems` passes.
- [x] **T3.** Add `PreferencesBackupStore` and `ProcessGuard`. Satisfies AC-5. Done when
  `test_refuses_while_vivaldi_runs` passes.
- [x] **T4.** Add `ShortcutsCommand` with `apply`, `--dry-run`, `restore` and `status`, wired in the
  CLI, refusing `sudo`. Satisfies AC-1, AC-2, AC-3, AC-4, AC-12. Done when their tests pass.
- [x] **T5.** Add `uninstall --restore-shortcuts`. Satisfies AC-16. Done when
  `test_uninstall_restores_shortcuts_only_when_asked` passes.
- [x] **T6.** Update `docs/native-settings.md` (Keyboard) and the README with the command, and bump
  the version in `package.json`, `package-lock.json` and `installer/vivarcdi/__init__.py`. Done when
  `make check` passes.
- [x] **T7.** Write the manual verification checklist for Tore from AC-13, AC-14 and AC-15, in
  Italian, with the read-only probe to compare before and after.
