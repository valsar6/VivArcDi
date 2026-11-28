# 075 VivArcDi Settings

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | Tore, 2026-11-28 (in chat) |
| Related | [074 Toolbar waves](../074-toolbar-waves/spec.md) (a sibling Draft: it defines the tab bar section); [076 Compact Breaking wave](../076-compact-breaking-wave/spec.md) (a separate Draft) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

VivArcDi has no place of its own in the interface. Its options live in `src/config.json`, its themes
are chosen with `theme apply` on the command line (029, 051), and a problem leaves one console line
(039). Tore wants a **VivArcDi Settings** page that lives inside Vivaldi and looks like Vivaldi's own
settings pages: uppercase section headings with a rule, a short description, cards with a preview and
a name below them and a check mark on the chosen one, and checkboxes with a gray explanation (as in
Vivaldi's "Layout presets" and "Page appearance"). Mockup: section "Pagina Impostazioni VivArcDi" of
<https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG>; only the tab bar section is defined, the other
entries are examples.

The page is the home of four sections:

- **Tab bar**: a checkbox "Show only the icon of the workspace" (Italian: "Mostra solo l'icona dello spazio di lavoro"), and the four wave layouts of [074](../074-toolbar-waves/spec.md), as four cards, in this order,
  from no effect to the most customized interface: Still water (Specchio d'acqua), Ripple
  (Increspatura), Swell (Flutto), Breaking wave (Cavallone). The four icons are approved by Tore.
- **Themes**: the VivArcDi themes of [028](../028-arc-sidebar-look/spec.md),
  [029](../029-arc-light-theme/spec.md) and [051](../051-more-themes/spec.md).
- **Features**: every module of `config.json`, switchable ([036](../036-module-options/spec.md)).
- **Troubleshooting**: a copyable diagnostic from the boot self-check
  ([039](../039-boot-self-check/spec.md)) and a way to report a problem.

This spec defines the shell of the page and what every section must satisfy. It does not define the
content of any section beyond the tab bar section, which 074 owns.

**Spike results (lab Vivaldi 8.3.4191.47, 2026-11-28).**

- Vivaldi's settings tab is `chrome://settings/` (element `<settings-ui>`, with a shadow root);
  `vivaldi://settings` opens it too. The form `chrome-extension://<id>/components/settings/settings.html`
  does not exist in the lab.
- Inside that tab `vivaldi.prefs` does not exist (only `vivaldi.themePrivate`).
  `chrome.scripting.executeScript` is refused ("Extension manifest must request permission to access
  this host") and `chrome.tabs.executeScript` does not exist. `webview.executeScript` worked only when
  the tab was opened as `chrome://settings/`, never with `vivaldi://settings` (3 of 3, cause unknown).
- Pages shipped in Vivaldi's resources (welcome, private-intro, mail, devtools) open as normal tabs with
  `chrome.tabs.create({url: 'chrome-extension://<id>/<path>'})` and have `chrome`, `chrome.tabs`,
  `chrome.storage`, `vivaldi` and `vivaldi.prefs`.
- A new file under `vivarcdi/` is **not proven**: the lab copy has no `vivarcdi` folder (its payload is
  served from 127.0.0.1 and injected through CDP), and adding a file to the lab copy breaks its code
  signature.
- Read in the code: `scripts/build.mjs` (`StaticAssets`, line 167) copies only `.json` files from
  `src/` to `dist/`, so a `.html` file is not built today; `PayloadDeployer.deploy`
  (`installer/vivarcdi/payload.py`) copies the whole `dist/` folder with `copytree`, so any file the
  build puts there is installed.

Adding a section to Vivaldi's settings tab (option A of [Q-1](#open-questions)) is therefore fragile.
Option B needs two proofs, listed in Q-1.

## User stories

- **US-1.** As a user, I want one page inside Vivaldi where I choose how VivArcDi looks and which
  features are on, so that I never edit `config.json` or type a command.
- **US-2.** As a user, I want the page to look like Vivaldi's own settings, in light and dark, so that
  it feels part of the browser.
- **US-3.** As a user with a problem, I want to copy a diagnostic and know where to report it, so that
  a bug report starts from facts.
- **US-4.** As a developer of a module, I want to add a section to the page by registering it, so
  that the page does not change each time a feature gains an option.

## Expected behavior

### Today

| Case | What happens | Where |
|---|---|---|
| A user turns a module off | Edits `enabled` in the deployed `config.json`; the next reinstall can overwrite it | `src/config.json`, `src/core/boot/VivArcDi.ts` (reads `config.json` at boot) |
| A user changes the theme | Runs `theme apply` in a terminal; the installer writes Vivaldi's preferences | `installer/vivarcdi/theme.py`, specs 029 and 051 |
| The workspace switcher shows the icon and the name | Vivaldi has a native preference for icon only, `vivaldi.workspaces.button.show_name` (boolean, default `true`; `false` shows the icon only, no CSS needed), but VivArcDi has no control for it | none |
| A user picks a tab bar layout | Not possible: no setting exists (074 adds the service `globalThis[Symbol.for('vivarcdi.waves')]` with `{waves, current, needsConfirmation, choose, onChange}`, and marks `body` with `data-vivarcdi-wave`) | none yet |
| A user asks "why is it half working" | Reads the console summary line `VivArcDi:boot` | spec 039 |
| The payload reads preferences | Only reads, and follows changes; has no method that writes | `src/core/browser/BrowserPrefs.ts` |
| The payload stores its own data | `PersistentStorage` over `chrome.storage.local`, under `vivarcdi.*` keys, versioned and with a write outcome | specs 037 and 041 |
| The payload runs | Only in `window.html`, loaded by `vivarcdi/loader.js`; page scripts run in web pages | `src/loader.ts`, `installer/vivarcdi/window_patch.py`, `src/page/` (038) |

### After

**The page.** A page titled "VivArcDi Settings" that Vivaldi's user opens from one entry point
([Q-2](#open-questions)). It has a navigation list on the left and the sections on the right, in the
layout of Vivaldi's settings. Section headings are uppercase with a rule below; each has a short
description. Choices that exclude each other are **cards** (a preview, the name below, a check mark on
the chosen one); independent choices are **checkboxes** with a gray explanation. Colors, type and
spacing follow Vivaldi's own, in the light and in the dark theme ([Q-5](#open-questions)).

**The workspace icon option.** The Tab bar section also holds one checkbox in Vivaldi's own style (a
label and a gray explanation line, like Vivaldi's "Force dark theme"): **Show only the icon of the
workspace** (Italian: Mostra solo l'icona dello spazio di lavoro), explained as "The workspace button
shows its icon without the name." It is **independent of the waves** of 074 and of
[076](../076-compact-breaking-wave/spec.md): no wave sets it and none reads it. Checked writes
`vivaldi.workspaces.button.show_name` as `false`; unchecked writes `true`; opening the page reads the
current value. Vivaldi applies it at once; that is expected, and unproven for this preference (the
spike showed it for the toolbar lists), so a `live:` scenario proves it. The page reaches the
preference through the same `chrome.runtime` channel as the waves, generalised to **window
preferences** with an allow-list of the keys the page may read and write; today it holds only this
key. In a private window the box shows the value and is disabled. When the preference or `set` is
unavailable, the box is disabled with its reason.

**Sections as a registry.** The page knows no section by name. Each section is an object that gives an
id, a title, a description and a way to draw itself and to read and write its choice. The four sections
register themselves; a module that wants a section registers one the same way
([Q-4](#open-questions)).

**Choices.** A choice is saved when made, with no Save button, and applies without a restart where the
feature allows it. Where a choice is stored depends on what it controls ([Q-3](#open-questions)): the
tab bar layout and the feature switches are VivArcDi's own; the theme is Vivaldi's, and today the
installer writes it.

**Private windows.** The page changes no stored choice from a private window, in line with
`privateWindows = 'never'` of modules that store data. There it shows the current choices and says
that changes are off.

**When the page cannot be reached.** If the page cannot be opened or loaded, VivArcDi starts and works
as today with the choices already stored, one `warn` line is logged, and the entry point is hidden or
shows one notice (041) instead of a blank tab. No section throws into another.

**Tests first.** Every acceptance criterion below has a named check that is written and seen red
before the code that makes it pass.

## Requirements

### Functional

- **FR-1.** A page "VivArcDi Settings" opens from one entry point and shows the sections in a
  navigation list and a content area.
- **FR-2.** The page draws headings, descriptions, cards and checkboxes in the way of Vivaldi's own
  settings, in light and dark.
- **FR-3.** Sections are objects in a registry; the page draws whatever the registry holds, in
  registration order, and a module can add one.
- **FR-4.** The **Tab bar** section shows the four layouts of 074 as cards with a preview and a name, in the order Still water, Ripple, Swell, Breaking wave;
  who owns the previews is [Q-6](#open-questions); the choice and its effect are 074's. The page lives in
  another document than the window, so it reaches 074's service through a message bridge that 075
  owns (design, Waves bridge); when 074 does not publish its service, the section is absent.
- **FR-5.** The **Themes** section shows the VivArcDi themes of 051 as cards and marks the current one;
  it adds no new theme.
- **FR-6.** The **Features** section lists every module of `config.json` with a checkbox and its
  explanation, and writes its `enabled` option within the schema of 036.
- **FR-7.** The **Troubleshooting** section shows the diagnostic of the boot self-check of 039 in a
  box with a **Copy** button, and a **Report a problem** link.
- **FR-8.** A choice is saved when made and read back at the next start; a value that breaks its
  schema falls back to the default with a warning, as in 036.
- **FR-9.** In a private window no choice is written.
- **FR-10.** When the page cannot be reached, the rest of VivArcDi is unaffected (see After).
- **FR-11.** The **Tab bar** section holds the checkbox **Show only the icon of the workspace**, with a
  gray explanation, independent of the wave cards; it reads `vivaldi.workspaces.button.show_name`
  when the page opens and shows it checked when the value is `false`.
- **FR-12.** Checking the box writes `show_name` as `false`; unchecking it writes `true`. Neither
  writes anything else, and the waves of 074 are untouched.
- **FR-13.** The page reads and writes window preferences only through the message bridge, which
  accepts a key only if it is on an allow-list; the list holds `vivaldi.workspaces.button.show_name`
  and nothing else.
- **FR-14.** In a private window the box shows the value and is disabled, and the bridge refuses the
  write. When the preference or its `set` is unavailable, the box is disabled and says why.

### Non-functional

- **NFR-1.** A user who never opens the page sees no change and pays no cost at start beyond the entry
  point.
- **NFR-2.** The page works offline and loads nothing from the network.
- **NFR-3.** No new stored value is written without a version (037) and a write outcome (041); a failed
  save shows the notice of 041.
- **NFR-4.** The shell uses no Vivaldi class names that are not in the selector catalog for the
  running version (070); it reads colors from Vivaldi's own variables where they exist.
- **NFR-5.** Every section can be tested without Vivaldi, with the fakes of `tests/loader/fakes.ts`.
- **NFR-6.** Ships on a `features/` branch with a minor version change.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). `auto` names a unit test, `live` a scenario of
`npm run live` (spec 046), `manual` a step Tore performs. Each check is written red before the code.
The `live` checks wait for the spike of [Q-1](#open-questions); their scenarios are named now so the
red tests exist first.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user uses the entry point, THE window SHALL open the page "VivArcDi Settings" | live: `opens the VivArcDi Settings page` |
| AC-2 | THE page SHALL list the registered sections in registration order, in the navigation and in the content | auto: `lists the registered sections in order` |
| AC-3 | WHEN a module registers a section, THE page SHALL show it without a change to the page | auto: `shows a section registered by a module` |
| AC-4 | IF a section throws while drawing, THEN THE page SHALL show the others and one line naming the section in the console | auto: `keeps the other sections when one fails` |
| AC-5 | THE page SHALL draw a card choice with a preview, a name and a check mark on the chosen card only | auto: `marks only the chosen card` |
| AC-6 | THE page SHALL draw a checkbox choice with its gray explanation | auto: `draws a checkbox with its explanation` |
| AC-7 | WHILE Vivaldi uses the dark theme, THE page SHALL use Vivaldi's dark colors, and the light ones otherwise | auto: `takes its colors from Vivaldi's variables` |
| AC-8 | THE Tab bar section SHALL show four cards named, in this order, Still water, Ripple, Swell and Breaking wave | auto: `shows the four wave layouts as cards in order` |
| AC-9 | WHEN the user chooses a card of the Tab bar section, THE window SHALL store the choice and set `data-vivarcdi-wave` on the window's body to the chosen id, without a restart | live: `applies a wave layout from the settings page` |
| AC-10 | THE Themes section SHALL mark the current VivArcDi theme and list the five themes of 051 | auto: `marks the current theme among the five` |
| AC-11 | WHEN the user switches a module in the Features section, THE page SHALL write its `enabled` option, and SHALL leave every other option as it was | auto: `writes only the enabled option of a module` |
| AC-12 | THE Features section SHALL list every module of the registry with its explanation | auto: `lists every module with a switch` |
| AC-13 | THE Troubleshooting section SHALL show the boot self-check summary and copy it on request | auto: `copies the boot diagnostic` |
| AC-14 | WHEN a choice is saved, THE next start SHALL read it back; a value that breaks its schema SHALL give the default and one warning | auto: `reads a saved choice back and falls back on a bad one` |
| AC-15 | WHILE the window is private, THE page SHALL show the choices and SHALL NOT write any | auto: `writes nothing in a private window` |
| AC-16 | IF the page cannot be reached, THEN THE window SHALL start as today, log one warning and show no blank tab | auto: `starts normally when the settings page is missing` |
| AC-17 | WHEN a save fails, THE page SHALL show the notice of 041 and keep the old choice drawn as chosen | auto: `shows the save notice and keeps the old choice` |
| AC-18 | WHEN Tore opens the page in light and in dark on macOS and Debian, THE page SHALL look like a section of Vivaldi's settings | manual |
| AC-19 | THE build SHALL put the settings page file in `dist/`, and the installer SHALL copy it into the install's `vivarcdi/` folder | auto: `builds and installs the settings page file` |
| AC-20 | THE wave card previews SHALL follow the measured structure of 074: full-width rows for Workspace and NewTab, a horizontal group for the small buttons, flexible spacers, with `before` drawn above the page area and `after` below it | auto: `draws the previews with the measured structure` |
| AC-21 | WHEN Tore uses the entry point on his install, THE opened page SHALL have `vivaldi.prefs` and read and write a choice | manual |
| AC-22 | WHEN the page opens, THE Tab bar section SHALL show the checkbox "Show only the icon of the workspace" with its gray explanation, checked when `show_name` is `false` | auto: `shows the workspace icon option from the current preference` |
| AC-23 | WHEN the user checks the box, THE page SHALL write `show_name` as `false`, and WHEN the user unchecks it, as `true` | auto: `writes show_name from the workspace icon checkbox` |
| AC-24 | THE bridge SHALL read and write only the window preferences on its allow-list, and SHALL refuse any other key | auto: `allows only listed window preferences` |
| AC-25 | WHEN the workspace icon option changes, THE page SHALL NOT read, write or change the wave choice | auto: `leaves the waves alone when the workspace icon changes` |
| AC-26 | WHILE the window is private, THE bridge SHALL refuse a preference write and THE box SHALL be disabled | auto: `writes no window preference in a private window` |
| AC-27 | IF the preference or its `set` is unavailable, THEN THE box SHALL be disabled with its reason | auto: `disables the workspace icon option when preferences cannot be set` |
| AC-28 | WHEN `show_name` is `false`, THE workspace button SHALL show its icon and not its name, and WHEN restored to `true` the name SHALL return | live: `the workspace button shows only its icon` |

AC-18 is the manual step for the look: whether a page "looks like Vivaldi's" cannot be asserted by a
test; the variables and structure are covered by AC-5 to AC-7. AC-21 is the second manual step and
answers a different behavior, the reach of the page: the lab copy cannot hold a new file under
`vivarcdi/` (see Q-1), so it is proven on Tore's install until the harness change below lands.

## Out of scope

- The content of the Themes, Features and Troubleshooting sections beyond FR-5 to FR-7: previews,
  grouping of features, the format of the report. Each gets its own spec or a revision of this one.
- New themes, and any change to `theme apply` or the installer's theme flow.
- The wave layouts themselves and their stylesheet ([074](../074-toolbar-waves/spec.md)).
- Any other window preference on the page; the allow-list grows only by a revision of this spec.
- CSS for the icon-only workspace button: Vivaldi's own preference does it.
- Changing an option of a module other than `enabled` (a later spec, per module).
- Syncing the choices between devices, import and export of settings.
- Translations of the page (English only, like the rest of the interface).

## Open questions

- [x] **Q-1. How the page is reached.** Evidence in [Spike results](#summary).
  - **A. A section inside Vivaldi's own settings tab (`chrome://settings/`).** The page lives where
    users expect it. Fragile: no `vivaldi.prefs` there, `chrome.scripting.executeScript` refused,
    `webview.executeScript` worked only for the `chrome://settings/` form and never for
    `vivaldi://settings`, cause unknown.
  - **B. A VivArcDi page under the resources `vivarcdi/` folder, opened as a tab** with
    `chrome.tabs.create({url: 'chrome-extension://<id>/vivarcdi/<page>.html'})`. Vivaldi's own shipped
    pages open this way and have `chrome.storage` and `vivaldi.prefs`. The page is ours and stable.
  - *Recommendation:* B, with two proofs before Approved. **Proof 1**, the file is built and
    installed: today the build copies only `.json` and the installer copies all of `dist/`, so the
    build needs to also copy the page; proven by AC-19. **Proof 2**, the page opens with
    `vivaldi.prefs`: proven on Tore's install by AC-21 (manual), because the lab cannot hold the file.
    Dependency, not written here: a change to [046](../046-live-verification/spec.md) that serves
    `vivarcdi/*.html` in the lab through CDP `Fetch` interception, so Proof 2 can later become a
    `live:` check. A stays as the fallback only if B fails Proof 2.
  Answered (Tore, 2026-11-28): approved with the spec on 2026-11-28, with the recommendation: option B, an own page under `vivarcdi/`, with its two proofs (AC-19 auto, AC-21 manual on Tore's install).

- [x] **Q-2. Where it opens from.** A button in the sidebar, a menu entry, a command (Quick Commands),
  or a link in the boot notice.
  *Recommendation:* a command plus a link in the boot notice of 039 for a broken start, and a
  button in the panel bar once the page exists; no tab bar button, which is crowded.
  Answered (Tore, 2026-11-28): approved with the spec on 2026-11-28, with the recommendation: a command plus a link in the boot notice, and a panel bar button later.

- [x] **Q-3. Where choices are stored.** `config.json` is deployed by the installer and fetched
  read-only, so the payload cannot write it and a reinstall can overwrite it. `vivaldi.prefs` can set
  Vivaldi's own preferences but is not known to accept new keys. `chrome.storage.local` (037, 041)
  is writable, versioned and reports outcomes.
  *Recommendation:* VivArcDi's own choices (layout, module switches) in `chrome.storage.local` under
  one versioned key, read at boot over the `config.json` defaults; the theme stays in Vivaldi's
  preferences, written the way the installer does (read [029](../029-arc-light-theme/spec.md),
  [051](../051-more-themes/spec.md)) if `vivaldi.prefs.set` allows it, else the card shows the
  current theme and the command to change it.
  Answered (Tore, 2026-11-28): approved with the spec on 2026-11-28, with the recommendation: `chrome.storage.local` under one versioned key; the theme in Vivaldi's preferences.

- [x] **Q-4. How sections register.** A static list in the page, or a registry the modules add to.
  *Recommendation:* a `SettingsSection` interface and a registry like `ModuleRegistry`
  (`src/modules/index.ts`), with an optional static `settingsSection` on a `Module`; the four
  sections of this spec are the first entries.
  Answered (Tore, 2026-11-28): approved with the spec on 2026-11-28, with the recommendation: a `SettingsSection` interface and a registry.

- [x] **Q-5. How Vivaldi's look is reproduced.** Reuse Vivaldi's own settings CSS (only possible in
  option A, and tied to its class names), or own SCSS that reads Vivaldi's CSS variables.
  *Recommendation:* own SCSS in `src/styles/`, using Vivaldi's color variables and the dimensions
  measured from "Layout presets" and "Page appearance"; no copy of Vivaldi's stylesheet.
  Answered (Tore, 2026-11-28): approved with the spec on 2026-11-28, with the recommendation: own SCSS over Vivaldi's CSS variables.

- [x] **Q-6. Who owns the wave card previews.** 075 draws cards; 074 knows what a wave looks like.
  *Recommendation:* 074 supplies one preview per layout in its wave data (`Wave.preview`, `{before, after}`:
  rows above and below the tab strip, of rows, groups and spacers; requirement of 075 on 074, see the design) and owns the data; the previews follow the measured structure (full-width rows
  for Workspace and NewTab, a horizontal group for small buttons, flexible spacers; AC-20). 075 only
  places them in cards, in the order of the Summary, so a layout and its preview change together.
  Answered (Tore, 2026-11-28): approved with the spec on 2026-11-28, with the recommendation: 074 owns the previews and the data, 075 places them.
- [ ] **Q-7. The shortcut that opens the page.** Default `Mod+Alt+,`, a `settings-page` option of
  `src/config.json` that the user can change. Free in VivArcDi (it uses Cmd+Opt+[ and ], Cmd+Opt+N,
  Cmd+Shift+K, Cmd+T, spec 014); **to confirm in Vivaldi**, whose own shortcut table is inside the
  browser and cannot be read from its resources or `vivaldi.prefs`. Tore accepts it only if free: the
  manual checklist has a step to search the combination in Vivaldi Settings > Keyboard and, if it is
  taken, to choose another and update the default.
- [x] **Q-8. Where the icon-only option is stored.** Answered (Tore, 2026-11-28, in chat; scope
  change): in Vivaldi's own preference `vivaldi.workspaces.button.show_name`, not in VivArcDi's
  storage, so Vivaldi's own settings and the page always agree; nothing of ours to migrate or back up.
  AC-28 is the only live check of it and does not need the page file, so it can run in the lab today.

## References

- Mockup: <https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG>, section "Pagina Impostazioni VivArcDi".
- [074 Toolbar waves](../074-toolbar-waves/spec.md): the tab bar section; its design fixes the service, the marker `data-vivarcdi-wave` and the wave data.
- [076 Compact Breaking wave](../076-compact-breaking-wave/spec.md): a separate Draft, related only.
- [036 Module options](../036-module-options/spec.md), [037 Versioned storage](../037-versioned-storage/spec.md),
  [038 Page scripts](../038-page-scripts/spec.md), [039 Boot self-check](../039-boot-self-check/spec.md),
  [041 Write outcome](../041-write-outcome/spec.md), [046 Live verification](../046-live-verification/spec.md).
- [028](../028-arc-sidebar-look/spec.md), [029](../029-arc-light-theme/spec.md),
  [051](../051-more-themes/spec.md): the themes.
- `src/core/boot/VivArcDi.ts`, `src/loader.ts`, `src/core/browser/BrowserPrefs.ts`,
  `installer/vivarcdi/window_patch.py`, `installer/vivarcdi/theme.py`.
