# 071 Clear archives the active tab too

| | |
|---|---|
| Status | Approved |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-26 |
| Supersedes | [004](../004-today-tabs-and-keyboard/spec.md) FR-5 and AC-7 (Clear keeps the active tab); [060](../060-clear-bar-and-pinned-unload/spec.md) FR-2, AC-1 and the sentence "except the active one" in its "What Clear does" paragraph; [069](../069-clear-like-arc/spec.md) AC-10 (the live scenario that expects the active tab to stay open) and the words "Today tabs" of FR-8 and AC-7 where they exclude the active tab. 004 FR-2 and AC-2 stay for the automatic sweep: it never archives the active tab of any window nor a tab playing audio. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Tore found on 2026-11-26 that Clear, by click on the separator label or with Cmd/Ctrl+Shift+K,
leaves the tab he is looking at open although it is a Today tab. In Arc, Clear archives the whole
Today list. This spec makes Clear archive the active Today tab too. The automatic sweep is
unchanged: it still protects the active tab, because it runs without the user asking.

When Clear leaves the workspace with no tab to show (no pinned tab, Favorite or tab in a stack or
tile), the user stays in front of a blank new tab in that workspace, and the window never closes.

## User stories

- **US-1.** As a user, I want Clear to archive every Today tab, including the one I am on, so that
  Today is empty afterwards, as in Arc.
- **US-2.** As a user, I want to land on a blank tab when nothing else is left, so that the window
  does not close and I can start again.
- **US-3.** As a user, I want the automatic archive to keep leaving the tab I am using alone.

## Expected behavior

Today the active Today tab is the only one Clear skips, because the one rule that tells which tabs
may be archived (`TodayTabPolicy.isArchivable`) also refuses the active tab, for the sweep and for
Clear alike. After this spec Clear archives it too; the sweep does not.

| | Today | After |
|---|---|---|
| Clear, active tab is a Today tab | Stays open (`TodayTabPolicy.ts` line 16, `ArchiveSweeper.ts` line 124) | Archived with the others |
| Clear, nothing else stays in the workspace | Not possible: the active tab always stays | A blank new tab opens in the workspace, active, before the Today tabs close |
| Clear, pinned tabs, Favorites, stacks or tiles exist | Active tab stays | Vivaldi picks the tab to show (Q-1) |
| Sweep, every minute | Never archives the active tab of the window | Same |
| Tab playing audio, Clear or sweep | Kept (`TodayTabPolicy.ts` line 16) | Same (Q-4) |
| Pinned, Favorite, bookmark-link, stacked tabs, non-page URLs | Kept by both | Same |

The code today: `ArchiveSweeper.clear()` (lines 94-96) runs `#clearNow()` (lines 117-125), which finds
the active tab only to read its workspace, then archives the window's tabs that pass
`TodayTabPolicy.isArchivable` and have that workspace. `isArchivable` (`TodayTabPolicy.ts` line 15)
excludes `KeptTab.is` tabs (`src/shared/tabs/KeptTab.ts` line 11: pinned, Favorite or bookmark link),
the active tab, audible tabs, tabs in a stack (`TabData.stackOf`) and non-page URLs. Tiles are tabs
in a stack, so the stack rule keeps them. `#archive` (lines 132-146) saves the entries, then
removes the tabs one by one. Removing the last tab of a window closes the window, which Clear must
never cause.

## Requirements

### Functional

- **FR-1.** WHEN Clear runs, by click on the separator label or by Cmd/Ctrl+Shift+K, THE module
  SHALL archive the active tab too when it is a Today tab of the workspace: not kept, not in a stack
  or tile, not playing audio and showing a web page or a file.
- **FR-2.** THE automatic sweep SHALL still never archive the active tab of the window or a tab
  playing audio (004 FR-2).
- **FR-3.** WHEN Clear would leave the workspace with no open tab, THE module SHALL open a blank new
  tab in that workspace, active, before it closes the Today tabs, so that the window does not close
  and the user stays in the workspace. THE blank tab SHALL not be a Today tab to archive afterwards.
- **FR-4.** WHEN Clear leaves a pinned tab, a Favorite or a tab in a stack or tile in the workspace,
  THE module SHALL open no blank tab and leave the choice of the tab to show to Vivaldi (Q-1).
- **FR-5.** WHEN the archive cannot be saved, THE module SHALL keep every tab open, the active one
  included, and open no blank tab (as 004 today).
- **FR-6.** Pinned, Favorite, bookmark-link, stacked and tiled tabs, tabs playing audio and tabs of
  other windows SHALL stay open on Clear.

### Non-functional

- **NFR-1.** No new module, option or runtime dependency; the change stays in `today-archive`.
- **NFR-2.** One rule per question: the exclusion of the active tab is the only difference between
  the sweep and Clear, and is expressed once, not as a second copy of the policy.
