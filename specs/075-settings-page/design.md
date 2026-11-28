# 075 VivArcDi Settings: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

The page is option B of Q-1: a document of our own, `vivarcdi/settings.html`, opened as a normal tab
at `chrome-extension://<id>/vivarcdi/settings.html`. Vivaldi's own shipped pages open this way and
have `chrome.storage` and `vivaldi.prefs`; adding a section to `chrome://settings/` is out (no
`vivaldi.prefs` there, `executeScript` refused or unreliable). Five pieces.

**The file reaches the install (Proof 1, AC-19).** `src/settings/settings.html` is a static file.
`AssetCopier` in `scripts/build.mjs` (line 167) keeps only paths ending in `.json`; it also keeps
`.html`. `ScriptBuilder` already compiles every `.ts` under `src/` to an ES module in `dist/`, so
`src/settings/main.ts` becomes `dist/settings/main.js` and the page loads it with
`<script type="module" src="main.js">`, with no inline script. `PayloadDeployer.deploy` copies the
whole `dist/` with `copytree`, so it needs no change; a test proves it (AC-19).

**The page opens with its own scripts (Proof 2, AC-21).** `main.ts` builds a `SettingsApp` over the
same `PersistentStorage` and `BrowserPrefs` classes the window uses, reads `chrome` and `vivaldi`
from the page's own globals, and shows the sections of the registry. Whether those globals exist in
a page of ours is unproven until Tore's check (AC-21). `main.ts` therefore starts by testing for
`chrome.storage` and `vivaldi.prefs` and, when either is missing, draws one message with the console
line instead of the sections (the graceful failure of FR-10 seen from the page).

**Sections are a registry.** `SettingsSection` is an interface; `SettingsRegistry` holds them in
registration order; `SettingsApp` draws the navigation and the content from it, in a `try` per
section (AC-4). The four sections are registered by `main.ts`; a module adds one with an optional
static `settingsSection` read by the registry builder in `src/modules/index.ts`, not by the page.
The page cannot import the window's modules at runtime, so a module section is a small file under
`src/settings/sections/` that the module names, not code that runs in the window.

**Choices live in `chrome.storage.local`.** One versioned key, `vivarcdi.settings` (037), holds
`{ waves: string, modules: Record<string, boolean> }`. The page writes it with `save` (041); the
window reads it at boot over `config.json` (`SettingsOverrides`, below) and follows
`chrome.storage.onChanged` for the wave layout, which applies without a restart. Module switches
apply at the next start: a module cannot be unmounted safely mid-session by this spec. The theme is
not stored by us: the Themes section reads `vivaldi.themes.current` with `vivaldi.prefs` and writes it
only if `prefs.set` is accepted (Q-3), else it marks the current theme and shows `theme apply`.

**The window opens the page.** A module `settings-page` (`src/modules/settingspage/`) registers one
shortcut through `WindowKeys` (014) and calls `tabs.create` with the URL built from
`document.location.origin`. The boot notice of 039 gets an `onClick` that does the same
(`Notices.show` gains an optional `onClick` passed to `Toast.show`, which already has it).

```text
window.html: SettingsPageModule ──shortcut / notice click──▶ chrome.tabs.create(.../vivarcdi/settings.html)
                                                                      │
vivarcdi/settings.html ─ main.ts ─ SettingsApp ─ SettingsRegistry ─ sections ─▶ chrome.storage.local
                                                                      └──────────▶ vivaldi.prefs (theme)
window.html: SettingsOverrides ◀── chrome.storage.onChanged / boot read ◀── vivarcdi.settings
```

### Rejected alternatives

- **A section in `chrome://settings/`:** no `vivaldi.prefs`, `chrome.scripting.executeScript` refused,
  `webview.executeScript` only for one URL form (spike of 2026-11-28).
