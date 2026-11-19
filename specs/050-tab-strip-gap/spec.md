# 050 Tab strip gap

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | Tore, 2026-11-19 (answers to Q-1 to Q-4); FR-6 and AC-11 to AC-20 added at Tore's request the same day; AC-21 and AC-22 added after reading Vivaldi's bundle (T1) |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

VivArcDi hides the slots of link tabs and pinned tabs that it draws itself (folders, Favorites), but
Vivaldi keeps their place in its own layout, so an empty block of about 51 px opens above the first
visible tab of Today. This spec closes the gap: hidden slots take no space, and the separator that no
longer separates anything is hidden too. Reported as issue #171.

## User stories

- **US-1.** As a user, I want the first Today tab right under the New Tab row, so that no empty block
  pushes my tabs down.
- **US-2.** As a user, I want tabs below a hidden one to stay in line, so that no hole opens in the
  middle of the list.
- **US-3.** As a user, I want dragging and reordering tabs to keep working as in Vivaldi.

## Expected behavior

Vivaldi places each slot of `#tabs-container .tab-strip` with absolute positioning, through the inline
variables `--PositionX`, `--PositionY` and `--Height`, computed from the full list of tabs, hidden
ones included. `HiddenTabMarker` ([009](../009-bookmark-folders-in-tab-bar/spec.md)) sets
`display: none` on a hidden slot, which removes it from rendering but not from that computation. In the
case reported on Vivaldi 8.2 the first visible tab sat at 51 px: 18 px of the separator and 33 px of
the hidden link tab.

With this spec, the visible slots of the strip are drawn as if the hidden ones were not in the list:
the offset of each visible slot loses the heights of the hidden slots before it, and the strip is as
tall as its visible slots. The separator between pinned tabs and Today's tabs is hidden while no pinned
tab is visible, since pinned tabs are drawn as VivArcDi tiles and Vivaldi's pinned group is hidden.
Nothing changes when no slot is hidden.

## Requirements

### Functional

- **FR-1.** The offset of a visible slot SHALL be reduced by the sum of the heights of the hidden slots
  that come before it in the strip.
- **FR-2.** The height of the strip SHALL be reduced by the heights of all hidden slots.
- **FR-3.** The corrections SHALL be applied again after every change of the strip, by the same
  observer that marks the slots, and SHALL be removed when a slot stops being hidden.
- **FR-4.** The separator slot SHALL be hidden while the strip has no visible pinned tab, and shown
  again as soon as one is.
- **FR-5.** Dragging, dropping and reordering tabs SHALL keep working: Vivaldi's own values are never
  overwritten, only read, and the corrections are removed while a drag is in progress.
- **FR-7.** A drag SHALL be detected from the pointer, not from a Vivaldi class: Vivaldi drags tabs with
  `mousedown` on a slot, then `mousemove` and `mouseup` on the window, and sets no state on the strip.
  A press without a move is a click and SHALL keep the corrections.
- **FR-6.** The offsets and heights SHALL be computed by a pure function of the slots (offset, height,
  hidden), developed test first, with no DOM: slots are ordered by their offset, not by their place in
  the document; slots that share an offset form a row, and a row closes only when all its slots are
  hidden; the function never changes its input.

### Non-functional

- **NFR-1.** The corrections cost one pass per animation frame (`FrameTask`), however many mutations
  arrive.
- **NFR-2.** A Vivaldi version whose strip does not match the selectors leaves the strip as Vivaldi
  draws it, with a warning in the log, and never blocks the window.
