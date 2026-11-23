# 059 Pinned tabs and Favorites like Arc: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/pinned-tabs-arc` for the code. Each implementer task follows TDD: first the failing
tests with the verbatim `auto:` names of the criteria, then the code that makes them pass, then
`make check`. One commit per task, in its own worktree from the same base commit; the lead
cherry-picks them into the feature branch. The version bump is the one the branch type requires
(CONTRIBUTING, Branches): minor for `features/pinned-tabs-arc`, patch for a `fix/` branch; the lead
confirms it before T13 and `npm run release -- check` is the gate.

## Order and parallelism

```
T1 (probe, lead) ─> T2 (findings, documents)
T3 (Q-7 in Arc, Tore)          T4 (Q-3 indicator, documents)

T5 (shared menu) ─────┐
T6 (pinned module) ───┤
T7 (favorites) ───────┼─> T10 (after T5, T6) ─> T12 (if T2 allows it)
T8 (minus) ───────────┤
T9 (Little Arc) ──────┘   T9, T4 ─> T11 (if T4 confirms)
                                  T5..T12 ─> T13 (lead) ─> T14 (Tore)
```

- **T1** runs first, only after Tore agrees, on the lab. **T2** is documents only and must land
  before T8 (close markup) and before T12 decides.
- **T3** and **T4** are documents only and need no code; T3 is Tore's measurement in Arc. T4 lands
  before T11 starts.
- **T5, T6, T7, T8, T9** start in parallel from the same base commit and touch different files. T8
  starts after T2, because the minus rule is written from T2's close markup. Merge the five in any
  order; T10 needs T5 and T6 merged.
- **T10** runs alone after T5 and T6. **T11** runs alone after T9 and T4. **T12** runs alone after T6
  and T10, and only if T2 records a safe signal.
- **T13** (the lead) runs after T5 to T12. **T14** comes last and is Tore's.

## Files each task owns

A task edits only its files. T6 and T12 both touch `PinnedTabs.ts`; T12 runs after T10, which already
merged T6, so it rebases onto the merged file. T9 and T11 both touch `MainWindowRole.ts`; T11 runs
after T9.

| Task | Owns |
|---|---|
| T1 | Nothing in the repository; the probe is `.claude/tmp/059-pinned-tabs-arc/probe.js` |
| T2 | `specs/059-pinned-tabs-arc/design.md` (findings, confirmed or rejected hypotheses) |
| T3 | Nothing in the repository; the answer goes to the lead, who records it in the follow-up |
| T4 | `specs/059-pinned-tabs-arc/design.md` (the indicator reading) |
| T5 | `src/shared/tabmenu/TabMenuItems.ts`, `src/shared/tabmenu/MenuItemShape.ts`, the two files they leave in `src/modules/folders/favoritelinks/`, `src/modules/folders/editing/FolderEditing.ts`, the moved tests |
| T6 | `src/modules/pinned/PinnedMarks.ts`, `TabBarMarker.ts`, `PinnedMarking.ts`, `PinnedPageLoader.ts`, `PinnedTabs.ts`, `PinnedTabsOptions.ts`, `SavedAddresses.ts` (if a read is needed), `AwayTabs.ts` and `ResetClick.ts` (deleted), `src/config.json` (`resetButton`), `tests/modules/pinned/PinnedTabs.test.ts`, `tests/modules/pinned/Marking.test.ts`, `tests/modules/pinned/PinnedPage.test.ts`, `tests/modules/favorites/fakes.ts` |
| T7 | `src/modules/favorites/FavoriteStates.ts`, `FavoritesView.ts`, `FavoriteOpener.ts`, `PinnedFavorites.ts`, `tests/modules/favorites/FavoritePage.test.ts`, `tests/modules/favorites/FavoritesView.test.ts` (only if a test names the attribute) |
| T8 | `src/styles/pinned.scss`, `src/styles/_tokens.scss`, `tests/styles/Pinned.test.ts` |
| T9 | `src/page/little-arc-links.ts`, `src/modules/littlearc/LittleArcMessage.ts`, `LittleArcLauncher.ts`, `MainWindowRole.ts`, `src/modules/peek/Peek.ts`, `tests/modules/littlearc/module.test.ts`, `tests/modules/peek/Peek.test.ts` |
| T10 | `src/shared/linkmenu/PinnedAddress.ts`, `src/shared/linkmenu/BookmarkPinnedStore.ts`, `src/shared/tabmenu/TabMenuItems.ts`, `src/shared/tabmenu/MenuItemShape.ts`, `src/modules/pinned/TabPinnedStore.ts`, `src/modules/pinned/PinnedRowMenu.ts`, `src/modules/pinned/PinnedTabs.ts`, `src/modules/favorites/TileLinkCommands.ts`, `src/modules/folders/editing/SavedTabActions.ts`, `tests/modules/pinned/PinnedRowMenu.test.ts` |
| T11 | `src/modules/littlearc/LittleArcIndicator.ts`, `MainWindowRole.ts`, `src/core/browser/BrowserWindows.ts`, `src/core/browser/BrowserTabs.ts` (the `ChromeApi` window event), `src/styles/little-arc.scss`, `tests/modules/littlearc/module.test.ts` |
| T12 | `src/modules/pinned/PinnedAddressBar.ts`, `PinnedTabs.ts`, `tests/modules/pinned/PinnedAddressBar.test.ts` |
| T13 | `README.md`, `docs/manual/tab-bar.md`, the headers of `specs/003-pinned-tabs-and-folders/spec.md` and `specs/058-pinned-tabs-83/spec.md`, the header and FR-1 of `specs/015-peek-new-tab-links/spec.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py`, `specs/README.md` when the spec is implemented |
| T14 | Nothing in the repository while the checklist is written; `.claude/tmp/059-pinned-tabs-arc/verifica-059.md` |

