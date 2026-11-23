# 059 Pinned tabs and Favorites like Arc

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |
| Supersedes | [003](../003-pinned-tabs-and-folders/spec.md) FR-5, AC-9, AC-10 and AC-16 (fully; they cover Favorites and pinned tabs); the away-arrow parts of [058](../058-pinned-tabs-83/spec.md) AC-1 and AC-4 to AC-6, whose pinned-group layout and separator stay |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc 1.174.1 shows no back arrow on a pinned tab and none on a Favorite tile. Both keep a **page**: a
pinned tab keeps the page it was pinned with, and a Favorite keeps the address of its bookmark.
Following a link inside the tab changes what the tab shows, but not that page, and the reset is
implicit. The pinned row has a minus that unloads the tab; a Favorite keeps its middle click,
Cmd/Ctrl+W and close affordance. In both cases the row or tile stays, dimmed, and opening it again
loads the page.

[003](../003-pinned-tabs-and-folders/spec.md) and the away-arrow part of
[058](../058-pinned-tabs-83/spec.md) do the opposite: they mark a Favorite or pinned tab that left
its page and replace its favicon with a reset arrow, and a click on the active one navigates it
back. This spec moves both to Arc's model, adds Edit Pinned Page to the pinned row, gives the pinned
row Arc's minus, keeps the Edit Pinned Page of a tile, and covers the Cmd+L, new-window and Clear
rules Tore saw on 2026-11-23.

Tore decided on 2026-11-23 that Favorites follow the same model in this spec, not in a later one.

003 keeps its saved pages, its separator, the link between a Favorite and its tabs, and its unload
on close; 058 keeps its 8.3 pinned-group layout and its separator. The away mark and the arrow go
from both the rows and the tiles, the close X becomes a minus on pinned rows only, and the
`resetButton` option of 003/FR-9 has nothing left to show.

### Seen in Arc

From Arc 1.174.1, Tore's recording of 2026-11-23 and his screenshots of the same day. The pinned row
shows no back arrow and no visible reset button. The app still ships the reset feature in its strings
(`canResetTab`, `resetTabTitle`, `resetTabIcon`, `Reset tab to original URL.`, `Reset all tabs in this
Space`, `Title to reset Pinned Tabs while on a focused list.`, `Tooltip title for resetting a pinned
tab.`), but none of it appears on the row. The row's menu offers `Edit Pinned Page` with `Replace
Pinned URL with Current` and `Edit…`, and `Remove Pin`, not a reset item.

| What Tore did | What Arc did |
|---|---|
| Pressed Cmd+L on the pinned Ultimate Guitar tab and opened an address | A new unpinned tab opened; the pinned tab kept its page |
| Followed a same-site link to `https://www.ultimate-guitar.com/explore?decade[]=2020` | The pinned tab's URL changed; its saved URL did not, and the menu offered `Replace Pinned URL with Current` |
| Clicked the minus, then opened the row again | The tab unloaded and came back at the saved `https://www.ultimate-guitar.com/` |
| Selected the pinned site in the command bar's suggestions | Arc switched to the pinned tab |
| Opened a `target="_blank"` link | The page stayed in Little Arc, and an icon for it appeared next to the pinned row |
| Clicked `Clear` above New Tab | Every unpinned tab closed; the pinned tabs stayed open |

Arc's Favorites follow the same model: a tile stands for a bookmark's address, a link followed in
its tab changes only the tab, the tile keeps its icon and shows no back arrow, an unloaded tab leaves
the tile in place and dimmed, and a click loads the bookmark again. Tore asked for this model in
VivArcDi as part of this spec (2026-11-23).

## User stories

- **US-1.** As a user, I want a pinned tab to keep the page it was pinned with and to show it again
  when reopened, so that a link I follow inside it never replaces my pinned page.
- **US-2.** As a user, I want no back arrow on a pinned row and a minus that unloads it, so that the
  row behaves as in Arc.
- **US-3.** As a user, I want Edit Pinned Page on a pinned row, so that I can change its pinned page
  from the row itself.
