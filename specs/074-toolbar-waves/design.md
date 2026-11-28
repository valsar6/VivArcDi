# 074 Toolbar waves: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

Five small pieces in a new module, `toolbar-waves`, and one change of style.

**A catalog of the four waves.** `WaveCatalog` (`src/modules/toolbarwaves/WaveCatalog.ts`) is the one
table of ids, names, icons and lists (NFR-1). The button ids are constants of `ToolbarButtons`
beside it. Nothing else names a button.

**A preference writer.** `BrowserPrefs` gains `set(key, value)`, which calls
`prefs.set({ path: key, value })`, the only signature Vivaldi accepts, and returns at once (FR-2).
`PrefsApi` gains an optional `set`, and `BrowserPrefs.canSet` tells whether it exists.

**A controller that owns the rules.** `WaveController` reads the pair of lists, decides the current
wave, chooses a wave (backup, confirmation, write, record) and follows changes. It is the service
the page of [075](../075-settings-page/spec.md) calls (FR-10).

**A store for the backup and the choice.** `WaveStore` keeps `{ wave, backup }` under one versioned
key, through `StoredFormat` like the other stores (037, NFR-2).

**A marker.** `WaveMarker` writes `data-vivarcdi-wave` on `body` (FR-13) and removes it.

**A style change.** `sidebar-look.scss` hides `NewTab`, the flexible spacers and the empty nested row
only while `body` has no `data-vivarcdi-wave` (FR-12).

```text
075 page ──▶ WaveController ──▶ WaveCatalog (lists, names, icons)
                 │   │   └────▶ WaveStore ──▶ ModuleContext.storage (vivarcdi.toolbar-waves)
                 │   └────────▶ WaveMarker ──▶ body[data-vivarcdi-wave]
                 └────────────▶ BrowserPrefs.get / set / onChange (two toolbar lists)
sidebar-look.scss ◀── body:not([data-vivarcdi-wave]) hides NewTab and spacers
```

### Rejected alternatives

- **One list preference per wave, switched by Vivaldi**: Vivaldi has no such preference; the two lists
  are the whole state.
- **Hiding the unwanted buttons with CSS instead of writing the lists**: the lists are what the
  user sees in Vivaldi's own editor, and what syncs.
- **Resetting the lists to `store: "default"` for Still water**: no API does it (measured); Still
  water writes values.
- **A `Spacer` only to push the strip down**: measured, it has no effect against an empty list; it
  stays only as Tore's choice (Q-3).

## Measured

From the spike of 2026-11-28 (lab Vivaldi 8.3.4191.47); the code relies on these and the live
scenarios keep them true:

- `vivaldi.prefs.set({ path, value })` is synchronous and has no callback.
- `onChanged(path, { store, value, defaultValue })` fires once per write, 0.8 ms later; the DOM
  settles in under 150 ms, without a reload.
- An empty list is accepted and read back as `[]`; `[]` and `["Spacer"]` for `tabbar_before` both
  leave a 6 px strip.
- The preferences file on disk is updated in 1 to 2 s; `store` stays `"user"` after the defaults are
  written back.
- Each toolbar is a flex column; `WorkspaceButton` and `NewTab` are full-width rows; the small
  buttons form a horizontal `.tabbar-nested-buttons` group; a large button breaks the group.
- Not measured: persistence after a restart (AC-21).

## Components

### Preferences (`src/core/browser/BrowserPrefs.ts`, changed)

```ts
export interface PrefsApi {
  get: (key: string, callback: (result: { value?: unknown } | undefined) => void) => void;
  set?: (change: { path: string; value: unknown }) => void;
  onChanged?: { addListener(...): void; removeListener(...): void } | undefined;
}

export class BrowserPrefs {
  public get canSet(): boolean;
  public set(key: string, value: unknown): void;
}
```

- `set` throws only when the preferences are not available or have no `set`; the module checks
  `canSet` first (FR-9). The JSDoc of the class stops saying "no method that writes".
- `onChange(key, listener)` already exists and is used for both lists.

### Catalog (`src/modules/toolbarwaves/`)

