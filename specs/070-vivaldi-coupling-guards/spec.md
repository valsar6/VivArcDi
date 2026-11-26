# 070 Guards for the two couplings to Vivaldi's interface

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-26 (PR #308) |
| Implemented | 2026-11-26 |
| Amends | [039 Boot self-check](../039-boot-self-check/spec.md) (one more kind of warning) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

A tech-debt audit of 2026-11-26 found two places where VivArcDi depends on Vivaldi's interface and a
Vivaldi update breaks it without a sound. Tore asked for a dedicated spec (2026-11-26).

- **A. Class names in the styles.** The selector catalog (`src/selectors/<version>.json`, read by
  `SelectorCatalog` in TypeScript) is the one place for Vivaldi's DOM names, but the SCSS files
  repeat them by hand: `.tab-position`, `.tab-strip`, `.tab-header`, `.tab-wrapper`, `.resize`,
  `.favicon`, `#tabs-container` and more. A rename in a new catalog changes the TypeScript side and
  leaves the styles pointing at nothing, and the boot self-check of
  [039](../039-boot-self-check/spec.md) does not see it, because it only counts catalog names that
  code asked for and the catalog lacks.
- **B. React internals.** `src/shared/spaces/ReactInternals.ts` reads the React fiber of a
  workspace row to start a rename that Vivaldi offers no other way to start. It is used by
  `EditorOpener`, `WorkspaceSync` and `LinkRelocationFactory`. If Vivaldi changes the shape, the
  reader returns `null` by design and the features fail with no line in the console.

This spec adds a guard for each, and changes no behavior the user can see. A makes the styles read
their Vivaldi names from one partial that a test ties to the catalog. B makes the boot self-check
report, as a warning, that the expected React shape is missing.

## User stories

- **US-1.** As the maintainer, I want every Vivaldi class name of the styles in one partial, so that
  a rename is one edit and a grep finds all of them.
- **US-2.** As the maintainer, I want `make check` to fail when the catalog and the styles disagree,
  so that a new catalog cannot ship with styles that match nothing.
- **US-3.** As the maintainer, I want a console warning when Vivaldi's React structure is not what
  the code expects, so that a bug report says "the shape changed" instead of "renaming does nothing".
- **US-4.** As the maintainer, I want the shared code to report that warning without core importing
  shared, so that the layer rules of [034](../034-module-boundaries/spec.md) and
  [035](../035-core-layout/spec.md) keep holding.

## Expected behavior

### Today: A, Vivaldi names in the styles

Counts of `grep` for the class or id in `src/styles/*.scss` at `origin/main` (head `e860bd01`). The
design replaces this table with the exact list, line by line.

| Name | Files (occurrences) | Catalog name it mirrors |
|---|---|---|
| `.tab-position` | `favorites` (6), `pinned` (3), `hidden-tabs` (1), `little-arc` (1), `sidebar-look` (1) | `pinnedTab` (`.tab-position.is-pinned`) |
| `.tab-strip` | `_tokens` (1, in `$strip`), `column-scroll` (2), `hidden-tabs` (1) | `tabStrip`, `tabStripFrame`, `tabListHost` |
| `.tab-header` | `favorites` (1), `pinned` (1), `sidebar-look` (1) | `tabClose`, `tabFavicon` (prefix) |
| `.tab-wrapper` | `favorites` (2), `little-arc` (1), `sidebar-look` (2) | `tabWrapper` |
| `.resize` | `column-scroll` (1) | `tabStripFrame` |
| `.favicon` | `favorites` (3), `sidebar-look` (1) | `tabFavicon` |
| `#tabs-container` | `_tokens` (1, in `$strip`), `hidden-tabs` (1), `sidebar-look` (3), `column-scroll` (1) | `tabsContainer` |
| `#tabs-tabbar-container` | `_tokens` (`$tab-bar`, `$narrow-tab-bar`) | `tabBar`, `verticalTabBar` |
| `#browser` | `little-arc` and others, about 10 with `#panels`, `#switch`, `#webview-container` | `browser`, `webviewContainer` |
| `.title`, `.close`, `.tab-audio`, `.stack-counter`, `.svg-tab-selection`, `.page-progress-indicator`, `#panels-container`, `#panels`, `#switch` | `favorites`, `sidebar-look` | none in the catalog |

`.pinned-group` is in the catalog (`pinnedGroup`) and in no stylesheet. Several styles already build
selectors from a token (`$strip`, `$tab-bar`, `$look` in `src/styles/_tokens.scss`), so part of the
names sit in one file and part do not. No test compares any of them with `src/selectors/8.1.json`.
`src/selectors/index.json` lists `8.1` only, so today the test would read one catalog.

### Today: B, React internals

| Piece | What it does | Where |
|---|---|---|
| Fiber lookup | Takes the first own key of the row element that starts with `__reactFiber`, climbs `return` to a fiber whose props hold `isRenaming`, then to one whose props hold `workspaces` and `hidePopup`, reads `id` and collects the hook dispatchers whose state is `undefined` | `src/shared/spaces/ReactInternals.ts:20`, `:40-64` |
| Failure | Any miss or exception returns `null`; no line is logged | `ReactInternals.ts:32-38` |
| Users | `ReactEditorOpener` calls `renameHooks(row)`; `WorkspaceSync` and `LinkRelocationFactory` build it with `new ReactInternals()` | `src/shared/spaces/EditorOpener.ts:41`, `src/modules/workspacesync/WorkspaceSync.ts:158`, `src/modules/folders/editing/LinkRelocationFactory.ts:42` |
| Report | `BootReport` logs one warning per undefined selector and one summary line; it knows nothing of React | `src/core/boot/BootReport.ts:112-121` |
| Layers | `core/` imports only `core/`; `shared/` may import `core/`, never the reverse | `CONTRIBUTING.md`, `tests/structure/ModuleBoundaries.test.ts` |

A workspace row exists only while the workspace popup is open, so the full shape (`isRenaming`,
`workspaces`, `hidePopup`, the hooks) cannot be checked at boot. What a boot can check is cheaper:
that the interface is still built with React, that is, that an element of the window carries a key
that starts with `__reactFiber`.

### After

| Piece | Place |
|---|---|
| Partial with one variable per Vivaldi name | `src/styles/_vivaldi.scss`, reached through `_tokens.scss` or `@use` (design decides) |
| Test that ties the partial to every catalog | `tests/styles/VivaldiNames.test.ts` |
| Probe of the React shape, registered by shared code | name and place fixed by the design; the registration point is in `src/core/boot/` |
| Warning line | `BootReport` logs it next to the undefined-selector warnings |

The partial has one variable per name, for example `$tab-strip: '#tabs-container .tab-strip'` or,
for a single class, `$tab-position: '.tab-position'`. The styles interpolate the variables
(`#{$tab-position}`) in place of the literals. A variable whose value is a full catalog selector
equals it; a variable for a part of a selector (a single class) is mapped to the catalog name whose
selector contains that part, in a table inside the test (Q-7). A name with no catalog entry (Q-3)
is either added to the catalog or listed in the test as "style only".

The React probe is a small object that says what it checked and whether it passed. Shared code
registers it with the boot; the boot runs it once at the end of the start, after the modules have
started, and the report prints one warning such as `Vivaldi UI shape: <what is missing>`. The exact
text is fixed by the design. Nothing is stopped, retried or disabled, and a passing probe logs
nothing. The summary line counts the warning with the undefined selectors.

## Requirements

### Functional

- **FR-1.** `src/styles/_vivaldi.scss` defines one SCSS variable per Vivaldi DOM name that a
  stylesheet uses, each with a stable name that follows the catalog name (`$tab-position` for the
  class of `pinnedTab`, and so on). A token that already exists (`$strip`, `$tab-bar`,
  `$narrow-tab-bar`) keeps its name and moves to the partial.
- **FR-2.** No stylesheet in `src/styles/` other than `_vivaldi.scss` writes a Vivaldi class or id as
  a literal. The names that are VivArcDi's own (`data-vivarcdi-*`, classes VivArcDi adds) stay where
  they are.
- **FR-3.** A test reads `_vivaldi.scss` and every catalog listed in `src/selectors/index.json`,
  and fails when a variable that mirrors a catalog name differs from that catalog's selector, or
  when a mirrored catalog name is missing in a catalog.
- **FR-4.** A test fails when a Vivaldi class or id appears as a literal in a stylesheet other than
  `_vivaldi.scss` (the list of names comes from the variables themselves).
- **FR-5.** `ReactInternals` or a sibling in `src/shared/spaces/` exposes a probe that returns whether the interface is
  built with React: an element under `#browser` carries a key that starts with `__reactFiber`. It
  never throws.
- **FR-6.** `src/core/boot/` offers a registration point for such checks, typed in core with no
  import from `shared/` or `modules/`. Shared code registers the React probe at the window start,
  through the `shape` service of `ModuleContext`, from the start of the two modules that use
  `ReactInternals`.
- **FR-7.** `BootReport` logs one `warn` line for a probe that fails, once per start, and counts it
  in the problem count that sets the summary level. It logs nothing for a probe that passes.
- **FR-8.** WHEN `renameHooks` returns `null` at the first use in a window, THE code SHALL log the
  same kind of warning once per window session (the deep shape is only known then), through the
  same registration point. Q-4 is answered "both", so the FR stays.

### Non-functional

- **NFR-1.** No visible change: the compiled CSS has the same selectors and rules as before, apart
  from whitespace that the Sass compiler normalizes. The existing style tests show it.
- **NFR-2.** Layers: `core/` imports `core/`; `shared/` imports `core/` and `shared/`. The lint rule
  `module-boundaries` and the structure tests pass.
- **NFR-3.** The probe is cheap: one element lookup and one key scan, at most once per start; it
  reads no storage and starts no timer or observer.
- **NFR-4.** No behavior of the three users of `ReactInternals` changes: a missing shape still
  returns `null` and never throws.
- **NFR-5.** The catalog JSON files keep their format. If a name is added to them (Q-3), every
  catalog in `index.json` gets it, and the undefined-selector warning of 039 still applies.
- **NFR-6.** `docs/architecture.md` says where the Vivaldi names live (the catalog for TypeScript,
  `_vivaldi.scss` for the styles) and how the self-check reports React.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE partial SHALL define a variable for every Vivaldi name the styles use | auto: `_vivaldi.scss defines every Vivaldi name the styles use` |
| AC-2 | WHEN a variable mirrors a catalog name, THE test SHALL require its value to equal that selector in every catalog of `index.json` | auto: `every mirrored variable equals its catalog selector in every catalog` |
| AC-3 | IF a mirrored catalog name is missing in a catalog, THEN THE test SHALL fail and name the catalog and the name | auto: `a mirrored name missing in a catalog fails` |
| AC-4 | IF a stylesheet other than the partial writes a Vivaldi class or id as a literal, THEN THE test SHALL fail and name the file | auto: `no stylesheet writes a Vivaldi name as a literal` |
| AC-5 | THE compiled styles SHALL keep their selectors | auto: the existing tests under `tests/styles/`, names unchanged |
| AC-6 | WHEN an element under `#browser` carries a key that starts with `__reactFiber`, THE probe SHALL pass | auto: `React probe passes when the interface carries a fiber` |
| AC-7 | IF no element under `#browser` carries such a key, or the lookup throws, THEN THE probe SHALL fail and not throw | auto: `React probe fails without a fiber and never throws` |
| AC-8 | WHEN a registered probe fails, THE report SHALL log one warning that names what is missing, and the summary SHALL count it | auto: `BootReport warns once for a failed probe and counts it` |
| AC-9 | WHEN every registered probe passes, THE report SHALL log nothing extra | auto: `BootReport logs nothing for a passing probe` |
| AC-10 | WHEN `renameHooks` returns `null` at the first use in a window, THE code SHALL log one warning, and no more until the window reloads | auto: `a missing React shape at first use warns once` |
| AC-11 | THE start SHALL run the registered probes once, after the modules start | auto: `boot runs the registered probes once after the modules` |
| AC-12 | IF core imports shared or a module, or shared imports a module, THEN THE tests SHALL report it | auto: `core imports only core`, `shared imports only core and shared` (existing) |
| AC-13 | THE three users of `ReactInternals` SHALL behave as before | auto: the existing tests of `ReactInternals` and `ReactEditorOpener` in `tests/shared/spaces/WorkspaceMenu.test.ts` and of the `workspacesync` and `folders` modules, names unchanged |
| AC-14 | IF the interface carries no React fiber when the start ends, THEN THE boot report SHALL warn and the summary SHALL be a warning | auto: `boot warns when Vivaldi's React shape is missing` |
| AC-15 | WHEN the interface carries a React fiber, THE boot report SHALL log no shape warning and the summary SHALL stay `info` | auto: `boot stays silent when Vivaldi's React shape is present` |
| AC-16 | WHEN a module builds `ReactInternals`, THE module SHALL register the React probe in its `start` | auto: `every module that builds ReactInternals registers the React probe` |

There is no `manual` criterion: the change is internal to the build and the console, and `make check`
runs every check, including the build. There is no `live:` scenario (Q-6): AC-14 and AC-15 boot the
whole start in a node test with a fake document, once without and once with the React shape.

## Out of scope

- Generating the Vivaldi names of the styles from the catalog at build time (Q-2 asks; the
  recommendation is no).
- Replacing the use of React internals with another way to start a rename, or any change to what
  the rename does.
- Checking the deep React shape at boot (a row of the popup does not exist then).
- Checking CSS custom properties or Vivaldi variables the styles read (`--colorBg` and similar).
- Any change to the catalog contents beyond the names that Q-3 decides to add.
- A toast or an automatic disable when a guard fires: both guards only report.

## Open questions

- [x] **Q-1. One spec or two?** A and B share only the cause (silent breakage on a Vivaldi update)
  and the home (boot self-check, `make check`). They touch different files and could land as two
  pull requests. Recommendation: one spec, two tasks that run in parallel, as in
  [068](../068-shared-page-messages-and-timers/spec.md), because both are small and the audit
  asked for them together. Split them if Tore prefers separate reviews.
  Answered (Tore, 2026-11-26): one spec, two tasks in parallel.
- [x] **Q-2. Hand-written variables or a partial generated from the JSON at build time?** A generated
  `_vivaldi.scss` (from `8.1.json`) cannot drift, but it ties Sass to one catalog while several can
  exist, hides the names from a plain read of the styles and adds a step to `scripts/build.mjs`.
  Recommendation: hand-written variables plus the test of FR-3, because the test gives the same
  guarantee for all catalogs and the styles stay readable. Revisit if more than two catalogs ship.
  Answered (Tore, 2026-11-26): hand-written variables, protected by the tests of FR-3 and FR-4.
- [x] **Q-3. Names the catalog does not have.** `.title`, `.close`, `.tab-audio`, `.stack-counter`,
  `.svg-tab-selection`, `.page-progress-indicator`, `#panels`, `#panels-container` and `#switch`
  are in styles only. Recommendation: add them to the catalog only when a TypeScript reader needs
  them; otherwise keep them in `_vivaldi.scss` marked "style only" in the test, so they are in one
  place and a grep finds them, without growing the catalog and the undefined-selector check.
  Answered (Tore, 2026-11-26): keep the style-only names in the partial, marked in the test; the catalog does not grow.
- [x] **Q-4. Where and when does the React check report?** Options: (a) boot only, the cheap probe
  of FR-5; (b) first use only, from `ReactEditorOpener` when `renameHooks` returns `null`;
  (c) both. Recommendation: (c). The boot probe tells that React is gone (the case that breaks all
  three users at once); the first-use warning tells that the deep shape changed, which only exists
  while the popup is open. Both go through the registration point of FR-6, so core has no import of
  shared code: core owns an interface (a probe with a name and a `check()`), the window services
  hold the list, `VivArcDi` runs it and `BootReport` prints.
  Answered (Tore, 2026-11-26): as proposed (c): boot probe and first-use warning, both through the registration point.
- [x] **Q-5. What does the boot probe look at?** The fiber key under `#browser` is cheap but may
  pass while the workspace rows have changed. Recommendation: accept this, since the first-use
  warning of Q-4 covers the deep shape. A deeper boot probe would need to open the popup, which a
  self-check that only reports must not do.
  Answered (Tore, 2026-11-26): correct as proposed: the probe looks for the `__reactFiber` key; the deep shape is the first-use warning.
- [x] **Q-6. Is a `live:` scenario worth it?** `npm run live` (spec 046) could remove the
  `__reactFiber` keys and read the console for the warning. Recommendation: no for this spec; the
  `auto:` tests with a fake document are enough and a lab run adds cost for one console line.
  Answered (Tore, 2026-11-26): changed: no `live:` scenario and no lab run, but an automated boot scenario in a node test with a fake DOM, one without and one with the React shape (AC-14, AC-15).
- [x] **Q-7. Mapping of partial names to catalog names.** Variables for a whole selector equal the
  catalog value; variables for one class are a part of it. Recommendation: the test holds a table
  `variable -> catalog name -> "equals" or "contained in"`, so each rule is visible and a new
  variable without a row fails AC-1.
  Answered (Tore, 2026-11-26): the mapping lives in the tests.

## References

- [039 Boot self-check](../039-boot-self-check/spec.md): the report, the undefined-selector warning.
- [034 Module boundaries](../034-module-boundaries/spec.md) and
  [035 Core layout](../035-core-layout/spec.md): the layer rules.
- [068 Shared page-message parser and timers](../068-shared-page-messages-and-timers/spec.md): the
  model for a small internal spec with structure tests.
- `src/selectors/8.1.json`, `src/selectors/index.json`, `src/core/dom/SelectorCatalog.ts`
- `src/styles/_tokens.scss` (`$strip`, `$tab-bar`, `$look`), `src/styles/favorites.scss`,
  `src/styles/sidebar-look.scss`, `src/styles/column-scroll.scss`, `src/styles/hidden-tabs.scss`,
  `src/styles/pinned.scss`, `src/styles/little-arc.scss`
- `src/shared/spaces/ReactInternals.ts`, `src/shared/spaces/EditorOpener.ts`,
  `src/modules/workspacesync/WorkspaceSync.ts`,
  `src/modules/folders/editing/LinkRelocationFactory.ts`
- `src/core/boot/BootReport.ts`, `src/core/boot/VivArcDi.ts`, `src/core/boot/WindowServices.ts`
- `tests/structure/ModuleBoundaries.test.ts`, `tests/core/boot/BootReport.test.ts`
