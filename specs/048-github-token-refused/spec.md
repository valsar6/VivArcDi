# 048 GitHub token refused

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Amends | [026 Live folders](../026-live-folders/spec.md) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Issue #205: the live folders stop showing pull requests and ask to log in to GitHub again. GitHub
had refused the token (answer 401, for example because the authorization was revoked on GitHub's
side). Spec 026 reacts by keeping the token, marking each folder `needsReconnect` and showing a
`Reconnect GitHub` row. Every later refresh, from the timer or from `Refresh`, sends the same dead
token again and gets 401 again, and the user is never told why the folders went quiet.

This spec makes a refusal final: the token is discarded, every live folder shows `Connect GitHub`,
and the window tells the user once, with a toast, that GitHub refused the connection and they must
sign in again. Why GitHub revokes a token is outside VivArcDi and out of scope.

## User stories

- **US-1.** As a user, I want a token that GitHub refused to be dropped, so that the live folders
  do not keep calling GitHub with it.
- **US-2.** As a user, I want to be told when GitHub refused the connection, so that I know to sign
  in again instead of wondering why the folders went empty.
- **US-3.** As a user with several windows, I want one notice, and I do not want a connection I just
  renewed in another window to be thrown away.

## Expected behavior

### Today

| Case | What happens | Where |
|---|---|---|
| GitHub answers 401 to a refresh | `GithubFailure.refused` is true; the folder keeps rows, gets the warning and `needsReconnect = true`; the token stays | `GithubPullRequests.ts` (`refused`), `LiveFolderRefresher.ts` `#load` (l. 134-138) |
| The next refresh (timer or `Refresh`) | Reads the same token and calls GitHub again, 401 again, forever | `LiveFolderRefresher.ts` `#refreshOne` (l. 119-123) |
| Folder with `needsReconnect` | First row is `Reconnect GitHub`, then the last rows | `LiveEntries.ts` `#children` (l. 54) |
| Folder without a token | Rows emptied, single `Connect GitHub` row | `LiveFolderRefresher.ts` l. 120-121, `LiveEntries.ts` l. 49-51 |
| The user is told | Only the warning mark on each folder; no toast | `LiveFolders.ts` |
| 403 and 429 | Rate limit: `GithubFailure` with `refused` false; the token is kept | `GithubPullRequests.ts` |
| Token storage | Read from storage at each use; `forget()` clears it and tells the listeners of this window; other windows see the change through the storage | `GithubConnection.ts` `token`, `forget`, `PersistentStorage` `onChanged` |

### After

**Discard.** When a refresh gets a refusal (401), the refresher compares the token it used with the
token stored now. If they are the same, the connection forgets it. Everything then follows the
existing path of a disconnected profile: the listener of `LiveFolders` publishes and refreshes
every folder, each folder is emptied and shows the single `Connect GitHub` row, and no more request
is sent. If the stored token differs (another window already forgot it, or the user reconnected
there), nothing is forgotten, and the folder is simply refreshed again with the current token by
the usual path.

**Notice.** Only the window that discarded the token shows a toast, kind `error`, through
`context.notices.show` ([041](../041-write-outcome/spec.md)): `GitHub refused the connection:
sign in again to use the live folders`, for the duration of the shared notices (8 s, `NOTICE_MS`).
It is shown once per refusal, not once per session: a second refusal after a new connection shows
it again. Windows that did not discard the token show nothing.

**Rate limit.** 403 and 429 keep the token, as today (the warning mark and the rows stay).

**`needsReconnect`.** A refusal no longer sets it. The field stays in the store, and the
`Reconnect GitHub` row stays in `LiveEntries`, so a profile that saved `needsReconnect = true`
before this version keeps working: its next refresh either succeeds (flag cleared) or is refused
(token discarded, `Connect GitHub`). Removing the field is a later cleanup.

**Menu and refresh.** `Refresh` from the folder menu and the periodic refresh go through the same
`#load`, so both discard.

## Requirements

### Functional

- **FR-1.** WHEN a refresh is refused by GitHub (401), the refresher SHALL ask the connection to
  forget the token it used, only if that token is still the stored one.
- **FR-2.** The connection SHALL offer that conditional forget and report whether it forgot.
  `forget()` keeps its behavior.
- **FR-3.** After the token is discarded, every live folder SHALL show the single `Connect GitHub`
  row and no request SHALL be sent until the user connects again.
