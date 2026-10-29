# 014 Arc shortcuts

| | |
|---|---|
| Status | Draft |
| Phase | 0 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

The installer can set the Vivaldi settings that make the keyboard feel like Arc's: Quick Commands on
Cmd/Ctrl+T, "Open Links In New Tab" on, and the shortcuts Arc does not use removed or moved. Print stays on Cmd/Ctrl+P, as Tore decided on 2026-10-29. The
change is opt-in, backed up and reversible. VivalArc recommends the same settings by hand; here one
command applies them.

## User stories

- **US-1.** As a Vivaldi user, I want one command to set Arc's shortcuts, so that I do not click
  through Settings > Keyboard.
- **US-2.** As a Vivaldi user, I want my current shortcuts saved before any change, so that I can go
  back.
- **US-3.** As a Vivaldi user, I want to see what would change before it changes, so that I keep
  control of my own shortcuts.

## Expected behavior

With Vivaldi closed, the user runs `python3 installer shortcuts apply`. The installer finds the
profile of each Vivaldi build, copies its `Preferences` file into the VivArcDi data folder, and writes
these settings:

| Setting | Arc-style value |
|---|---|
| Quick Commands > Open Links In New Tab | on |
| New Tab | no shortcut |
| Quick Commands | Cmd+T (Ctrl+T on Debian) |
| Save Page As | no shortcut |
| Tab Bar | Cmd+S (Ctrl+S on Debian) |
| Create Bookmark | no shortcut |
| Pin / Unpin Tab | Cmd+D (Ctrl+D on Debian) |
| Print | unchanged, keeps Cmd+P (Ctrl+P on Debian) |
| Panel | unchanged |

`shortcuts apply --dry-run` lists the differences and writes nothing. `shortcuts restore` puts back
the saved `Preferences`. `status` reports whether the shortcuts match the table. Vivaldi has to be
closed, because it rewrites `Preferences` when it quits; if it is running, the command stops and says
so. A shortcut that Cmd+T, Cmd+S or Cmd+D collides with is removed from the other command, so
no key is bound twice. `install` never touches shortcuts unless asked.

## Requirements

### Functional

- **FR-1.** `shortcuts apply` backs up each profile's `Preferences` once per run, then writes the
  settings of the table above into it.
- **FR-2.** The command finds the profiles of stable and snapshot builds on macOS
  (`~/Library/Application Support/Vivaldi*/`) and Debian (`~/.config/vivaldi*/`), every profile
  folder that holds a `Preferences` file.
- **FR-3.** The shortcut table lives in one data file of the installer, not in code, and uses `meta`
  on macOS and `ctrl` on Debian.
- **FR-4.** `--dry-run` prints each setting with its current and new value and changes nothing.
- **FR-5.** `restore` copies the newest backup of each profile back, and tells when there is none.
- **FR-6.** The command refuses to run while a Vivaldi process is running.
- **FR-7.** Applying twice gives the same file as applying once.
- **FR-8.** Settings not in the table stay as they are, byte-for-byte in meaning.
- **FR-9.** `shortcuts` runs as the user. On Debian it refuses `sudo`, because the profile belongs to
  the user.

### Non-functional

- **NFR-1.** The write is atomic: a temporary file next to `Preferences`, then a rename, so a crash
  never leaves a half-written file.
