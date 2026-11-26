# 058 Pinned tabs on Vivaldi 8.3

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-26 (PR #297) |
| Implemented | 2026-11-26 |
| Amended by | [059](../059-pinned-tabs-arc/spec.md) (2026-11-23): AC-1 and the away-arrow parts of AC-4 to AC-6 are superseded; the pinned-group layout and the separator stay. [060](../060-clear-bar-and-pinned-unload/spec.md) (2026-11-24): the pinned rows with the grid on are tiles up to `maxTiles`. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

On Vivaldi 8.3 Vivaldi draws the pinned tabs of a window in a `span.pinned-group` that sits inside
`#tabs-container` beside the `.tab-strip`, not inside the strip as in 8.1 and 8.2. This spec makes
the pinned rows work wherever Vivaldi puts them, with no change on 8.1 and 8.2, and states what
VivArcDi guarantees on Vivaldi 8.3 as a whole: the selector catalog in use there names every
selector the modules ask for.

Seen in the lab on Vivaldi 8.3.4191.47 with the 8.1 catalog in use
(`[VivArcDi:boot] Vivaldi 8.3 has no selector catalog of its own: using 8.1`): the direct children of
`#tabs-container .tab-strip` are a `div.separator` and a `span` for the normal tab, while
`div.tab-position.is-pinned` sits inside `span.pinned-group`, a sibling of the strip. Every selector
of the 8.1 catalog resolved.

**What changed since the first draft.** [059](../059-pinned-tabs-arc/spec.md) dropped the away mark,
the back arrow and the click reset on every Vivaldi version: a pinned row keeps its favicon and its
minus unloads it. The 059 implementation already reads the rows of `pinnedGroup` in
`TabBarMarker`, and the test `marks the separator after the last pinned row of a group beside the
tab strip` already proves AC-2. What this spec still adds is the 8.3 catalog guarantee (AC-3), the
minus on a row of the pinned group (AC-4), and the checks on a real Vivaldi 8.3 and on 8.1 or 8.2.

## User stories

- **US-1.** As a user on Vivaldi 8.3, I want the separator after the last pinned row, so that the
  pinned rows stay apart from Today's tabs.
- **US-2.** As a user on Vivaldi 8.3, I want the minus of a pinned row to unload the tab as on 8.1,
  so that the Arc reset of 059 works on the newer Vivaldi.
- **US-3.** As a user on Vivaldi 8.3, I want every VivArcDi feature to find the parts of Vivaldi it
  needs, so that the update does not silently switch a feature off.
- **US-4.** As a user on Vivaldi 8.1 or 8.2, I want the same behavior as before, so that the Vivaldi
  update does not cost me the working version.

## Expected behavior

On Vivaldi 8.3 the pinned rows keep their place in the sidebar, below the Favorites grid and the
folders and above the separator and Today's tabs, but Vivaldi groups their slots in its own
`span.pinned-group` beside the strip. The rows look and act as on 8.1 and 8.2, as
[059](../059-pinned-tabs-arc/spec.md) describes: the row keeps its favicon after browsing away, the
minus at its right end unloads the tab and the row stays dimmed, opening it loads the pinned page,
and the last pinned row shown carries the separator below it. With the Favorites grid on, a pinned
tab linked to a Favorite stays hidden behind its tile
([003](../003-pinned-tabs-and-folders/spec.md) FR-3), and every other pinned tab of the workspace up
to `maxTiles` becomes a tile under the Favorites ([060](../060-clear-bar-and-pinned-unload/spec.md));
a pinned tab past `maxTiles` keeps its row. With the grid off, every pinned tab shows as a row.
Restarting Vivaldi or changing workspace does not change any of it.

VivArcDi reads the pinned rows wherever Vivaldi puts them, through the selector catalog of
[039](../039-boot-self-check/spec.md), so the same selectors serve the strip of 8.1 and 8.2 and the
pinned group of 8.3. The catalog in use on 8.3 keeps every name the 8.1 catalog defines, so no other
module loses a selector on the newer Vivaldi, and the [046](../046-live-verification/spec.md)
selector check on 8.3 reports no failed selector.

## Requirements

### Functional

- **FR-1.** VivArcDi SHALL show the separator after the last pinned row shown, whether the rows sit
  inside `#tabs-container .tab-strip` (8.1, 8.2) or in Vivaldi's pinned group beside it (8.3).
- **FR-2.** The minus of a pinned row SHALL unload its tab as 059/AC-8 says, in both layouts.
- **FR-3.** The behavior SHALL hold with the Favorites grid enabled and disabled, as 003/FR-3 and
  060 describe.
- **FR-4.** The structure of the pinned rows SHALL be read through the selector catalog, never
  hard-coded in a module, and the catalog in use on Vivaldi 8.3 SHALL define every selector name the
  8.1 catalog defines.
- **FR-5.** Vivaldi 8.1 and 8.2 SHALL keep their current behavior; the change may add a selector or a
  catalog file, but SHALL NOT change how the strip of those versions is read.

### Non-functional

- **NFR-1.** Works on Vivaldi 8.3.4191.47 and later 8.3 builds, on macOS and Debian.
- **NFR-2.** The change adds no module, no option in `config.json` and no runtime dependency.
- **NFR-3.** The `npm run live` selector check on Vivaldi 8.3 reports no failed selector, and the
  marking keeps its current cost of one pass per animation frame.
- **NFR-4.** IF Vivaldi's markup does not match the selectors, THEN VivArcDi SHALL leave the tab bar
  as Vivaldi draws it and log the reason, as in 003/NFR-3.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | Superseded by [059](../059-pinned-tabs-arc/spec.md) AC-14: a pinned row shows no away mark and no back arrow on any Vivaldi version. | manual |
| AC-2 | WHEN the pinned rows sit in a group beside the tab strip, THE module SHALL mark the last pinned row shown with the separator. | auto: `marks the separator after the last pinned row of a group beside the tab strip` |
| AC-3 | THE selector catalog in use on Vivaldi 8.3 SHALL define every selector the 8.1 catalog defines. | auto: `defines on Vivaldi 8.3 every selector of the 8.1 catalog` |
| AC-4 | WHEN the minus of a pinned row inside a group beside the tab strip is clicked, THE module SHALL unload the tab and SHALL NOT close it. | auto: `unloads a pinned tab from its minus in a group beside the tab strip` |
| AC-5 | WHEN a pinned row shows in Vivaldi 8.3's pinned group and its tab browsed away, THE last pinned row SHALL carry the separator, a click on its minus SHALL unload the tab, and opening it SHALL load its pinned page. | live: `the separator and the minus work on the pinned group` |
| AC-6 | WHEN Tore pins a tab on Vivaldi 8.3, browses away and unloads it from its minus, with the Favorites grid on and then off, THE row SHALL keep its favicon, the separator SHALL sit below the last pinned row and the dimmed row SHALL look as on a pinned row of 059. | manual |
| AC-7 | WHILE the pinned rows sit inside the tab strip, as on Vivaldi 8.1 and 8.2, THE module SHALL mark the separator after the last pinned row as before. | auto: `marks the separator after the last pinned row inside the tab strip` |

No Vivaldi 8.1 or 8.2 is available to Tore (Q-3), so AC-7 and the existing strip tests stand in for a manual run there.

## Out of scope

- Other Vivaldi 8.3 incompatibilities that the lab run did not show: each one gets its own spec once
  it is reported.
- 8.4 and later, and a catalog file per build number.
- The away mark, the back arrow and the click reset: 059 removed them.
- Redesign of the tab bar, of the rows or of their icons ([027](../027-rename-pinned-tabs/spec.md),
  [028](../028-arc-sidebar-look/spec.md)).
- A live scenario for 8.1 or 8.2: the lab runs the installed Vivaldi.

## Open questions

All answered by Tore on 2026-11-26 (PR #297).

- [x] **Q-1. A catalog for 8.3 or the 8.1 catalog as stand-in.** No `8.3.json` while 8.1 and 8.3
  are compatible: the AC-3 test and the 046 selector check on 8.3 prove it. A catalog file for 8.3 is
  added only when a selector differs.
- [x] **Q-2. A live scenario for AC-5.** Yes: the separator, the unload and the reload are read from
  the DOM and `chrome.tabs` on the lab Vivaldi 8.3; only the look stays manual (AC-6).
- [x] **Q-3. Which Vivaldi build Tore still has.** Neither 8.1 nor 8.2. The 8.1 and 8.2 layout is
  covered by the automated tests (AC-7 and the existing strip tests) and the 8.3 layout by the lab.

## References

- [003 Favorites and pinned tabs](../003-pinned-tabs-and-folders/spec.md): FR-3 and NFR-3.
- [059 Pinned tabs and Favorites like Arc](../059-pinned-tabs-arc/spec.md): AC-8 (the minus) and
  AC-14 (no away mark).
- [060 Clear bar and pinned unload](../060-clear-bar-and-pinned-unload/spec.md): tiles up to
  `maxTiles` and the Clear control outside the pinned group.
- [027 Rename and re-icon pinned tabs](../027-rename-pinned-tabs/spec.md): the rows are the same
  elements.
- [039 Boot self-check](../039-boot-self-check/spec.md): the selector catalog, its stand-in line and
  the undefined-selector warning.
- [046 Live verification](../046-live-verification/spec.md): the selector check and the `live:`
  scenarios.
- [050 Tab strip gap](../050-tab-strip-gap/spec.md): `HiddenTabMarker` already marks the slots of the
  pinned group wherever they sit.
- [The tab bar](../../docs/manual/tab-bar.md#pinned-tabs), section "Pinned tabs".
- `src/selectors/8.1.json`, `src/core/dom/SelectorCatalog.ts`, `src/modules/pinned/TabBarMarker.ts`,
  `src/modules/pinned/PinnedMinus.ts`, `src/shared/tabs/TabBarMarks.ts`.
