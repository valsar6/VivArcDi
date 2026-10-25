# 000 Foundations: tasks

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Reconstructed from PR #1 and PR #5.

- [x] **T1.** Repository, license, native settings guide.
- [x] **T2.** Loader, module base class, registry, selector catalog, readiness, styles. AC-13 to AC-16.
- [x] **T3.** `activation-marker` module.
- [x] **T4.** `window.html` patcher, payload deployer, backups. AC-1, AC-4, AC-5.
- [x] **T5.** macOS and Debian platforms, update hooks, self staging. AC-6 to AC-8, AC-11.
- [x] **T6.** Commands `install`, `reapply`, `uninstall`, `status`. AC-2, AC-9, AC-10.
- [x] **T7.** Permission advice for macOS App Management. AC-12.
- [x] **T8.** TypeScript and SCSS build to `dist/`, CI publishing the `dist` branch. AC-3.
- [x] **T9.** Manual checks AC-17 and AC-19 on macOS (Tore, 2026-10-25).
- [ ] **T10.** Make the macOS update hook work despite App Management. AC-18, open question.
- [ ] **T11.** Manual checks AC-17 to AC-19 on Debian 13.
- [x] **T12.** Activation mark as a data attribute, found on Vivaldi 8.2 where the class was lost
  and no stylesheet applied. AC-20.
- [x] **T13.** Publish `.gitignore` on the `dist` branch, so `__pycache__` folders written by the
  installer do not dirty the user's checkout. AC-21.