- **Writing `config.json` from the page:** it is fetched read-only and a reinstall overwrites it (Q-3).
- **One bundle for the page (IIFE like `src/page/`):** page scripts are for web pages that cannot
  import our modules; a page of our own can, so `PersistentStorage` and the `SettingsRegistry` are
  shared as they are.
- **A key per choice:** one key keeps one version and one upgrade path (037).

## Components

### The page (`src/settings/`, new, built into `dist/settings/`)

| File | Role | Pattern |
|---|---|---|
| `settings.html` | The shell: `<link>` to `../styles/settings-page.css`, a `nav`, a `main`, `<script type="module" src="main.js">`; no inline script or style | Static asset |
| `main.ts` | Tests for `chrome.storage` and `vivaldi.prefs`, opens the storage, builds the registry, starts `SettingsApp` | Composition root |
| `SettingsSection.ts` | `interface SettingsSection { readonly id: string; readonly title: string; readonly description: string; render(host: HTMLElement, services: SettingsServices): void }` | Strategy |
| `SettingsRegistry.ts` | `register(section)`, `sections()`; a second section with the same id is refused with a warning | Registry |
| `SettingsApp.ts` | Draws navigation and content; calls `render` in a `try` per section; logs `VivArcDi:settings section "<id>" failed` | Facade |
| `SettingsServices.ts` | `{ choices: SettingsChoices; prefs: BrowserPrefs; diagnostic: DiagnosticSource; priv: boolean; logger: Logger }` | Dependency injection |
| `SettingsChoices.ts` | `read(): Promise<StoredChoices>`, `set(patch): Promise<SaveOutcome>` over `vivarcdi.settings` with a `StoredFormat`; `set` resolves `memory` without writing when `priv` is true | Repository |
| `widgets/CardGroup.ts` | `render(host, cards: Card[], chosen: string, onChoose)`; one `button` per card with the preview, the name and a check mark on the chosen one only | Widget |
| `widgets/CheckboxRow.ts` | A `label` with an `input[type=checkbox]` and a gray `small` explanation | Widget |
| `WindowPrefsClient.ts` | Page side: `get(key)`, `set(key, value)` over `chrome.runtime` messages, an error name from the bridge becomes a typed error | Proxy |
| `sections/WorkspaceIconOption.ts` | The checkbox of the Tab bar section: `CheckboxRow` with the label, the gray explanation and the reason when disabled; checked means `show_name` is `false`; disabled when private, or the client reports `unavailable` | Section part |
| `sections/WavesSection.ts` | The four cards, in the order Still water, Ripple, Swell, Breaking wave, from `WavesClient` | Section |
| `WavesClient.ts` | Page side of the bridge: `waves()`, `current()`, `needsConfirmation()`, `choose(id, { confirmed })`, `onChange(listener)` over `chrome.runtime` messages | Proxy |
| `sections/ThemesSection.ts` | The five themes of 051 as cards; marks `vivaldi.themes.current` | Section |
| `sections/FeaturesSection.ts` | One `CheckboxRow` per module of `config.json` | Section |
| `sections/TroubleshootingSection.ts` | The diagnostic in a `pre`, a **Copy** button, a **Report a problem** link | Section |

`WavesSection` consumes 074's service, published by the window as
`globalThis[Symbol.for('vivarcdi.waves')]` with `{ waves, current, needsConfirmation, choose,
onChange }` (074 design, Module). The wave ids are `still-water`, `ripple`, `swell`, `breaking-wave`,
in this order; each wave carries `id`, `name`, `italianName`, `icon` and `lists`. The layout marker is
the attribute `data-vivarcdi-wave` on the window's `body`, which 074 writes and AC-9 reads.

