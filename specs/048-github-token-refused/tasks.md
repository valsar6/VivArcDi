# 048 GitHub token refused: tasks

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `fix/token-refused`, with a patch version change in `package.json`, `package-lock.json` and
`installer/vivarcdi/__init__.py` (NFR-4). Each task ends green on `make check` and every existing
test keeps its name (NFR-3), except `offers to reconnect when the token is refused`, which T1
replaces.

Order and parallel work: nothing runs in parallel. T1 adds `forgetIf`, which T2 uses; T2 changes
the refresher, its fakes and `LiveFolders`, which T1 does not touch but depends on. Each runs alone
in its own `vivarcdi-implementer` worktree, T2 from the commit of T1. T3 and T4 are the lead's, T5
comes last.

- [ ] **T1. Conditional forget.** `GithubConnection.forgetIf(token)` with its JSDoc. Test
  `forgets only the token it is given` in `tests/modules/livefolders/GithubConnection.test.ts`.
  Small; it runs alone and first.
- [ ] **T2. Refresher discards and wiring.** `LiveFolderRefresher.ts`: `REFUSED_NOTICE`, the
  `notices` and `connection` dependency types, `#active`, `#empty`, `#refused`, the new `catch` in
  `#load`, the JSDoc. `LiveFolders.#build` passes `context.notices` to the refresher.
  `FakeConnection` in `tests/modules/livefolders/fakes.ts`; the `setup` of
  `LiveFolderRefresher.test.ts` builds it and a real `Notices` over `RecordingToast`. Satisfies
  AC-1 to AC-8 in `tests/modules/livefolders/LiveFolderRefresher.test.ts`: `forgets the token when
  GitHub refuses it` (replaces `offers to reconnect when the token is refused`), `stops calling
  GitHub after the token is refused`, `keeps the token on a rate limit`, `keeps a token renewed in
  another window`, `tells the user once when GitHub refuses the token`, `tells the user again after
  a new refusal`, `discards the token on a refresh from the menu`, `clears the old reconnect flag
  on success`. Also `shows the refusal notice through the module context` in
  `tests/modules/livefolders/LiveFolders.test.ts`. Runs alone, from the commit of T1.
- [ ] **T3. Review pass.** Not an implementation task: the lead runs `make check`, reads the diff
  against the design (no token in logs or toast, the 200-line and complexity limits, no other
  `needsReconnect` writer).
- [ ] **T4. Docs and version.** Owned by the lead: the 026 paragraph and AC-23 row, 026 design
  l. 204-206, `docs/manual/live-folders.md` `### Reconnect`, the patch bump checked with
  `npm run release -- check --base origin/main --branch fix/token-refused`.
- [ ] **T5. Manual check.** Italian checklist for AC-9 under
  `~/Desktop/sonde-vivarci/048-github-token-refused/`: connect GitHub in the lab or real profile,
  revoke VivArcDi in GitHub's settings (Authorized OAuth Apps), refresh a live folder from its menu
  and see the toast `GitHub refused the connection: sign in again to use the live folders` read well
  (8 seconds, error icon, not cut off), the folders show `Connect GitHub`, sign in again and the rows
  return. When Tore reports it green, the spec becomes `Implemented`.
