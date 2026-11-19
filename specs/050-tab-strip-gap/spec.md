# 050 Tab strip gap

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

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

## Out of scope

- Changing which tabs are hidden: that stays with 003, 009 and 027.
- Changing the sizes or look of the rows ([028](../028-arc-sidebar-look/spec.md)).
- Replacing Vivaldi's absolute layout with normal flow (see Q-1).

## Open questions

- [ ] **Q-1.** How to close the gap. Proposed: correct the offsets (option A), because it keeps
  Vivaldi's layout and its drag and reorder code. Option B, `position: static` on the rows, frees the
  space with plain CSS but puts Vivaldi's drag and reorder at risk. Decide after the probe in Q-2.
- [ ] **Q-2.** Which property does Vivaldi read for the offset, `transform` or `top`? Proposed: a
  read-only probe (`npm run live -- --probe`) on the lab copy, before the design; the design follows its
  answer.
- [ ] **Q-3.** Does the separator belong to this spec or to 028? Proposed: here, since it is the same
  gap and the same strip.
- [ ] **Q-4.** Where do the corrections live? Proposed: in `HiddenTabMarker`, since it already marks
  the hidden slots and observes the strip, so no second observer.

## References

- Issue #171, Empty gap above the first visible Today tab.
- [009 Bookmark folders in the tab bar](../009-bookmark-folders-in-tab-bar/spec.md), link tabs hidden.
- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md).
- `src/shared/tabs/HiddenTabMarker.ts`, `src/styles/hidden-tabs.scss`.
