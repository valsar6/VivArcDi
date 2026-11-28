# 073 Today titles aligned like the folder rows: tasks

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Branch `fix/today-title-style` (patch), version read
from `main` just before opening the pull request.

- [x] **T1.** Write the three live scenarios and watch them fail on the current code. Satisfies
  AC-1, AC-2, AC-5. Done: the alignment scenario failed (6.75 px off center, 4 px against 8 px); the
  other two pass because font and color already match.
- [x] **T2.** Dropped by the amendment of 2026-11-27: the title style tokens would have changed the
  Arc look.
- [x] **T3.** The `.title` alignment in `sidebar-look.scss` (`height: auto`, inline start). Satisfies
  AC-2, AC-5, FR-2. Done: the three scenarios pass.
- [x] **T4.** Bump the patch version in `package.json` and `installer/vivarcdi/__init__.py`, set the
  spec to `Implemented`, run `make check`, and write the manual checklist for AC-4.
