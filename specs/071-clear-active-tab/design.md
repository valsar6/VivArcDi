# 071 Clear archives the active tab too: design

| | |
|---|---|
| Status | Approved (2026-11-26) |
| Spec | [spec.md](spec.md) |

Tore approved the spec on 2026-11-26 with the recommendations of Q-1 to Q-4: Vivaldi picks the tab
to show when kept tabs exist, VivArcDi opens the blank tab with `WorkspaceTabs`, the scope stays the
current window and the workspace of the active tab, and a tab playing audio stays on Clear. This
document says **how**; the spec says **what**.

## Approach

| Area | What changes | Where |
|---|---|---|
| One rule, two questions | `isArchivable` is split: `isClearable` holds every rule except "not active"; `isArchivable` is `isClearable` plus "not active" | `modules/today/TodayTabPolicy.ts` |
| Clear | `#clearNow` uses `isClearable`; it decides whether a tab is left and, if not, opens a blank tab after the save and before the first removal | `modules/today/ArchiveSweeper.ts` |
| Blank tab | A new dependency `blank` (`WorkspaceTabs.open`), which learns to open with no address | `modules/today/ArchiveSweeper.ts`, `modules/today/TodayArchive.ts`, `core/workspaces/WorkspaceTabs.ts` |
| Sweep | Unchanged: it keeps `isArchivable` (`ArchiveSweeper.ts` line 106) | none |

No new module, option or file in `src/`. Today the sweep and Clear share `isArchivable`
(`TodayTabPolicy.ts` line 15, called at `ArchiveSweeper.ts` lines 106 and 124).

## TodayTabPolicy

```ts
public static isClearable(tab: chrome.tabs.Tab): boolean {
  return !KeptTab.is(tab) && tab.audible !== true && TabData.stackOf(tab) === null && TodayTabPolicy.#isPage(tab.url);
}

public static isArchivable(tab: chrome.tabs.Tab): boolean {
  return tab.active !== true && TodayTabPolicy.isClearable(tab);
}
```