- **US-4.** As a user, I want an address I type or open on a pinned tab to open in a new tab, so that
  my pinned page is never lost.
- **US-5.** As a user, I want a new-window link opened from a pinned page to live in Little Arc, with
  a sign next to the pinned row, so that I know where it went.
- **US-6.** As a user, I want Clear to leave my pinned tabs open, so that clearing Today never moves
  them.
- **US-7.** As a user, I want a Favorite to keep its bookmark's address as its page, so that a link I
  follow in its tab never replaces the Favorite.
- **US-8.** As a user, I want no away mark and no back arrow on a Favorite tile, and its usual unload
  controls, so that the tile stays in the grid as in Arc.
- **US-9.** As a user, I want a click on a Favorite tile whose tab shows another page to switch to
  that tab without resetting it, so that the page is never taken from under me.
- **US-10.** As a user, I want Edit Pinned Page on a Favorite tile to change the bookmark's address,
  so that the tile opens the new page in every workspace.

## Expected behavior

**Pinned page.** A pinned tab has one pinned page, stored with the tab as it is today
(003/AC-6, AC-7, AC-8): the address it had when it was pinned, or the one it showed the first time
VivArcDi saw it pinned without one; unpinning forgets it. Navigating inside the pinned tab changes
only what the tab shows. The pinned page stays, and it is what the tab loads when it is opened after
being unloaded or after a restart.

**Favorite page.** A Favorite's page is the address of its bookmark (003/FR-1). The link between the
bookmark and the tab stays (003/FR-2, FR-3). Navigating inside the Favorite's tab changes only what
the tab shows: the bookmark, its address and the Favorite's page stay, and the bookmark's address is
what the tab loads when it is opened after being unloaded or after a restart. VivArcDi still never
changes a bookmark except through Edit Pinned Page of 056/057, which the user asks for.

**Implicit reset on a pinned row.** The pinned row keeps its favicon and shows no away mark, no arrow
and no reset button. The reset is the unload: the minus at the right end of the row unloads the tab,
and so do Cmd/Ctrl+W and the close affordance, as 003 already does. The row stays, dimmed; opening it
loads the pinned page. Removing the pin or closing the tab stays a real action of Vivaldi's own menu
(Close tab, Unpin tab) and of Arc's `Remove Pin`, never of the minus.

**Implicit reset on a Favorite tile.** The Favorite tile keeps its favicon and shows no away mark, no
back arrow and no reset control. The unload is middle click, Cmd/Ctrl+W and the close affordance, as
001 and 003 already do. The tile stays in the grid, dimmed; opening it loads the bookmark's address.
A click on the tile while its tab shows another address activates the tab and does not reset it: the
user asked for the tab, not for the bookmark. Removing the Favorite stays an act on the bookmark in
the Bookmarks panel.

**Menu of a pinned row.** It gains `Edit Pinned Page ▸` with the texts, the dialog and the disabled
states of [056](../056-saved-tab-menu/spec.md) FR-6 and FR-7, acting on the pinned tab's pinned page:
`Replace Pinned URL with Current` takes the address the tab shows now, disabled while it is the same
or when the row has no open tab, and `Edit…` opens the dialog titled `Edit Pinned URL` and saves an
`http`, `https`, `file` or `vivaldi` address, keeping the tab's title and favicon. There is no reset
item. Vivaldi's Close tab and Unpin tab stay where they are.

**Menu of a Favorite tile.** It keeps `Edit Pinned Page ▸` of
[057](../057-tile-menu/spec.md), with the texts, dialog and disabled states of 056/FR-6 and FR-7,
acting on the tile's bookmark: `Replace Pinned URL with Current` takes the address the open tab
shows, disabled while it equals the bookmark or the tile has no open tab, and `Edit…` changes the
bookmark's address in every workspace, keeping its name and icon. These two items are the only way
this spec changes a bookmark, and only when the user asks for them.

