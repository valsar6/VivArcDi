# 059 Pinned tabs and Favorites like Arc: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after the spec was approved on 2026-11-23. It says **how**; the spec says **what**. It builds
on the marker and the own-page storage of [003](../003-pinned-tabs-and-folders/design.md), on the
pinned-group findings of [058](../058-pinned-tabs-83/spec.md) (whose design travels in its own pull
request), on the menu items of [056](../056-saved-tab-menu/design.md) and
[057](../057-tile-menu/design.md), and on the window of [005](../005-little-arc/design.md).

## Approach

The spec removes the away model from both the pinned rows and the Favorite tiles and keeps the page
each one stands for. That is not one change but six that share three pieces of code: the tab-bar
marks, the own page stored with a tab, and the menu items. The design makes the smallest change per
area so that every task stays reviewable on its own.

| Area | What changes | Where |
|---|---|---|
| Pinned page | The away mark, the reset arrow and the reset click go; the pinned page stays | `modules/pinned` |
| Favorite page | The `away` tile state, the tile attribute and the reset on a tile click go; the bookmark's page stays | `modules/favorites` |
| Minus | Vivaldi's close button is redrawn as a minus on pinned rows only | `styles/pinned.scss` |
| Pinned row menu | `Edit Pinned Page ▸` is added to Vivaldi's own menu of a pinned tab | `modules/pinned`, `shared/linkmenu`, `shared/tabmenu` |
| New-window link | A `target="_blank"` link of a pinned or Favorite page opens Little Arc, with its indicator | `modules/littlearc`, `modules/peek`, `page/` |
| 8.3 | The separator follows the last pinned row in the group and in the strip; no away mark | `modules/pinned/TabBarMarker.ts` |

The design keeps two of the spec's decisions explicit because they gate code:

- **Q-1 (T12) is conditional.** It runs only if T2 records a way to see the address field's
  navigation without taking the key or the field from Vivaldi. Otherwise AC-17 stays out and the
  lead records it as a follow-up.
- **Q-3 (T11) is conditional on its probe.** If T4 cannot say what the icon is, the link still opens
  in Little Arc and the indicator stays out; AC-18 is then only partly met and the lead reports it
  to Tore before closing the spec.

### Pinned page and the implicit reset

**Marks.** `AwayTabs` becomes `PinnedMarks` and keeps only the set of tabs linked to a Favorite,
which the marker needs to leave the last pinned row to the visible rows. `TabBarMarker` stops
writing `data-vivarcdi-away`; it keeps `data-vivarcdi-pinned-last` and gains the group slots of 058.
`PinnedMarking` loses `isAway`. `AwayTabs.ts` goes; its `TabMarks` moves to `PinnedMarks` with only
the linked set.

**Own page.** `SavedAddresses` already stores `pinnedUrl` on pin and first sight and forgets it on
unpin; nothing changes there. What changes is the open of an unloaded tab: Vivaldi restores the URL
the tab showed last, which can be the away one, so the module loads the pinned page instead.

`PinnedPageLoader` (new, `modules/pinned`) does that in one place for every pinned tab, Favorites
included:

1. `start` subscribes to `onActivated`, `onUpdated` and `onRemoved` and reopens the active tab of the
   window, so a discarded pinned tab restored by a restart is covered too.
2. On activation of a pinned, unloaded tab with a pinned page, it calls
   `tabs.update(tabId, { url: own })` before Vivaldi's reload of the last URL. A discarded tab takes
   a URL directly, so the pinned page is the first page loaded.
3. The tab id is remembered until its first `status` of `complete`. If the tab still shows another
   address then, as when Vivaldi reloaded the last URL before the update, the loader navigates it
   once more. The remembered id is dropped on `complete` and on `onRemoved`, so a later navigation
   by the user is never undone.
4. When the tab has no own page (a `vivaldi://` pinned tab), the loader leaves it alone.

`PinnedTabs` starts the loader and stops it; it no longer builds `ResetClick`, and the `resetButton`
option goes from `PinnedTabsOptions` and from `config.json`, where it would otherwise be an unknown
option and log a warning.

**Why not reset in `PinWatcher`.** It sees the pin and the URL but not the activation, and it must
stay the only writer of `pinnedUrl`. The loader only navigates.

**Rejected:** navigating on `onActivated` even for a loaded away tab (it would undo a page the user
is reading); a `discarded` listener on the webview (per page, not per tab); clearing the away URL
from the tab's session history (not available to `chrome.tabs`).

### Favorite page and the click on a tile

`FavoriteStates` loses `away`; its `TileState` is `{ active, unloaded }`. `FavoritesView` loses
`AWAY_ATTRIBUTE` and its toggle. The bookmark, its address and the copy in `LinkedTabs` stay.

`FavoriteOpener.open` becomes: no tab → open it as today; a tab that is already active → nothing
(the user asked for the tab, not for the bookmark); any other tab → activate it, and when it is
unloaded, `tabs.update(tabId, { url: favorite.url })` instead of `reload`. `#reset` goes.

`PinnedFavorites.#open`, the tiles of pinned tabs without a Favorite, does the same with its own page
(`OwnPage.of(tab)`), falling back to `reload` when the tab has none. That keeps AC-6 true for the
tiles of pinned tabs as well as for the rows.