```ts
export type WaveId = 'still-water' | 'ripple' | 'swell' | 'breaking-wave';

export interface ToolbarLists {
  readonly before: readonly string[];
  readonly after: readonly string[];
}

export interface PreviewRow {
  readonly kind: 'row' | 'group' | 'spacer';
  readonly width: 'full' | 'fit';
  readonly items: number;
}

export interface PreviewShape {
  readonly rows: readonly PreviewRow[];
}

export interface Wave {
  readonly id: WaveId;
  readonly name: string;
  readonly italianName: string;
  readonly icon: string;
  readonly preview: PreviewShape;
  readonly lists: ToolbarLists | null;
}

export type WaveData = Omit<Wave, 'lists'>;

export class WaveCatalog {
  public static readonly defaults: ToolbarLists;
  public static all(): readonly Wave[];
  public static byId(id: WaveId): Wave;
  public static match(lists: ToolbarLists): WaveId | null;
}
```

- `lists` is null for Still water: its lists are the backup, else `defaults`.
- The four lists are the table of the spec; `defaults` are `["WorkspaceButton"]` and
  `["NewTab", "FlexibleSpacer", "TabButton"]`.
- `match` compares both lists in order and returns the preset's id, or null (Still water is never
  matched by lists; it is a stored choice).
- `WaveData` is what the service serves: plain JSON, with no function and no DOM node, because the
  page of 075 receives it in `chrome.runtime` messages (AC-23). `all()` returns `Wave`; the service
  maps it to `WaveData`.
- `preview.rows` follow the measured structure: `row` with `full` width for `WorkspaceButton` and
  `NewTab`, `group` with `fit` width for the small buttons that Vivaldi groups, `spacer` for a
  flexible spacer alone (vertical); `items` counts the buttons of a group. Rows list the top toolbar,
  then the bottom one; the tab strip is not a row (see Risks). The four previews:

| Wave | Rows |
|---|---|
| Still water | `row full 1`, `row full 1`, `group fit 2` (Vivaldi's defaults, not the user's lists) |
| Ripple | `row full 1`, `group fit 3` |
| Swell | `row full 1`, `group fit 2`, `group fit 3`, `row full 1` |
| Breaking wave | `group fit 1`, `group fit 3`, `row full 1`, `spacer full 1`, `row full 1` |

- Icons are in `WaveIcons.ts`: four SVG strings, `viewBox="0 0 16 16"`, `fill="none"`,
  `stroke="currentColor"`, no other color. Each is `[the approved drawing]` of the spec.

### Store (`WaveStore.ts`)

```ts
export interface WaveState {
  wave: WaveId | null;
  backup: ToolbarLists | null;
}

export class WaveStore {
  constructor(storage: ModuleContext['storage']);
  public read(): WaveState;
  public save(state: WaveState): Promise<SaveOutcome>;
}
```

- Key `vivarcdi.toolbar-waves`, format version 1: `{ wave, backup }`; a wrong shape is rejected and
  reads as the empty state, as in 037.
- The module keeps `privateWindows = 'never'` (FR-11); the lists are profile-wide.

### Controller (`WaveController.ts`)

```ts
export interface WaveChoice {
  readonly confirmed: boolean;
}

export class WaveController {
  constructor(prefs: BrowserPrefs, store: WaveStore, marker: WaveMarker, logger: Logger);
  public async start(): Promise<void>;
  public stop(): void;
  public current(): WaveId | null;
  public needsConfirmation(): boolean;
  public async choose(id: WaveId, choice: WaveChoice): Promise<void>;
  public onChange(listener: (current: WaveId | null) => void): () => void;
}
```

- `start` reads both lists and the stored state, sets `current` to the stored wave when the lists
  still agree with it, else to `WaveCatalog.match(lists)`, else null (AC-2); applies the marker;
  follows both preferences. It writes nothing (NFR-4).
- A stored wave of a preset whose lists the user has since edited is dropped on start (FR-7).
- `needsConfirmation` is true when the lists equal no preset and not the defaults (FR-8, AC-9).
  `choose` throws when it is true and `choice.confirmed` is false.