## Tasks

- [ ] **T1. Probe on the lab Vivaldi 8.1, 8.2 and 8.3** (read-only;
  `npm run live -- --probe .claude/tmp/059-pinned-tabs-arc/probe.js`, only after Tore agrees; the
  throwaway profile is lost afterwards). The probe body and the questions are in design.md,
  "Findings of the probe (T1)". It records the close markup, the `vivaldi.contextMenu.show` items
  including a submenu, the `span.pinned-group` children, and what Cmd/Ctrl+L and the address field
  do to a pinned tab. Run it on 8.3 and, where a build is installed, on 8.1 and 8.2
  (`--vivaldi <root> --vivaldi-version <v>`). Satisfies Q-1 and the menu, close and 8.3 questions of
  the design. Done when the probe's JSON is recorded and the versions that ran are known.
- [ ] **T2. Probe findings in the design** (documents only, alone, after T1). Write the findings in
  design.md "Findings of the probe (T1)" with the version and the date for each question: the close
  markup and the child that hides the X; the submenu item's `type`, key and disabled flag; the
  `pinned-group` chain; and the Q-1 verdict, either a signal that tells the address field's
  navigation from a link (and which) or none. If the verdict is none, say that T12 is closed and
  AC-17 stays out. Satisfies Q-1. Done when the findings are in the design and the lead agrees.
- [ ] **T3. Q-7 measurement in Arc** (Tore, documents only, in parallel with T1 and T2). Tore runs
  the four steps of design.md "Q-7 probe (T3, Tore)" in Arc 1.174.1 and reports whether a
  same-window cross-site link in a pinned or Favorite page navigates the tab, opens a new tab or
  opens Little Arc. The lead records the answer in the follow-up. If it is not measured before the
  implementation, the behavior stays out: a same-window cross-site link keeps navigating the tab as
  today, and the lead records it as a follow-up. Satisfies Q-7. Done when the answer is recorded, or
  the absence is noted.
- [ ] **T4. Read the Little Arc indicator** (documents only, in parallel with T1; after Tore's
  recording of 2026-11-23 is available). Read the recording and the screenshots for the icon at the
  right end of the pinned row after the title: whether it is the page's favicon (the MuseHub purple
  one) or a generic page glyph, whether it is clickable, whether it has a tooltip, and where it sits
  on a Favorite tile. Write the reading in design.md "A new-window link and the indicator (Q-3)" and
  the smallest indicator to build. If the recording does not settle it, say so and mark T11 closed.
  Satisfies Q-3. Done when the reading is in the design and the lead agrees.
- [ ] **T5. Move the tab menu to `shared`** (no behavior change; runs in parallel with T6, T7, T8 and
  T9). Move `TabMenuItems.ts` and `MenuItemShape.ts` from `src/modules/folders/favoritelinks/` to
  `src/shared/tabmenu/`, with their tests, and update `FolderEditing.ts`. Give the missing-API
  warning the neutral text of design.md "Texts and logs". No test is renamed and the folders menu
  stays as it is. Done when the existing tests pass and `make check` is green.
