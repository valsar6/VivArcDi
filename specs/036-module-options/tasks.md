# 036 Module options: tasks

| | |
|---|---|
| Status | Draft |
| Design | [design.md](design.md) |

Branch `fix/module-options`, with a patch version change in `package.json` and
`installer/vivarcdi/__init__.py`. Each task ends green on `make check`.

- [ ] **T1. Option kinds and schema.** `src/core/boot/options/`: `Option`, the five kinds,
  `OptionSchema`, `OptionValues`. Tests AC-1 to AC-7 in `tests/core/boot/options/OptionSchema.test.ts`.
  Confirm that `Module<PeekOptions>` fits `Module<object>` without `any`.
- [ ] **T2. Module and context.** `Module<O>`, `static options`, `ModuleContext<O>`, and `modules` typed
  as checked values. No module changes yet: every module keeps `OptionSchema.none` and reads its raw
  section as today.
- [ ] **T3. Boot.** `ModuleRegistry.createEnabled` requires `enabled === true` and reports non-boolean
  values; `VivArcDi.start` checks every known module's options, warns, skips modules with a missing
  required option, and fills `context.modules`. Tests AC-8 and AC-9.
- [ ] **T4. Simple modules.** Schemas for `copy-url`, `folder-preview`, `today-archive`,
  `sidebar-look`, `pinned-tabs`; remove their own checks; update their tests as listed in the design.
- [ ] **T5. Modules with nested settings.** `peek`, `little-arc`, `favorites-grid`; remove
  `settingsFrom` and `defaults`; update the tests that use them.
- [ ] **T6. Folder and sync modules.** `bookmark-folders` (with `WorkspaceRoots`), `live-folders`
  (required `githubClientId`), `workspace-sync`, and `reopen-pinned` reading checked `modules`.
  Keep 010/AC-8 green under its name.
- [ ] **T7. Shipped config.** `tests/core/boot/options/ShippedConfig.test.ts` (AC-10).
- [ ] **T8. Manual and docs.** Paragraph in `docs/manual/getting-started.md`; the `ModuleContext`
  section of `docs/architecture.md`.
- [ ] **T9. Version and checks.** Patch version change; `npm run release -- check --base origin/main
  --branch fix/module-options`; `make check`.
- [ ] **T10. Manual verification.** Checklist from AC-11 and AC-12 for Tore, on macOS and Debian.
  Then set the spec to `Implemented`.