- `choose(id)`:
  1. When the current wave is null or Still water and `id` is a preset, store the current lists as
     the backup (FR-4); never overwrite a backup while a preset wave is chosen (AC-5).
  2. Resolve the lists: the preset's, or for Still water the backup, else `defaults` (FR-6).
  3. Write `before`, then `after`, through `BrowserPrefs.set`.
  4. Save `{ wave: id, backup }`, set the marker, tell the listeners.
- Following: on a change of either list, compare the pair with the chosen preset. Still water is
  never compared. When it no longer equals the preset, save `{ wave: null, backup }`, remove the
  marker and tell the listeners; never write (FR-7). A change that the controller wrote itself is
  ignored by comparing it with the pair it just wrote.
- A write whose `onChanged` echo arrives with the expected pair keeps the current wave.

### Marker (`WaveMarker.ts`)

`apply(id: WaveId | null)` sets `data-vivarcdi-wave` on `body`, or removes it for null; `remove()`
removes it. A `MutationObserver` is not needed: Vivaldi does not replace `body`.

### Module (`ToolbarWaves.ts`)

```ts
export class ToolbarWaves extends Module<ToolbarWavesOptions> {
  public static override id = 'toolbar-waves';
  public static override options = TOOLBAR_WAVES_OPTIONS;
}
```

- Options: `wave`, a choice of `none` plus the four ids, default `none` (the initial wave). With
  `none` nothing is written (NFR-4); a wave in the option is chosen only when no wave is stored.
- `start` checks `prefs.canSet` and that both lists read as arrays; if not it logs one warning
  `the toolbar waves are off: Vivaldi has no writable toolbar lists` and returns (FR-9, AC-10),
  leaving the service unpublished so that the 075 page hides the section.
- `choose` rejects with an `Error` whose `message` is readable (`needs a confirmation`, `the toolbar
  lists could not be written`), never a bare object (AC-24).
- `start` publishes the controller and the catalog as `globalThis[Symbol.for('vivarcdi.waves')]`,
  an object `{ waves, current, needsConfirmation, choose, onChange }`; `stop` removes it and the
  marker. This is the contract for [075](../075-settings-page/spec.md); the key is also what the
  live scenarios use.
- Registered in `src/modules/index.ts`; `config.json` gains `"toolbar-waves": { "enabled": true,
  "wave": "none" }` (Q-7). `privateWindows` stays `never` (AC-11).

### Selectors (`src/selectors/8.1.json`)

Four keys, read through `context.selectors`: `toolbarBefore` (`.toolbar-tabbar-before`),
`toolbarAfter` (`.toolbar-tabbar-after`), `nestedButtons` (`.tabbar-nested-buttons`) and
`trashButton`, the button of Schede chiuse (`TabsTrash`), which [076](../076-compact-breaking-wave/spec.md)
needs. The spikes found every toolbar button through `[data-name]` (the attribute holds the button id,
for example `TabsTrash`), under the two toolbar classes. That gives `trashButton` as
`:is(.toolbar-tabbar-before, .toolbar-tabbar-after) [data-name="TabsTrash"]`; the spike data does not
say whether the attribute sits on the button itself or on a wrapper, so T6 reads it on the lab and
a selector-states entry proves it (below). It is not guessed beyond that.

