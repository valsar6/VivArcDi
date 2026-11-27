# 073 Today titles styled like the folder rows: tasks

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Ordered, small and independently reviewable. Branch `fix/today-title-style` (patch), version read
from `main` just before opening the pull request.

- [ ] **T1.** Write the three live scenarios and watch them fail on the current code. Satisfies
  AC-1, AC-2, AC-5. Done when `npm run live -- --only 073` fails for the right reasons (13 px against
  14 px, 8 px against 4 px, off-center text).
- [ ] **T2.** `title style tokens are shared`, test first, then the tokens in `_tokens.scss` and their
  use in `folders.scss` and `sidebar-look.scss`. Satisfies AC-3, FR-1. Done when the test passes.
- [ ] **T3.** The `.title` alignment in `sidebar-look.scss` (`height: auto`, inline start). Satisfies
  AC-2, AC-5, FR-2. Done when the three scenarios pass.
- [ ] **T4.** Bump the patch version in `package.json` and `installer/vivarcdi/__init__.py`, set the
  spec to `Implemented`, run `make check`, and write the manual checklist for AC-4.