- **NFR-3.** Same behavior on macOS and Debian.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a hidden slot sits before a visible one THE module SHALL reduce the visible slot's offset by the hidden slot's height | auto: `offsets the visible slots by the heights of the hidden slots before them` |
| AC-2 | WHEN slots are hidden THE module SHALL reduce the height of the strip by their heights | auto: `shrinks the strip by the heights of the hidden slots` |
| AC-3 | WHEN a slot stops being hidden THE module SHALL restore its offset and the height of the strip | auto: `restores the offsets when a slot is shown again` |
| AC-4 | WHEN the strip changes THE module SHALL apply the corrections again in one pass per frame | auto: `applies the corrections once per frame after changes of the strip` |
| AC-5 | WHILE no pinned tab is visible THE module SHALL hide the separator slot | auto: `hides the separator while no pinned tab is visible` |
| AC-6 | WHEN a pinned tab becomes visible THE module SHALL show the separator again | auto: `shows the separator when a pinned tab is visible` |
| AC-7 | WHILE a tab is being dragged THE module SHALL leave Vivaldi's offsets as they are | auto: `leaves the offsets alone during a drag` |
| AC-8 | IF the strip does not match the selectors THEN THE module SHALL leave it untouched and log a warning | auto: `leaves the strip untouched when the selectors do not match` |
| AC-9 | WHEN a link tab is hidden and no pinned tab is visible THE first Today tab SHALL start right under the New Tab row | live: `no gap above the first Today tab` |
| AC-10 | WHEN I drag a Today tab to another place and drop it THE order SHALL change as in Vivaldi with no gap | manual |
| AC-11 | WHEN no slot is hidden THE function SHALL return a zero shift for every slot and a zero hidden height | auto: `returns no shift when no slot is hidden` |
| AC-12 | WHEN the first slot is hidden THE function SHALL shift every visible slot by its height | auto: `shifts every visible slot when the first slot is hidden` |
| AC-13 | WHEN several slots in a row are hidden THE function SHALL add their heights | auto: `adds the heights of consecutive hidden slots` |
| AC-14 | WHEN a hidden slot is the last one THE function SHALL shift no slot and still count its height in the hidden total | auto: `counts a trailing hidden slot without shifting any slot` |
| AC-15 | WHEN every slot is hidden THE function SHALL return no visible slot and the total of all heights | auto: `closes the whole strip when every slot is hidden` |
| AC-16 | WHEN the slots are not in the order of their offsets THE function SHALL order them by offset before it counts | auto: `orders the slots by offset, not by document order` |
| AC-17 | WHEN slots share an offset THE function SHALL close their row only if all of them are hidden | auto: `closes a row only when all its slots are hidden` |
| AC-18 | WHEN the offset or the height of a slot is missing or not a number THE function SHALL leave the strip as it is | auto: `leaves the strip as it is when a slot has no valid offset or height` |
| AC-19 | WHEN the function runs THE function SHALL NOT change its input | auto: `does not change the slots it is given` |
| AC-20 | WHEN offsets and heights are fractional THE function SHALL keep the fraction | auto: `keeps fractional offsets and heights` |
| AC-21 | WHEN the pointer moves with the button down on a slot THE module SHALL report a drag until the button is released | auto: `reports a drag from the first pointer move until the release` |
| AC-22 | WHEN the button goes down and up on a slot without a move THE module SHALL NOT report a drag | auto: `does not report a drag for a click` |

## Out of scope

- Changing which tabs are hidden: that stays with 003, 009 and 027.
- Changing the sizes or look of the rows ([028](../028-arc-sidebar-look/spec.md)).
- Replacing Vivaldi's absolute layout with normal flow (see Q-1).

## Open questions

- [x] **Q-1.** How to close the gap. Decided: correct the offsets, keeping Vivaldi's layout and its
  drag and reorder code. The normal-flow option (`position: static`) is dropped as riskier.
- [x] **Q-2.** Which property does Vivaldi read for the offset? Answered by a probe on the lab copy
  (Vivaldi 8.2, 2026-11-19): `.tab-position` is `position: absolute` with `top: 0`, drawn by
  `transform: translateX(var(--PositionX)) translateY(var(--PositionY))`, so the offset is the inline
  variable `--PositionY`. The height of the strip comes from its parent `.resize`, whose inline
  `max-height` Vivaldi writes from the full list. The design reads and corrects these two values
  without overwriting Vivaldi's inline values.
- [x] **Q-3.** The separator belongs here, since it is the same gap and the same strip.
- [x] **Q-4.** The corrections are driven by the observer that already marks the hidden slots, but
  live in a class of their own: `HiddenTabMarker` keeps marking and hiding, the new class only
  computes and applies the offsets (single responsibility).

## References

- Issue #171, Empty gap above the first visible Today tab.
- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md), link tabs hidden.
- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md).
- `src/shared/tabs/HiddenTabMarker.ts`, `src/styles/hidden-tabs.scss`.
