# 015 Peek for new-tab links: tasks

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable.

- [x] **T1.** `LinkClassifier`: `pinnedNewTab` and `anyNewTab` rules. Satisfies AC-6 to AC-9. Done
  when the four tests named in the spec pass.
- [x] **T2.** `Peek`, `PageScripts` and `config.json`: read, clamp and pass the options; defaults 90
  and 94. Done when the page policy carries both triggers.
- [x] **T3.** `PeekKeyMap` shortcut labels and `PeekPanel` button column in the order Close, Expand,
  Split, with tooltips. Satisfies AC-5.
- [x] **T4.** `peek.scss`: column outside the panel, narrow-window fallback, panel without toolbar.
- [x] **T5.** Version bump to 0.13.0 (feature) in `package.json`, `package-lock.json` and
  `installer/vivarcdi/__init__.py`; README section on the new options.
- [x] **T6.** Write the manual verification checklist for Tore from AC-1 to AC-5 (macOS and Debian).
- [x] **T7.** Manual checks AC-1 to AC-5 by Tore.
