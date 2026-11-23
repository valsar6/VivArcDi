# 058 Pinned tabs on Vivaldi 8.3

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |
| Amended by | [059](../059-pinned-tabs-arc/spec.md) (2026-11-23): AC-1 and the away-arrow parts of AC-4 to AC-6 are superseded; the pinned-group layout and the separator stay. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

On Vivaldi 8.3 Vivaldi draws the pinned tabs of a window in a `span.pinned-group` that sits inside
`#tabs-container` beside the `.tab-strip`, not inside the strip as in 8.1 and 8.2. VivArcDi reads the
rows of the strip only, so the Arc behavior of [003](../003-pinned-tabs-and-folders/spec.md) and
[027](../027-rename-pinned-tabs/spec.md) disappears on 8.3: no reset arrow on a pinned tab that left
its own page, no separator after the last pinned row, and a click on the favicon does not go back to
the own page. This spec makes the pinned rows work wherever Vivaldi puts them, with no change on
8.1 and 8.2.

Seen in the lab on Vivaldi 8.3.4191.47 with the 8.1 catalog in use
(`[VivArcDi:boot] Vivaldi 8.3 has no selector catalog of its own: using 8.1`): the direct children of
`#tabs-container .tab-strip` are a `div.separator` and a `span` for the normal tab, while
`div.tab-position.is-pinned` sits inside `span.pinned-group`, a sibling of the strip. After pinning
`http://127.0.0.1:47823/news.html`, with `pinnedUrl` stored, navigating to `guides.html` left
`data-vivarcdi-away` and `data-vivarcdi-pinned-last` at 0, and a click on
`.tab-position.is-pinned .favicon` left the tab at `guides.html`. The same run booted and resolved
the selectors of the 8.1 catalog. The same flow on 8.1 is expected to work as 003 describes; it was
not retested for this spec.

## User stories

- **US-1.** As a user on Vivaldi 8.3, I want the reset arrow on a pinned tab that left its own page,
  so that the row behaves as in Arc.
- **US-2.** As a user on Vivaldi 8.3, I want a click on the arrow to bring the pinned tab back, so
  that one click still resets it.
- **US-3.** As a user on Vivaldi 8.3, I want the separator after the last pinned row, so that the
  pinned rows stay apart from Today's tabs.
- **US-4.** As a user on Vivaldi 8.1 or 8.2, I want the same behavior as before, so that the Vivaldi
  update does not cost me the working version.

## Expected behavior

On Vivaldi 8.3 the pinned rows keep their place in the sidebar, below the Favorites grid and the
folders and above the separator and Today's tabs, but Vivaldi groups their slots in its own
`span.pinned-group` beside the strip. The rows look and act as on 8.1 and 8.2: a pinned tab that
shows another host or path than its own page shows the reset arrow instead of its favicon, the last
pinned row shown carries the separator below it, and a click on the arrow loads the own page as in
[003](../003-pinned-tabs-and-folders/spec.md) and
[007](../007-reopen-pinned-tabs/spec.md). The behavior holds whether the Favorites grid is on or off:
with the grid on, a pinned tab linked to a Favorite stays hidden behind its tile
([003](../003-pinned-tabs-and-folders/spec.md) FR-3) and the other pinned tabs show as rows; with
the grid off, every pinned tab shows as a row.
Restarting Vivaldi or changing workspace does not change any of it.

VivArcDi reads the pinned rows wherever Vivaldi puts them, through the selector catalog of
[039](../039-boot-self-check/spec.md), so the same selectors serve the strip of 8.1 and 8.2 and the
pinned group of 8.3. The selector catalog in use on 8.3 keeps every name the 8.1 catalog defines, so
no other module loses a selector on the newer Vivaldi. The [046](../046-live-verification/spec.md)
selector check on 8.3 reports no failed selector.

## Requirements

### Functional

- **FR-1.** VivArcDi SHALL show the reset arrow on a pinned row whose tab left its own page, whether
  the row sits inside `#tabs-container .tab-strip` (8.1, 8.2) or in Vivaldi's pinned group beside it
  (8.3).
- **FR-2.** VivArcDi SHALL show the separator after the last pinned row shown, in both layouts.
- **FR-3.** A click on the favicon of an away pinned row SHALL load its own page, in both layouts, as
  003/AC-10 says.
- **FR-4.** The behavior SHALL hold with the Favorites grid enabled and disabled. Pinned tabs linked
  to a Favorite stay hidden as in 003/FR-3.