**The page is another document.** The service lives in `window.html`'s globals, which the page
cannot read. 075 owns a bridge: in the window, `WavesBridge` (`src/modules/settingspage/`) answers
`chrome.runtime` messages `{ vivarcdi: 'waves', call: 'list' | 'current' | 'needsConfirmation' |
'choose', ... }` from the service and posts `{ vivarcdi: 'waves-changed', current }` on each
`onChange`; in the page, `WavesClient` (`src/settings/WavesClient.ts`) gives the same five names back
as promises and an `onChange`. `WavesSection` uses only the client's shape, so tests give it a fake
client. A `choose` that 074 refuses (`needsConfirmation` without `confirmed`) comes back as an error
that the section shows as a confirmation step. When the service is not published (074's FR-9, the
module off), the bridge answers `unavailable` and the section is not drawn.

**Window preferences.** The page needs one more thing from the window: Vivaldi's preferences, which
only the window's side reliably holds (`BrowserPrefs.set({path, value})` exists since 074 T4). The
same envelope serves it: `{ vivarcdi: 'window-prefs', call: 'get' | 'set', key, value? }`.
`WindowPrefsBridge` (`src/modules/settingspage/`, next to `WavesBridge`) answers it through
`BrowserPrefs`, after three checks in this order: the key is on `WINDOW_PREF_KEYS` (today
`['vivaldi.workspaces.button.show_name']`), the window is not private for a `set`, and `prefs.available`
and `canSet` hold; each failure answers `{ error: 'refused' | 'private' | 'unavailable' }` and logs one
`warn`. `WindowPrefsClient` (`src/settings/`) gives `get(key)` and `set(key, value)` back as
promises. `WavesBridge` and `WindowPrefsBridge` register on one listener that routes by `vivarcdi`, so
the window has one `onMessage` handler. The option never calls the waves service and the waves
never read the preference (AC-25).

**What 075 requires of 074.** One thing the 074 design lacks: `Wave` also carries
`preview: PreviewShape`, as 074's FR-10 and spec already say ("id, English name, Italian name, icon,
preview"). The shape measured from Vivaldi's tab bar, JSON-safe so it crosses the bridge. 074's design
still shows `{ rows }` at the time of writing; 075 uses `{ before, after }`, as agreed with Tore, and
this is a dependency: when 074's design lands with the same shape, nothing here changes, otherwise
this section is the one to update:

```ts
export interface PreviewShape {
  readonly before: readonly PreviewRow[];
  readonly after: readonly PreviewRow[];
}

export interface PreviewRow {
  readonly kind: 'row' | 'group' | 'spacer';
  readonly width: 'full' | 'fit';
  readonly items: number;
}
```

Full-width rows for Workspace and NewTab, a horizontal group for the small buttons, flexible
spacers. `before` holds the rows above the tab strip and `after` the rows below it. `PreviewDrawing`
draws `before`, then a block that stands for the page area, then `after`, so the card shows where each
button sits relative to the tabs (AC-20). Both `icon` and `preview` must survive `JSON`; `choose`
errors must have a readable `message`. Until 074 ships, a fake client serves the tests and `main.ts`
does not register the section.

### The window (`src/modules/settingspage/`, new)

| File | Role |
|---|---|
| `SettingsPage.ts` | `Module`, `id = 'settings-page'`, `privateWindows = 'allowed'` (it stores nothing, the page enforces AC-15). `start` attaches a `WindowKeys` for the shortcut; `stop` detaches |
| `SettingsOpener.ts` | `open(): Promise<void>`: `tabs.create({ url: \`${origin}/vivarcdi/settings.html\` })`; if `tabs.available` is false or `create` rejects, one `warn` and the notice `VivArcDi Settings cannot be opened` (AC-16) |
| `WavesBridge.ts` | Window side of the bridge: reads `globalThis[Symbol.for('vivarcdi.waves')]` per call, answers messages, posts changes, answers `unavailable` without the service | Adapter |
| `WindowPrefsBridge.ts` | Window side of the window-preferences channel: allow-list `WINDOW_PREF_KEYS`, private-window and availability checks, `get` and `set` over `BrowserPrefs` | Adapter with a guard |
| `SettingsOverrides.ts` | At boot reads `vivarcdi.settings` and returns `config.modules` with each `enabled` replaced by the stored boolean; ignored with a warning when the value is unreadable (036, 037) |

