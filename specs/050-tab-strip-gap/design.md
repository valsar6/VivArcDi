# 050 Tab strip gap: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written only after the spec is `Approved`. It says **how**; the spec says **what**.

## Approach

Vivaldi draws each slot of the tab strip with `transform: translateX(var(--PositionX))
translateY(var(--PositionY))` (probe on Vivaldi 8.2, 2026-11-19), and sets `max-height` inline on the
strip's parent `.resize` from the full list. A new class, `StripGapCloser`, leaves both values alone
and adds a correction next to them:

1. It reads the slots of the strip in order, with their `--PositionY` and `--Height`. A slot is
   *hidden* when it carries `data-vivarcdi-hidden` (written by `HiddenTabMarker`) or is the separator
   while no pinned tab is visible.
2. For each visible slot it writes the custom property `--vivarcdi-gap-shift`: the sum of the heights
   of the hidden slots that come before it, in px. The stylesheet subtracts it:
   `translateY(calc(var(--PositionY) - var(--vivarcdi-gap-shift, 0px)))`. Vivaldi's own inline values
   are never written, so a Vivaldi redraw cannot undo the correction, only make it stale for a frame.
3. It writes the inline `max-height` of the `.resize` parent as Vivaldi's value minus the sum of all
   hidden heights, with `!important` as `HiddenTabMarker` does for `display`, and remembers the slot
   and the original value to restore them.
4. It runs once per animation frame (`FrameTask`) after each pass of `HiddenTabMarker`.

The correction is a pure calculation (slots in, shifts out) kept apart from the DOM writing, so the
tests check the arithmetic without a browser, and it is built test first (FR-6): each AC-1, AC-2 and
AC-11 to AC-20 is a failing test before the code that passes it. Rules of the function: slots are
ordered by offset and not by document order; slots that share an offset form a row (horizontal
tiles), and the row closes only when all its slots are hidden; the shift of a slot is the sum of the
heights of the closed rows above it; a slot with an offset or height that is missing or not a number
makes the function return no correction at all; the input is never changed.

**Separator.** The separator is a slot of the strip like the others. It counts as hidden while the
strip has no visible pinned tab, which `StripGapCloser` decides from the pinned-tab selector, and then
it is collapsed like a hidden slot.

**Single responsibility.** `HiddenTabMarker` keeps one job: marking and collapsing hidden slots. It
gains no geometry. `StripGapCloser` has one job: closing the space the hidden slots leave. Several
markers run at once (Favorites, folders, space header, Today list), so the closer is shared per
document, like `HiddenTabs.of(document)`: `StripGapCloser.of(document, selectors)` counts its users.
A marker takes a use in `start()`, releases it in `stop()`, and asks for a pass at the end of `apply()`.

**Rejected.**
- Normal flow (`position: static`) for the rows: frees the space with CSS alone but puts Vivaldi's
  drag and reorder at risk (decided in Q-1).
- Overwriting `--PositionY` inline: Vivaldi rewrites it on every layout, so the correction would fight
  Vivaldi and could corrupt the value it reads back during a drag.
- A second `MutationObserver` in the closer: the marker already observes the strip, and a second
  observer doubles the work (NFR-1).
- Each module wiring the closer: four modules would repeat the same lines.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `src/shared/tabs/StripGapCloser.ts` | Reads slots and writes `--vivarcdi-gap-shift` and the `.resize` `max-height`; restores them; skips a drag | Shared per document, counted users, `FrameTask` |
| `src/shared/tabs/GapShifts.ts` | Pure arithmetic: slots with offset, height, hidden flag in; shift per visible slot and total hidden height out | Pure function, no DOM |
| `src/shared/tabs/HiddenTabMarker.ts` | Takes a use of the closer in `start()`, releases it in `stop()`, requests a pass after `apply()` | Existing class, three lines added |
| `src/styles/hidden-tabs.scss` | `transform` of `.tab-position` with the shift subtracted | Existing file |
| `src/selectors/8.1.json` | `separator`, `tabStripFrame` | Selectors per version |

## Vivaldi interface

New selectors in `src/selectors/8.1.json`, read through `context.selectors`:

| Name | Value | Used for |
|---|---|---|
| `separator` | `#tabs-container .tab-strip .separator` | The line between pinned and Today's tabs |
| `tabStripFrame` | `#tabs-container .resize:has(> .tab-strip)` | The parent whose inline `max-height` Vivaldi writes |

Existing: `tabStrip`, `pinnedTab`, `pinnedGroup`, `tabWrapper`. Marks: `data-vivarcdi-hidden` (read),
`--vivarcdi-gap-shift` (written on visible slots), the inline `max-height` of `tabStripFrame`
(written, restored).

Fallbacks: a missing `separator` or `tabStripFrame` selector, or a strip that does not match, leaves
the strip as Vivaldi draws it and logs one warning (AC-8). A drag in progress is detected from the
state Vivaldi gives the dragged slot; which attribute that is, is read by probe in T1.

## Configuration

None. The correction is on whenever a slot is hidden, so it needs no option.

## Risks

| Risk | Mitigation |
|---|---|
| Vivaldi rewrites `max-height` between two passes, so the gap shows for a frame | The pass runs on the same mutation that Vivaldi's write causes; check by live scenario (AC-9) |
| Drag and reorder read positions back and get the corrected ones | Corrections are removed while a drag is in progress (FR-5); manual check AC-10 |
| The drag state attribute is not what we expect | Probe T1 before code; if there is none, compare the `--PositionY` write order instead |
| Another Vivaldi version changes the strip markup | Versioned selectors; mismatch leaves Vivaldi's layout (NFR-2) |
| The separator is not a direct slot of the strip | Probe T1 reads its markup first |
