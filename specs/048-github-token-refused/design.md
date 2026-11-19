# 048 GitHub token refused: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

No new class and no new storage key (NFR-2). Three small changes in the `livefolders` module.

**The connection forgets conditionally.** `GithubConnection` gains `forgetIf(token)`: it reads the
stored token and, only when it equals `token`, calls `forget()` and returns `true`; otherwise it
returns `false` and writes nothing. The read, the comparison and the write run in one synchronous
call, so inside a window nothing can slip between them. `forget()` is unchanged, so `Disconnect
GitHub` behaves as before.

**The refresher discards on a refusal.** `#load` no longer marks the folder; on a `GithubFailure`
with `refused` it hands over to a new private method `#refused(id, secret)`:

- `forgetIf(secret)` is `true`: the folder is emptied in place (the same update as the
  not-connected path, now in a shared `#empty(id)`), one warning is logged without the token, and
  `notices.show(REFUSED_NOTICE, 'error')` runs. `forgetIf` has already told the listeners, so
  `LiveFolders.#connectionChanged` publishes and calls `refreshAll()`; that run finds no token for
  the other folders, empties them and sends no request (FR-3).
- `forgetIf(secret)` is `false`: another window already forgot the token or the user reconnected
  there. Nothing is forgotten and no notice is shown (FR-5); the folder is queued again with
  `refresh(id)` and the next run reads whatever token is stored now. If that token is refused too,
  the same rule applies to it, so the chain ends with the first token that is not refused or with
  no token.

A refusal no longer sets `needsReconnect` (FR-6); every other failure still sets the warning and
`needsReconnect: false`, as today. Success still clears the flag, which is what retires an old saved
`true` (AC-8). `LiveEntries` is untouched: it keeps the `Reconnect GitHub` row for old data.

**LiveFolders passes the shared notices.** `#build` takes `notices` from the context and gives the
refresher `notices: context.notices` (type `Pick<NoticeBoard, 'show'>`). The refresher shows the
notice with `show`, not `once`: the spec asks for one toast per discard, and a discard happens once
per token, so a second refusal after a new connection shows it again (AC-6) with no key to reset.

### Answers to the open doubts

- **A `refreshAll` requested during a running `#run`.** `SerialTask.request` (`SerialTask.ts`
  l. 22-26) sets `#again` when a run is active and runs once more in its `finally` (l. 29-35).
  `#run` reads and clears `#refreshAll` and `#pending` at its start (`LiveFolderRefresher.ts`
  l. 105-107), so a flag set during the run survives for the re-run. Verified: the discard does
  not need to loop by itself.
- **Folders still queued in the current run.** `#run` loops over ids and `#refreshOne` reads
  `connection.token` per folder (l. 119). After a discard the remaining folders see `null` and are
  emptied; the re-run repeats that without a request. Cheap and correct.
- **Two windows with the same dead token.** The first to be refused forgets the token (storage
  write) and shows the notice; the other finds `null` or a newer token in its storage copy, so
  `forgetIf` is `false`: no discard, no toast (AC-4). If the other window's copy has not yet received
  the storage change, it still sees the old token, forgets it again (the same value is written) and
  shows a second toast. This race lasts the time of a storage event; accepted. The opposite case, a
  window that reconnects in the same instant and has its fresh token erased by a stale copy, needs
  the same timing and costs the user one more sign-in; accepted.
- **A stopped module.** `stop()` clears the queue but a refresh in flight ends on its own
  (`stop` JSDoc). `#refused` must not queue a new run after `stop`, so the refresher keeps a private
  `#active` flag (set in `start`, cleared in `stop`) and `#refused` calls `refresh` only when it is
  set. The listener path is already guarded by `LiveFolders.#stopped`.

## Components

### `GithubConnection.ts` (132 lines, limit 200)

```ts
/**
 * Forgets the token only if it is still the stored one, and tells the listeners.
 *
 * @param token The token that was used and refused.
 * @returns Whether it was forgotten; false when the stored token differs or there is none.
 */
public forgetIf(token: string): boolean
```