The active exclusion is written once, in `isArchivable` (NFR-2). Update the doc comments: Clear
uses `isClearable` (a Today tab of the user's choosing, the active one included), the sweep uses
`isArchivable`.

## WorkspaceTabs.open

`open(url: string | null, workspace, own)`: with `url === null` it calls
`this.#tabs.create({ active: true })`, which gives Vivaldi's own new tab page, as the New Tab rows
do (`NewTabOpener.create`, `src/shared/newtab/NewTabOpener.ts` line 41). With a string, nothing
changes (`WorkspaceTabs.ts` line 37). The workspace write (`#store`, line 60) is as today.

## ArchiveSweeper

`SweeperDependencies` gets one field, built in `TodayArchive.start` from the `WorkspaceTabs` that is
already created for the restorer (`TodayArchive.ts` line 73), moved to a local so both share it:

```ts
/** Opens the blank tab that keeps the window and workspace alive when Clear closes every tab. */
blank: Pick<WorkspaceTabs, 'open'>;
```

`#clearNow` (now lines 117-125):

```ts
async #clearNow(): Promise<void> {
  const windowTabs = await this.#windowTabs();
  const active = windowTabs.find((tab) => tab.active);
  if (active === undefined) {
    return;
  }
  const workspace = TabData.of(active);
  const closing = windowTabs.filter((tab) => TodayTabPolicy.isClearable(tab) && TabData.of(tab) === workspace);
  const stays = windowTabs.some((tab) => TabData.of(tab) === workspace && !closing.includes(tab));
  await this.#archive(closing, stays ? undefined : () => this.#deps.blank.open(null, workspace));
}
```

`#archive(tabs, beforeClose?)`: after `outcome === 'saved'` (line 141) and before the removal loop
(line 143) it awaits `beforeClose`. If it throws, the sweeper logs
`could not open a blank tab: the Today tabs stay open` and returns without removing any tab (the
window must never close). When the save fails, `beforeClose` never runs (FR-5, AC-6). The sweep
calls `#archive(stale)` with no hook.

Rules:

- A tab is "left" when it is in the window's query, in the workspace of the active tab and not in
  `closing`. That covers pinned tabs, Favorites, stacked and tiled tabs, audible tabs and non-page
  tabs (such as `vivaldi://`) of that workspace. Tabs of other workspaces and windows do not count
  (Q-3, FR-6).
- The blank tab is created after the archive is saved and before the first removal, so it exists
  when the last Today tab closes, and it is never in `closing` (it did not exist when `closing` was
  computed), so it is not archived (FR-3).
- With a tab left, `ArchiveSweeper` activates the kept tab of the workspace nearest to the active one (by position in the window) before the first removal (Q-1, FR-4): left to itself, Vivaldi showed a tab of another workspace.
- The blank tab opens in the window of the active tab (`create({ windowId, active: true })`, as the New Tab rows do) and, after the last removal, is activated again, so Vivaldi cannot fall back to a tab of another workspace (found by Tore's manual check on 2026-11-26).
- A removal that fails leaves the blank tab open and logs as today (`ArchiveSweeper.ts` line 144).
- `clear()` and `sweep()` still share the queue, so a sweep cannot run between the save and the
  removals.
- Log texts are lower case without a final period, as the existing ones.

## Tests

| AC | Test (verbatim) | File | How |
|---|---|---|---|
| AC-1 | `clear archives the active Today tab too` | `tests/modules/today/ArchiveSweeper.test.ts` | Replaces `clear archives every Today tab of the workspace except the active one`. Tabs: `ACTIVE` (workspace 7), tab 2 (7), tab 3 (workspace 8), pinned tab 4 (7). Expect `removedIds()` `[1, 2]`, the two entries, and no `create` call |
| AC-2 | `clear opens a blank tab when no tab is left to show` | same | `ACTIVE` (7), tab 2 (7), tab 3 (8, stays but does not count). Expect one `create` call, issued before the first `remove` in `tabs.calls`, and the new tab carries `workspaceId` 7 in its `vivExtData` |
| AC-3 | `clear opens no blank tab while a kept tab stays open` | same | One run each with a pinned tab, a Favorite, a stacked tab and a `vivaldi://settings` tab of workspace 7 left; expect no `create` call and an activation of that tab before the first `remove`; the second test puts tabs of workspace 8 on both sides and expects the pinned tab of workspace 7 to be the only one activated |
| AC-4 | `the sweep still never archives the active tab` | same | `ACTIVE` stamped older than the limit plus a stale tab 2; `sweep()` removes `[2]` only |
| AC-5 | `clear still keeps protected tabs` | same | Protected set of `never archives protected tabs` (audible active tab, pinned, Favorite, stacked, other window, non-page) plus a tab of workspace 8; `clear()` removes nothing, saves nothing, opens no blank tab |
| AC-6 | `clear keeps the active tab and opens no blank tab when the archive cannot be saved` | same | `outcomeSetup` with `failed` and `memory`; `clear()` leaves `[ACTIVE, OLD]` open, no `remove`, no `create` |
| AC-7 | `the Clear shortcut archives the active Today tab` | `tests/live/scenarios/the-clear-shortcut-archives-the-active-today-tab.live.ts` | Replaces `the Clear shortcut archives the Today tabs` (`the-clear-shortcut-archives-the-today-tabs.live.ts`); the file is renamed with `git mv`, `spec: '071'` |
| AC-8 | `Clear leaves a blank tab when nothing else is open` | `tests/live/scenarios/clear-leaves-a-blank-tab-when-nothing-else-is-open.live.ts` | New scenario, `spec: '071'` |
| AC-9 | manual | Italian checklist, task T5 | Tore, Vivaldi 8.3 |

Existing tests the change touches (names stay, bodies change, because the active tab is now
archived by Clear):

- `ArchiveSweeper.test.ts`: `never archives protected tabs` keeps the sweep call only (the clear
  part moves to AC-5); `does not archive the tab of a link` runs the sweep with `ACTIVE` and the
  clear with the link tab as the active tab; `keeps the tabs open when the archive cannot be saved`
  stays as is (AC-6 adds the blank-tab check). `setup` and `outcomeSetup` pass
  `blank: new WorkspaceTabs(fake, silentLogger())`; the folders fake `create` (`tests/modules/folders/fakes.ts`
  line 128) already records `['create', properties]`.
- `TodayArchive.test.ts`: `clears the Today tabs on the Clear shortcut` (069 AC-7) expects
  `[1, 2]` removed and one `create` call, since `TABS()` leaves no tab; `does nothing on the Clear
  shortcut without Today tabs` makes tab 1 active **and pinned**, so nothing is a Today tab.
- `TodayTabPolicy.test.ts`: add two extra tests, `the active tab is clearable but not archivable`
  and `an audible tab is neither clearable nor archivable`; they carry no AC.
- `tests/core/workspaces/` (the `WorkspaceTabs` test): add `opens a tab with no address when the
  address is null`; it carries no AC.

## Live scenarios

Both use `driver.evaluate` with `chrome.tabs` as the current scenario does (cleanup in `finally`).

- **AC-7** (`the Clear shortcut archives the active Today tab`): as today, a pinned tab and two
  `file:///` tabs, the second active. After Cmd+Shift+K both file tabs are gone, the pinned tab is
  open, and no tab other than the pinned tab and the initial tabs exists, which shows that no blank
  tab opened. If the check fails because Vivaldi reports no `workspaceId` on the pinned tab, the
  implementer reports it instead of changing the rule (see doubts in the report).
- **AC-8** (`Clear leaves a blank tab when nothing else is open`): create two `file:///` tabs,
  activate the second, then remove every other tab that is not one of them (the lab's initial tab
  is a non-page Today tab that would count as "left"). After Cmd+Shift+K the two tabs are gone, the
  window still answers `chrome.tabs.query({ currentWindow: true })` with exactly one tab, active,
  with an id that is not one of the two and the same workspace as before. The scenario leaves that
  blank tab open, because removing it would close the window.

## Docs

`docs/manual/today-and-keyboard.md` and `docs/manual/tab-bar.md` (Clear and the shortcut), and the
README line about Clear, say Clear archives the active tab too and opens a blank tab when nothing
else is left. 004, 060 and 069 already carry an "Amended by 071" line; at release, no change in
their status.
