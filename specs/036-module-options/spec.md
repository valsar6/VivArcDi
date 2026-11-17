# 036 Module options

| | |
|---|---|
| Status | Approved |
| Phase | 0 |
| Owner | Tore |
| Approved | Tore, 2026-11-17 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

`ModuleContext.options` is a `Record<string, unknown>`, and each of the ten modules with options reads
it in its own way. A wrong value is clamped by some modules, replaced by 100% by others, and passed
through unchecked by two of them, and no module logs it. This spec gives every module a declared
schema of its options, checked once at the boundary by the boot. The rule is convention over
configuration: the defaults are ours, chosen and tested, and a value that breaks the schema never
reaches a module. It falls back to the default and leaves a warning.

## User stories

- **US-1.** As a user who edits `config.json`, I want a mistake to leave the module looking and
  working as designed, so that a typo never breaks Vivaldi's interface.
- **US-2.** As a user or the maintainer, I want every ignored value to leave a warning in the console,
  so that I can see why my setting had no effect.
- **US-3.** As the maintainer, I want one place that states each option's type, default and allowed
  values, so that a module never has to check its options again.

## Expected behavior

With the `config.json` that VivArcDi ships, nothing changes: every module receives the same values as
today.

When a user changes `config.json`, each option is checked against its module's schema:

- A valid value reaches the module as written.
- A missing option gets its default.
- A value of the wrong type, out of its range, or not among its choices is discarded: the module
  receives the default, and the console shows one warning that names the module, the option, the
  discarded value and the default used.
- An option that the module does not declare is ignored with a warning, so a misspelled name
  (`toastMS` for `toastMs`) does not pass silently.
- An option without a sensible default is required. If it is missing or invalid, the module stays
  off and says so in the console, as `live-folders` already does without `githubClientId`.
- `enabled` must be `true` to start a module. Any other value keeps it off; a value that is not a
  boolean also leaves a warning.

**Why the default and not the nearest limit.** A value at the edge of a range is still a value nobody
chose: Peek at 100% covers the whole window, and a panel at its minimum size can hide its own
controls. The default is the only value that was designed and checked for every module, so an invalid
value never decides how VivArcDi looks.

### Today

| Handling | Where | A wrong value gives |
|---|---|---|
| Merged over the defaults, no check | `FavoritesGrid.ts:87`, `PinnedTabs.ts:44` | The wrong value, e.g. the string `"12"` |
| `Number(x) \|\| default`, then clamped | `CopyUrl.ts:87` | A numeric string is accepted; out of range is clamped |
| `Number(x) \|\| 100`, then clamped | `Peek.ts:102`, `LittleArcSettings.ts:30` | 100% for a non-number; out of range is clamped |
| `typeof number`, then clamped | `BookmarkFolders.ts:54`, `TodayArchive.ts:158`, `LiveFolders.ts:184`, `FolderPreview.ts:41` | The default for a non-number; out of range is clamped |
| Boolean `=== true` | `Peek.ts:104`, `LittleArcSettings.ts:32` | Off |
| Boolean `=== false` | `WorkspaceSync.ts:147` | On |
| Name lookup | `SidebarLook.ts:48` | The default palette, silently |
| `enabled` truthy | `ModuleRegistry.ts:72` | On for any truthy value, e.g. `"no"` |
| Another module's options, raw | `ReopenPinned.ts:74-78` | Reads `bookmark-folders` with its own checks |

No module logs a discarded value.

## Requirements

### Functional

- **FR-1.** Every module with options declares a schema: for each option its type (boolean, number,
  string, one of a list, or a map of strings), its default, and its allowed values (a range for
  numbers, a list for choices).
- **FR-2.** The boot checks each module's options against its schema before starting the module, and
  `ModuleContext.options` holds only the checked values, with every declared option present.
- **FR-3.** A value that does not fit its schema is replaced by the default and leaves one `warn`
  in the console, through the module's logger, naming the option, the discarded value and the
  default.
- **FR-4.** A value out of its range is replaced by the default, never by the nearest limit.
- **FR-5.** An option not declared by the schema is dropped and leaves one `warn`.
- **FR-6.** An option with no sensible default is declared required. If it is missing or invalid,
  the module does not start and leaves one `warn`.