Placed after `forget` (l. 86-92). About 8 lines. The JSDoc of the class gains no new claim.

### `LiveFolderRefresher.ts` (144 lines, limit 200; about 165 after)

| Where | Change |
|---|---|
| imports | `NoticeBoard` type from `../../core/dom/Notices.js` |
| top, after `defaultTicker` (l. 26-31) | `export const REFUSED_NOTICE = 'GitHub refused the connection: sign in again to use the live folders';` |
| `RefresherDependencies` (l. 14-24) | `connection: Pick<GithubConnection, 'token' \| 'forgetIf'>`; new `notices: Pick<NoticeBoard, 'show'>` with a one-line doc |
| field list (l. 34-38) | `#active = false` |
| `start` / `stop` (l. 63-76) | `#active = true` first in `start`; `#active = false` in `stop` |
| `#refreshOne` (l. 113-126) | the `secret === null` branch calls `this.#empty(id)` |
| `#load` (l. 128-139) | the `catch` splits: `error instanceof GithubFailure && error.refused` goes to `await this.#refused(id, secret)` and returns; otherwise `store.update(id, { warning: reason, needsReconnect: false })` and the existing log |
| new `#empty(id)` | `store.update(id, { rows: [], warning: null, needsReconnect: false, archived: {} })` |
| new `#refused(id, secret)` | as under Approach; log lines below |
| class JSDoc (l. 40-49) | replace "when GitHub refused the token the folder is marked to offer `Reconnect GitHub`" with "when GitHub refused the token it is forgotten, the folders show `Connect GitHub` and the window shows one notice" |

`#refused` is synchronous (no `await` inside), so `#load` stays `async` only for `github.list`.
Complexity: `#load` 3, `#refused` 3, both under the limit of 8.

Log lines, none with a token (NFR-1), via `logger.warn`:

- discard: `GitHub refused the token: it was forgotten`
- replaced token: `GitHub refused a token that is no longer the stored one: refreshing again`

### `LiveFolders.ts` (184 lines, limit 200)

- l. 106: `#build` destructures `notices` too: `{ document, selectors, tabs, storage, options, logger, notices }`.
- l. 118-126: the refresher gets `notices` (one line more). The line count after is 185.
- Nothing else: `connection.onChange` (l. 153) already republishes and refreshes all, and `disconnect`
  (l. 135) still calls `forget()`.

If the `#build` line grows past the project's line width, `notices` moves onto the object as
`notices: context.notices` with `context` kept whole; the implementer picks whichever passes lint.

### Text

| What | Exact text | Kind | Time |
|---|---|---|---|
| Toast | `GitHub refused the connection: sign in again to use the live folders` | `error` | `NOTICE_MS` (8 s), from the shared `Notices` |
| Warning mark | `GitHub refused the connection` (`REFUSED_REASON`, unchanged, now only visible on a folder of an old profile that has not refreshed yet) | | |

## Tests

Names identical to the `auto:` checks. All in `tests/modules/livefolders/` and written with the
existing `setup()` of `LiveFolderRefresher.test.ts`, which changes as follows.

Shared test changes:

- `fakes.ts` gains `FakeConnection`: `token: string | null` and `forgetIf(token)` that sets
  `token = null` and returns `true` only when it equals `token`, counting calls in `forgets`.
  The `setup` of `LiveFolderRefresher.test.ts` builds it instead of `{ token }`; the two existing
  uses (`context.connection.token = ...`, l. 94 and 102) keep compiling.
- `setup` also builds a `RecordingToast` and a real `Notices` over it (both exist in
  `tests/loader/fakes.ts`), exposes `toasts`, and passes `notices` to the refresher.

| AC | Test | File |
|---|---|---|
| AC-1 | `forgets the token when GitHub refuses it` | `LiveFolderRefresher.test.ts` |
| AC-2 | `stops calling GitHub after the token is refused` | `LiveFolderRefresher.test.ts` |
| AC-3 | `keeps the token on a rate limit` | `LiveFolderRefresher.test.ts` |
| AC-4 | `keeps a token renewed in another window` | `LiveFolderRefresher.test.ts` |
| AC-5 | `tells the user once when GitHub refuses the token` | `LiveFolderRefresher.test.ts` |
| AC-6 | `tells the user again after a new refusal` | `LiveFolderRefresher.test.ts` |
| AC-7 | `discards the token on a refresh from the menu` | `LiveFolderRefresher.test.ts` |
| AC-8 | `clears the old reconnect flag on success` | `LiveFolderRefresher.test.ts` |
| AC-9 | manual | checklist, T4 |