A Favorite tab is pinned, so its activation can reach both `FavoriteOpener` and `PinnedPageLoader`.
They load the same address (`favorite.url` is the `pinnedUrl` written by `LinkedTabs.link`), and the
second call is a no-op once the tab is no longer discarded; the duplicate is harmless and leaves the
one path of each module clear.

### The minus

The minus is CSS on Vivaldi's own close button, so `CloseShortcut` keeps its click path and AC-8
needs no new listener. The row, not a new control, is the target:

```scss
#{$root}[data-vivarcdi-pinned-unload] .tab-position.is-pinned .tab-header .close {
  // the glyph of Vivaldi is hidden, a minus is drawn in currentcolor
}

#{$root}[data-vivarcdi-pinned-unload] .tab-position.is-pinned:hover .tab-header .close,
#{$root}[data-vivarcdi-pinned-unload] .tab-position.is-pinned:has(.tab.active) .tab-header .close {
  opacity: 1;
}
```

**Probe result (T2).** 8.3 has no `.tab-header .close` on a pinned row, so the rule above cannot be a
restyle of Vivaldi's X. T8 adds a VivArcDi minus button at the right end of the row, hidden until the
row is hovered or active, and the CSS above becomes the starting point for that button. `CloseShortcut`
keeps its own click path; the button calls the same unload.

`$minus-glyph` joins the tokens next to `$close-glyph`. The block lives in `pinned.scss`, next to the
separator, and uses `pinnedTab`/`tabClose` through the existing tokens. It sits under
`#browser[data-vivarcdi-active][data-vivarcdi-pinned-unload]`: `PinnedTabs` sets that attribute from
the `unloadOnClose` option (the option of 003/FR-9 stays), so with the option off the close button
is not drawn as a minus that would close the tab, and Vivaldi's X stays. The close button of a
Favorite tab is not restyled: the tab is hidden in the list and its tile keeps middle click,
Cmd/Ctrl+W and the close affordance of 001.

The probe (T1) records the markup of `.tab-header .close` on 8.1, 8.2 and 8.3: whether the X is an
inline SVG, a background image or a font glyph, and which child hides it cleanly. The stylesheet is
written from that record; no selector is guessed.

### Edit Pinned Page on a pinned row

The menu of a pinned row is Vivaldi's own menu, extended the way the folders already extend it: a
wrapper around `vivaldi.contextMenu.show`. Two pieces move so that `modules/pinned` can use them
without importing `modules/folders`:

- `TabMenuItems` and `MenuItemShape` move to `src/shared/tabmenu/`. Their behavior and tests stay;
  only the import paths and the missing-API warning change (it is no longer about Pin tab and Tile
  tab only).
- `PinnedAddress` learns a `PinnedPageStore` instead of a `BookmarkWriter` and a `LinkedTab`:
  `read(id)`, `write(id, url)` and `tab(id)`. `BookmarkPinnedStore` (shared) wraps the bookmark
  writer and the linked tab for 056/057, so `TileLinkCommands` and `SavedTabActions` keep their
  items and tests. `TabPinnedStore` (pinned) reads and writes `vivExtData.pinnedUrl` with
  `TabDataWriter`, so `Edit…` and `Replace` act on the pinned page of the tab, not on a bookmark.

`PinnedAddress` gains a synchronous `menuFor(id, snapshot)` next to the asynchronous `submenu(id)`
of 056/057: the menu of Vivaldi must be built before `show` returns, so the disabled state comes
from a snapshot the module keeps, and the click re-reads the tab before it writes.

`TabMenuItems` changes from a fixed list of commands to `items(tabId) => TabMenuItem[]`, a small tree
of commands and submenus. The folders module passes a function that returns its two flat commands,
so its menu is unchanged. `MenuItemShape` learns the submenu type from the first item that has one
(the existing menu test already records it as `{ type: 'folder', id, label, items: [] }`) and gains
`submenu(id, label, items)`: it copies the sample's keys, sets that type and puts the children built
with `command` in `items`. When the menu has no submenu item to learn from, `submenu` returns null.
A `command` can now be built disabled, the sample's boolean flag set to false.

`PinnedRowMenu` (new, `modules/pinned`) owns the wrapper and a small snapshot of the pinned tabs
(read at start and on `onActivated`, `onUpdated`, `onRemoved`, like `PinnedMarking`). It builds:

| Menu | Item | Disabled when |
|---|---|---|
| top | `Edit Pinned Page ▸` | never |
| submenu | `Replace Pinned URL with Current` | no open tab, or the address equals the pinned page |
| submenu | `Edit…` | never |

Vivaldi's own Close tab and Unpin tab stay after the added items, untouched (FR-8). There is no
reset item, as in Arc.

**Probe result (T2).** A real right-click on a pinned row did not call `vivaldi.contextMenu.show`; the
pinned-row menu is native on 8.3 (or not routed through that API), so the folders' wrapper cannot
extend it. T10 is blocked until Tore chooses: a custom VivArcDi menu on the row that also carries
Close tab and Unpin tab, or dropping `Edit Pinned Page` from the pinned row and amending the spec. Do
not move `TabMenuItems`/`MenuItemShape` (T5) until that choice is made.

