# 074 Toolbar waves: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

Six small pieces in a new module, `toolbar-waves`, and one change of style.

**One strategy per wave, built by a factory.** A wave is a Strategy: the abstract `WaveStrategy`
(`src/modules/toolbarwaves/WaveStrategy.ts`) holds what every wave has (id, names, icon, preview) and
the one thing that differs, the lists it writes. `StillWaterWave`, `RippleWave`, `SwellWave` and
`BreakingWave` implement it. `WaveFactory` builds them and returns them in the order Still water,
Ripple, Swell, Breaking wave. Adding a wave is one class and one line in the factory; `WaveController`
never switches on an id (Open/Closed). The button ids are constants of `ToolbarButtons` beside them
(NFR-1); nothing else names a button.

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
075 page ──▶ WaveController ──▶ WaveFactory ──▶ WaveStrategy x4 (lists, names, icons)
                 │   │   └────▶ WaveStore ──▶ ModuleContext.storage (vivarcdi.toolbar-waves)
                 │   └────────▶ WaveMarker ──▶ body[data-vivarcdi-wave]
                 └────────────▶ BrowserPrefs.get / set / onChange (two toolbar lists)
sidebar-look.scss ◀── :not(body[data-vivarcdi-wave] *) guard on the NewTab and spacer rules
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

- `set` is synchronous, like Vivaldi's call, and throws only when the preferences are not available
  or have no `set`; the module checks `canSet` first (FR-9), and `WaveController.choose` catches the
  error and fails with a readable message (AC-24), so `choose` never throws. The JSDoc of the class stops saying "no method that writes".
- `onChange(key, listener)` already exists and is used for both lists.

### Waves (`src/modules/toolbarwaves/`)

```ts
export type WaveId = 'still-water' | 'ripple' | 'swell' | 'breaking-wave';

export interface ToolbarLists {
  readonly before: readonly string[];
  readonly after: readonly string[];
}

export interface WaveContext {
  readonly backup: ToolbarLists | null;
  readonly defaults: ToolbarLists;
}

export abstract class WaveStrategy {
  public abstract readonly id: WaveId;
  public abstract readonly name: string;
  public abstract readonly italianName: string;
  public abstract readonly icon: string;
  public abstract readonly preview: PreviewShape;
  public abstract lists(context: WaveContext): ToolbarLists;
  public abstract get replacesUserLists(): boolean;
  public matches(lists: ToolbarLists): boolean;
}

export class WaveFactory {
  constructor(defaults: ToolbarLists);
  public all(): readonly WaveStrategy[];
  public byId(id: WaveId): WaveStrategy;
  public matching(lists: ToolbarLists): WaveStrategy | null;
  public get context(): Pick<WaveContext, 'defaults'>;
}

export interface WaveData {
  readonly id: WaveId;
  readonly name: string;
  readonly italianName: string;
  readonly icon: string;
  readonly preview: PreviewShape;
}

export class WaveDataMapper {
  public toData(wave: WaveStrategy): WaveData;
}
```

- `lists(context)` of a preset ignores the context and returns its fixed table of the spec;
  `StillWaterWave.lists` returns `context.backup`, else `context.defaults` (FR-6). `defaults` are
  `["WorkspaceButton"]` and `["NewTab", "FlexibleSpacer", "TabButton"]`, a constant in
  `ToolbarButtons.ts` passed to the factory, so there is no static state.
- `replacesUserLists` is true for the three presets and false for Still water; the controller backs
  up the user's lists when it goes from a wave that does not replace them to one that does (FR-4).
- `matches(lists)` compares both lists in order with the wave's own table; Still water never matches
  (it is a stored choice, not a pair of lists). `WaveFactory.matching` returns the first matching
  strategy, or null.
- The factory holds one array of builders, in display order; it is the only registration point.
- `WaveData` is what the service serves: plain JSON, no function and no DOM node, because the page of
  075 receives it in `chrome.runtime` messages (AC-23). `WaveDataMapper.toData` is the one mapper from
  a strategy to `WaveData`; the shape and the service contract are as 075 expects.
