# 075 VivArcDi Settings

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | |
| Related | [074 Toolbar waves](../074-toolbar-waves/spec.md) (a sibling Draft: it defines the tab bar section) |

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

- **Tab bar**: the four wave layouts of [074](../074-toolbar-waves/spec.md), as four cards: Ripple
  (Increspatura), Swell (Flutto), Breaking wave (Cavallone), Still water (Specchio d'acqua).
- **Themes**: the VivArcDi themes of [028](../028-arc-sidebar-look/spec.md),
  [029](../029-arc-light-theme/spec.md) and [051](../051-more-themes/spec.md).
- **Features**: every module of `config.json`, switchable ([036](../036-module-options/spec.md)).
- **Troubleshooting**: a copyable diagnostic from the boot self-check
  ([039](../039-boot-self-check/spec.md)) and a way to report a problem.

This spec defines the shell of the page and what every section must satisfy. It does not define the
content of any section beyond the tab bar section, which 074 owns.

**Not proven yet.** Vivaldi 8.3.4191.47 opens its settings as a tab at
`chrome-extension://<id>/components/settings/settings.html` (found in `resources/vivaldi/bundle.js`;
the file is not on disk, it is served virtually) and at `vivaldi:settings`. VivArcDi's payload is
injected only in `window.html` (`vivarcdi/loader.js`), so it is **not known** whether the payload can
add a section to Vivaldi's settings tab, nor whether a page of ours, installed under `vivarcdi/` and
opened in a tab, can reach the extension APIs it needs. A spike is running; [Q-1](#open-questions)
holds both options and waits for its result. Everything below that depends on the answer is marked.

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
| A user picks a tab bar layout | Not possible: no setting exists (074 adds one) | none |
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
- **FR-4.** The **Tab bar** section shows the four layouts of 074 as cards with a preview and a name;
  who owns the previews is [Q-6](#open-questions); the choice and its effect are 074's.
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
| AC-8 | THE Tab bar section SHALL show four cards named Ripple, Swell, Breaking wave and Still water | auto: `shows the four wave layouts as cards` |
| AC-9 | WHEN the user chooses a card of the Tab bar section, THE window SHALL store the choice and apply 074's layout without a restart | live: `applies a wave layout from the settings page` |
| AC-10 | THE Themes section SHALL mark the current VivArcDi theme and list the five themes of 051 | auto: `marks the current theme among the five` |
| AC-11 | WHEN the user switches a module in the Features section, THE page SHALL write its `enabled` option, and SHALL leave every other option as it was | auto: `writes only the enabled option of a module` |
| AC-12 | THE Features section SHALL list every module of the registry with its explanation | auto: `lists every module with a switch` |
| AC-13 | THE Troubleshooting section SHALL show the boot self-check summary and copy it on request | auto: `copies the boot diagnostic` |
| AC-14 | WHEN a choice is saved, THE next start SHALL read it back; a value that breaks its schema SHALL give the default and one warning | auto: `reads a saved choice back and falls back on a bad one` |
| AC-15 | WHILE the window is private, THE page SHALL show the choices and SHALL NOT write any | auto: `writes nothing in a private window` |
| AC-16 | IF the page cannot be reached, THEN THE window SHALL start as today, log one warning and show no blank tab | auto: `starts normally when the settings page is missing` |
| AC-17 | WHEN a save fails, THE page SHALL show the notice of 041 and keep the old choice drawn as chosen | auto: `shows the save notice and keeps the old choice` |
| AC-18 | WHEN Tore opens the page in light and in dark on macOS and Debian, THE page SHALL look like a section of Vivaldi's settings | manual |

AC-18 is the only manual step: whether a page "looks like Vivaldi's" cannot be asserted by a test; the
variables and structure are covered by AC-5 to AC-7.

## Out of scope

- The content of the Themes, Features and Troubleshooting sections beyond FR-5 to FR-7: previews,
  grouping of features, the format of the report. Each gets its own spec or a revision of this one.
- New themes, and any change to `theme apply` or the installer's theme flow.
- The wave layouts themselves and their stylesheet ([074](../074-toolbar-waves/spec.md)).
- Changing an option of a module other than `enabled` (a later spec, per module).
- Syncing the choices between devices, import and export of settings.
- Translations of the page (English only, like the rest of the interface).

## Open questions

- [ ] **Q-1. How the page is reached.** The spike decides; do not choose without its result.
  - **A. A section inside Vivaldi's own settings tab.** The page lives where users expect it, in
    Vivaldi's chrome and navigation. Needs the payload to run in that tab, which loads from
    `chrome-extension://<id>/components/settings/settings.html` and not from `window.html`, so it
    needs either a patch of that file (which is virtual, not on disk) or a second injection point.
    Fragile across Vivaldi versions and the least proven.
  - **B. A VivArcDi page under the resources `vivarcdi/` folder, opened in a tab.** The installer
    already deploys that folder ([016](../016-plug-and-play-installer/spec.md)); the page is ours and
    stable. Needs a URL a tab can open and the extension APIs for the choices (preferences, storage),
    which a plain page may not get.
  - *Recommendation:* B if the spike shows the page can reach `chrome.storage` and `vivaldi.prefs`
    (or can talk to the window payload); A only if B cannot and A is proven. Both are written so
    the shell (FR-1 to FR-3) is the same, and only the host differs.
- [ ] **Q-2. Where it opens from.** A button in the sidebar, a menu entry, a command (Quick Commands),
  or a link in the boot notice.
  *Recommendation:* a command plus a link in the boot notice of 039 for a broken start, and a
  button in the panel bar once the page exists; no tab bar button, which is crowded.
- [ ] **Q-3. Where choices are stored.** `config.json` is deployed by the installer and fetched
  read-only, so the payload cannot write it and a reinstall can overwrite it. `vivaldi.prefs` can set
  Vivaldi's own preferences but is not known to accept new keys. `chrome.storage.local` (037, 041)
  is writable, versioned and reports outcomes.
  *Recommendation:* VivArcDi's own choices (layout, module switches) in `chrome.storage.local` under
  one versioned key, read at boot over the `config.json` defaults; the theme stays in Vivaldi's
  preferences, written the way the installer does (read [029](../029-arc-light-theme/spec.md),
  [051](../051-more-themes/spec.md)) if `vivaldi.prefs.set` allows it, else the card shows the
  current theme and the command to change it.
- [ ] **Q-4. How sections register.** A static list in the page, or a registry the modules add to.
  *Recommendation:* a `SettingsSection` interface and a registry like `ModuleRegistry`
  (`src/modules/index.ts`), with an optional static `settingsSection` on a `Module`; the four
  sections of this spec are the first entries.
- [ ] **Q-5. How Vivaldi's look is reproduced.** Reuse Vivaldi's own settings CSS (only possible in
  option A, and tied to its class names), or own SCSS that reads Vivaldi's CSS variables.
  *Recommendation:* own SCSS in `src/styles/`, using Vivaldi's color variables and the dimensions
  measured from "Layout presets" and "Page appearance"; no copy of Vivaldi's stylesheet.
- [ ] **Q-6. Who owns the wave card previews.** 075 draws cards; 074 knows what a wave looks like.
  *Recommendation:* 074 supplies one preview per layout (an inline SVG that shares its tokens with
  the real stylesheet), 075 only places them in cards, so a layout and its preview change together.

## References

- Mockup: <https://claude.ai/artifact/1GZq7xVP3D6H8MKnRmXyuG>, section "Pagina Impostazioni VivArcDi".
- [074 Toolbar waves](../074-toolbar-waves/spec.md): the tab bar section (a sibling Draft, on its own branch).
- [036 Module options](../036-module-options/spec.md), [037 Versioned storage](../037-versioned-storage/spec.md),
  [038 Page scripts](../038-page-scripts/spec.md), [039 Boot self-check](../039-boot-self-check/spec.md),
  [041 Write outcome](../041-write-outcome/spec.md), [046 Live verification](../046-live-verification/spec.md).
- [028](../028-arc-sidebar-look/spec.md), [029](../029-arc-light-theme/spec.md),
  [051](../051-more-themes/spec.md): the themes.
- `src/core/boot/VivArcDi.ts`, `src/loader.ts`, `src/core/browser/BrowserPrefs.ts`,
  `installer/vivarcdi/window_patch.py`, `installer/vivarcdi/theme.py`.