**Fallback.** If Vivaldi's menu has no submenu shape the wrapper can copy, `MenuItemShape.submenu`
returns null, `PinnedRowMenu` adds nothing, logs once, and reports it in the review; the design does
not put the two items at the top level on its own, because the spec asks for
`Edit Pinned Page ▸` and for Vivaldi's items to stay. Tore decides then whether the spec changes.

### Cmd+L on a pinned tab (Q-1, T12)

The design does not guess this one. The probe records, on each lab version:

1. With a pinned tab active that shows another address, pressing Cmd/Ctrl+L: does
   `document.activeElement` become `input.UrlBar-UrlField`? Does `tabs.onUpdated` fire? Does
   `tabs.onCreated` fire?
2. Typing an address and pressing Enter: which tab gets the new URL, does Vivaldi open a new tab by
   itself, and does the pinned tab's `vivExtData.pinnedUrl` stay?
3. Whether the Enter on the address field is visible to a capture listener on `window.html` with the
   field as the target, without a listener that changes what the field does.
4. Which lab versions are installed; the design records the ones that ran.

Only one shape is preferred, and only if the probe supports it: `PinnedAddressBar` (new,
`modules/pinned`) subscribes to `tabs.onUpdated` for the active pinned tab, armed by the address
field's session (focus or Enter observed, never prevented), and when the tab lands on another
address it opens that address in a new unpinned tab (`openerTabId` unset, not active if that is what
the probe shows), then loads the pinned page back. It never binds Cmd+L and never sets the field's
value or prevents its Enter.

The probe's result is written in "Findings of the probe (T1)". If the field's navigation cannot be
told apart from a click on a same-window link, T12 is closed without code: the "open and reset"
would also undo Q-7's deferred behavior, which the spec leaves out. AC-17 then stays manual and
unimplemented, and the lead records it as a follow-up.

**Probe result (T2).** The lab on 8.3 offered no safe signal: the synthetic events changed neither
focus nor navigation, and a real CDP Meta+L plus Enter left the pinned tab on its address and opened
no tab. T12 is closed without code, AC-17 stays out, and the lead records it as a follow-up.

### A new-window link and the indicator (Q-3)

**Routing.** `target="_blank"` in a pinned or Favorite page goes to Little Arc, and Peek keeps its
other triggers. The two modules cannot import each other, so the split is explicit and uses the
checked options the boot already passes in `context.modules`:

- `Peek` computes its effective triggers with `pinnedNewTab && modules['little-arc']?.enabled !== true`
  (together with the configured value). With Little Arc on, Peek no longer claims new-window links
  in pinned pages; the shift-click, cross-site and ordinary-tab triggers are untouched.
- `MainWindowRole` injects a new page script, `page/little-arc-links.ts`, into the pages of pinned
  and Favorite tabs, as Peek injects its own. A plain left click on a link with `target="_blank"` and
  an `http`/`https` address is prevented and sent to the interface with a token and the source tab
  id. Modifier and middle clicks stay with Vivaldi.
- The interface re-reads the tab, checks it is still a kept tab, opens the address in a Little Arc
  window (`LittleArcLauncher.openAddressIn`, a sibling of `openAddress` that returns the window id)
  and hands the window id and the source tab to the indicator.

015 gets its amendment in the implementation's docs task: its `pinnedNewTab` trigger applies only
where Little Arc cannot open. Until then this spec's Q-6 decision governs.

