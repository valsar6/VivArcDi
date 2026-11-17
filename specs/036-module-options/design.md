# 036 Module options: design

| | |
|---|---|
| Status | Approved |
| Approved | Tore, 2026-11-17 |
| Spec | [spec.md](spec.md) |

Written only after the spec is `Approved`. It says **how**; the spec says **what**.

## Approach

Each module declares its options once, as a schema built from small option kinds. The boot runs every
module's schema over its section of `config.json` before any module starts, logs what it discards
through that module's logger, and hands the module typed, complete values. Modules lose their own
`settingsFrom`, `#number`, `#minutes` and `defaults` code and read `context.options` as it is.

The option kinds are a Strategy: each one knows its default and whether a value is acceptable, and the
schema walks them without knowing which kind it holds. The schema is the only place that knows a
module's defaults, so the shipped `config.json` is checked against it by a test.

Rejected alternatives:

- **Each module checks its options in `start`.** Fewer changes to the boot, but `context.modules`
  (FR-8) would stay raw, and every module would still have to remember to call the check.
- **A JSON Schema file per module, validated by a library.** A runtime dependency in the payload and a
  second language for something five option kinds cover.
- **Clamp numbers to the range, as several modules do today.** Rejected by the spec (FR-4).

## Components

### Option kinds (`src/core/boot/options/`)

| Class | Accepts | Notes |
|---|---|---|
| `BooleanOption` | `true` or `false` | |
| `NumberOption` | A finite number from `min` to `max`, both included | No numeric strings: `"3000"` is discarded |
| `TextOption` | A string; with `nonEmpty`, one with text after trimming | The value is trimmed |
| `ChoiceOption` | One of a fixed list of strings | |
| `TextMapOption` | An object whose values are all strings | One wrong entry discards the whole map, as 010/AC-8 does today |

Every kind extends `Option<T>`, which holds the default (or `required`) and offers
`accept(value: unknown): value is T` and `describe(): string` for the warning, for example
`a number from 40 to 100`.

### `OptionSchema<T>` (`src/core/boot/options/OptionSchema.ts`)

```ts
export const PEEK_OPTIONS = OptionSchema.of({
  shiftClick: Option.boolean(true),
  widthPercent: Option.number(90, { min: 40, max: 100 }),
});
export type PeekOptions = OptionValues<typeof PEEK_OPTIONS>;
```

- `OptionSchema.of(kinds)` builds the schema; `OptionValues<S>` infers the value type, so a module
  never writes its options type by hand.
- `check(raw, logger): T | null` returns the complete values, or `null` when a required option is
  missing or invalid. It logs one `warn` per discarded value, per unknown key and per missing required
  option. The key `enabled` belongs to the registry and is skipped without a warning.
- `defaults` returns the values a module gets with an empty section; the tests use it.
- `OptionSchema.none` is the empty schema of a module without options.

Warning texts, through the module's child logger (so the line already names the module):

- `option "widthPercent" is 500, not a number from 40 to 100: using 90`
- `option "toastMS" is not known: ignored`
- `option "githubClientId" is required and missing: the module stays off`
- `"enabled" is "yes", not true or false: the module stays off`

### Module and context (`src/core/boot/Module.ts`)

- `Module<O extends object = Record<string, never>>` gains `public static options: OptionSchema<object> =
  OptionSchema.none`, overridden like `id`.
- `ModuleContext<O>` types `options: Readonly<O>`. `modules` becomes
  `Readonly<Record<string, Readonly<Record<string, unknown>>>>` holding checked values (FR-8).
- `ModuleOptions` in `types.ts` stays the raw shape of `config.json`.

### Boot (`ModuleRegistry.ts`, `VivArcDi.ts`)

- `ModuleRegistry.createEnabled` starts a module only when `enabled === true`, and returns the ids
  whose `enabled` is not a boolean next to the unknown ones.
- `VivArcDi.start` checks the options of every module named in `config.json` that the registry knows,
  enabled or not, before starting any. The checked map feeds `context.modules`; an enabled module
  whose check returns `null` is not started.
- Checking happens once per window, so each window's console shows the same warnings.

### Modules

Each module with options gets a sibling `<Name>Options.ts` with its schema and type, and drops its own
checks. The defaults equal the shipped `config.json` (NFR-2).

