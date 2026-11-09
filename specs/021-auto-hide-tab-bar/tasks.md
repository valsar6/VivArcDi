# 021 Auto-hide tab bar: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes. Branch `features/auto-hide-tab-bar`, next minor version.

- [ ] **T1.** Preference found: `vivaldi.auto_hide.tab_bar` (2026-11-09). Remaining probe for Tore: set only that key to true on the normal layout and check the edge behavior and Cmd+S. Earlier text: diff `Preferences` before and after turning on the tab bar auto-hide in Vivaldi; record the key
  in the spec. Done when the key is in the spec's open questions.
- [ ] **T2.** Add the option to `shortcuts.json` and the `auto-hide.enabled` switch to `ShortcutTable`. Satisfies AC-4, AC-5. Done
  when `test_auto_hide_is_turned_on` and `test_auto_hide_is_left_alone_when_disabled` pass.
- [ ] **T3.** Add the `autoHideWrapper` and `panelBar` selectors, `BarHiddenWatcher` and the `tab-bar-tuning` module with its
  options. Satisfies AC-1 to AC-3. Done when its unit tests with a fake wrapper pass.
- [ ] **T4.** Write `tab-bar-tuning.scss` with the overlay variables and the panel bar rule. Satisfies AC-3, AC-6. Done when `make check` passes.
- [ ] **T5.** README and `docs/native-settings.md`, version bump.
- [ ] **T6.** Write the manual verification checklist for Tore from AC-1, AC-2, AC-3 and AC-6.