**Selector states.** `tests/live/selector-states.json` needs no entry for `toolbarBefore`,
`toolbarAfter` and `nestedButtons`: Vivaldi's default lists put `WorkspaceButton`, `NewTab`,
`FlexibleSpacer` and `TabButton` there, so the three resolve in the default state. `trashButton`
needs an entry: `TabsTrash` is in no default list. T6 adds a state `toolbar-trash` in
`scripts/live/checks/SelectorStates.ts` (`enter` writes the Ripple lists with `vivaldi.prefs.set` and
waits for the element, `leave` writes Vivaldi's defaults) and the entry
`"trashButton": "toolbar-trash"`. Its assertion is that the selector resolves to exactly one visible
button whose `data-name` is `TabsTrash`.

### Sidebar look (`src/styles/sidebar-look.scss`, changed)

The two rules at lines 37-43 gain a guard:

```scss
body:not([data-vivarcdi-wave]) #{$tab-bar} :is(.button-toolbar.newtab, .button-toolbar.toolbar-spacer-flexible) {
  display: none !important;
}

body:not([data-vivarcdi-wave]) #{$tab-bar} .tabbar-nested-buttons:not(:has(.button-toolbar:not(.toolbar-spacer, .toolbar-spacer-flexible))) {
  display: none !important;
}
```

- With no wave chosen the look is as today (Q-9). With a wave chosen, Swell and Breaking wave show
  both the "+ New Tab" row of 028 and the `NewTab` button.
- The nested-row rule would hide a group of only flexible spacers, which is a part of Swell and
  Breaking wave; the guard keeps it visible while a wave is chosen.
- 028 gets a "Refined by" line and a note under FR-6 (task T8).

## Tests

| AC | Test | File |
|---|---|---|
| AC-1 | `writes a preference and resolves` | `tests/core/browser/BrowserPrefs.test.ts` |
| AC-2 | `shows the wave the lists already equal` | `tests/modules/toolbarwaves/WaveController.test.ts` |
| AC-3 | `writes the lists of the chosen wave` | same |
| AC-4 | `stores the user's lists before the first write` | same |
| AC-5 | `keeps the first backup when waves change` | same |
| AC-6 | `still water writes the stored lists` | same |
| AC-7 | `still water writes the defaults without a backup` | same |
| AC-8 | `drops the choice after a manual edit` | same |
| AC-9 | `asks before replacing custom lists` | same |
| AC-10 | `does not start without writable toolbar lists` | `tests/modules/toolbarwaves/ToolbarWaves.test.ts` |
| AC-11 | `stays out of private windows` | same |
| AC-12 | `exposes the four waves and a service to choose one` | same |
| AC-13 | `draws the four wave icons with currentColor` | `tests/modules/toolbarwaves/WaveIcons.test.ts` |
| AC-14 | `lets an active wave keep the new-tab button, spacers and nested row` | `tests/styles/sidebar-look-waves.test.ts` |
| AC-22 | `marks the body with the chosen wave` | `tests/modules/toolbarwaves/WaveMarker.test.ts` |
| AC-23 | `serves the waves with a JSON-safe preview` | `tests/modules/toolbarwaves/WaveCatalog.test.ts` |
| AC-24 | `reports a failed choice with a readable message` | `tests/modules/toolbarwaves/WaveController.test.ts` |

| AC | Scenario | File |
|---|---|---|
| AC-15 | `the ripple wave puts the buttons above the strip` | `tests/live/scenarios/` |
| AC-16 | `the swell wave splits the buttons around the strip` | same |
| AC-17 | `the breaking wave puts every button below the strip` | same |
| AC-18 | `a written toolbar list shows without a reload` | same |
| AC-19 | `still water restores the toolbar` | same |

AC-20 and AC-21 are manual. Fakes: a `FakePrefs` with `get`, `set` and `onChanged` that records
writes and fires changes, in `tests/modules/toolbarwaves/fakes.ts`.

## Risks

- **Restart persistence is not proven** (AC-21). If the lists do not survive a restart, the spec
  returns to Q-5.
- **`onChanged` and manual edits.** The controller must tell its own write from the user's: it
  compares the pair with the one it wrote. A sync of the lists from another computer looks like a
  manual edit and drops the choice (FR-7), as the spec accepts.
- **Private windows.** The module does not start there (AC-11); the lists are profile-wide, so a
  private window still shows the wave chosen in a normal one.
- **A Vivaldi without these preferences or without `set`.** The module logs one warning and does not
  start (Q-4); the 075 page finds no service and omits the section.
- **The tab strip in the preview.** The shape agreed with 075 is a flat list of rows, without a mark
  for the tab strip. The page can place it after the rows of the top toolbar only if it knows how many
  they are; if 075 needs the split, a `before` count is added to `PreviewShape` by agreement between
  the two specs.
- **Looks.** The compact Breaking wave of [076](../076-compact-breaking-wave/spec.md) reads
  `data-vivarcdi-wave`; its rules must not assume the order of the buttons beyond the lists above.
- **The 028 row and the button** both show with Swell and Breaking wave (Q-9); Tore judges the look.
