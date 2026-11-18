# 045 No downgrade: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/no-downgrade`, with a patch version change in `package.json`, `package-lock.json` and
`installer/vivarcdi/__init__.py`. Each task ends green on `make check`. T2 to T4 all touch
`commands.py`, so they run one after the other; T5 and T6 touch other files and can run in parallel
with them once T1 is merged.

- [x] **T1. Version guard.** `versions.py` with `VersionGuard` and `read_staged_version`;
  `PayloadDeployer.deployed_version`; `InstallationState.newer` and the new `needs_reapply`. Unit
  tests for the guard, including unreadable versions. Satisfies AC-10.
- [x] **T2. Install.** `--allow-downgrade` in `cli.py`, the check in `InstallCommand` before takeover
  and staging. Satisfies AC-1 to AC-3.
- [x] **T3. Reapply.** `apply(keep_payload=True)` for newer payloads, the warning for an older stage.
  Satisfies AC-4 to AC-7.
- [x] **T4. Status.** Versions per build and the staged line. Satisfies AC-8.
- [x] **T5. App.** `BuildState.NEWER`, its label, the presenter warning and the disabled actions.
  Satisfies AC-11.
- [x] **T6. Debian package.** `--allow-downgrade` in `postinst`. Satisfies AC-9.
- [x] **T7. Docs and version.** The option and the refusal in the installer section of `README.md`; patch
  bump checked with `npm run release -- check --base origin/main --branch fix/no-downgrade`.
- [ ] **T8. Manual check.** Italian checklist for AC-12 and AC-13 under
  `~/Desktop/sonde-vivarci/045-no-downgrade/`, macOS and Debian. When it is green the spec becomes
  `Implemented`.
