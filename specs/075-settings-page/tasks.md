# 075 VivArcDi Settings: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/settings-page`, with a minor version change (NFR-6). Strictly test first: in every
task the named tests or scenarios are written and seen red before the code that makes them pass.
Each task ends green on `make check` and every existing test keeps its name. The test and scenario
names below are identical to the criteria.

Order and parallel work: T1 runs alone and first. T2 follows T1. T3 and T4 are independent of each
other and can run in parallel from the commit that has T2, each in its own `vivarcdi-implementer`
worktree from the same base commit. T5 needs T2, T3 and T4 and runs alone. T6 is Tore's. T7, T8 and
T9 are independent and can run in parallel after T5. T8 is blocked by spec 074 (its wave service and
preview data). T10 is owned by the lead and comes last.

- [ ] **T1. Live scenarios first.** Write `tests/live/scenarios/opens-the-vivarcdi-settings-page.live.ts`
  (name `opens the VivArcDi Settings page`, AC-1) and
  `tests/live/scenarios/applies-a-wave-layout-from-the-settings-page.live.ts` (name
  `applies a wave layout from the settings page`, AC-9), both `spec: '075'`, so that
  `every live check has a scenario` in `tests/live/LiveChecks.test.ts` stops failing. They are real
  code: AC-1 triggers the shortcut, waits for a tab at `/vivarcdi/settings.html`, and fails with a
  clear message when the page does not load; AC-9 clicks the card in that page and reads
  `data-vivarcdi-wave` on the window's `body` (074 design) and compares it with the chosen id. In the lab they
  fail for now, because 046 cannot serve the file; that is the expected red. They pass once the
  follow-up spec for 046 (serve `vivarcdi/*.html` through CDP `Fetch`) exists; until then the proof
  is AC-21 by hand. Done when `LiveChecks.test.ts` is green; the scenarios are not run in CI.
- [ ] **T2. Build and install the page file (AC-19).** Red first: `builds and installs the settings page file` in
  `tests/release/BuildAssets.test.ts` (a `src/settings/settings.html` fixture ends in `dist/settings/`)
  and the same name in `tests/installer/test_payload.py` (the deployer copies a `dist/settings/` file
  into `vivarcdi/`). Then `scripts/build.mjs`: `AssetCopier` keeps `.html` as well as `.json`;
  `src/settings/settings.html` (the shell). Done when both tests are green and `make check` builds.
- [ ] **T3. Shell and registry (AC-2 to AC-4).** Red first in `tests/settings/SettingsApp.test.ts`:
  `lists the registered sections in order`, `shows a section registered by a module`,
  `keeps the other sections when one fails`. Then `src/settings/SettingsSection.ts`,
  `SettingsRegistry.ts`, `SettingsApp.ts`, `SettingsServices.ts`. Parallel with T4.
- [ ] **T4. Choices and storage (AC-14, AC-15, AC-17).** Red first in
  `tests/settings/SettingsChoices.test.ts`: `reads a saved choice back and falls back on a bad one`,
  `writes nothing in a private window`, `shows the save notice and keeps the old choice`. Then
  `src/settings/SettingsChoices.ts` over a `StoredFormat` for `vivarcdi.settings`. Parallel with T3.
- [ ] **T5. Widgets, main and the opener (AC-5, AC-6, AC-16).** Red first: `marks only the chosen card`
  and `draws a checkbox with its explanation` in `tests/settings/widgets.test.ts`;
  `starts normally when the settings page is missing` in `tests/modules/settingspage/SettingsPage.test.ts`.
  Then `src/settings/widgets/CardGroup.ts`, `CheckboxRow.ts`, `src/settings/main.ts` (with the
  `chrome.storage` and `vivaldi.prefs` test and its message), and
  `src/modules/settingspage/` (`SettingsPage`, `SettingsOpener`), registered in
  `src/modules/index.ts` and enabled in `src/config.json` with the `shortcut` option and its schema;
  `Notices.show` gains the optional `onClick`. Runs alone: it touches the registry and the config.
- [ ] **T6. Stylesheet and Tore looks (AC-7).** Red first: `takes its colors from Vivaldi's variables`
  in `tests/styles/settings-page.test.ts`. Then `src/styles/settings-page.scss` as in the design.
  **Tore looks:** the lead builds, Tore opens the page by eye in this prototype phase, in light and
  dark, and names what to change; the task ends only when Tore says the CSS is right. No other task
  waits for this one except T10's manual look.
- [ ] **T7. Features, Themes and Troubleshooting (AC-10 to AC-13).** Red first: `marks the current theme
  among the five` in `tests/settings/ThemesSection.test.ts`; `writes only the enabled option of a
  module` and `lists every module with a switch` in `tests/settings/FeaturesSection.test.ts`;
  `copies the boot diagnostic` in `tests/settings/TroubleshootingSection.test.ts`. Then the three
  sections, `SettingsOverrides.ts` wired into `VivArcDi.start`, and the `vivarcdi.diagnostic` write
  in the boot (not in private windows). Parallel with T8 and T9.
- [ ] **T8. Waves section (AC-8, AC-20). Blocked by spec 074.** Red first in
  `tests/settings/WavesSection.test.ts`: `shows the four wave layouts as cards in order` and
  `draws the previews with the measured structure` (a fake `WavesClient` gives `preview: { before, after }`; the test checks that the `before` rows are drawn above the page-area block and the `after` rows below it), Then
  `sections/WavesSection.ts`, `PreviewDrawing.ts`, `WavesClient.ts` and, in the window,
  `WavesBridge.ts` over `globalThis[Symbol.for('vivarcdi.waves')]` (tests of the bridge with a fake
  service in `tests/modules/settingspage/WavesBridge.test.ts`, named after the behavior they prove);
  after 074's service and its `Wave.preview` exist, `main.ts` registers the section. Done when AC-9's
  scenario can run against the real service. It also needs 074 to add `preview` to `Wave`.
- [ ] **T9. Docs.** `docs/architecture.md` gains the page, the registry and the storage key; the
  manual in `docs/manual/` a section on the settings page and its shortcut. Parallel with T7 and T8.
- [ ] **T10. Manual checklist and version (lead).** Italian checklist under
  `~/Desktop/sonde-vivarci/075-settings-page/`, built from the `manual` criteria: AC-18 (apri la
  pagina in tema chiaro e scuro su macOS e Debian e confrontala con le impostazioni di Vivaldi) and
  Q-7 (apri Impostazioni di Vivaldi > Tastiera, cerca `Cmd/Ctrl+Alt+,`, conferma che non è usata; se lo è, scegli un'altra combinazione e aggiorna il valore predefinito di `shortcut`) e AC-21 (usa la scorciatoia, la pagina si apre in una scheda, ha `vivaldi.prefs`, cambia una scelta e
  la rilegge dopo il riavvio). Then read the versions on `main` right before, bump the minor version
  in `package.json`, `package-lock.json` and `installer/vivarcdi/__init__.py`, and run
  `npm run release -- check --base origin/main --branch features/settings-page` and `make check`.
  When Tore reports AC-18 and AC-21 green, and the 046 follow-up has made AC-1 and AC-9 pass, the
  spec becomes `Implemented`.