**A new address on a pinned tab.** With a pinned tab active and showing another address, Cmd/Ctrl+L
and a new address open it in a new unpinned tab; the pinned tab keeps its pinned page. Picking the
pinned site from Vivaldi's suggestions switches to the pinned tab, as
[007](../007-reopen-pinned-tabs/spec.md) already does.

**A new-window link.** A `target="_blank"` link in a pinned page or a Favorite's page opens in Little
Arc ([005](../005-little-arc/spec.md)), and the row or tile it came from shows a small indicator for
that Little Arc window. This differs from [015](../015-peek-new-tab-links/spec.md), which sends such a
link to Peek. Tore decided on 2026-11-23 that Little Arc wins (Q-6): 015 gets an amendment, and its
Peek trigger applies only where Little Arc cannot open.

**Clear.** Clear on the separator leaves the pinned tabs of the workspace and the Favorite tabs open:
Favorites are never archived (003/FR-8). The unpinned tabs follow
[004](../004-today-tabs-and-keyboard/spec.md), which archives them; Arc closes them (Q-2).

**Versions.** The behavior holds on Vivaldi 8.1, 8.2 and 8.3, in the strip layout of 8.1 and 8.2 and
in the `span.pinned-group` layout that 058 reads on 8.3.

### Today

| Case | What happens today | Where |
|---|---|---|
| A pinned tab shows another address | Its slot gets `data-vivarcdi-away`, the stylesheet hides the favicon and draws a back arrow, and a click on the favicon navigates back | `AwayTabs.ts`, `TabBarMarker.ts` (`AWAY_ATTRIBUTE`, line 6), `ResetClick.ts`, `styles/pinned.scss` lines 3-18, `PinnedTabs.ts` (`resetButton`) |
| A Favorite's tab shows another address | Its state is `away` and its tile gets `data-vivarcdi-away`; a click on the active tile navigates back to the bookmark's address | `FavoriteStates.ts` line 32, `FavoritesView.ts` line 111 (`AWAY_ATTRIBUTE`), `FavoriteOpener.ts` lines 46 and 78-83 |
| Pinned page stored | Saved on pin or first sight into `vivExtData.pinnedUrl`; forgotten on unpin | `PinWatcher.ts`, `SavedAddresses.ts` lines 40-67, `OwnPage.ts` |
| Favorite page stored | The bookmark's address, also copied into `vivExtData.pinnedUrl` when the tab is linked | `LinkedTabs.ts` `link` and `sync` |
| Unload of a pinned tab | Cmd/Ctrl+W and Vivaldi's close button discard the tab; reopening loads the URL the tab last showed | `PinnedClosing.ts`, `CloseShortcut.ts`, `TabUnloader.ts` |
| Unload of a Favorite | Middle click, Cmd/Ctrl+W and the close affordance discard the tab; reopening reloads the URL the tab last showed, not necessarily the bookmark | `FavoriteOpener.ts` `unload` and `#activate` lines 85-90, `MiddleClickUnload.ts`, `PinnedClosing.ts`, `TabUnloader.ts` |
| Close control | Vivaldi's X, transparent until the row is hovered | `styles/sidebar-look.scss` lines 90-97 |
| Menu of a pinned row | Vivaldi's own menu only; no Edit Pinned Page | no VivArcDi menu on pinned rows; `PinnedAddress.ts` is used by `TileLinkCommands.ts` line 60 and `SavedTabActions.ts` line 101 |
| Menu of a Favorite tile | Edit Pinned Page from 057; Edit writes the bookmark, Replace takes the open tab's address | `TileLinkCommands.ts`, `shared/linkmenu/PinnedAddress.ts` |
| Cmd+L on a pinned tab | Vivaldi's address field navigates the tab it is on; VivArcDi has no rule for pinned tabs | `src/modules/littlearc/commandbar/`, no pinned handling |
| A `target="_blank"` link in a pinned page | Peek, as 015 says; Little Arc only takes links from other apps | `modules/peek`, `littlearc/ExternalLinkDetector.ts`, `littlearc/LittleArc.ts` |
| Clear | Archives the workspace's Today tabs; pinned and Favorite tabs are not archivable | `TodayArchive.ts` lines 50 and 113, `ArchiveSweeper.ts` line 94, `TodayTabPolicy.ts` |
| Vivaldi 8.3 | 058 marks the separator on the rows of the pinned group; the away arrow sits on the same rows | `TabBarMarker.ts`, `src/selectors/8.1.json` (`pinnedGroup`) |