- **FR-4.** The window that discarded the token SHALL show one `error` toast through
  `context.notices.show`, once per discard.
- **FR-5.** A window that finds the stored token different from the refused one SHALL discard
  nothing and show nothing.
- **FR-6.** A refusal SHALL NOT set `needsReconnect`; 403 and 429 SHALL keep the token.
- **FR-7.** Starting a window SHALL show no toast because of persisted state.

### Non-functional

- **NFR-1.** The token is never logged or put in the toast; the log line names no token.
- **NFR-2.** No new storage key, no new service: reuse `GithubConnection`, `LiveFolderRefresher`
  and `Notices`.
- **NFR-3.** Every existing test keeps its name and passes, except the test of 026/AC-23, which
  changes with the behavior (see Amends below).
- **NFR-4.** Ships on a `fix/` branch with a patch version change.

### Amends 026

026/AC-23 (`offers to reconnect when the token is refused`) says the folder keeps the token and
offers `Reconnect GitHub`. It is replaced by AC-1 to AC-3 below. The paragraph of 026 about
`Reconnect GitHub` after a refusal is superseded; the stored-flag row stays for old data only.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria).

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN GitHub answers 401 to a refresh, THE module SHALL forget the token used, and the folders SHALL show `Connect GitHub` | auto: `forgets the token when GitHub refuses it` |
| AC-2 | WHEN the token is forgotten, THE module SHALL send no further request until a new connection | auto: `stops calling GitHub after the token is refused` |
| AC-3 | IF GitHub answers 403 or 429, THEN THE module SHALL keep the token | auto: `keeps the token on a rate limit` |
| AC-4 | IF the stored token is not the one that was refused, THEN THE module SHALL keep the stored token and show no notice | auto: `keeps a token renewed in another window` |
| AC-5 | WHEN the module forgets a refused token, THE window SHALL show one error notice that GitHub refused the connection and the user must sign in again | auto: `tells the user once when GitHub refuses the token` |
| AC-6 | WHEN a new token is refused after a reconnection, THE window SHALL show the notice again | auto: `tells the user again after a new refusal` |
| AC-7 | WHEN the menu `Refresh` or the periodic refresh gets 401, THE module SHALL discard the token alike | auto: `discards the token on a refresh from the menu` |
| AC-8 | WHEN a window opens with `needsReconnect` saved and a token that is no longer refused, THE next refresh SHALL clear the flag and show no notice | auto: `clears the old reconnect flag on success` |
| AC-9 | WHEN GitHub refuses the token, THE toast SHALL read well in the interface | manual |

AC-9 is the only manual step. A `live:` scenario is not possible: a 401 needs a real GitHub account
and a revoked authorization, and the lab Vivaldi has no GitHub login, so the paths are covered by
tests with a fake GitHub.

## Out of scope

- Why GitHub revokes the token (GitHub-side).
- Narrowing the OAuth scope `repo` (Q-3).
- Removing `needsReconnect` and the `Reconnect GitHub` row.
- A toast at startup from persisted state (Q-2).
- Retrying, or refreshing the token automatically (the device flow gives no refresh token).

## Open questions

- [ ] **Q-1. Toast text and duration.** Recommendation: `GitHub refused the connection: sign in
  again to use the live folders`, kind `error`, `NOTICE_MS` (8 s) from the shared notices, no new
  duration.
- [ ] **Q-2. Notice at startup.** Should a window opened when the persisted state says refused also
  show it? Recommendation: no. After the change the state is simply "not connected", and the
  `Connect GitHub` row is the notice; the toast is for the moment of the refusal.
- [ ] **Q-3. Narrow the scope `repo`.** Recommendation: out of scope; a separate spec, since it
  changes what the user authorizes on GitHub.
- [ ] **Q-4. Rows after the discard.** The existing disconnected path empties the folder rows, so
  the last rows are not kept. Recommendation: accept it (same as `Disconnect GitHub`); the rows come
  back at the next connection.

## References

- Issue #205, "Live folder disconnects and asks for GitHub login again".
- [026 Live folders](../026-live-folders/spec.md), [040 Live folders writes](../040-live-folders-writes/spec.md),
  [041 Write outcome](../041-write-outcome/spec.md) (shared notices), [037](../037-versioned-storage/spec.md) (storage).
