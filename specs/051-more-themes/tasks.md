# 051 More Arc themes: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/more-themes` (minor), version read from `main`
just before opening the pull request. Tests are written first and keep the names of the criteria.

- [x] **T1.** Probe on a lab Vivaldi (`npm run live -- --probe <file>`, with Tore's agreement): is
  `vivaldi.themes.current` readable through `vivaldi.prefs` and does `onChanged` fire when the theme
  changes; which elements and classes carry the window and the bars while Automatically hide UI is
  on, and what happens to the marks of `#browser` when the mode toggles. Satisfies AC-9, AC-16.
  Done: the design records the answers (preference readable, `onChanged` present, hidden-UI class and wrapper).
- [ ] **T2.** Add the hidden-UI selectors found in T1 to `src/selectors/8.1.json` and
  `tests/live/selector-states.json`. Satisfies AC-16. Done when the selector check passes.
- [ ] **T3.** `theme.json` as a catalog and `ThemeCatalog`; `ThemeService.apply(theme_id)` upserting
  all five themes, `restore`, `list`. Satisfies AC-1 to AC-7, AC-13, AC-14. Done when
  `applies the chosen theme with a backup`, `applies the light theme by default`,
  `refuses an unknown theme id`, `lists the themes with their credit`, `every theme credits vivalarc`,
  `restores the theme from before the first apply`, `refuses to change the theme while vivaldi runs`,
  `installs all themes and selects the chosen one` and `upserts a theme that is already installed`
  pass, and no Preferences file receives a `credit` key.
- [ ] **T4.** CLI: `theme list`, `theme apply --theme <id>`, `install --theme <id>`, and the question
  at the end of `install` ("Which theme should Vivaldi start with?"). Adapts the test of 029/AC-8.
  Satisfies AC-15. Done when `install asks which theme starts as current` passes and the 029 test
  `install offers the arc light theme` is renamed or replaced, with a line in spec 029 pointing to 051.
- [ ] **T5.** The four palettes in `Palettes.ts` and `ThemePalettes`. Satisfies AC-8. Done when
  `arc theme palettes keep readable text` passes for every stop and pill.
- [ ] **T6.** Move the marks into `LookMarks` and make `SidebarLook` choose the palette from the
  current theme, follow its changes, and re-apply the marks when Vivaldi removes them. Satisfies AC-9,
  AC-16. Done when `theme apply selects the matching palette` and `palette stays applied with the ui hidden`
  pass and the existing `SidebarLook` tests still pass.
- [ ] **T7.** Stylesheet: dark tokens, the revealed bars of hidden UI in gradient and flat mode.
  Satisfies AC-16, AC-17. Done when the style tests pass and `npm run build` is clean.
- [ ] **T8.** README: `palette` option table, a "Themes" table in Credits with each inspiration and a
  link to VivalArc by tovifun; adjust `theme.json` and palette values after Tore sees them.
  Satisfies AC-10. Done when `readme credits the vivalarc themes` passes.
- [ ] **T9.** Bump the version in `package.json` and `installer/vivarcdi/__init__.py` (minor), run
  `make check`, open the pull request, set the spec to `Implemented` when merged.
- [ ] **T10.** Write the manual verification checklist for Tore from the `manual` criteria (AC-11,
  AC-12, AC-17): apply each theme, restart, check menus, address field, panels and tab bar; F10 with
  each theme and the pointer at the edges; `theme restore`.