### After

| Case | What happens after | Where |
|---|---|---|
| A pinned tab shows another address | No away mark, no arrow; the favicon stays; the pinned page is unchanged | Remove `AwayTabs.ts`, `ResetClick.ts` and the arrow from `styles/pinned.scss`; keep `TabBarMarker.ts` for the separator |
| A Favorite's tab shows another address | No away mark, no back arrow; the favicon stays; the bookmark and the Favorite's page are unchanged | Drop `away` from `FavoriteStates.ts` line 32 and `AWAY_ATTRIBUTE` from `FavoritesView.ts` line 111; remove `#reset` from `FavoriteOpener.ts`; keep the grid, the tile and its menu |
| Click on a Favorite tile | Activates its tab and never resets the page it shows, also when the tab shows another address | `FavoriteOpener.ts` `open`: no `#reset` branch |
| Pinned page stored | Unchanged: saved on pin or first sight, forgotten on unpin | `PinWatcher.ts`, `SavedAddresses.ts` (kept) |
| Favorite page stored | Unchanged: the bookmark's address, and its copy in the linked tab | `LinkedTabs.ts` (kept) |
| Unload of a pinned tab | The minus, Cmd/Ctrl+W and the close affordance unload; reopening loads the pinned page | `CloseShortcut.ts`, `PinnedClosing.ts`, `SavedAddresses.ts` |
| Unload of a Favorite | Middle click, Cmd/Ctrl+W and the close affordance unload; the tile stays dimmed; opening loads the bookmark's address | `FavoriteOpener.ts` `#activate` loads the Favorite's page, `MiddleClickUnload.ts` (kept) |
| Close control | A minus at the right end, shown while the row is hovered or active, that unloads and never closes; it is Vivaldi's close button restyled on pinned rows only | `styles/sidebar-look.scss`, `styles/pinned.scss` |
| Menu of a pinned row | Vivaldi's menu gains Edit Pinned Page with Replace and Edit…; Close tab and Unpin tab stay | new menu collaborator on the pinned rows, `shared/linkmenu/PinnedAddress.ts` |
| Menu of a Favorite tile | Unchanged: Edit Pinned Page with Replace and Edit…, acting on the bookmark | `TileLinkCommands.ts` (kept) |
| Cmd+L on a pinned tab | The address opens in a new unpinned tab, the pinned tab keeps its page, and a pinned-site suggestion switches to it | new; the probe of Q-1 comes first |
| A `target="_blank"` link in a pinned page | Opens in Little Arc, and the row shows the indicator | `littlearc/ExternalLinkDetector.ts` or a new detector, `styles/` |
| Clear | Unchanged for Today tabs; pinned and Favorite tabs stay open | `TodayArchive.ts` (kept), `TodayTabPolicy.ts` (kept) |
| Vivaldi 8.1, 8.2, 8.3 | The same behavior in both pinned layouts | `src/selectors/8.1.json` (`pinnedTab`, `tabWrapper`, `tabClose`, `pinnedGroup`) |

## Requirements

### Functional

- **FR-1.** Each pinned tab SHALL keep a pinned page: the address it had when pinned, or the one it
  showed when VivArcDi first saw it pinned without one. Unpinning SHALL forget it.
- **FR-2.** WHEN a pinned tab navigates to another address, THE pinned page SHALL stay unchanged.
- **FR-3.** WHEN an unloaded pinned tab is opened, THE tab SHALL load its pinned page.
- **FR-4.** THE tab bar SHALL NOT mark a pinned tab as away and a pinned row SHALL show no reset arrow
  or visible reset control; the row SHALL keep the favicon of its tab.