| Module | Options (default, allowed) | Removed |
|---|---|---|
| `favorites-grid` | `folder` (`Favorites`, non-empty text); `maxTiles` (12, **1–48**); `maxColumns` (3, **1–6**); `tileMinWidth` (64, **40–200**); `tileHeight` (44, **32–96**); `gap` (8, **0–24**); `unloadOnMiddleClick` (true) | `defaults`, the spread at `FavoritesGrid.ts:87` |
| `peek` | `shiftClick` (true), `pinnedCrossSite` (true), `anyCrossSite` (false), `pinnedNewTab` (true), `anyNewTab` (false); `widthPercent` (90, 40–100); `heightPercent` (94, 40–100) | `defaults`, `settingsFrom` |
| `bookmark-folders` | `root` ('', text); `workspaces` ({}, map of texts); `workspacesBase` (`VivArcDi`, non-empty text); `maxDepth` (3, 1–10); `maxHeightPercent` (60, 20–100) | `#number`; the `typeof` checks in `WorkspaceRoots` |
| `live-folders` | `refreshMinutes` (5, 1–**60**); `githubClientId` (required, non-empty text) | `#minutes`, `#clientId` |
| `folder-preview` | `hoverDelayMs` (400, 100–2000) | the inline clamp |
| `pinned-tabs` | `resetButton` (true), `unloadOnClose` (true) | `defaults`, the spread at `PinnedTabs.ts:44` |
| `today-archive` | `archiveAfterHours` (12, 1–720); `archiveLimit` (500, 50–5000) | `#number` |
| `copy-url` | `toastMs` (2000, 500–10000) | `defaults`, `settingsFrom` |
| `little-arc` | `commandBar` (true), `externalLinks` (true), `askWorkspace` (false); `idleCloseHours` (6, 0–**168**, 0 turns the timer off); `widthPercent` (34, 20–100); `heightPercent` (60, 20–100) | `LITTLE_ARC_DEFAULTS`, `settingsFrom` |
| `sidebar-look` | `palette` (`arclight`, one of the palette names) | the `??` at `SidebarLook.ts:48` |
| `workspace-sync` | `folder` (`VivArcDi Sync`, non-empty text); `renameFromOtherComputers` (true) | `defaults`, `#folderOf`, `#renamerOf`'s check |

Ranges in **bold** are new, because those options have none today; they need Tore's approval
(NFR-2). They are chosen so the sidebar stays usable at both ends: for example, more than 6 columns of
64 px tiles do not fit a normal sidebar, and a gap above 24 px leaves room for fewer tiles than
`maxTiles`.

`reopen-pinned` reads `context.modules['bookmark-folders'].root` without its own `typeof` check, and
keeps `folders.enabled === false` as it is.

`Palettes.byName` keeps its fallback, because other callers use it; `Palettes.names` is added for the
`ChoiceOption`.

## Configuration

`config.json` does not change. `docs/manual/getting-started.md` gains a short paragraph: what happens
to a wrong value, and where the warning appears (`vivaldi://inspect/#apps`, `window.html`, console).

## Tests

New, in `tests/core/boot/options/`, named after the `auto:` checks:

| AC | Test file |
|---|---|
| AC-1 to AC-7 | `OptionSchema.test.ts` |
| AC-8, AC-9 | `ModuleRegistry.test.ts`, `VivArcDi.test.ts` |
| AC-10 | `ShippedConfig.test.ts`: every module in `src/config.json` against its schema, with a recording logger that must stay empty |

Existing tests that change their body but keep their name (NFR-4):

| Test | Change |
|---|---|
| `copy settings keep the toast between half a second and ten seconds` | Through `COPY_URL_OPTIONS.check`; 100 and 60000 now give 2000 |
| `peek settings keep sizes between 40 and 100 percent` | Through `PEEK_OPTIONS.check`; 10 and 300 now give 90 and 94 |
| `settings are read with defaults and clamped sizes` | Through `LITTLE_ARC_OPTIONS.check`; −3, 5 and 500 now give 6, 34 and 60 |
| `little arc settings read the commandBar option` | `'no'` now gives the default `true` |
| `clamps archiveAfterHours to at least one hour` | Starts the module with checked options; 0 now gives 12 hours, so the tab still stays |
| `ignores an invalid workspaces option` (010/AC-8) | Checks `BOOKMARK_FOLDERS_OPTIONS`: same inputs, the map falls back to `{}` with one warning |
| `does not log when the option workspaces is absent` | Same, through the schema |
| `uses the palette chosen in the options and falls back to arclight for an unknown one` | The fallback part goes through the schema |
| Tests that read `FavoritesGrid.defaults` or `WorkspaceSync.defaults` | Read the schema's `defaults` |

Two of these names describe clamping, which this spec removes:
`settings are read with defaults and clamped sizes` and `clamps archiveAfterHours to at least one
hour`. See [Open questions](#open-questions).

Module tests that call `start` with a hand-made context keep passing valid values and need no change.
`FolderPreview.test.ts` passes `hoverDelayMs: 50`, which today is clamped to 100. With checked options
the module uses what it receives, so the test keeps working, now with a 50 ms delay.

## Risks

- **A user's `config.json` that relied on clamping.** For example `"widthPercent": 120` used to give
  100% and now gives 90%. The warning says so, and this is the behavior the spec asks for.
- **A non-boolean `enabled`.** A module enabled with `"enabled": 1` stops starting. The warning names
  it.
- **The generic `Module<O>`.** The registry holds module classes of different option types. Methods
  are checked bivariantly in TypeScript, so `Module<PeekOptions>` fits where `Module<object>` is
  expected without `any`; this must be confirmed in the first task before the modules move.

## Open questions

- [x] **New ranges.** Decided: the ranges in bold in the modules table, as proposed.
- [x] **Tests named after clamping.** NFR-4 keeps every name, but two names would then describe
  behavior that no longer exists. Decided: rename only those two, to
  `settings are read with defaults and sizes in range` and
  `archiveAfterHours below one hour falls back to the default`, as a stated exception to NFR-4. No
  spec uses them as an `auto:` check.
