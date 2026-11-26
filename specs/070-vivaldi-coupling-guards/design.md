# 070 Guards for the two couplings to Vivaldi's interface: design

| | |
|---|---|
| Status | Approved (2026-11-26, PR #308) |
| Spec | [spec.md](spec.md) |

Tore approved the spec on 2026-11-26 (PR #308). He accepted the recommendation of every open
question, except Q-6: there is no `live:` scenario, and an automated boot scenario with a fake DOM
takes its place (AC-14, AC-15). This document says **how**; the spec says **what**. Nothing changes
for the user: the compiled CSS keeps its selectors and the only new output is one console warning.

## Approach

| Area | What changes | Where |
|---|---|---|
| Names of the styles | One partial with a variable per Vivaldi name; the stylesheets interpolate them | `src/styles/_vivaldi.scss`, `_tokens.scss` and six stylesheets |
| Style tests | A test ties the partial to every catalog and finds literals | `tests/styles/VivaldiNames.test.ts` |
| Probe service | A typed list of probes that core owns, runs and reports | `src/core/boot/ShapeGuards.ts`, `WindowServices.ts`, `ModuleStarter.ts`, `Module.ts`, `VivArcDi.ts`, `BootReport.ts` |
| React probe | The cheap boot probe, its registration helper and the first-use warning | `src/shared/spaces/ReactProbe.ts`, `ReactInternals.ts` |
| Registration | The two modules that use `ReactInternals` register the probe in `start` | `WorkspaceSync.ts`, `BookmarkFolders.ts` |
| Boot scenario | A node test boots the whole start with and without the React shape | `tests/loader/BootShape.test.ts` |
| Docs | Where the Vivaldi names live | `docs/architecture.md` |

Part A (T1) and part B (T2) touch disjoint files.

## Part A: the Vivaldi names of the styles

### The exact list

Found with `grep` at `origin/main` (head `b3997476`), `file:line`, in `src/styles/`. Lines that are
`url("data:image/svg+xml,...")` are skipped (their dots are numbers). A name written as part of
another (`.is-pinned` in `.tab-position.is-pinned`) is listed once with the line. Own names
(`data-vivarcdi-*`, `.vivarcdi-*`) are not in the list. After the change every line of the list uses
a variable.

| Name | Variable | Lines |
|---|---|---|
| `#browser` | `$browser` | `_tokens.scss:1`, `:85`, `:102`; `little-arc.scss:26`, `:34`, `:42`, `:196` |
| `#tabs-container` | `$tabs-container` | `_tokens.scss:103`; `column-scroll.scss:3`; `hidden-tabs.scss:7`; `sidebar-look.scss:17`, `:25`, `:45` |
| `#tabs-tabbar-container` | in `$tab-bar`, `$narrow-tab-bar` | `_tokens.scss:96`, `:104` |
| `.left`, `.right` | in `$tab-bar` | `_tokens.scss:104` |
| `.narrow` | in `$narrow-tab-bar` | `_tokens.scss:96` |
| `.tab-strip` | `$tab-strip`, and in `$strip` | `_tokens.scss:103`; `column-scroll.scss:11`, `:16`; `hidden-tabs.scss:7` |
| `.resize` | `$resize` | `column-scroll.scss:11` |
| `.tab-position` | `$tab-position` | `favorites.scss:21`, `:25`, `:29`, `:38`, `:43`, `:48`; `hidden-tabs.scss:7`; `little-arc.scss:34`; `pinned.scss:14`, `:18`, `:22`; `sidebar-look.scss:106` |
| `.is-pinned` | `$is-pinned` | `pinned.scss:14`, `:18`, `:22`; `sidebar-look.scss:106` |
| `.tab-wrapper` | `$tab-wrapper` | `favorites.scss:49`, `:58`; `little-arc.scss:34`; `sidebar-look.scss:3`, `:5` |
| `.tab` | `$tab` | `favorites.scss:50`, `:69`, `:75`; `sidebar-look.scss:4`, `:74`, `:180` |
| `.active` | `$active` | `favorites.scss:69`; `sidebar-look.scss:74`, `:180` |
| `.tab-header` | `$tab-header` | `favorites.scss:76`; `pinned.scss:14`; `sidebar-look.scss:85` |
| `.title` | `$title` | `favorites.scss:98`; `sidebar-look.scss:91`, `:106` |
| `.close` | `$close` | `favorites.scss:98`; `pinned.scss:14`; `sidebar-look.scss:114`, `:152`, `:159` |
| `.favicon` | `$favicon` | `favorites.scss:81`, `:93`, `:121`; `sidebar-look.scss:110` |
| `.tab-audio` | `$tab-audio` | `favorites.scss:112` |
| `.stack-counter` | `$stack-counter` | `favorites.scss:98` |
| `.svg-tab-selection` | `$svg-tab-selection` | `favorites.scss:98` |
| `.page-progress-indicator` | `$page-progress-indicator` | `favorites.scss:98` |
| `.button-badge` | `$button-badge` | `favorites.scss:102` |
| `#panels-container` | `$panels-container` | `sidebar-look.scss:26` |
| `#panels` | `$panels` | `sidebar-look.scss:27` |
| `#switch` | `$switch` | `sidebar-look.scss:28` |
| `.auto-hide` | `$auto-hide` | `sidebar-look.scss:33` |
| `.auto-hide-wrapper` | `$auto-hide-wrapper` | `sidebar-look.scss:33` |
| `.button-toolbar` | `$button-toolbar` | `sidebar-look.scss:37`, `:41` |
| `.button-toolbar.newtab` | `$new-tab-button` | `sidebar-look.scss:37` |
| `.toolbar-spacer` | `$toolbar-spacer` | `sidebar-look.scss:41` |
| `.toolbar-spacer-flexible` | `$toolbar-spacer-flexible` | `sidebar-look.scss:37`, `:41` |
| `.tabbar-nested-buttons` | `$tabbar-nested-buttons` | `sidebar-look.scss:41` |

Stylesheets with no Vivaldi name: every other file of `src/styles/` (including `_minus.scss`,
which only has mixins). `.vivarcdi-*` and `data-vivarcdi-*` stay literal. The `$rows`, `$row-tabs`
and `$tile-wrappers` strings of `sidebar-look.scss:3-5` hold `.tab-wrapper` and `.tab`: they are
rebuilt with interpolation, for example `'#{$strip} > :not(#{$tile}) #{$tab-wrapper}'`.

Two catalog names have no style use and stay out of the partial: `pinnedGroup` (`.pinned-group`)
and the many that only TypeScript reads. The partial holds the names that the styles use, not the
catalog.

### `src/styles/_vivaldi.scss`

One variable per line, `$name: 'value';` (single quotes, no interpolation, no comment: the test
reads the file line by line). Order: ids, then classes, then the style-only names.

```scss
$browser: '#browser';
$tabs-container: '#tabs-container';
$tab-bar: '#tabs-tabbar-container:is(.left, .right)';
$narrow-tab-bar: '#tabs-tabbar-container.narrow';
$strip: '#tabs-container .tab-strip';
$panels: '#panels';
$tab-strip: '.tab-strip';
$resize: '.resize';
$tab-position: '.tab-position';
$is-pinned: '.is-pinned';
$tab-wrapper: '.tab-wrapper';
$tab-header: '.tab-header';
$close: '.close';
$favicon: '.favicon';
$button-toolbar: '.button-toolbar';
$new-tab-button: '.button-toolbar.newtab';
$auto-hide-wrapper: '.auto-hide-wrapper';
$tab: '.tab';
$active: '.active';
$title: '.title';
$tab-audio: '.tab-audio';
$stack-counter: '.stack-counter';
$svg-tab-selection: '.svg-tab-selection';
$page-progress-indicator: '.page-progress-indicator';
$button-badge: '.button-badge';
$panels-container: '#panels-container';
$switch: '#switch';
$auto-hide: '.auto-hide';
$toolbar-spacer: '.toolbar-spacer';
$toolbar-spacer-flexible: '.toolbar-spacer-flexible';
$tabbar-nested-buttons: '.tabbar-nested-buttons';
```

The values are the ones in the stylesheets today, character for character, so the compiled CSS does
not change (NFR-1).

### Catalog mapping

This table is the one that lives in the test (Q-7). Rules: `equals` (the value is the catalog
selector), `in` (the value is a substring of the catalog selector), `extends` (the value starts with
the catalog selector), `style only` (no catalog name; Q-3).

| Variable | Rule | Catalog name |
|---|---|---|
| `$browser` | equals | `browser` |
| `$tabs-container` | equals | `tabsContainer` |
| `$tab-bar` | equals | `verticalTabBar` |
| `$narrow-tab-bar` | extends | `tabBar` |
| `$strip` | equals | `tabStrip` |
| `$panels` | in | `panelAddButton` |
| `$tab-strip` | in | `tabStrip` |
| `$resize` | in | `tabStripFrame` |
| `$tab-position` | in | `pinnedTab` |
| `$is-pinned` | in | `pinnedTab` |
| `$tab-wrapper` | equals | `tabWrapper` |
| `$tab-header` | in | `tabClose` |
| `$close` | in | `tabClose` |
| `$favicon` | in | `tabFavicon` |
| `$button-toolbar` | in | `newTabButton` |
| `$new-tab-button` | equals | `newTabButton` |
| `$auto-hide-wrapper` | equals | `autoHideWrapper` |
| `$tab`, `$active`, `$title`, `$tab-audio`, `$stack-counter`, `$svg-tab-selection`, `$page-progress-indicator`, `$button-badge`, `$panels-container`, `$switch`, `$auto-hide`, `$toolbar-spacer`, `$toolbar-spacer-flexible`, `$tabbar-nested-buttons` | style only | none |

`$strip`, `$tab-bar` and `$narrow-tab-bar` keep the names they have in `_tokens.scss` (their users
and `tests/styles/CompactTabBar.test.ts` name them); the other variables follow the class or id.

### How the existing tokens move

`src/styles/_tokens.scss` starts with the two lines

```scss
@use 'vivaldi' as *;
@forward 'vivaldi';
```

`@use` lets the token file read the names; `@forward` makes them reach every stylesheet that already
writes `@use 'tokens' as *`, so no stylesheet gets a new `@use`. (Checked with the installed Sass:
the two together compile and expose the variables.) Then:

| Token | Before | After |
|---|---|---|
| `$root` | `'#browser[data-vivarcdi-active]'` | `'#{$browser}[data-vivarcdi-active]'` |
| `$private` | `'#browser[data-vivarcdi-private]'` | `'#{$browser}[data-vivarcdi-private]'` |
| `$look` | `'#browser[data-vivarcdi-look]'` | `'#{$browser}[data-vivarcdi-look]'` |
| `$strip`, `$tab-bar`, `$narrow-tab-bar` | defined in `_tokens.scss` | deleted there, defined in `_vivaldi.scss` with the same value |

`$root`, `$private` and `$look` are VivArcDi's own marks on a Vivaldi element and stay in
`_tokens.scss`. No stylesheet loses a name it uses: the three moved tokens come back through
`@forward`.

### The edits, per stylesheet

| File | Change |
|---|---|
| `column-scroll.scss` | `#tabs-container#{$column-scroll}` becomes `#{$tabs-container}#{$column-scroll}`; `.resize:has(> .tab-strip)` becomes `#{$resize}:has(> #{$tab-strip})`; `.tab-strip` becomes `#{$tab-strip}` |
| `hidden-tabs.scss` | line 7 becomes `#{$root} #{$strip} #{$tab-position}` |
| `favorites.scss` | `.tab-position` (lines 21, 25, 29, 38, 43, 48) to `#{$tab-position}`; `.tab-wrapper`, `.tab`, `.tab.active` (69), `.tab-header`, `.favicon`, `.title`, `.close`, `.stack-counter`, `.svg-tab-selection`, `.page-progress-indicator`, `.button-badge`, `.tab-audio` to their variables; `.favicon img` becomes `#{$favicon} img` |
| `pinned.scss` | `.tab-position.is-pinned` becomes `#{$tab-position}#{$is-pinned}` (lines 14, 18, 22); `.tab-header .close` becomes `#{$tab-header} #{$close}` |
| `little-arc.scss` | `#browser` (26, 34, 42, 196) to `#{$browser}`; `.tab-position .tab-wrapper::after` to `#{$tab-position} #{$tab-wrapper}::after` |
| `sidebar-look.scss` | every name of the list above; `#tabs-container` to `#{$tabs-container}`; `&.auto-hide .auto-hide-wrapper` to `&#{$auto-hide} #{$auto-hide-wrapper}`; line 37 to `#{$tab-bar} :is(#{$new-tab-button}, #{$button-toolbar}#{$toolbar-spacer-flexible})`; line 41 to `#{$tab-bar} #{$tabbar-nested-buttons}:not(:has(#{$button-toolbar}:not(#{$toolbar-spacer}, #{$button-toolbar}#{$toolbar-spacer-flexible})))` |
| `_tokens.scss` | as in the table above |

Note on `sidebar-look.scss:41`: the original is
`.button-toolbar:not(.toolbar-spacer, .toolbar-spacer-flexible)`, so the inner list holds the two
classes alone; write it as `#{$button-toolbar}:not(#{$toolbar-spacer}, #{$toolbar-spacer-flexible})`.
The compiled selector must be identical to today's; the implementer compares the compiled CSS of
every stylesheet before and after (`sass.compile` and `diff`, ignoring whitespace) and the
existing tests under `tests/styles/` pass.

### The tests: `tests/styles/VivaldiNames.test.ts`

Reads `_vivaldi.scss` (variables: one per line matching `^\$([a-z-]+): '([^']*)';$`), every catalog
named in `src/selectors/index.json`, and every `*.scss` of `src/styles/`. It holds the mapping table
above as `const MAPPING: Record<string, Mapping>`, where `Mapping` is
`{ rule: 'equals' | 'in' | 'extends'; name: string } | { rule: 'style only' }`. A function
`problemsOf(catalogs, variables): string[]` returns one line per problem, naming the catalog and the
name, so the test of AC-3 can call it with a catalog that lacks a name.

| AC | Test, name verbatim | What it does |
|---|---|---|
| AC-1 | `_vivaldi.scss defines every Vivaldi name the styles use` | The variables of the file and the keys of `MAPPING` are the same set; every variable is used (`#{$name}`) in at least one other stylesheet |
| AC-2 | `every mirrored variable equals its catalog selector in every catalog` | For every catalog of `index.json` and every non-style-only row, applies the rule (`equals`, `in`, `extends`) and asserts `problemsOf` is empty |
| AC-3 | `a mirrored name missing in a catalog fails` | Calls `problemsOf` with a copy of the real catalog without `tabWrapper` and with `tabStrip` changed; asserts the two lines name the catalog version and the name |
| AC-4 | `no stylesheet writes a Vivaldi name as a literal` | Takes every class and id inside the values of the variables (`[.#][A-Za-z][\w-]*`), removes `/* */` comments and `url(...)` from each other stylesheet, and fails with the file name when a name is found as a whole token (`(?<![\w-])#name` and `(?<!\d)\.name`, both followed by `(?![\w-])`). It also asserts that the check finds a literal in a sample string, so it cannot pass by matching nothing |
| AC-5 | the existing tests under `tests/styles/`, names unchanged | They compile the stylesheets and assert the selectors |

`_vivaldi.scss` is skipped by AC-4. The `index.json` list today is `8.1` only; the loop covers every
version it lists.

Existing test affected: `tests/styles/CompactTabBar.test.ts` reads `_tokens.scss` to see
`$narrow-tab-bar: '#tabs-tabbar-container.narrow';`. T1 changes the file it reads for that one row
(to `_vivaldi.scss`); the test names stay. Any other style test that reads source text and fails is
adjusted the same way, never by changing what it asserts.

## Part B: the React probe

### Core: `src/core/boot/ShapeGuards.ts`

```ts
export interface ShapeProbe {
  readonly name: string;
  readonly expects: string;
  holds(): boolean;
}

export interface ShapeFinding {
  readonly name: string;
  readonly expects: string;
}

export interface ShapeBoard {
  add(probe: ShapeProbe): void;
  report(key: string, expects: string): void;
}

export class ShapeGuards implements ShapeBoard {
  constructor(logger: Pick<Logger, 'warn'>);
  public add(probe: ShapeProbe): void;
  public report(key: string, expects: string): void;
  public run(): ShapeFinding[];
}
```

Rules:

1. `add` keeps the probes by `name`; a second probe with the same name replaces the first. So the
   two modules that use React can both register it and it runs once (AC-11).
2. `run` calls `holds()` of every probe once, in the order of registration, and returns one finding
   for each probe that returns `false` or throws. It never throws and logs nothing itself.
3. `report(key, expects)` logs `Vivaldi UI shape: ${expects}` at `warn` through the logger the
   service was built with, the first time per `key`; later calls with the same key log nothing
   until the window reloads (AC-10). This is the first-use channel (FR-8).
4. `ShapeBoard` is the narrow type given to modules (the same idea as `NoticeBoard`): a module
   cannot call `run`.

`ShapeGuards` imports `Logger` type only: it stays inside `core/`.

### Wiring in core

| File | Change |
|---|---|
| `src/core/boot/WindowServices.ts` | `StartServices` gets `shape: ShapeGuards`; `open` returns `Pick<StartServices, 'storage' \| 'notices' \| 'shape'>` and builds `new ShapeGuards(logger.child('shape'))` |
| `src/core/boot/ModuleStarter.ts` | `start` reads `shape` from `StartServices` and passes it in the context |
| `src/core/boot/Module.ts` | `ModuleContext` gets `shape: ShapeBoard` with the JSDoc "Reports a change of Vivaldi's interface that the module depends on (spec 070)." |
| `src/core/boot/VivArcDi.ts` | in `#run`, after the loop over the modules and before the `active` info line: `report.useShape(services.shape.run());` |
| `src/core/boot/BootReport.ts` | new `useShape(findings: readonly ShapeFinding[]): void` keeps the list; `summarize` logs one `warn` per finding after the undefined-selector warnings; `#level` counts the findings in `problems`; `#line` appends `; shape warnings: N` only when N is greater than zero, so the clean summary line, which the existing tests compare, is unchanged |

The warning text is `Vivaldi UI shape: ${finding.expects}`, for example
`Vivaldi UI shape: a React fiber on the browser element or its children`, logged under the tag
`VivArcDi:boot` (the report's logger). A finding does not change the `active` line, the outcome, the
boot notice or `severe`.

Spec check: the self-check summary, whose level is `warn` when a problem exists, becomes `warn` for a
failed probe (AC-14) and stays `info` otherwise (AC-15).

### Shared: `src/shared/spaces/ReactProbe.ts`

```ts
export const REACT_PROBE = 'react-fiber';

export class ReactProbe implements ShapeProbe {
  public readonly name = REACT_PROBE;
  public readonly expects = 'a React fiber on the browser element or its children';
  constructor(document: Document, selectors: Pick<SelectorCatalog, 'get'>);
  public holds(): boolean;
}

export function registerReactProbe(context: Pick<ModuleContext, 'document' | 'selectors' | 'shape'>): void;
```

`holds()` finds the element of `selectors.get('browser')`; it returns `true` when that element or
one of its direct children (`Array.from(element.children)`) has an own key that starts with
`__reactFiber`, and `false` otherwise, with no element, or when the lookup throws (try/catch, no
log). It reads no storage and starts no timer or observer (NFR-3). `registerReactProbe` calls
`context.shape.add(new ReactProbe(context.document, context.selectors))`.

The probe looks at the browser element and its direct children, not at every descendant, so the
cost stays at one lookup and a handful of key scans. **To verify in a lab Vivaldi** before
`Implemented` (not an acceptance criterion): that `#browser` or a child carries the key. If neither
does, the child level in the probe moves down to the first element that does.

`ReactInternals` constructor takes the board that reports the first-use miss:

```ts
constructor(shape: Pick<ShapeBoard, 'report'>);
```

`renameHooks` keeps its behavior and, when it returns `null` (a miss or an exception), calls
`this.#shape.report('react-rename', 'a workspace row has no React rename state: renaming a space may not work')`. The
key `react-rename` makes it once per window session across every instance, because `ShapeGuards`
dedupes by key (AC-10, NFR-4). The report runs outside the `try`, after the result is known, and
cannot change the result; if `report` throws, `renameHooks` still returns `null` (the call is in its
own `try`).

Call sites:

| Site | Change |
|---|---|
| `src/modules/workspacesync/WorkspaceSync.ts` `start` | after the availability check, `registerReactProbe(context)`; `#menuParts` builds `new ReactInternals(context.shape)` (`shape` destructured with `document`, `selectors`, `logger`) |
| `src/modules/folders/BookmarkFolders.ts` `start` | after the availability check, `registerReactProbe(context)` |
| `src/modules/folders/editing/LinkRelocationFactory.ts:42` | `new ReactInternals(context.shape)` (`shape` added to the destructuring of `context`) |
| `src/shared/spaces/EditorOpener.ts` | no change: it keeps `Pick<ReactInternals, 'renameHooks'>` |

Why the modules register (and not `ReactInternals`): `LinkRelocationFactory.create` runs on the
first Move to, long after the boot ran the probes, so a registration in the constructor would come
too late. `BookmarkFolders` is the module that owns the Move to action; a window without it and
without `workspacesync` never uses React internals, and the probe is not registered there.

### Layers

`core/boot/ShapeGuards.ts` imports from `core/` only. `shared/spaces/ReactProbe.ts` imports
`core/boot/ShapeGuards.js` (type), `core/boot/Module.js` (type) and `core/dom/SelectorCatalog.js`
(type): allowed. Modules import `shared/spaces/ReactProbe.js`: allowed. The existing structure tests
`core imports only core` and `shared imports only core and shared` pass unchanged (AC-12).

### Tests of part B

| AC | Test, name verbatim | File | What it does |
|---|---|---|---|
| AC-6 | `React probe passes when the interface carries a fiber` | `tests/shared/spaces/ReactProbe.test.ts` | A fake browser element with the key `__reactFiber$abc`, and one whose child has it; `holds()` is `true` for both |
| AC-7 | `React probe fails without a fiber and never throws` | `tests/shared/spaces/ReactProbe.test.ts` | No element, an element without the key, and a getter that throws: `holds()` is `false` each time |
| AC-8 | `BootReport warns once for a failed probe and counts it` | `tests/core/boot/BootReport.test.ts` | `useShape` with one finding then `summarize('active')`: one `warn` line `Vivaldi UI shape: ...` and the summary line is `warn` and ends with `shape warnings: 1` |
| AC-9 | `BootReport logs nothing for a passing probe` | `tests/core/boot/BootReport.test.ts` | `useShape([])`: no extra line; the summary is `info` and has no `shape warnings` |
| AC-10 | `a missing React shape at first use warns once` | `tests/shared/spaces/ReactProbe.test.ts` | A real `ShapeGuards` with a collecting logger and two `ReactInternals` built on it: `renameHooks` of a row without fiber, called three times on both, logs one `Vivaldi UI shape: ...` line |
| AC-11 | `boot runs the registered probes once after the modules` | `tests/loader/BootShape.test.ts` | The test module `probe-recorder` (see below) registers a recording probe twice under one name in its `start`; after `app.start()` the recorded events are `['start', 'probe']` |
| AC-12 | `core imports only core`, `shared imports only core and shared` | `tests/structure/ModuleBoundaries.test.ts` | existing, names unchanged |
| AC-13 | the existing tests | `tests/shared/spaces/WorkspaceMenu.test.ts`, `tests/modules/workspacesync/`, `tests/modules/folders/` | names unchanged; see below |
| AC-14 | `boot warns when Vivaldi's React shape is missing` | `tests/loader/BootShape.test.ts` | boots with the module `react-user` and a browser element without the key; see below |
| AC-15 | `boot stays silent when Vivaldi's React shape is present` | `tests/loader/BootShape.test.ts` | the same boot with the key on the browser element |
| AC-16 | `every module that builds ReactInternals registers the React probe` | `tests/structure/ReactProbeUsers.test.ts` | Reads `src/modules/**/*.ts`; the set of module folders with `new ReactInternals(` is a subset of the folders with `registerReactProbe(`, and that set is not empty |

AC-13 note. `ReactInternals` is tested in `tests/shared/spaces/WorkspaceMenu.test.ts` (lines 128 to
144: the fiber structure, the misses and the throwing getter), not in a file of its own; the spec
assumed otherwise and says so now. `ReactEditorOpener` is tested there too, with
`FakeReactInternals` (`tests/shared/spaces/popup.ts:174`). The changes that this design forces on
tests are mechanical and keep every name: `new ReactInternals()` gets a board argument
(`{ report: () => undefined }`) in `WorkspaceMenu.test.ts`, and the context that the `workspacesync`
and `folders` tests build gets `shape: { add: () => undefined, report: () => undefined }`
(`tests/modules/workspacesync/Module.test.ts`, `tests/modules/folders/BookmarkFolders.test.ts`, and
any other context that reaches `WorkspaceSync.start`, `BookmarkFolders.start` or
`LinkRelocationFactory.create`; T2 finds them by running the suite).

### The boot scenario (AC-14, AC-15)

`tests/loader/boot.ts` gets one test module, built like `Asker`:

```ts
export class ReactUser extends Module {
  public static override id = 'react-user';
  public override start(context: ModuleContext): void {
    registerReactProbe(context);
  }
}
```

`createApp` registers it (`.register(ReactUser)`) next to the others; the other tests do not enable
it, so they do not change. `createApp` already returns `browser` (the `FakeElement` under
`#browser`) and the selector file of its payload has `browser`, which is all the probe reads.

`tests/loader/BootShape.test.ts`:

| Test | Steps | Asserts |
|---|---|---|
| `boot warns when Vivaldi's React shape is missing` | `createApp({ modules: { 'react-user': { enabled: true }, ...MARKER } })`, no key on `browser`; `await app.start()` | one `warn` line under `[test:boot]` equal to `Vivaldi UI shape: a React fiber on the browser element or its children`; the summary has level `warn` and ends with `shape warnings: 1` |
| `boot stays silent when Vivaldi's React shape is present` | the same, after `Object.assign(browser, { '__reactFiber$test': {} })` | no `Vivaldi UI shape` line; the summary equals the clean summary of `BootSelfCheck.test.ts` with two modules (`2 of 2 modules started`) and its level is `info` |

`tests/loader/boot.ts` also gets `ProbeRecorder` (id `probe-recorder`) and an exported `events: string[]`:
its `start` pushes `'start'` and calls `context.shape.add` twice with a probe named `recorded` whose
`holds()` pushes `'probe'` and returns `true`; the AC-11 test clears `events` first. Besides the
named tests, `tests/core/boot/ShapeGuards.test.ts` holds unit tests of the rules of `ShapeGuards`
(a throwing probe is a finding, `report` once per key, `run` keeps the order) with their own names.

Each test calls `await app.stop()` at the end. `FakeElement` has a `children` array and no own keys beyond
its fields, so `Object.keys` works on it as on a DOM node. No new fake is needed.

## Documentation (T3, the lead)

`docs/architecture.md`: in the selector part, say that Vivaldi's DOM names live in the catalog for
TypeScript and in `src/styles/_vivaldi.scss` for the styles, that `tests/styles/VivaldiNames.test.ts`
ties the two, and that the self-check reports a React shape that changed (probe at boot, warning at
first use) through `ModuleContext.shape`. NFR-6.

## Branch and version

`CONTRIBUTING.md` and `scripts/release/BranchPolicy.ts` give a bump only to `features/` (minor) and
`fix/` (patch); any other prefix keeps the version. This is a refactor with one new console warning
and no change a user can see, as 068 was. Proposal: branch `refactor/070-vivaldi-coupling-guards`,
**no version change**. The alternative is `fix/070-vivaldi-coupling-guards` with a patch bump in
`package.json` and `installer/vivarcdi/__init__.py`, which fits only if Tore counts the warning as a
fix; the release check enforces whichever prefix is used.