- **FR-5.** The unload affordance of a pinned row SHALL be Vivaldi's close button restyled as a minus
  on pinned rows only, not a new control. It SHALL sit at the right end of the row, be shown while the
  row is hovered or active and hidden otherwise, and a click on it SHALL unload the tab and SHALL NOT
  close it.
- **FR-6.** Cmd/Ctrl+W on a pinned tab SHALL unload it and SHALL NOT close it, as 003/FR-6 says.
- **FR-7.** The menu of a pinned row SHALL offer `Edit Pinned Page ▸` with `Replace Pinned URL with
  Current` and `Edit…`, with the texts, the dialog and the disabled states of 056/FR-6 and FR-7,
  acting on the pinned page of that tab. It SHALL NOT offer a reset item.
- **FR-8.** The menu of a pinned row SHALL keep a real close or unpin route, so a pinned tab can be
  closed or unpinned without the minus. Vivaldi's Close tab and Unpin tab stay as they are.
- **FR-9.** WHEN a pinned tab shows another address and the user opens an address from the address
  field with Cmd/Ctrl+L, THE address SHALL open in a new unpinned tab and the pinned tab SHALL keep
  its pinned page. Picking the pinned site from Vivaldi's suggestions SHALL switch to the pinned tab,
  as 007 says.
- **FR-10.** WHEN a page in a pinned tab or a Favorite's tab opens a link in a new window
  (`target="_blank"`), THE link SHALL open in Little Arc, as 005 describes, and the row or tile it
  came from SHALL show an indicator for that Little Arc window.
- **FR-11.** WHEN Clear is clicked, THE pinned and Favorite tabs of the workspace SHALL stay open. The
  unpinned tabs follow 004.
- **FR-12.** `Edit…` on a pinned row SHALL save an `http`, `https`, `file` or `vivaldi` address into
  the pinned page and keep the tab's title and favicon. An invalid address SHALL keep the dialog open
  with the field marked.
- **FR-13.** The behavior SHALL hold on Vivaldi 8.1, 8.2 and 8.3, in the tab strip and in the pinned
  group beside it.
- **FR-14.** A Favorite's page SHALL be the address of its bookmark (003/FR-1) and SHALL NOT change
  when its tab navigates. The bookmark SHALL stay.
- **FR-15.** WHEN a Favorite's tab navigates to another address, THE Favorite's page and its bookmark
  SHALL stay unchanged.
- **FR-16.** WHEN an unloaded Favorite tile is opened, THE tab SHALL load the bookmark's address.
- **FR-17.** THE grid SHALL NOT mark a Favorite tile as away and the tile SHALL show no away mark, no
  back arrow and no reset control; the tile SHALL keep its favicon and stay in the grid.
- **FR-18.** Middle click, Cmd/Ctrl+W and the close affordance on a Favorite's tab SHALL unload it and
  SHALL NOT close it; the tile SHALL stay, dimmed.
- **FR-19.** A click on a Favorite tile SHALL activate its tab and SHALL NOT reset the page it shows,
  also when the tab shows another address.
- **FR-20.** The menu of a Favorite tile SHALL keep `Edit Pinned Page ▸` of 057, acting on the
  bookmark: `Replace Pinned URL with Current` takes the address the open tab shows, and `Edit…`
  changes the bookmark's address in every workspace, keeping its name and icon.

### Non-functional

- **NFR-1.** VivArcDi SHALL never block Vivaldi; no unload, navigation or window happens without a
  user action.
- **NFR-2.** The pinned page, the link between a Favorite and its tab, and the Favorite's page SHALL
  survive a restart of Vivaldi (003/NFR-2) and SHALL stay with their workspace
  ([030](../030-workspace-sync/spec.md)).
- **NFR-3.** The change adds no module and no runtime dependency. The `resetButton` option of
  003/FR-9 has nothing left to show and is retired by the design.