- **NFR-2.** Standard library only, like the rest of the installer.
- **NFR-3.** IF the file is not valid JSON or lacks the expected structure, THEN nothing is written.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN `shortcuts apply` runs, THE installer SHALL back up `Preferences` and write every setting of the table. | auto: `test_apply_backs_up_and_writes_every_setting` |
| AC-2 | WHEN `--dry-run` is given, THE installer SHALL print the differences and leave `Preferences` unchanged. | auto: `test_dry_run_changes_nothing` |
| AC-3 | WHEN `shortcuts restore` runs, THE installer SHALL put the newest backup back. | auto: `test_restore_puts_back_the_backup` |
| AC-4 | IF no backup exists, THEN `restore` SHALL say so and change nothing. | auto: `test_restore_without_backup_changes_nothing` |
| AC-5 | IF Vivaldi is running, THEN `apply` and `restore` SHALL stop with a message and write nothing. | auto: `test_refuses_while_vivaldi_runs` |
| AC-6 | WHEN `apply` runs twice, THE second run SHALL leave the file identical. | auto: `test_apply_is_idempotent` |
| AC-7 | THE installer SHALL leave every setting outside the table unchanged. | auto: `test_unrelated_settings_are_untouched` |
| AC-8 | WHEN another command holds a key of the table, THE installer SHALL remove it from that command. | auto: `test_conflicting_shortcut_is_removed_from_other_command` |
| AC-9 | THE installer SHALL use `meta` on macOS and `ctrl` on Debian. | auto: `test_modifier_follows_the_platform` |
| AC-10 | IF `Preferences` is not valid JSON, THEN THE installer SHALL write nothing and name the file. | auto: `test_invalid_preferences_are_left_alone` |
| AC-11 | THE installer SHALL find the profiles of stable and snapshot builds on both systems. | auto: `test_profiles_are_found_on_both_systems` |
| AC-12 | WHEN `status` runs, THE installer SHALL report for each profile whether the table matches. | auto: `test_status_reports_match_per_profile` |
| AC-13 | WHEN Vivaldi restarts after `apply`, THE keyboard SHALL follow the table and Settings > Keyboard SHALL show it. | manual |
| AC-14 | WHEN Vivaldi restarts after `restore`, THE keyboard SHALL be as before `apply`. | manual |
| AC-15 | WHEN Vivaldi restarts after `apply`, Quick Commands SHALL open links in a new tab. | manual |

## Out of scope

- Windows, and any shortcut outside the table.
- Changing shortcuts while Vivaldi runs, or from inside Vivaldi's interface.
- Shortcuts that VivArcDi itself provides (copy URL), covered by spec 004.
- Mouse gestures and Quick Commands search sources.

## Open questions

- [x] **Where do the settings live?** Confirmed by Tore's probe (2026-10-29, Vivaldi on macOS): `vivaldi.actions` is a list with one object; each command is a key `COMMAND_<NAME>` holding `{"shortcuts": [...]}`, with `gestures` kept beside it. The option is `vivaldi.quick_commands.open_url_in_new_tab` (boolean). Command ids: `COMMAND_NEW_TAB`, `COMMAND_SHOW_QUICK_COMMANDS`, `COMMAND_SAVE_PAGE`, `COMMAND_MAIN_TOGGLE_TAB_BAR`, `COMMAND_ADD_BOOKMARK`, `COMMAND_PIN_TAB`, `COMMAND_PRINT_PAGE`, `COMMAND_MAIN_TOGGLE_PANEL_TOGGLE`.
- [x] **Does Vivaldi accept an edited file?** The file has no `protection` hash, so nothing signs the keys. Whether Vivaldi keeps an edit at startup is checked by AC-13; if it reverts, the spec drops back to a manual guide.
- [ ] **Removing a shortcut.** Tore's file shows a removed command as `{}` or without `shortcuts`, and an emptied one as `"shortcuts": []`. Proposal: write `"shortcuts": []`, keep `gestures`, and let AC-13 prove it.
- [ ] **Print and Panel.** Tore's current file has Panel on `meta+p` and Print on `shift+meta+p`, while his last message says Cmd+P stays on Print. Proposal: the table leaves both alone, so the installer keeps whatever the user has. Tore confirms which he wants.
- [x] **Command names.** Decided by Tore 2026-10-29: "Tab Bar" is the command that shows the workspace area (the tab bar); Panel and Print are not changed, Print keeps Cmd+P. The probe still confirms the exact command ids.
- [x] **Conflicts.** Decided by Tore 2026-10-29: remove the old shortcuts that Cmd+T, Cmd+S and Cmd+D would override, as listed in the table. Cmd+P is not remapped, so Print is left alone.
- [ ] **Sync.** If Vivaldi Sync carries keyboard settings, a synced device may overwrite the change.
  Proposal: mention it in the command output and do nothing more.
- [ ] **Scope.** Proposal: opt-in `shortcuts` command only, never part of `install`; `uninstall`
  does not restore shortcuts, only `shortcuts restore` does.
- [ ] **Debian keys.** Ctrl+T, Ctrl+S, Ctrl+D, Ctrl+P on Linux, or the same table with `ctrl`? The
  proposal is `ctrl`, as in the table above.

## References

- [docs/native-settings.md](../../docs/native-settings.md#keyboard)
- [Spec 004, keyboard](../004-today-tabs-and-keyboard/spec.md)
- [VivalArc](https://github.com/tovifun/VivalArc)
- [Vivaldi forum: exporting keyboard hotkeys](https://forum.vivaldi.net/post/672852)