Option `shortcut` of `settings-page` in `src/config.json`, a string with the default `Mod+Alt+,`, and the user changes it by editing the option (schema of 036; an invalid value falls back to the default with a warning). The combination is free in VivArcDi (Cmd+Opt+[ and ], Cmd+Opt+N, Cmd+Shift+K, Cmd+T); that it is free in Vivaldi is **to confirm**: Vivaldi's shortcut table cannot be read from its resources or `vivaldi.prefs`, so the manual checklist asks Tore to search it in Vivaldi Settings > Keyboard. `ModuleSettings.check` runs after the overrides, so a
stored switch is checked like a written one. `VivArcDi.start` calls `SettingsOverrides` between
reading `config.json` and `createEnabled` (`VivArcDi.ts` line 204 to 205); in a private window it
skips the overrides.

### Diagnostic

`BootReport` (039) already builds the summary line. When the window is not private, `VivArcDi.start`
writes the same text, versioned, to `vivarcdi.diagnostic` with `save`; the Troubleshooting section reads
it and the **Copy** button writes it to the clipboard. It holds versions, module ids and selector
names, no URL or title. Private windows write nothing; the section then says there is no report yet.

### Look (`src/styles/settings-page.scss`, new)

Linked by `settings.html`, not listed in `config.json` `styles` (that list is injected into the
window). The page reads Vivaldi's color variables (`--colorFg`, `--colorBg`, `--colorBgIntense`,
`--colorHighlightBg`, `--colorBorder`) where Vivaldi's own pages define them, with the fallback
value of each in the declaration so a missing variable still gives a readable page (AC-7). Measures
come from Vivaldi's "Layout presets" and "Page appearance": heading uppercase, 11px, letter-spacing,
a 1px rule; card 140px wide, 8px radius, 2px border in the highlight color when chosen, a check mark at
its top right; checkbox explanation in `--colorFgFaded`. Partials from `_tokens.scss` are used where
they fit. Tore checks the result by eye in this prototype phase (task T6).

## Risks

- **The page may not get `vivaldi.prefs`** in a file of ours. Unproven until AC-21 on Tore's install;
  the page degrades to a message (FR-10), and the Themes section works read-only without prefs.
- **The lab cannot hold the file**: its copy has no `vivarcdi/` folder and adding a file breaks the
  code signature. The two `live:` scenarios of this spec exist and are named, but they pass only
  after a change to [046](../046-live-verification/spec.md) that serves `vivarcdi/*.html` through
  CDP `Fetch` interception. That change is a follow-up spec, not written here.
- **Vivaldi versions**: the page uses no Vivaldi class names (NFR-4); only CSS variables, with fallbacks.
- **074 is a dependency** of the Waves section and of AC-9, and `Wave.preview` is a requirement on it. 075 ships the shell and three sections
  first.