- **FR-5.** The structure of the pinned rows SHALL be read through the selector catalog, never
  hard-coded in a module, and the catalog in use on Vivaldi 8.3 SHALL define every selector name the
  8.1 catalog defines.
- **FR-6.** Vivaldi 8.1 and 8.2 SHALL keep their current behavior; the change may add a selector or a
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
| AC-1 | WHEN a pinned row sits in Vivaldi's pinned group beside the tab strip and its tab left its own page, THE module SHALL mark it as away so its reset arrow shows. | auto: `marks an away pinned row of a group beside the tab strip` |
| AC-2 | WHEN the pinned rows sit in a group beside the tab strip, THE module SHALL mark the last pinned row shown with the separator. | auto: `marks the separator after the last pinned row of a group beside the tab strip` |
| AC-3 | THE selector catalog in use on Vivaldi 8.3 SHALL define every selector the 8.1 catalog defines. | auto: `defines on Vivaldi 8.3 every selector of the 8.1 catalog` |
| AC-4 | WHEN a pinned row on Vivaldi 8.3 leaves its own page, THE row SHALL show the reset arrow and a click on it SHALL load the own page. | manual |
| AC-5 | WHEN Tore turns the Favorites grid off on Vivaldi 8.3 and browses away from a pinned tab, THE row, its arrow, the separator and the click SHALL work as with the grid on. | manual |
| AC-6 | WHEN Tore runs the same flow on Vivaldi 8.1, or 8.2 if 8.1 is no longer installed, THE arrow, the separator and the click SHALL work as before. | manual |

AC-4 becomes a live check when the implementation adds its scenario. A Draft spec names none:
`every live check has a scenario` would look for a scenario that does not exist yet.

## Out of scope

- Other Vivaldi 8.3 incompatibilities that the lab run did not show: each one gets its own spec once
  it is reported.
- 8.4 and later, and a catalog file per build number.
- The recording and GIF capture work: a separate effort.
- Redesign of the tab bar, of the rows or of their icons ([027](../027-rename-pinned-tabs/spec.md),
  [028](../028-arc-sidebar-look/spec.md)).
- A live scenario for 8.1 or 8.2: the lab runs the installed Vivaldi.

## Open questions

- [ ] **Q-1. A catalog for 8.3 or one selector for every version.** Every selector of the 8.1
  catalog resolved in the lab on 8.3; the pinned rows simply sit in a `pinned-group` that the catalog
  already names. Recommendation: mark the rows of the pinned group wherever they sit, as
  [050](../050-tab-strip-gap/spec.md)'s `HiddenTabMarker` already does, so 8.1, 8.2 and 8.3 share one
  code path; add an 8.3 catalog only if the design's probe finds another selector wrong on 8.3.
- [ ] **Q-2. Why the click does not reset on 8.3.** The lab clicked
  `.tab-position.is-pinned .favicon` and the tab stayed at `guides.html`, but the probe did not tell
  whether the reset found no away tab or no tab id in the row's wrapper. Recommendation: the design
  probes the pinned row on 8.3 for the wrapper that carries `data-id` and for the
  `.tab-header`/`.favicon` nesting the reset matches; the live scenario added with the
  implementation then proves the click.
- [ ] **Q-3. Which Vivaldi build Tore still has.** Recommendation: run AC-6 on 8.1 if it is still
  installed, otherwise on 8.2; the change must leave both untouched. If neither is available, say so
  and rely on the 8.3 live run and the automated tests.

## References

- [003 Favorites and pinned tabs](../003-pinned-tabs-and-folders/spec.md): AC-9, AC-10 and AC-16
  describe the arrow, the separator and the reset.
- [007 Reopen pinned tabs](../007-reopen-pinned-tabs/spec.md): FR-2 compares the own page.
- [027 Rename and re-icon pinned tabs](../027-rename-pinned-tabs/spec.md): the rows are the same
  elements.
- [039 Boot self-check](../039-boot-self-check/spec.md): the selector catalog, its stand-in line and
  the undefined-selector warning.
- [046 Live verification](../046-live-verification/spec.md): the selector check and the `live:`
  scenarios.
- [050 Tab strip gap](../050-tab-strip-gap/spec.md): `HiddenTabMarker` already marks the slots of the
  pinned group wherever they sit.
- [The tab bar](../../docs/manual/tab-bar.md#pinned-tabs), section "Pinned tabs".
- `src/selectors/8.1.json`, `src/modules/pinned/TabBarMarker.ts`,
  `src/modules/pinned/ResetClick.ts`, `src/shared/tabs/TabBarMarks.ts`.