- AC-1 replaces the test of 026/AC-23, `offers to reconnect when the token is refused`
  (`LiveFolderRefresher.test.ts` l. 124-140), which is removed (NFR-3, the only rename). Steps: a
  successful refresh, then status 401, then `refreshed`; expect `connection.token === null`, the
  folder with no rows, `needsReconnect` false and `LiveEntries.folder(..., NOT_CONNECTED)` showing
  only `CONNECT_TITLE`. The `Reconnect GitHub` row stays covered by AC-8.
- AC-2 counts `github.requests` after the 401, runs `refreshed` and `ticker.tick()` plus `idle()`,
  and expects no new request; then sets a token and expects requests again.
- AC-3 runs once with 403 and once with 429; expects the token kept, `forgets` at 0, no toast,
  rows kept and the warning as today.
- AC-4 wraps `list` of the real `GithubPullRequests` so that it sets `connection.token` to another
  value before answering 401; expects that value kept, no toast, `forgets` at 1 call returning
  false, and a second request made with the new token.
- AC-5 uses two folders and one 401: expects one toast `{ text: REFUSED_NOTICE, kind: 'error' }`
  (the second folder is emptied without a request and without a toast), and the text without the
  token (`!shown.text.includes(TOKEN)`).
- AC-6 refuses, sets a new token, refreshes with 401 again; expects two toasts.
- AC-7 does the 401 once through `ticker.tick()` and once through `refresher.refresh(id)` (the call
  `LiveFolderMenu` makes), each on a fresh setup; both end with no token and one toast.
- AC-8 sets `needsReconnect: true` through `store.update`, checks that `LiveEntries` puts
  `RECONNECT_TITLE` first, refreshes with 200; expects the flag cleared, no toast, no `forgets`.
- Extra, not tied to an AC: `forgets only the token it is given` in `GithubConnection.test.ts`
  (matching token: forgotten, `true`, listener called; other token or none: kept, `false`, listener
  not called), and `shows the refusal notice through the module context` in `LiveFolders.test.ts`
  (a 401 on the real wiring shows the `error` toast on the context's `notices`).

## Vivaldi interface

None. The toast goes under the `browser` selector through the shared `Notices`.

## Configuration

None. No option, no storage key.

## Docs owned by the lead

- `specs/026-live-folders/spec.md`: the paragraph at l. 80-82 ("When GitHub refuses the connection
  ... `Reconnect GitHub`") says that a refusal now discards the token, see 048; the AC-23 row (l. 165)
  is marked superseded by 048 AC-1 to AC-3 and keeps its text. `specs/026-live-folders/design.md`
  l. 204-206: the 401 bullet points to 048.
- `docs/manual/live-folders.md` l. 49-53 (`### Reconnect`): say that when GitHub refuses the
  connection the folders show **Connect GitHub**, a notice says that GitHub refused the connection,
  and the user signs in again; a passing problem such as no network or a rate limit does not
  disconnect.
- `docs/architecture.md`: no change needed; the module row (l. 106) stays true.
- `specs/README.md`: row 048 to `Implemented` after the manual check.
- Version: patch bump on a `fix/token-refused` branch (NFR-4).

## Risks

| Risk | Mitigation |
|---|---|
| A transient 401 from GitHub drops a good token | GitHub documents 401 as a bad credential; one extra sign-in is the cost, and the notice tells why |
| Two windows both show the toast | Only in the short storage-propagation race, see above |
| A discard loop between windows | Not possible: each pass either forgets (token becomes null) or finds a different token, and a refresh with no token sends nothing |
| `LiveFolders.ts` near the line limit | 185 of 200; the fallback is under Components |