- **NFR-3.** The behavior holds on Vivaldi 8.1 to 8.3, on macOS and Debian.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN Clear runs, THE module SHALL archive the active Today tab with the other Today tabs of the workspace. | auto: `clear archives the active Today tab too` |
| AC-2 | WHEN Clear leaves the workspace with no open tab, THE module SHALL open a blank tab in that workspace before closing the Today tabs. | auto: `clear opens a blank tab when no tab is left to show` |
| AC-3 | WHEN a pinned tab, a Favorite or a stacked tab stays open after Clear, THE module SHALL open no blank tab. | auto: `clear opens no blank tab while a kept tab stays open` |
| AC-4 | THE sweep SHALL never archive the active tab of the window. | auto: `the sweep still never archives the active tab` |
| AC-5 | WHEN Clear runs, THE module SHALL keep pinned, Favorite, bookmark-link, stacked and audible tabs and tabs of other workspaces. | auto: `clear still keeps protected tabs` |
| AC-6 | WHEN the archive cannot be saved, THE module SHALL keep all tabs open and open no blank tab. | auto: `clear keeps the active tab and opens no blank tab when the archive cannot be saved` |
| AC-7 | WHEN the user presses Cmd+Shift+K in a lab Vivaldi with a pinned tab and two Today tabs, the active one among them, THE two Today tabs SHALL be archived and the pinned tab SHALL stay open. | live: `the Clear shortcut archives the active Today tab` |
| AC-8 | WHEN the user presses Cmd+Shift+K in a lab Vivaldi whose workspace holds only Today tabs, THE window SHALL stay open on a blank tab of that workspace. | live: `Clear leaves a blank tab when nothing else is open` |
| AC-9 | WHEN Tore clears Today on a real Vivaldi 8.3 from the active Today tab, with and without a pinned tab, THE window SHALL stay open and what he sees SHALL be as Arc shows it. | manual |

The live scenario `the Clear shortcut archives the Today tabs` (069 AC-10, spec 069) is replaced by
AC-7: the implementation renames it and changes its expectation. The test `clear archives every
Today tab of the workspace except the active one` (060 AC-1) is replaced by AC-1.

## Out of scope

- The automatic sweep: no change (FR-2).
- The look of Clear, its line and its tooltip: 067, 069.
- Archiving tabs of other workspaces or other windows on Clear.
- Moving the user to a chosen tab when kept tabs exist (Q-1 recommends Vivaldi's own choice).

## Open questions

- [x] **Q-1. What is active after Clear when kept tabs exist.** With a pinned tab, a Favorite or a
  tiled tab left, Vivaldi activates a neighbor when the active tab is removed. Recommendation:
  leave Vivaldi's native choice; no code runs, and it is the least surprising on both platforms. The
  alternative is to activate the first kept tab of the workspace ourselves.
  Answered (Tore, 2026-11-26): recommendation accepted.
- [x] **Q-2. Who opens the blank tab.** When the last tab closes, Vivaldi closes the window (or
  switches workspace), so leaving it to Vivaldi does not work. Recommendation: VivArcDi opens it with
  `WorkspaceTabs.open` (an empty new tab, assigned to the workspace) before closing the Today tabs,
  only when no tab of the workspace will remain (FR-3). The blank tab is created before the first
  removal and stays if a removal fails.
  Answered (Tore, 2026-11-26): recommendation accepted.
- [x] **Q-3. Tabs of other windows and workspaces.** Clear works on the current window and the
  workspace of the active tab (`ArchiveSweeper.ts` lines 119-124) and keeps working so. Recommendation:
  unchanged; tabs of other workspaces of the window stay and do not count as "a tab left to show", so
  Clear still opens the blank tab in the current workspace.
  Answered (Tore, 2026-11-26): recommendation accepted.
- [x] **Q-4. Audio.** Both the sweep and Clear skip a tab playing audio today (`TodayTabPolicy.ts`
  line 16). Recommendation: Clear keeps skipping it: archiving closes the tab and the sound stops,
  which the user did not ask for; Arc archives from the list and would also stop it, so this is a
  deliberate difference. An active tab playing audio therefore stays after Clear. The alternative is
  that Clear archives audible tabs, as an explicit user action.
  Answered (Tore, 2026-11-26): recommendation accepted.

## References

- [004 Today tabs and keyboard](../004-today-tabs-and-keyboard/spec.md) FR-2, FR-5, AC-2, AC-7
- [060 Clear bar and pinned tile unload](../060-clear-bar-and-pinned-unload/spec.md) FR-2, AC-1
- [069 Clear like Arc](../069-clear-like-arc/spec.md) FR-8, AC-7, AC-10
- `src/modules/today/ArchiveSweeper.ts` (`clear`, `#clearNow`, `#archive`),
  `src/modules/today/TodayTabPolicy.ts`, `src/shared/tabs/KeptTab.ts`,
  `src/modules/today/TodayArchive.ts` (`#clear`), `src/core/workspaces/WorkspaceTabs.ts` (`open`)
- `tests/live/scenarios/the-clear-shortcut-archives-the-today-tabs.live.ts`