- [ ] **T6. Pinned module: no away, separator over 8.3, pinned page on reopen** (TDD; runs in
  parallel with T5, T7, T8 and T9). Tests first, in `tests/modules/pinned/Marking.test.ts`:
  `does not mark a pinned tab that left its own page` (AC-5), `marks the separator after the last
  pinned row of a group beside the tab strip`, `clears the marks of the rows of a group beside the
  tab strip`, `keeps marking the strip when the catalog has no pinned group`,
  `does not warn when the strip is missing but a group exists` and
  `warns once when neither the strip nor a group matches` (NFR-4); in
  `tests/modules/pinned/PinnedPage.test.ts`: `keeps the pinned page when a pinned tab navigates`
  (AC-4), `loads the pinned page when an unloaded pinned tab opens` (AC-6) and
  `loads the pinned page of the active tab at start`; in `tests/modules/pinned/PinnedTabs.test.ts`:
  `unloads a pinned tab from its minus` (AC-8). Keep `saves the address of a newly pinned tab` (AC-1),
  `saves the address of a pinned tab seen for the first time` (AC-2),
  `forgets the address of an unpinned tab` (AC-3), `unloads a pinned tab on close shortcut` (AC-7)
  and `leaves the close shortcut to Vivaldi for ordinary tabs` (AC-9) green. Remove
  `marks favorites and pinned tabs that left their own page` and `loads the own page on reset`,
  which the spec supersedes, with their imports. Then: delete `AwayTabs.ts`
  and `ResetClick.ts`; add `PinnedMarks` with only the linked set; drop the away attribute and add
  the group slots to `TabBarMarker` as 058 designed; add `PinnedPageLoader`; remove `isAway`,
  `#startReset` and the `resetButton` option, and drop `resetButton` from `config.json`; set
  `data-vivarcdi-pinned-unload` on `#browser` from `unloadOnClose`, removing it on stop; add
  `querySelectorAll` to the `FakeNode` fake if 058's change is not in yet. Close tab and Unpin tab
  are untouched. Satisfies AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, NFR-4. Done when the tests pass and
  `make check` is green.
- [ ] **T7. Favorites: no away, the bookmark's page on open** (TDD; runs in parallel with T5, T6, T8
  and T9). Tests first, in `tests/modules/favorites/FavoritePage.test.ts`:
  `keeps the bookmark page when a favorite tab navigates` (AC-22),
  `does not mark a favorite tile that left its own page` (AC-23),
  `loads the bookmark page when an unloaded favorite tile opens` (AC-24) and
  `a click on the tile of an away tab activates it without resetting it`. Then drop `away` from
  `FavoriteStates` and the attribute from `FavoritesView`; in `FavoriteOpener` activate and load
  `favorite.url` when the tab is unloaded, with no `#reset`; in `PinnedFavorites.#open` load
  `OwnPage.of(tab)` when there is one. Keep `edits the pinned url of a tile` (AC-25) and
  `replaces the pinned url of a tile with the current one` (AC-26) green. Satisfies AC-22, AC-23,
  AC-24, AC-25, AC-26. Done when the tests pass and `make check` is green.
- [ ] **T8. The minus on a pinned row** (after T2; runs in parallel with T5, T6, T7 and T9). A style
  test first, `draws the close button of a pinned row as a minus` in `tests/styles/Pinned.test.ts`:
  a rule under `#browser[data-vivarcdi-active][data-vivarcdi-pinned-unload]` for
  `.tab-position.is-pinned .tab-header .close` that hides Vivaldi's X and draws `$minus-glyph`,
  shown on hover and on the active row, and no such rule for a tile. Then `$minus-glyph` in
  `_tokens.scss` and the rule in `pinned.scss`, from T2's close markup. `CloseShortcut` does not
  change. Supports AC-15 (manual look) and US-2. Done when the style
  test and `make check` are green.
- [ ] **T9. A new-window link opens in Little Arc** (TDD; runs in parallel with T5, T6, T7 and T8).
  Tests first: `opens a blank link of a pinned page in Little Arc`,
  `leaves blank links of ordinary pages to Vivaldi` in `tests/modules/littlearc/module.test.ts`, and
  `peek leaves new-tab links of pinned pages to Little Arc` in `tests/modules/peek/Peek.test.ts`.
  Then `page/little-arc-links.ts`, the `page-link` message of `LittleArcMessage`, the injector in
  `MainWindowRole` for kept tabs, `openAddressIn` in `LittleArcLauncher`, and Peek's effective
  `pinnedNewTab` given `context.modules['little-arc']`. The link opens in Little Arc, the Peek
  triggers for shift-click, cross-site and ordinary tabs are unchanged. Satisfies AC-18 for the
  routing; the indicator is T11. Done when `make check` is green and `npm run live` passes on the
  lab after Tore agrees.