- **NFR-4.** The marking keeps its cost of at most one pass per animation frame (058/NFR-3).
- **NFR-5.** IF Vivaldi's markup or the tabs API is not what the module expects, THEN the module
  SHALL leave the tab bar as Vivaldi draws it and log the reason, as 003/NFR-3 says.
- **NFR-6.** Works on macOS and Debian; texts in English.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). A Draft spec names only `auto` and `manual`
checks: it adds no live scenario, so it names none.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a tab is pinned, THE module SHALL save its current address as its pinned page. | auto: `saves the address of a newly pinned tab` |
| AC-2 | WHEN the module first sees a pinned tab without a pinned page, THE module SHALL save its current address. | auto: `saves the address of a pinned tab seen for the first time` |
| AC-3 | WHEN a tab is unpinned, THE module SHALL forget its pinned page. | auto: `forgets the address of an unpinned tab` |
| AC-4 | WHEN a pinned tab navigates to another address, THE module SHALL keep its pinned page. | auto: `keeps the pinned page when a pinned tab navigates` |
| AC-5 | WHEN a pinned tab shows another address, THE module SHALL leave the row unmarked and keep its favicon. | auto: `does not mark a pinned tab that left its own page` |
| AC-6 | WHEN an unloaded pinned tab is opened, THE tab SHALL load its pinned page. | auto: `loads the pinned page when an unloaded pinned tab opens` |
| AC-7 | WHEN Cmd/Ctrl+W targets a pinned tab, THE module SHALL unload it and SHALL NOT close it. | auto: `unloads a pinned tab on close shortcut` |
| AC-8 | WHEN the minus of a pinned row is clicked, THE module SHALL unload the tab and SHALL NOT close it. | auto: `unloads a pinned tab from its minus` |
| AC-9 | WHEN Cmd/Ctrl+W targets an ordinary tab, THE module SHALL leave the shortcut to Vivaldi. | auto: `leaves the close shortcut to Vivaldi for ordinary tabs` |
| AC-10 | WHEN `Replace Pinned URL with Current` is chosen on a pinned row, THE pinned page SHALL become the address the tab shows. | auto: `replaces the pinned page of a row with the current one` |
| AC-11 | WHEN `Edit…` is saved with a valid address on a pinned row, THE pinned page SHALL change and the title and favicon SHALL stay. | auto: `edits the pinned page of a row` |
| AC-12 | WHILE the current address equals the pinned page or the row has no open tab, `Replace Pinned URL with Current` SHALL be disabled. | auto: `disables replace on a pinned row when the addresses are equal` |
| AC-13 | WHEN Clear is clicked, THE pinned tabs SHALL stay open. | auto: `a pinned tab is not archivable` |
| AC-14 | WHEN Tore compares Arc 1.174.1 with VivArcDi, THE pinned row SHALL show no back arrow, no reset button and no away mark, SHALL keep its favicon after browsing away, and a click on the row SHALL NOT navigate it back. | manual |
| AC-15 | WHEN Tore hovers a pinned row and makes it active, THE minus SHALL be Vivaldi's close button restyled as a minus at the right end, look and show as Arc's, and a click on it SHALL unload the row, which SHALL come back at its pinned page. | manual |
| AC-16 | WHEN Tore right-clicks a pinned row, THE menu SHALL show `Edit Pinned Page` with `Replace Pinned URL with Current` and `Edit…` and no reset item, and SHALL keep Close tab and Unpin tab. | manual |
| AC-17 | WHEN Tore presses Cmd/Ctrl+L on a pinned tab showing another address and opens an address, THE address SHALL open in a new unpinned tab, the pinned tab SHALL keep its page, and a pinned-site suggestion SHALL switch to the pinned tab. | manual |
| AC-18 | WHEN Tore opens a `target="_blank"` link in a pinned or Favorite page, THE page SHALL open in Little Arc and the row or tile SHALL show the indicator; Little Arc SHALL win over Peek, and 015 SHALL be amended so its Peek trigger applies only where Little Arc cannot open. | manual |
| AC-19 | WHEN Tore clicks Clear, THE unpinned tabs SHALL follow 004's archive and the pinned and Favorite tabs SHALL stay open. | manual |
| AC-20 | WHEN Tore runs the same checks on Vivaldi 8.1, 8.2 and 8.3, THE minus, the implicit reset, the menu and the indicator SHALL work in both pinned layouts. | manual |
| AC-21 | WHEN Vivaldi restarts or Tore switches workspace, EACH pinned tab and each Favorite SHALL keep its page and each workspace its own pinned tabs. | manual |
| AC-22 | WHEN a Favorite's tab navigates to another address, THE module SHALL keep the bookmark's page. | auto: `keeps the bookmark page when a favorite tab navigates` |
| AC-23 | WHEN a Favorite's tab shows another address, THE module SHALL leave its tile unmarked and keep its favicon. | auto: `does not mark a favorite tile that left its own page` |
| AC-24 | WHEN an unloaded Favorite tile is opened, THE tab SHALL load the bookmark's address. | auto: `loads the bookmark page when an unloaded favorite tile opens` |
| AC-25 | WHEN `Edit…` is saved with a valid address on a Favorite tile, THE bookmark's address SHALL change in every workspace and the name and icon SHALL stay. | auto: `edits the pinned url of a tile` |
| AC-26 | WHEN `Replace Pinned URL with Current` is chosen on a Favorite tile, THE bookmark's address SHALL become the address its open tab shows. | auto: `replaces the pinned url of a tile with the current one` |
| AC-27 | WHEN Clear is clicked, THE Favorite tabs SHALL stay open. | auto: `the tab of a Favorite is not archivable` |
| AC-28 | WHEN Tore compares a Favorite tile with Arc, THE tile SHALL show no away mark and no back arrow, SHALL keep its favicon and stay in the grid when its tab is unloaded, a click SHALL activate the tab and SHALL NOT reset it, and middle click and Cmd/Ctrl+W SHALL unload the tab, after which a click SHALL load the bookmark's address again. | manual |