**Indicator.** Tore's recording of 2026-11-23 shows a small page icon, the MuseHub purple one, at the
right end of the pinned row after the title. The design does not assume it is clickable or that it
has a tooltip. T4 reads the recording and runs the smallest live check (open a `target="_blank"` link
from a pinned page and a Favorite page on the lab, then record the Little Arc window's address, the
row's DOM and a screenshot). The smallest indicator that matches it:

- a small icon (about 12 to 14 px) at the end of the row, after the title, and at the top right of a
  Favorite tile;
- not clickable, no tooltip, no label;
- shown while the Little Arc window opened from that row or tile is open, and removed when it closes;
- the favicon of the Little Arc page when T4 confirms the icon is the page's favicon, otherwise a
  generic page glyph. In either case it comes from the favicon service or a token mask, never from a
  new dependency.

`LittleArcIndicator` (new, `modules/littlearc`) keeps `windowId -> source`, resolves the source to the
visible element (the tile `[data-vivarcdi-tile="<favoriteId>"]` when the tab is linked to a Favorite,
otherwise the slot of `[data-id="tab-<id>"]`) and writes one attribute; `little-arc.scss` draws it.
It re-applies on tab-bar mutations once per frame, and clears on `windows.onRemoved`, which
`BrowserWindows` gains next to `onFocusChanged`.

If T4 cannot say what the icon is, T11 is closed without code, the design says so, and AC-18 is
reported to Tore as met for the routing only.

#### Findings (T4, 2026-11-23)

Tore's screenshots of 2026-11-23 show the ULTIMATE GUITAR row with the MuseHub page in Little Arc.
The indicator is a small square icon, about 16 px, at the right end of the pinned row after the
title; its image is the favicon of the Little Arc page (the purple MuseHub icon), not a generic page
glyph. The screenshots do not show whether it is clickable or has a tooltip, and they do not show a
Favorite tile with one. The smallest indicator of the design (not clickable, no tooltip, the page
favicon, shown while the window is open) matches the row; the tile position is the design's choice
and Tore's manual check decides it. T11 proceeds on that basis.

### Clear

No code change. `TodayTabPolicy.isArchivable` already refuses a kept tab, so `ArchiveSweeper.clear`
and the minute sweep leave pinned tabs and Favorites open and keep 004's archive. AC-13 and AC-27
are the existing tests `a pinned tab is not archivable` and `the tab of a Favorite is not
archivable`.

### Vivaldi 8.3

The marker takes the group slots of 058: read `pinnedGroup` when the catalog has it, mark the group
children first and then the strip children that are not a group, remember both roots, keep one pass
per animation frame, and choose the last pinned row from the combined list. Only the away mark goes
from that design; the separator and the no-warning rules stay. The close button, the favicon and the
wrapper are found inside the group by the existing selectors, as 058's probe recorded.

`PinnedPageLoader` and `PinnedAddress` are layout independent: they read tabs, not rows. The minus
CSS uses `.tab-position.is-pinned`, which matches the group's rows too.

058 stays valid only for this layout and for the separator. Its marker task and live scenario must
not land their away mark and reset, which this spec supersedes; 059's T6 brings the group slots and
the separator. The lead says so on 058's pull request before either implementation merges.

### Findings of the probe (T1)

T1 runs on the lab, on a throwaway profile, after Tore agrees. The file is
`.claude/tmp/059-pinned-tabs-arc/probe.js`, which git ignores; the body is the following and follows
the guard of `npm run live -- --probe`: it writes no storage, bookmark or preference, only the URLs
and the pin state of the throwaway profile. It wraps `vivaldi.contextMenu.show` for the length of
the right click and restores it at once. It is run once per installed version, with
`--vivaldi <root> --vivaldi-version <v>` where the lab has an unpacked build.

```js
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (check, label) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await check()) return;
    await wait(100);
  }
  throw new Error(`Timed out: ${label}`);
};
const describe = (element) => element === null ? null : {
  tag: element.tagName.toLowerCase(),
  classes: String(element.className),
  html: element.outerHTML.slice(0, 400),
};
const OWN = 'https://example.com/059-own';
const AWAY = 'https://example.com/059-away';
const [start] = await chrome.tabs.query({ active: true, currentWindow: true });
await chrome.tabs.update(start.id, { url: OWN });
await until(async () => (await chrome.tabs.get(start.id)).url === OWN, 'own page');
await chrome.tabs.update(start.id, { pinned: true });
await until(() => document.querySelector('.tab-position.is-pinned') !== null, 'pinned row');
await wait(500);
const row = document.querySelector('.tab-position.is-pinned');
row?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
await wait(200);
const close = document.querySelector('.tab-position.is-pinned .tab-header .close');
const group = document.querySelector('.pinned-group');
const items = [];
const original = vivaldi?.contextMenu?.show;
if (typeof original === 'function') {
  vivaldi.contextMenu.show = (params, callback) => {
    items.push(JSON.parse(JSON.stringify(params ?? null)));
    return original.call(vivaldi.contextMenu, params, callback);
  };
}
row?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));
await wait(500);
if (typeof original === 'function') {
  vivaldi.contextMenu.show = original;
}
const field = document.querySelector('input.UrlBar-UrlField');
field?.focus();
const activeBefore = describe(document.activeElement);
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', metaKey: true, bubbles: true, cancelable: true }));
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true, cancelable: true }));
await wait(300);
const activeAfter = describe(document.activeElement);
const seen = [];
const onCreated = (tab) => seen.push({ created: tab.id, url: tab.pendingUrl ?? tab.url, opener: tab.openerTabId ?? null });
const onUpdated = (tabId, change) => seen.push({ updated: tabId, change: { status: change.status, url: change.url, discarded: change.discarded } });
chrome.tabs.onCreated.addListener(onCreated);
chrome.tabs.onUpdated.addListener(onUpdated);
field?.focus();
if (field !== null) {
  field.value = AWAY;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}
await wait(2000);
chrome.tabs.onCreated.removeListener(onCreated);
chrome.tabs.onUpdated.removeListener(onUpdated);
const tabs = await chrome.tabs.query({ currentWindow: true });
const pinned = await chrome.tabs.get(start.id);
return {
  userAgent: navigator.userAgent,
  row: describe(row),
  close: describe(close),
  closeChain: close === null ? null : [close, close.parentElement, close.parentElement?.parentElement].map(describe),
  group: describe(group),
  groupChildren: [...(group?.children ?? [])].map(describe),
  menuItems: items,
  addressField: describe(field),
  activeBefore,
  activeAfter,
  seen,
  tabs: tabs.map((tab) => ({ id: tab.id, url: tab.url, pinned: tab.pinned, discarded: tab.discarded, opener: tab.openerTabId ?? null })),
  pinnedTab: { url: pinned.url, pinnedUrl: JSON.parse(pinned.vivExtData || '{}').vivarcdi?.pinnedUrl ?? null },
};
```

The findings are written here by T2 with the version and the date for each of these questions:

- The markup and the child that makes the X of `.tab-header .close`, for the minus.
- The `type` and the key of a submenu item in `vivaldi.contextMenu.show` and its children, for
  `MenuItemShape.submenu`; whether the disabled flag is `enabled: false` or another key.
- What Cmd/Ctrl+L and the Enter of the address field do to a pinned tab, and which of the signals of
  Q-1 are visible without changing the field.
- The `span.pinned-group` children on 8.3, which 058's probe already recorded.

#### Findings (T2, 2026-11-23, Vivaldi 8.3.4191.47)

The probe ran on the only installed build, 8.3.4191.47, on the throwaway profile; 8.1 and 8.2 were
not installed. The first run had the Favorites grid on, so the pinned row was hidden by
`data-vivarcdi-hidden`; a second run with `favorites-grid` off and a real hover inspected the visible
row.

- **Close markup.** The pinned row's `.tab-header` contains only `span.favicon` and its image. There is
  no `.close` element, also after a real hover. Vivaldi 8.3's pinned tabs have no close button to
  restyle, so T8 must add a VivArcDi minus control instead of drawing a minus on Vivaldi's X.
- **Menu.** A real right-click on the pinned row did not call `vivaldi.contextMenu.show`; the wrapper
  was installed (`couldWrap: true`) and `menuItems` stayed empty. The pinned-row menu is native on
  8.3, or not routed through that API. T10 cannot add `Edit Pinned Page` to it with the wrapper the
  folders use. A custom VivArcDi menu on the row, or dropping the item and amending the spec, is a
  decision for Tore; T10 is blocked until then.
- **Cmd/Ctrl+L.** Synthetic events did not change focus or navigate. A real CDP Meta+L, an
  `insertText` of another address and Enter left the pinned tab on its address and created no tab
  (`seen` only an `onUpdated` with a null URL and status). No safe signal separates the address
  field from a same-window link, so T12 is closed and AC-17 stays out, as the design allows.
- **Group.** The pinned row is a child of `span.pinned-group`; with the grid off it is visible, and
  the group/separator approach of 058 holds.

### Q-7 probe (T3, Tore)

Measured in Arc 1.174.1, not in VivArcDi; the design writes the question, not the answer.

1. Pin `https://www.ultimate-guitar.com/` (or any site) in a Space.
2. Open a link to a different site that stays in the same window (no `target="_blank"`).
3. Record: does the pinned tab's URL change, does a new tab appear in the list, or does a Little Arc
   window open? Does a new window open behind the pinned row, and does the row show an indicator?
4. Repeat in a Favorite whose tab is on another page.

If Tore has not run it when the implementation starts, the behavior stays out of the first
implementation: a same-window cross-site link keeps navigating the tab, as today, and the lead
records it as a follow-up. It is not inferred from the new-window case, because a typed address and a
same-window link are indistinguishable from `chrome.tabs` alone.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/modules/pinned/PinnedMarks.ts` | Reads the linked tabs of the window; no away set | Replaces `AwayTabs` |
| `src/modules/pinned/TabBarMarker.ts` | Separator only, over the strip and every `pinnedGroup`; no away mark | One pass per frame |
| `src/modules/pinned/PinnedMarking.ts` | Builds the marker and the marks; no `isAway` | Existing wiring |
| `src/modules/pinned/PinnedPageLoader.ts` | Loads the pinned page when a pinned tab is reopened after an unload | Observer |
| `src/modules/pinned/PinnedTabs.ts` | Starts the loader and the row menu; no reset click, no `resetButton` | Module |
| `src/modules/pinned/TabPinnedStore.ts` | `PinnedPageStore` over `vivExtData.pinnedUrl` | Adapter |
| `src/modules/pinned/PinnedRowMenu.ts` | `Edit Pinned Page ▸` in Vivaldi's menu of a pinned row | Adapter |
| `src/modules/pinned/PinnedAddressBar.ts` | Q-1, only if T2 records a safe signal | Observer |
| `src/modules/favorites/FavoriteStates.ts` | `{ active, unloaded }` per tile | - |
| `src/modules/favorites/FavoritesView.ts` | The tile without the away attribute | - |
| `src/modules/favorites/FavoriteOpener.ts` | A click activates; an unloaded tab loads the bookmark's address | - |
| `src/modules/favorites/PinnedFavorites.ts` | A tile of a pinned tab loads its own page when reopened | - |
| `src/shared/tabmenu/TabMenuItems.ts` | Vivaldi's tab menu with commands and submenus; moved from `modules/folders` | Wrapper |
| `src/shared/tabmenu/MenuItemShape.ts` | Learns the menu item shape, including a submenu; moved | - |
| `src/shared/linkmenu/PinnedAddress.ts` | The `Edit Pinned Page` texts, dialog and disabled states over a `PinnedPageStore` | Adapter |
| `src/shared/linkmenu/BookmarkPinnedStore.ts` | `PinnedPageStore` over a bookmark and its linked tab | Adapter |
| `src/modules/littlearc/LittleArcIndicator.ts` | Marks the row or tile a Little Arc window came from | Observer |
| `src/modules/littlearc/MainWindowRole.ts` | Injects the new-window link script and opens the link in Little Arc | - |
| `src/page/little-arc-links.ts` | Prevents a `target="_blank"` click in a pinned or Favorite page and sends it | Page script |
| `src/modules/peek/Peek.ts` | Drops `pinnedNewTab` where Little Arc can open | - |
| `src/core/browser/BrowserWindows.ts` | `onRemoved`, for the indicator | - |
| `src/styles/pinned.scss` | The minus and the separator; no away block | Stylesheet |
| `src/styles/little-arc.scss` | The indicator | Stylesheet |

### Changed signatures

```ts
export class TabBarMarker {
  constructor(selectors: SelectorCatalog, logger?: Pick<Logger, 'warn'>);
  apply(root: ParentNode, marks: TabMarks): void;
  clear(): void;
}

export interface TabMarks {
  linked: Set<number>;
}

export class PinnedPageLoader {
  constructor(tabs: Pick<BrowserTabs, 'get' | 'query' | 'update' | 'onActivated' | 'onUpdated' | 'onRemoved'>, logger: Logger);
  start(): Promise<void>;
  stop(): void;
}

export interface PinnedPageStore {
  read(id: string): Promise<string | undefined>;
  write(id: string, url: string): Promise<void>;
  tab(id: string): Promise<chrome.tabs.Tab | undefined>;
}

export interface PinnedPageSnapshot {
  saved?: string | undefined;
  current?: string | undefined;
  open: boolean;
}

export interface PinnedAddressDependencies {
  store: PinnedPageStore;
  dialog: Pick<PromptDialog, 'ask'>;
  notify: (text: string, kind?: ToastKind) => void;
  logger: Logger;
}

export class PinnedAddress {
  constructor(dependencies: PinnedAddressDependencies);
  submenu(id: string): Promise<MenuItem>;
  menuFor(id: string, snapshot: PinnedPageSnapshot): MenuItem;
  replace(id: string): Promise<void>;
  edit(id: string): Promise<void>;
}

export interface TabMenuCommand {
  id: string;
  label: string;
  disabled?: boolean;
  run: (tab: chrome.tabs.Tab) => void | Promise<void>;
}

export interface TabMenuTree {
  id: string;
  label: string;
  items: readonly TabMenuCommand[];
}

export type TabMenuItem = TabMenuCommand | TabMenuTree;

export interface TabMenuItemsDependencies {
  document: Document;
  contextMenu: ContextMenuApi | undefined;
  wrapperSelector: string;
  tabs: Pick<BrowserTabs, 'get'>;
  items: (tabId: number) => readonly TabMenuItem[];
  appliesTo: (tab: chrome.tabs.Tab) => boolean;
  logger: Logger;
  now?: () => number;
}

export interface PinnedRowMenuDependencies {
  document: Document;
  contextMenu: ContextMenuApi | undefined;
  selectors: SelectorCatalog;
  tabs: Pick<BrowserTabs, 'get' | 'query' | 'onActivated' | 'onUpdated' | 'onRemoved'>;
  address: Pick<PinnedAddress, 'menuFor' | 'replace' | 'edit'>;
  logger: Logger;
}

export class PinnedRowMenu {
  constructor(dependencies: PinnedRowMenuDependencies);
  start(): Promise<void>;
  stop(): void;
}

export class BrowserWindows {
  onRemoved(listener: (windowId: number) => void): () => void;
}

export class LittleArcLauncher {
  openAddressIn(url: string): Promise<number | null>;
}

export class LittleArcIndicator {
  show(sourceTabId: number, windowId: number): Promise<void>;
  clear(windowId: number): void;
}
```

Call sites that change: `PinnedTabs` (loader and row menu, reset removed), `PinnedMarking`
(`PinnedMarks`, logger), `FolderEditing` (imports of `TabMenuItems` from `shared/tabmenu`),
`TileLinkCommands` and `SavedTabActions` (`BookmarkPinnedStore`), `MainWindowRole` (page-link script
and indicator), `LittleArcLauncher` (`openAddressIn`), `BrowserWindows` and its `ChromeApi` type
(`onRemoved`). `FavoritesView`, `FavoriteStates`, `FavoriteOpener`, `PinnedFavorites` and `Peek` keep
their constructors.

## Vivaldi interface

| Name | Value | Used for |
|---|---|---|
| `pinnedGroup` | `.pinned-group` | The group of pinned rows on 8.3 |
| `pinnedTab` | `.tab-position.is-pinned` | A pinned row, in the group or in the strip; the minus |
| `tabWrapper` | `.tab-wrapper` | `data-id="tab-<id>"` for the slot and the tab menu |
| `tabClose` | `.tab-header .close` | Vivaldi's close button, restyled as the minus; the click stays `CloseShortcut` |
| `tabFavicon` | `.tab-header .favicon` | Unused after the reset click goes; the selector stays in the catalog for the check of 046 |
| `tabStrip` | `#tabs-container .tab-strip` | The strip slots, after the group's |
| `tabWebview` | `#webview-container webview[tab_id]` | The page script of the new-window link |
| `browser` | `#browser` | The toast parent and the dialog parent |

`vivaldi.contextMenu.show` and `vivaldi.contextMenu.onActivated` are read as the folders module
already reads them, and every member is checked before use. `chrome.windows.onRemoved` is added to
the `ChromeApi` type next to `onFocusChanged`.

Marks added: `data-vivarcdi-little-arc`, written by `LittleArcIndicator` only, and
`data-vivarcdi-pinned-unload` on `#browser`, written by `PinnedTabs` from the `unloadOnClose`
option. Marks removed: `data-vivarcdi-away`, on rows and tiles. No selector name is added.

Fallbacks: without `vivaldi.contextMenu.show` no item is added and the reason is logged once; a
missing strip with a group is normal on 8.3; a strip and no group is 8.1 and 8.2; neither warns once
and leaves the tab bar as Vivaldi draws it (NFR-5).

## Configuration

No module and no runtime dependency (NFR-3). Options removed: `resetButton` of `pinned-tabs` in
`config.json` and in its schema. No option is added; the Little Arc routing follows the `little-arc`
module being enabled and Peek's own `pinnedNewTab` without a new key. No new stylesheet: the
indicator goes in `little-arc.css`, already listed.

## Verification

- Automated: `make check` after every task. The `auto` criteria map to the tests below; the manual
  ones become T14.
- Lab: T1 and T4 and the conditional T12 use `npm run live -- --probe <file>` after Tore agrees. T6
  and T9 also run `npm run live` (boot check, selector check, no failed selector) on the lab, once
  Tore agrees; the run is recorded in the design with the version.
- Versions: the lab is expected to have 8.3 (058 recorded 8.3.4191.47). 8.1 and 8.2 are used when a
  build is available; otherwise T1 records which versions ran and the manual T14 covers the rest.
- No live scenario is added: the spec names none, and the criteria that a live run could prove stay
  manual until a spec change names a scenario.

## Mapping of the criteria to tests

| AC | Check | File |
|---|---|---|
| AC-1 | `saves the address of a newly pinned tab` | `tests/modules/pinned/PinnedTabs.test.ts` |
| AC-2 | `saves the address of a pinned tab seen for the first time` | `tests/modules/pinned/PinnedTabs.test.ts` |
| AC-3 | `forgets the address of an unpinned tab` | `tests/modules/pinned/PinnedTabs.test.ts` |
| AC-4 | `keeps the pinned page when a pinned tab navigates` | `tests/modules/pinned/PinnedPage.test.ts` |
| AC-5 | `does not mark a pinned tab that left its own page` | `tests/modules/pinned/Marking.test.ts` |
| AC-6 | `loads the pinned page when an unloaded pinned tab opens` | `tests/modules/pinned/PinnedPage.test.ts` |
| AC-7 | `unloads a pinned tab on close shortcut` | `tests/modules/pinned/PinnedTabs.test.ts` |
| AC-8 | `unloads a pinned tab from its minus` | `tests/modules/pinned/PinnedTabs.test.ts` |
| AC-9 | `leaves the close shortcut to Vivaldi for ordinary tabs` | `tests/modules/pinned/PinnedTabs.test.ts` |
| AC-10 | `replaces the pinned page of a row with the current one` | `tests/modules/pinned/PinnedRowMenu.test.ts` |
| AC-11 | `edits the pinned page of a row` | `tests/modules/pinned/PinnedRowMenu.test.ts` |
| AC-12 | `disables replace on a pinned row when the addresses are equal` | `tests/modules/pinned/PinnedRowMenu.test.ts` |
| AC-13 | `a pinned tab is not archivable` | `tests/modules/today/TodayTabPolicy.test.ts` |
| AC-14 | `manual` | checklist of T14 |
| AC-15 | `manual` | checklist of T14 |
| AC-16 | `manual` | checklist of T14 |
| AC-17 | `manual`; implemented only by T12 if T2 finds a safe signal, otherwise recorded as a follow-up | checklist of T14 |
| AC-18 | `manual`; routing by T9, indicator by T11 when T4 confirms it | checklist of T14 |
| AC-19 | `manual` | checklist of T14 |
| AC-20 | `manual` | checklist of T14 |
| AC-21 | `manual` | checklist of T14 |
| AC-22 | `keeps the bookmark page when a favorite tab navigates` | `tests/modules/favorites/FavoritePage.test.ts` |
| AC-23 | `does not mark a favorite tile that left its own page` | `tests/modules/favorites/FavoritePage.test.ts` |
| AC-24 | `loads the bookmark page when an unloaded favorite tile opens` | `tests/modules/favorites/FavoritePage.test.ts` |
| AC-25 | `edits the pinned url of a tile` | `tests/modules/favorites/TileLinkCommands.test.ts` |
| AC-26 | `replaces the pinned url of a tile with the current one` | `tests/modules/favorites/TileLinkCommands.test.ts` |
| AC-27 | `the tab of a Favorite is not archivable` | `tests/modules/today/TodayTabPolicy.test.ts` |
| AC-28 | `manual` | checklist of T14 |

Behavior that no criterion names, and its tests:

| Behavior | Test | File |
|---|---|---|
| The separator follows the last pinned row in a group beside the strip | `marks the separator after the last pinned row of a group beside the tab strip` | `tests/modules/pinned/Marking.test.ts` |
| The group's marks are cleared when the rows move | `clears the marks of the rows of a group beside the tab strip` | `tests/modules/pinned/Marking.test.ts` |
| The strip path stays without a group | `keeps marking the strip when the catalog has no pinned group` | `tests/modules/pinned/Marking.test.ts` |
| A missing strip with a group is normal | `does not warn when the strip is missing but a group exists` | `tests/modules/pinned/Marking.test.ts` |
| Neither a strip nor a group warns once (NFR-4) | `warns once when neither the strip nor a group matches` | `tests/modules/pinned/Marking.test.ts` |
| A discarded active pinned tab at start | `loads the pinned page of the active tab at start` | `tests/modules/pinned/PinnedPage.test.ts` |
| A tile click on an away tab does not reset it | `a click on the tile of an away tab activates it without resetting it` | `tests/modules/favorites/FavoritePage.test.ts` |
| The minus is drawn on pinned rows only | `draws the close button of a pinned row as a minus` | `tests/styles/Pinned.test.ts` |
| The menu adds one submenu after Vivaldi's items | `adds Edit Pinned Page after the items of the menu of a pinned tab` | `tests/modules/pinned/PinnedRowMenu.test.ts` |
| Any other tab's menu is left to Vivaldi | `leaves the menu of anything but a pinned tab to Vivaldi` | `tests/modules/pinned/PinnedRowMenu.test.ts` |
| A blank link in a pinned page opens Little Arc | `opens a blank link of a pinned page in Little Arc` | `tests/modules/littlearc/module.test.ts` |
| A blank link in an ordinary page stays with Vivaldi | `leaves blank links of ordinary pages to Vivaldi` | `tests/modules/littlearc/module.test.ts` |
| Peek drops its new-tab trigger where Little Arc can open | `peek leaves new-tab links of pinned pages to Little Arc` | `tests/modules/peek/Peek.test.ts` |
| The indicator follows its window | `marks the row a Little Arc window came from and clears it when the window closes` | `tests/modules/littlearc/module.test.ts` |

## Texts and logs

Texts, unchanged from 056/057: `Edit Pinned Page`, `Replace Pinned URL with Current`, `Edit…`,
`Edit Pinned URL`, `URL`, `Save`, `This is what opens first when you click this tab or its favicon.`,
`Enter a valid address`, `Could not change the address`. The menu of a pinned row adds no other text.
The indicator has no text and no tooltip.

Logs:

- `pinned-tabs`: `warn` `The tab strip is missing: pinned rows are left as Vivaldi draws them`
  (058, once per marker); `warn` `Could not load the pinned page of tab <id>`;
  `warn` `vivaldi.contextMenu.show is missing: no command is added to the menu of a tab` (the moved,
  now neutral, `TabMenuItems` text); `warn` `"<label>" does not apply to this tab`;
  `warn` `could not run "<label>" from the menu of a tab`;
  `warn` `the items of vivaldi.contextMenu.show are not as expected: no command was added to the
  menu of the tab`.
- `pinned-tabs`, from `PinnedAddress`: `warn` `could not read the pinned address` and
  `warn` `could not change the pinned address`, as in 056.
- `little-arc`: `warn` `Could not open a Little Arc window, leaving the link to Vivaldi` (existing);
  `warn` `could not check whether the new tab is a link from another app` (existing);
  `warn` `could not read the tab of a Little Arc link` (new).

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi's close button markup differs per version | T1 records it; the minus rule is written from the record, and a version without the expected child keeps Vivaldi's X rather than a broken glyph |
| Vivaldi's menu has no submenu shape the wrapper can copy | `MenuItemShape.submenu` returns null, nothing is added, the reason is logged and reported; no silent flat fallback |
| The update on a discarded tab loses the race with Vivaldi's reload | `PinnedPageLoader` navigates once more on `complete` while the tab is remembered; the id is dropped on `complete` and on `onRemoved` |
| The away removal breaks the separator or the last pinned row | The separator is chosen from the combined slots, and the tests of T6 cover the strip, the group and the linked tabs |
| A row is redrawn while a Little Arc window is open | The indicator re-applies its attribute on tab-bar mutations, one pass per frame; a link to a missing element is ignored |
| Both Peek and Little Arc claim a `target="_blank"` click | Peek drops `pinnedNewTab` when `little-arc` is enabled; a test proves it, and the page script ignores modifier clicks |
| Little Arc cannot open (no `chrome.windows`, a failed launcher) | The link stays in Vivaldi and the launcher logs it; Peek's trigger is only off when the module is enabled, and the failure is reported |
| The 8.1 and 8.2 builds are not on the machine | T1 records which versions ran; the manual T14 covers the rest |
| AC-17 and the indicator stay out | T12 and T11 are explicitly conditional; the lead records them as follow-ups and reports AC-17 and AC-18 to Tore |
| The version bump does not match the branch type | CONTRIBUTING requires a minor bump for `features/` and a patch bump for `fix/`; T13 uses the one the release check accepts |
