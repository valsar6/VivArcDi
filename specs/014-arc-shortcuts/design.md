# 014 Arc shortcuts: design

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |

Written only after the spec is `Approved`. It says **how**; the spec says **what**.

## Approach

A new installer command, `shortcuts`, with the actions `apply`, `restore` and `status`, edits the
`Preferences` file of each Vivaldi profile. The format was confirmed on Tore's Vivaldi (macOS,
2026-10-29):

- `vivaldi.actions` is a list with one object. Each key is `COMMAND_<NAME>`, the value holds
  `shortcuts` (list of strings such as `meta+t`) and sometimes `gestures`.
- A command Tore cleared by hand appears as `{}`, without `shortcuts`. One emptied through the
  interface appears as `"shortcuts": []`.
- The option is `vivaldi.quick_commands.open_url_in_new_tab`, a boolean.
- The file carries no `protection` hash, so nothing signs the keys.

The settings live in a data file, `installer/vivarcdi/shortcuts.json`, so the table is data, not
code (FR-3):

```json
{
  "options": {"vivaldi.quick_commands.open_url_in_new_tab": true},
  "commands": {
    "COMMAND_NEW_TAB": [],
    "COMMAND_SHOW_QUICK_COMMANDS": ["{mod}+t"],
    "COMMAND_SAVE_PAGE": [],
    "COMMAND_MAIN_TOGGLE_TAB_BAR": ["{mod}+s"],
    "COMMAND_ADD_BOOKMARK": [],
    "COMMAND_PIN_TAB": ["{mod}+d"],
    "COMMAND_PRINT_PAGE": ["{mod}+p"]
  }
}
```

`{mod}` becomes `meta` on macOS and `ctrl` on Debian (AC-9). The Panel is not listed: it loses
`{mod}+p` through the conflict rule, which removes a key from every command not named in the table
that holds it (AC-8). Removing is writing `"shortcuts": []` and keeping `gestures` (FR-8). Where a
command is not yet in `vivaldi.actions[0]`, the installer adds it.

Apply flow: refuse if Vivaldi runs, read and parse every profile, compute the new document in memory,
stop if any profile is invalid (AC-10), copy the original to the backup folder, write to a temporary
file next to `Preferences` and rename it over the original (NFR-1). The comparison between current
and new values drives `--dry-run` (AC-2), `status` (AC-12) and the idempotence check (AC-6).

Backups go to `<data dir>/preferences-backups/<channel>-<profile>/Preferences.<timestamp>`; `restore`
copies the newest back (AC-3, AC-4). `uninstall --restore-shortcuts` calls the same restore (AC-16).

Rejected alternatives:

- Writing the shortcuts from the loader inside Vivaldi: the interface keeps its own copy of the
  settings in memory and would overwrite the change on exit.
- Doing it inside `install`: it would change keys the user did not ask for, and Debian `install`
  runs as root while the profile belongs to the user.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `installer/vivarcdi/shortcuts.json` | The table of options and commands | Data |
| `installer/vivarcdi/preferences.py` `PreferencesDocument` | Parses a `Preferences` file, reads and sets options and shortcuts, finds conflicts, writes atomically | Value object |
| `installer/vivarcdi/preferences.py` `ShortcutTable` | Loads the data file and resolves `{mod}` for a platform | Factory |
| `installer/vivarcdi/profiles.py` `ProfileLocator` | Finds `Preferences` files for stable and snapshot builds on macOS and Debian | Strategy per platform |
| `installer/vivarcdi/preferences_backup.py` `PreferencesBackupStore` | Saves timestamped copies, returns the newest | Repository |
| `installer/vivarcdi/running.py` `ProcessGuard` | Tells whether a Vivaldi process runs, through `CommandRunner` (`pgrep` on both systems) | Adapter |
| `installer/vivarcdi/commands.py` `ShortcutsCommand` | The `shortcuts apply`, `restore`, `status` actions | Command |
| `installer/vivarcdi/platforms.py` | `profile_roots()` and `modifier` on each Platform | Template method |
| `installer/vivarcdi/cli.py` | Parses the action, `--dry-run` and `uninstall --restore-shortcuts` | |

`ShortcutsCommand` has `needs_root = False` and `allows_root` is refused on both systems (FR-9).

## Vivaldi interface

Not touched: no selector, no `window.html` change. Profile folders:

| System | Root | Profiles |
|---|---|---|
| macOS | `~/Library/Application Support/Vivaldi`, `.../Vivaldi Snapshot` | every folder with a `Preferences` file |
| Debian | `~/.config/vivaldi`, `~/.config/vivaldi-snapshot` | the same |

## Configuration

None in `config.json`: the table is `shortcuts.json`, changed with a spec.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi rewrites `Preferences` on exit and drops the change | The command refuses while Vivaldi runs; AC-13 checks it on a real Vivaldi |
| Vivaldi ignores `"shortcuts": []` and brings back the default key | AC-13 checks the removed keys; the fallback is to delete the `shortcuts` key, as Tore's file shows |
| Vivaldi Sync overwrites the shortcuts from another device | The command prints a note after `apply` |
| Another Vivaldi build uses a different `Preferences` layout | An unexpected layout fails AC-10 and nothing is written |
| A crash during the write | Temporary file plus rename |