- [ ] **T10. Edit Pinned Page on a pinned row** (TDD; alone, after T5 and T6). Tests first, in
  `tests/modules/pinned/PinnedRowMenu.test.ts`: `replaces the pinned page of a row with the current
  one` (AC-10), `edits the pinned page of a row` (AC-11),
  `disables replace on a pinned row when the addresses are equal` (AC-12),
  `adds Edit Pinned Page after the items of the menu of a pinned tab` and
  `leaves the menu of anything but a pinned tab to Vivaldi`. Then: `PinnedAddress` takes a
  `PinnedPageStore` and gains `menuFor`, `replace` and `edit`; add `BookmarkPinnedStore` and
  `TabPinnedStore`; add `TabMenuTree`, `items(tabId)` in `TabMenuItems` and the submenu and
  disabled builders in `MenuItemShape`; add `PinnedRowMenu` and wire it in `PinnedTabs` with the
  `Toast` and the `PromptDialog`. The 056/057 items and tests stay as they are. If T2 found no
  submenu shape, add nothing, log once and report it; the task is then closed without the menu.
  Satisfies AC-10, AC-11, AC-12 and keeps AC-25, AC-26. Done when `make check` is green.
- [ ] **T11. The Little Arc indicator** (conditional on T4; alone, after T9 and T4). Tests first, in
  `tests/modules/littlearc/module.test.ts`:
  `marks the row a Little Arc window came from and clears it when the window closes`. Then
  `LittleArcIndicator`, the `onRemoved` of `BrowserWindows` and `ChromeApi`, the call in
  `MainWindowRole`, and the rules in `little-arc.scss`. It marks the row, or the tile of a Favorite,
  with one attribute and takes it away when the window closes. If T4 did not settle the icon, the
  task is closed without code: the routing of T9 stands and the lead reports AC-18 to Tore as met
  for the routing only. Satisfies AC-18. Done when `make check` is green and the live check of T4
  passes on the lab after Tore agrees.
- [ ] **T12. Cmd+L and the address on a pinned tab** (conditional on T2; alone, after T6, T10 and
  T2). Implemented only if T2 recorded a signal that tells the address field's navigation from a
  link without taking the key or the field. Tests first: `opens an address typed on a pinned tab in
  a new unpinned tab` and `keeps the pinned page when the address field sends a new one`. Then
  `PinnedAddressBar` as described in design.md, wired in `PinnedTabs`. It never binds Cmd+L and never
  prevents the field's Enter. If T2 recorded no signal, the task is closed without code and AC-17
  stays out; the lead records it as a follow-up. Satisfies AC-17. Done when `make check` is green.
- [ ] **T13. Docs and version** (the lead, after T5 to T12). `README.md`: the Favorites and pinned
  tabs sections lose the away state and the reset arrow and gain the minus, the pinned-page menu and
  Little Arc for new-window links; the Peek section says a `target="_blank"` link in a pinned or
  Favorite page opens Little Arc. `docs/manual/tab-bar.md`: the Favorites "Go home" paragraph and
  the Pinned tabs section say the page is kept and loaded on reopen, describe the minus and its
  menu, and drop the arrow. Add an `Amended by 059` header row to
  `specs/003-pinned-tabs-and-folders/spec.md` (FR-5, AC-9, AC-10, AC-16) and to
  `specs/058-pinned-tabs-83/spec.md` (AC-1, AC-4 to AC-6), keeping both statuses. Amend
  `specs/015-peek-new-tab-links/spec.md`: a change-request row of 2026-11-23 and FR-1 saying its
  new-tab trigger applies only where Little Arc cannot open. Bump the version in `package.json`,
  `package-lock.json` and `installer/vivarcdi/__init__.py` as the branch type requires, then run
  `npm run release -- check --base origin/main --branch features/pinned-tabs-arc` and `make check`.
  Leave the spec `Approved` until T14 is green. Done when the release check and `make check` pass.
- [ ] **T14. Manual checklist in Italian** (last; written from AC-14 to AC-21 and AC-28, in
  `.claude/tmp/059-pinned-tabs-arc/verifica-059.md`). On macOS and Debian, on Vivaldi 8.3 and, where
  a build is available, 8.1 and 8.2: a pinned row and a Favorite tile that browse away keep their
  icon and have no arrow, no away mark
  and no reset on click; the minus unloads the row and it comes back at its pinned page; the row
  menu has `Edit Pinned Page` with Replace and Edit…, no reset item, and keeps Close tab and Unpin
  tab; Cmd+L on a pinned tab (only if T12 landed); a `target="_blank"` link in a pinned and a
  Favorite page opens Little Arc, Little Arc wins over Peek, and the row or tile shows the indicator
  (only if T11 landed); Clear leaves the pinned and Favorite tabs open; a restart and a workspace
  switch keep every page. Record the version and the result of each. When Tore reports it green, the
  lead sets `specs/059-pinned-tabs-arc/spec.md` and its row in `specs/README.md` to `Implemented`,
  records AC-17 and AC-18 as follow-ups where T12 or T11 did not land, and bumps the version if T13
  did not.