## Out of scope

- Automatic unloading of pinned tabs or Favorite tabs after a time (soft hibernation), which Tore
  suspects in Arc but did not measure: it needs a measurement first.
- Whether a same-window cross-site link in a pinned or Favorite page navigates that tab or opens a new
  tab or Little Arc: Q-7, a probe before the design.
- `target="_blank"` links from ordinary, unpinned tabs: only the pinned case was observed.
- The back arrow of Little Arc and the lifetime of its windows: [005](../005-little-arc/spec.md).
- The amendment to 015 that applies its Peek trigger only where Little Arc cannot open: 015's own
  change, made after this spec's Q-6 decision.
- Changing Vivaldi's Close tab and Unpin tab items, and Arc's `Remove Pin` beyond keeping it in the
  menu.
- The other items of a tile's menu and the saved-page behavior of link rows and tiles:
  [056](../056-saved-tab-menu/spec.md) and [057](../057-tile-menu/spec.md).
- Vivaldi 8.4 and later.

## Open questions

- [ ] **Q-1. Cmd+L without blocking Vivaldi.** How to notice or intercept Cmd/Ctrl+L and the address
  it opens, without taking the key from Vivaldi. Recommendation: probe what Vivaldi does on 8.1, 8.2
  and 8.3 first; prefer watching the pinned tab's navigation and reopening the address in a new tab
  over binding Cmd+L, and if neither works without blocking the address field, say so and leave AC-17
  out of the implementation.
- [x] **Q-2. Clear: close or archive?** Arc closes every unpinned tab; VivArcDi's 004 archives the
  Today tabs of the workspace. Recommendation: keep 004's archive, and make this spec guarantee only
  that the pinned tabs and the Favorites stay open (Tore, 2026-11-23: Arc closes). Answered (Tore,
  2026-11-23): keep 004's archive; this spec guarantees that the pinned tabs and the Favorite tabs
  stay open.