- **FR-7.** A module starts only when its `enabled` is `true`. A non-boolean `enabled` leaves one
  `warn`.
- **FR-8.** `ModuleContext.modules` holds the checked options of every module, so a module that reads
  another module's options gets the same values that module gets.
- **FR-9.** Modules read their options from the checked values only and keep no checks of their own.

### Non-functional

- **NFR-1.** With the shipped `config.json`, every module receives the same values as today, and no
  warning is logged.
- **NFR-2.** The defaults equal the values in the shipped `config.json`. The ranges keep today's limits
  where a module has them; the design proposes ranges for the options that have none, for Tore's
  approval.
- **NFR-3.** Checking the options never stops VivArcDi: a broken option only affects its own module.
- **NFR-4.** Every existing test keeps its name. Tests that assert today's clamping change their
  expectation to the default, and the design lists them.
- **NFR-5.** The user manual documents the rule: an invalid value falls back to the default, and the
  console says why.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria) and verifiable one by one. `Check` says how:
`auto` names the test that proves it, `manual` is a step Tore performs on a real Vivaldi.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN an option has the declared type and an allowed value, THE boot SHALL hand that value to the module | auto: `valid option reaches the module unchanged` |
| AC-2 | WHEN an option is missing, THE boot SHALL hand the module its default | auto: `missing option gets its default` |
| AC-3 | IF an option has the wrong type, THEN THE boot SHALL hand the module the default and log a warning | auto: `option of the wrong type falls back to the default with a warning` |
| AC-4 | IF a number is out of its range, THEN THE boot SHALL hand the module the default, not the nearest limit, and log a warning | auto: `option out of range falls back to the default with a warning` |
| AC-5 | IF a choice is not among the allowed ones, THEN THE boot SHALL hand the module the default and log a warning | auto: `option outside its choices falls back to the default with a warning` |
| AC-6 | IF an option is not declared by the module, THEN THE boot SHALL drop it and log a warning | auto: `unknown option is dropped with a warning` |
| AC-7 | IF a required option is missing or invalid, THEN THE boot SHALL not start the module and log a warning | auto: `module without a required option stays off with a warning` |
| AC-8 | IF `enabled` is not `true`, THEN THE boot SHALL not start the module | auto: `module starts only when enabled is true` |
| AC-9 | WHEN a module reads another module's options, THE boot SHALL give it the checked values | auto: `other modules' options are checked too` |
| AC-10 | THE shipped `config.json` SHALL fit the schema of every registered module, with no warning | auto: `shipped config fits every module schema` |
| AC-11 | WHEN VivArcDi is installed with the shipped `config.json`, every enabled module SHALL behave as before and the console SHALL show no option warning | manual |
| AC-12 | WHEN `peek.widthPercent` is set to `500` and Vivaldi restarts, Peek SHALL open at its default width and the console SHALL show one warning for that option | manual |

## Out of scope

- Shortening the shipped `config.json` to the values that differ from the defaults (see
  [Open questions](#open-questions)).
- A settings panel inside Vivaldi.
- Options in the selectors, the stylesheets or the installer.
- Reading JSON kept in storage (spec 037).
- A toast for invalid options: the console is enough, toasts are kept for severe failures (spec 039).

## Open questions

- [x] **Branch and version.** Invalid values now fall back to the default instead of being clamped,
  and a truthy non-boolean `enabled` no longer starts a module. Decided: `fix/module-options`, with
  a patch version change, because the behavior changes for invalid configurations only.
- [x] **Shorter `config.json`.** Convention over configuration suggests shipping only `enabled` and the
  values that differ from the defaults, so a non-standard setting stands out. Decided: not in this
  spec. The manual documents each option through the shipped file; trimming it is a separate
  decision once the schemas exist.

## References

- Code review of 2026-11-12, point 3.
- [Convention over configuration](https://en.wikipedia.org/wiki/Convention_over_configuration).
- [000 Foundations](../000-foundations/spec.md): `config.json` and module enablement.
- [Architecture](../../docs/architecture.md)