- `PreviewRow` and `PreviewShape` are as follows, and are the ones 075 draws:

```ts
export interface PreviewRow {
  readonly kind: 'row' | 'group' | 'spacer';
  readonly width: 'full' | 'fit';
  readonly items: number;
}

export interface PreviewShape {
  readonly before: readonly PreviewRow[];
  readonly after: readonly PreviewRow[];
}
```

- `preview.before` and `preview.after` are the rows above and below the tab strip
  (`tabbar_before` and `tabbar_after`), each in the order of its toolbar, and follow the measured
  structure: `row` with `full` width for `WorkspaceButton` and `NewTab`, `group` with `fit` width for
  the small buttons that Vivaldi groups, `spacer` for a flexible spacer alone (vertical); `items`
  counts the buttons of a group. The tab strip is not drawn by the data; the page puts it between the
  two lists. The four previews:

| Wave | `before` | `after` |
|---|---|---|
| Still water | `row full 1` | `row full 1`, `group fit 2` (Vivaldi's defaults, not the user's lists) |
| Ripple | `row full 1`, `group fit 3` | none |
| Swell | `row full 1`, `group fit 2` | `group fit 3`, `row full 1` |
| Breaking wave | `group fit 1` | `group fit 3`, `row full 1`, `spacer full 1`, `row full 1` |

- Icons are in `WaveIcons.ts`: four SVG strings, `viewBox="0 0 16 16"`, `fill="none"`,
  `stroke="currentColor"`, no other color; each strategy takes its own.

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
  constructor(prefs: BrowserPrefs, store: WaveStore, marker: WaveMarker, waves: WaveFactory, logger: Logger);
  public async start(): Promise<void>;
  public stop(): void;
  public current(): WaveId | null;
  public needsConfirmation(): boolean;
  public async choose(id: WaveId, choice: WaveChoice): Promise<void>;
  public onChange(listener: (current: WaveId | null) => void): () => void;
}
```

- `start` reads both lists and the stored state, sets `current` to the stored wave when the lists
  still agree with it, else to `waves.matching(lists)`, else null (AC-2); applies the marker;
  follows both preferences. It writes nothing (NFR-4).
- A stored wave of a preset whose lists the user has since edited is dropped on start (FR-7).
- `needsConfirmation` is true when the lists equal no preset and not the defaults (FR-8, AC-9).
  `choose` throws when it is true and `choice.confirmed` is false.
- The controller works only against `WaveStrategy`; no line of it names a wave id.
- `choose(id)`:
  1. Take the strategy from the factory. When the current wave is null or does not replace the user's
     lists, and the chosen one does, store the current lists as the backup (FR-4); never overwrite a
     backup while a wave that replaces them is chosen (AC-5).
  2. Ask the strategy for its lists with the context `{ backup, defaults }` (FR-6).
  3. Write `before`, then `after`, through `BrowserPrefs.set`.
  4. Save `{ wave: id, backup }`, set the marker, tell the listeners.
- Following: on a change of either list, compare the pair with the chosen preset. Still water is
  never compared. When it no longer equals the preset, save `{ wave: null, backup }`, remove the
  marker and tell the listeners; never write (FR-7). A change that the controller wrote itself is
  ignored by comparing it with the pair it just wrote.
- **A raw write never adopts a wave.** Only `choose` sets the wave and the marker. A list written
  by anything else (`vivaldi.prefs.set` from a script, Vivaldi's editor, a sync) can only drop a
  chosen preset (FR-7); it never makes one current, so the 028 look stays as it is and the live
  scenarios of AC-15 to AC-17 choose through the service. `start` is the one place that reads a wave
  from the lists (AC-2).
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
- `start` publishes the controller and the waves as `globalThis[Symbol.for('vivarcdi.waves')]`,
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

The look mark `[data-vivarcdi-look]` is on `#browser`, which sits inside `body`, so a selector that
starts with `body` cannot match under it, and the test `sidebar look rules all sit under the look
mark` needs every selector to start with `#browser[data-vivarcdi-look]`. The two rules at lines 37-43
stay inside the `#{$look}` block and gain the guard at the end of their last compound:

