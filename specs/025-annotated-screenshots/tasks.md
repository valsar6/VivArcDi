# 025 Annotated screenshots: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/annotated-screenshots`, next minor version.

- [ ] **T1.** Probe for Tore: what Vivaldi's capture leaves (clipboard, file, nothing) and whether `window.html` can read it.
- [ ] **T2.** `AnnotationDocument` and `Renderer`. Satisfies AC-3, AC-4. Done when `keeps original pixels` and `undoes the last stroke` pass.
- [ ] **T3.** `ImageSource` implementations chosen by T1.
- [ ] **T4.** `EditorView`, `ImageOutput`, keys. Satisfies AC-1, AC-2.
- [ ] **T5.** Module, config, styles, README, version bump, `make check`.
- [ ] **T6.** Manual verification checklist for Tore from AC-1 and AC-2.