- [ ] **Q-3. The Little Arc indicator.** What exactly the icon next to the pinned row or the tile is,
  where it sits and what it opens. Recommendation: read it from Tore's recording and a probe before
  the design; do not guess a shape or a tooltip.
- [x] **Q-4. Minus or close button.** Whether the minus replaces Vivaldi's close button or is a new
  VivArcDi control. Recommendation: restyle Vivaldi's close button as a minus on pinned rows only, so
  the key and the click keep one code path; add a control of VivArcDi's only if a version cannot be
  restyled. Answered (Tore, 2026-11-23): restyle Vivaldi's close button on pinned rows only, not a
  new control; a Favorite keeps its middle click, Cmd/Ctrl+W and close affordance.
- [ ] **Q-5. The statuses of 003 and 058.** How to record the supersession once 059 lands.
  Recommendation: add an "Amended by 059" note to both headers and list the superseded criteria
  there; keep 003 `Approved` and 058 in its current status, because the saved pages, the separator
  and the 8.3 layout remain valid.
- [x] **Q-6. `target="_blank"`: Peek or Little Arc?** 015 (Approved, 2026-10-30) opens a new-window
  link in a pinned tab in Peek; Tore's run of Arc 1.174.1 on 2026-11-23 showed one in Little Arc with
  an icon next to the pinned row. Recommendation: Little Arc wins for a new-window link, and 015's
  Peek trigger applies only where Little Arc cannot open; 015 then gets an amendment. Answered (Tore,
  2026-11-23): Little Arc wins; 015 gets an amendment, and its Peek trigger applies only where Little
  Arc cannot open.
- [ ] **Q-7. A same-window cross-site link in a pinned or Favorite page.** In a pinned or Favorite
  page, does a link to another site that opens in the same window navigate that tab or open a new tab
  or Little Arc? Tore did not test it. Recommendation: probe it in Arc before the design and write
  the answer here; do not guess.

## References

- [001 Favorites grid](../001-favorites-grid/spec.md): the tile, its favicon and its unload controls.
- [003 Favorites and pinned tabs](../003-pinned-tabs-and-folders/spec.md): the Favorite's page, the
  saved page, the separator and the unload on close; FR-5, AC-9, AC-10 and AC-16 are fully superseded
  here.
- [007 Reopen pinned tabs](../007-reopen-pinned-tabs/spec.md): the address match and the switch to
  an existing pinned tab.
- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md): the row look and the close affordance
  this spec turns into a minus on pinned rows.
- [046 Live verification](../046-live-verification/spec.md): a Draft names no live scenario; the
  `manual` checks become Tore's checklist.
- [056 Menu of a saved tab](../056-saved-tab-menu/spec.md): the Edit Pinned Page texts, the dialog
  and the disabled state used on pinned rows and tiles.
- [057 Menu of a Favorites tile](../057-tile-menu/spec.md): the Edit Pinned Page of a tile, kept on
  the Favorite model.
- [058 Pinned tabs on Vivaldi 8.3](../058-pinned-tabs-83/spec.md): the pinned-group layout and the
  separator; only its away-arrow part is superseded.
- [002 Peek](../002-peek/spec.md) and [015 Peek for new-tab links](../015-peek-new-tab-links/spec.md):
  the Peek trigger this spec's new-window rule replaces, with 015's amendment.
- [004 Today tabs and keyboard](../004-today-tabs-and-keyboard/spec.md): Clear and the archive.
- [005 Little Arc](../005-little-arc/spec.md): the small window of a new-window link.
- [030 Workspace sync](../030-workspace-sync/spec.md): the pinned and Favorite tabs of each
  workspace.
- [The tab bar](../../docs/manual/tab-bar.md#pinned-tabs), section "Pinned tabs".
- Code: `src/modules/pinned/`, `src/modules/favorites/`, `src/modules/today/TodayTabPolicy.ts`,
  `src/shared/linkmenu/PinnedAddress.ts`, `src/styles/pinned.scss`, `src/styles/sidebar-look.scss`,
  `src/modules/littlearc/`, `src/selectors/8.1.json`.