```scss
#{$tab-bar} :is(.button-toolbar.newtab, .button-toolbar.toolbar-spacer-flexible):not(body[data-vivarcdi-wave] *) {
  display: none !important;
}

#{$tab-bar} .tabbar-nested-buttons:not(:has(.button-toolbar:not(.toolbar-spacer, .toolbar-spacer-flexible))):not(body[data-vivarcdi-wave] *) {
  display: none !important;
}
```

`:not(body[data-vivarcdi-wave] *)` uses a complex selector inside `:not`, which Chromium supports (and
Vivaldi runs Chromium); the compiled selector keeps its `#browser[data-vivarcdi-look]` start and the
marker stays on `body`.

- With no wave chosen the look is as today (Q-9). With a wave chosen, Swell and Breaking wave show
  both the "+ New Tab" row of 028 and the `NewTab` button.
- The nested-row rule would hide a group of only flexible spacers, which is a part of Swell and
  Breaking wave; the guard keeps it visible while a wave is chosen.
- 028 gets a "Refined by" line and a note under FR-6 (task T8).

## Names the tests rely on

The T2 tests import these; T3 to T6 keep them:

- `ToolbarWavesOptions.ts` exports `TOOLBAR_WAVES_OPTIONS` and the type `ToolbarWavesOptions`.
- `WaveIcons.ts` exports `WAVE_ICONS: Record<WaveId, string>`.
- `new WaveMarker(document)`, `new WaveStore(storage)`; the four strategies are built with no
  constructor arguments.
- `WaveStrategy.ts` exports `PreviewRow`, `PreviewShape`, `WaveContext`, `ToolbarLists`, `WaveId`.
- `WaveDataMapper.ts` exports `WaveData`; `WaveController.ts` exports `WaveChoice`.
- The published service has `waves` (a `WaveData[]`), `current`, `needsConfirmation`,
  `choose(id, { confirmed })` and `onChange`.
- The message of a choice that needs a confirmation contains the word "confirmation".

## Tests

| AC | Test | File |
|---|---|---|
| AC-1 | `writes a preference through the api` | `tests/core/browser/BrowserPrefs.test.ts` |
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
| AC-23 | `serves the waves with a JSON-safe preview` | `tests/modules/toolbarwaves/WaveDataMapper.test.ts` |
| AC-25 | `each wave gives the lists of its table` | `tests/modules/toolbarwaves/WaveStrategies.test.ts` (one case per `StillWaterWave`, `RippleWave`, `SwellWave`, `BreakingWave`) |
| AC-26 | `builds the four waves in order` | `tests/modules/toolbarwaves/WaveFactory.test.ts` |
| AC-27 | `chooses a wave it has no special case for` | `tests/modules/toolbarwaves/WaveController.test.ts` (with a fake strategy) |
| AC-24 | `reports a failed choice with a readable message` | `tests/modules/toolbarwaves/WaveController.test.ts` |

| AC | Scenario | File |
|---|---|---|
| AC-15 | `the ripple wave puts the buttons above the strip` (chooses through the service) | `tests/live/scenarios/` |
| AC-16 | `the swell wave splits the buttons around the strip` (same) | same |
| AC-17 | `the breaking wave puts every button below the strip` (same) | same |
| AC-18 | `a written toolbar list shows without a reload` (raw `vivaldi.prefs.set`) | same |
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
- **Looks.** The compact Breaking wave of [076](../076-compact-breaking-wave/spec.md) reads
  `data-vivarcdi-wave`; its rules must not assume the order of the buttons beyond the lists above.
- **The 028 row and the button** both show with Swell and Breaking wave (Q-9); Tore judges the look.
