# 008 Folder hover preview: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Each task names the acceptance criteria it satisfies
and is done when its check passes.

- [ ] **T1.** `RelativeTime`: minutes, hours, days, months, years in a language. AC-1.
- [ ] **T2.** `PreviewRows`: sort by last opening with unrecorded links last; filter by title or
  address. AC-2, AC-3.
- [ ] **T3.** `PreviewSession`: text, highlight, `move`, `activate`. AC-4.
- [ ] **T4.** `FolderLinks`: links of a folder by id from the bookmark tree.
- [ ] **T5.** `FolderHover`: delay, rest and leave on closed folder rows.
- [ ] **T6.** `PreviewPanelView` and `folder-preview.scss`: panel, position, keys, favicon fallback.
- [ ] **T7.** `FolderPreview` module, registry, `config.json` and its stylesheet, README section, clean
  stop, version bump of the minor number on `features/folder-hover-preview`.
- [ ] **T8.** Manual verification checklist for Tore from AC-5 to AC-8
  (`phase-3/verifica-pannello-cartelle.md` in the project files).
- [ ] **T9.** Manual checks AC-5 to AC-8 on macOS and Debian.
