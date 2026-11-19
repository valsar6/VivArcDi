# Agent instructions

Before changing code, read:

1. [CONTRIBUTING.md](CONTRIBUTING.md): the spec-driven workflow, the design principles and the style
   rules. They apply to every change.
2. [specs/README.md](specs/README.md): the index of specifications and the format of acceptance
   criteria.
3. The `spec.md`, `design.md` and `tasks.md` of the feature you work on.

Rules that are easy to miss:

- Implement only what an `Approved` spec describes. If the request is not covered, write or update
  the spec and stop for approval.
- Work in your own worktree and claim a spec number with its Draft pull request: see
  [Working in parallel](CONTRIBUTING.md#working-in-parallel).
- Keep test names identical to the `auto:` checks of the acceptance criteria, and scenario names
  identical to the `live:` checks.
- `npm run live` runs a lab copy of Vivaldi on a throwaway profile; run it only on a machine with
  Vivaldi and a desktop session, and only when the person you work for agrees. Use
  `npm run live -- --probe <file>` instead of asking for a probe pasted into DevTools.
- End the work with the manual verification checklist built from the `manual` criteria.
- Run `make check` before opening a pull request.