- **The shortcut** may clash with a Vivaldi shortcut; `WindowKeys` takes it before Vivaldi, so a clash would silently hide Vivaldi's command. Tore confirms it is free (T10) or the default changes.
- **The icon preference** is a native Vivaldi pref (`vivaldi.workspaces.button.show_name`, found in Vivaldi 8.3's `prefs_definitions.json`). That a write updates the button at once is expected, not proven; AC-28 proves it, and it runs in the lab today because it needs no page file. The key may be renamed by a Vivaldi update: the checkbox then reads `undefined`, shows unchecked and disabled with the reason.
- **The bridge**: `chrome.runtime.sendMessage` from a tab to a window must reach the window's `onMessage`; unproven, covered by AC-21 together with `vivaldi.prefs`. If it fails, the Waves section is absent and the page says so.

## Tests

Every test name is the `auto:` text of the criterion, verbatim; every `live:` scenario carries the
name and `spec: '075'` of its criterion. Each is written and seen red before the code.

| AC | Check | File |
|---|---|---|
| AC-1 | live: `opens the VivArcDi Settings page` | `tests/live/scenarios/opens-the-vivarcdi-settings-page.live.ts` |
| AC-2 | auto: `lists the registered sections in order` | `tests/settings/SettingsApp.test.ts` |
| AC-3 | auto: `shows a section registered by a module` | `tests/settings/SettingsApp.test.ts` |
| AC-4 | auto: `keeps the other sections when one fails` | `tests/settings/SettingsApp.test.ts` |
| AC-5 | auto: `marks only the chosen card` | `tests/settings/widgets.test.ts` |
| AC-6 | auto: `draws a checkbox with its explanation` | `tests/settings/widgets.test.ts` |
| AC-7 | auto: `takes its colors from Vivaldi's variables` | `tests/styles/settings-page.test.ts` |
| AC-8 | auto: `shows the four wave layouts as cards in order` | `tests/settings/WavesSection.test.ts` |
| AC-9 | live: `applies a wave layout from the settings page` | `tests/live/scenarios/applies-a-wave-layout-from-the-settings-page.live.ts` |
| AC-10 | auto: `marks the current theme among the five` | `tests/settings/ThemesSection.test.ts` |
| AC-11 | auto: `writes only the enabled option of a module` | `tests/settings/FeaturesSection.test.ts` |
| AC-12 | auto: `lists every module with a switch` | `tests/settings/FeaturesSection.test.ts` |
| AC-13 | auto: `copies the boot diagnostic` | `tests/settings/TroubleshootingSection.test.ts` |
| AC-14 | auto: `reads a saved choice back and falls back on a bad one` | `tests/settings/SettingsChoices.test.ts` |
| AC-15 | auto: `writes nothing in a private window` | `tests/settings/SettingsChoices.test.ts` |
| AC-16 | auto: `starts normally when the settings page is missing` | `tests/modules/settingspage/SettingsPage.test.ts` |
| AC-17 | auto: `shows the save notice and keeps the old choice` | `tests/settings/SettingsChoices.test.ts` |
| AC-18 | manual: look in light and dark | checklist T10 |
| AC-19 | auto: `builds and installs the settings page file` | `tests/release/BuildAssets.test.ts` and `tests/installer/test_payload.py` |
| AC-20 | auto: `draws the previews with the measured structure` | `tests/settings/WavesSection.test.ts` |
| AC-21 | manual: the page opens with `vivaldi.prefs` | checklist T10 |
| AC-22 | auto: `shows the workspace icon option from the current preference` | `tests/settings/WorkspaceIconOption.test.ts` |
| AC-23 | auto: `writes show_name from the workspace icon checkbox` | `tests/settings/WorkspaceIconOption.test.ts` |
| AC-24 | auto: `allows only listed window preferences` | `tests/modules/settingspage/WindowPrefsBridge.test.ts` |
| AC-25 | auto: `leaves the waves alone when the workspace icon changes` | `tests/settings/WorkspaceIconOption.test.ts` |
| AC-26 | auto: `writes no window preference in a private window` | `tests/modules/settingspage/WindowPrefsBridge.test.ts` |
| AC-27 | auto: `disables the workspace icon option when preferences cannot be set` | `tests/settings/WorkspaceIconOption.test.ts` |
| AC-28 | live: `the workspace button shows only its icon` | `tests/live/scenarios/the-workspace-button-shows-only-its-icon.live.ts` |

The scenario of AC-28 sets the preference with the window's `vivaldi.prefs`, the same call the bridge
makes (it needs no page file), reads the button through selectors `workspaceButton`,
`workspaceButtonName` and `workspaceButtonIcon` (added to the selector catalog if missing), asserts
that the name is gone and the icon stays, and restores `true` in a `finally`. The bridge and the
checkbox logic are covered by the `auto:` tests above.

AC-17 is checked on `SettingsChoices.set` returning `failed` and on the section keeping the previous
card checked.
