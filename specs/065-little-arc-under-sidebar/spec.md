# 065 Little Arc under the sidebar

| | |
|---|---|
| Status | Draft |
| Phase | 5 |
| Owner | Tore |
| Approved | – |
| Refines | The window placement of [005 Little Arc](../005-little-arc/spec.md) and its size option FR-10; follows up the placement item in [059 Pinned tabs and Favorites like Arc](../059-pinned-tabs-arc/spec.md), recorded at AC-18 and in its Follow-ups. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Issue #263 asks for the placement Tore saw in Arc on 2026-11-23: the Little Arc page sits clear of the
sidebar, so the sidebar stays usable and another tab can be opened while the page is still there.
VivArcDi creates Little Arc as a separate Vivaldi popup centred on the screen, which can cover the
sidebar and take the focus. This spec changes where that same window opens, and keeps its compact
bar, its back and address field, and its **Open in workspace** action.

## Source

- Issue [#263](https://github.com/valsar6/VivArcDi/issues/263), opened by Tore after the check of
  059/AC-18 on 2026-11-23. The issue describes the behavior in Arc and in VivArcDi in words; no
  recording or screenshot is attached to it.
- In Arc the sidebar stays usable while the Little Arc page is open, so the user can move to another
  tab without closing the page. The issue does not say whether the sidebar is drawn above the page
  or simply beside it; Tore settled Q-1 on 2026-11-25 in favour of the moved window and the overlap
  fallback below.
- In VivArcDi the page is a real Vivaldi `popup` window created by
  [LittleArcLauncher.ts](../../src/modules/littlearc/LittleArcLauncher.ts) lines 85-96, centred by
  [WindowBounds.ts](../../src/modules/littlearc/WindowBounds.ts) lines 30-39 and opened with
  `focused: true`. That is the behavior the issue reports; it is read from the code, not measured in
  a probe.

## User stories

- **US-1.** As a user, I want a Little Arc page not to cover the sidebar, so that I can still see my
  pinned and Favorite pages while it is open.
- **US-2.** As a user, I want to click a tab in the sidebar while a Little Arc page is open, so that
  I can move to another page without losing the quick lookup.
- **US-3.** As a user, I want the Little Arc page to keep its back arrow, address field and
  **Open in workspace** button, so that only its placement changes.
- **US-4.** As a user, I want the same placement wherever Little Arc opens — from the shortcut, an
  external link or a link in a pinned or Favorite page — so that one kind of window behaves the same
  everywhere.

## Expected behavior

**Placement.** Little Arc stays a separate Vivaldi popup. It opens beside the sidebar of the normal
window it came from, with its left edge at or to the right of the sidebar's right edge and a small
gap between them. The window stays entirely inside the screen that holds that normal window. The
placement is read from the sidebar as Vivaldi renders it and from the window's screen; no sidebar
width is hardcoded in the module. If Vivaldi hides the sidebar, the placement of 005 applies.

**The window itself.** The popup keeps its type, its 40 px compact bar with back and the address
pill, its **Open in workspace** action, its indicator on the pinned row or Favorite tile, its keys
and its idle timer. Only the `left` and `top` values, and the width when it has to shrink to fit,
change from 005. Adoption into a workspace (005/FR-5), closing (005/FR-7) and the indicator
(059/FR-11 and AC-18) are unchanged.

**The sidebar.** While the Little Arc page is open, the sidebar of the main window stays visible and
its tabs stay clickable. A click on a tab switches the main window to that tab; the Little Arc
window keeps its page and its bar. The main window may come to the front when it is clicked, as it
does today for any other window; reproducing Arc's layering is out of scope (Q-1).

**All openings.** The shortcut with `commandBar` off, the command bar's Enter action, an accepted
link from another app and a `target="_blank"` link in a pinned or Favorite page all use this
placement, because they all end in the launcher's one window-creation path.

**No room.** If the space beside the sidebar cannot fit the popup at the configured
`widthPercent`, the module keeps the window inside the screen, shrinks it to the available space and
logs once that the sidebar could not be kept clear. It never covers the sidebar deliberately, and
it never leaves the screen. The `widthPercent` and `heightPercent` options of 005/FR-10 keep their
meaning when there is room.

**If it still overlaps.** After creation the module reads the popup's bounds. IF the popup still
covers the sidebar, THE module SHALL move it clear once with `windows.update` and read the bounds
again. IF the overlap remains, THE module SHALL leave the normal window focused, so that the sidebar
stays clickable above the popup, SHALL keep the Little Arc window open and SHALL log the reason once.
The page and its bar are never closed to solve an overlap.

**Versions.** The behavior holds on Vivaldi 8.1, 8.2 and 8.3, with the Favorites grid on and off.
Vivaldi's extensions API can move and focus a window but has no z-order, docking or "behind another
window" property; the placement above is what can be guaranteed for a real window without an OS
helper. A page layered inside the main window was rejected in Q-1.

### Today

| Case | What happens today | Where |
|---|---|---|
| Creation | A popup is created with `type: 'popup'`, `focused: true` and centred bounds | [LittleArcLauncher.ts](../../src/modules/littlearc/LittleArcLauncher.ts) lines 85-96 |
| Bounds | 34% of the screen width and 60% of its height, centred on `screen.availWidth`/`availHeight` | [WindowBounds.ts](../../src/modules/littlearc/WindowBounds.ts) lines 30-39, [ScreenAreas.ts](../../src/modules/littlearc/ScreenAreas.ts) lines 18-24, [config.json](../../src/config.json) lines 91-99 |
| Sidebar | Not measured; the popup can overlap whatever is under its centre, including the sidebar | Same creation path |
| New-window links | A `target="_blank"` click in a pinned or Favorite page is cancelled in the page and opened through `openAddressIn` | [little-arc-links.ts](../../src/page/little-arc-links.ts) lines 19-43, [MainWindowRole.ts](../../src/modules/littlearc/MainWindowRole.ts) lines 185-199 |
| Peek split | Peek drops `pinnedNewTab` while Little Arc is enabled | [Peek.ts](../../src/modules/peek/Peek.ts) line 184 |
| Bar and adoption | The bar lives in the popup; **Open in workspace** moves the tab to a normal window and removes the popup | [PopupWindowRole.ts](../../src/modules/littlearc/PopupWindowRole.ts) lines 45-118, [WorkspaceAdopter.ts](../../src/modules/littlearc/WorkspaceAdopter.ts) lines 62-77 |
| Command bar | Its transparent catcher covers the main window, sidebar included, while the bar is open | [little-arc.scss](../../src/styles/little-arc.scss) lines 196-208 |
| Tests | The exact creation arguments, including the centred bounds and `focused: true`, are asserted | [module.test.ts](../../tests/modules/littlearc/module.test.ts) lines 30-53 |
| After creation | No bounds check; the popup stays wherever Vivaldi put it, even over the sidebar | [LittleArcLauncher.ts](../../src/modules/littlearc/LittleArcLauncher.ts) lines 85-96 |

### After

| Case | What happens after | Where |
|---|---|---|
| Creation | The same popup is created with `type: 'popup'` and the same bar; its bounds come from the sidebar-aware placement | [LittleArcLauncher.ts](../../src/modules/littlearc/LittleArcLauncher.ts) lines 85-96, a bounds collaborator in `src/modules/littlearc/` |
| Bounds | Left edge at or right of the sidebar's right edge, window inside the screen; `widthPercent` and `heightPercent` still set the size when there is room | New bounds collaborator, [WindowBounds.ts](../../src/modules/littlearc/WindowBounds.ts) kept for the fallback |
| Sidebar | Its rendered box is measured in the main window; no hardcoded width | New selector entry in [8.1.json](../../src/selectors/8.1.json) or a measurement from the existing DOM |
| New-window links | Unchanged: the link still opens in a Little Arc window and marks its row or tile | [MainWindowRole.ts](../../src/modules/littlearc/MainWindowRole.ts) lines 185-199, [LittleArcIndicator.ts](../../src/modules/littlearc/LittleArcIndicator.ts) lines 92-150 |
| Peek split | Unchanged: Peek keeps its other triggers | [Peek.ts](../../src/modules/peek/Peek.ts) line 184 |
| Bar and adoption | Unchanged | [PopupWindowRole.ts](../../src/modules/littlearc/PopupWindowRole.ts), [WorkspaceAdopter.ts](../../src/modules/littlearc/WorkspaceAdopter.ts) |
| Command bar | Unchanged; its overlay is a different phase of the feature, described by 005/FR-25 | [little-arc.scss](../../src/styles/little-arc.scss) lines 196-208 |
| Tests | The sidebar-aware bounds are asserted, and the old centred bounds remain the fallback | [module.test.ts](../../tests/modules/littlearc/module.test.ts), new tests named after the `auto:` criteria below |
| After creation | The bounds are read once; one corrective `windows.update` runs if the popup still covers the sidebar | [LittleArcLauncher.ts](../../src/modules/littlearc/LittleArcLauncher.ts) lines 85-96 |

## Requirements

### Functional

- **FR-1.** WHEN a Little Arc window opens, THE module SHALL place it with its left edge at or to
  the right of the sidebar's right edge in the normal window it came from, with a small gap, and
  SHALL keep the whole window inside that screen.
- **FR-2.** THE module SHALL read the sidebar's rendered box and the normal window's screen to
  compute that placement; it SHALL NOT use a hardcoded sidebar width.
- **FR-3.** THE module SHALL use the same placement for the shortcut, the command bar's opened
  address, an accepted external link and a `target="_blank"` link in a pinned or Favorite tab.
- **FR-4.** IF the space beside the sidebar cannot fit the configured `widthPercent`, THEN THE
  module SHALL shrink the window to that space, keep it inside the screen and log once that it could
  not keep the sidebar clear. IF no normal window or sidebar can be read, THEN it SHALL keep the
  centred bounds of 005.
- **FR-5.** THE Little Arc window SHALL remain a Vivaldi `popup` with its compact bar, its back and
  address field, and its **Open in workspace** action (005/FR-4, FR-5 and FR-11 to FR-17).
- **FR-6.** WHILE a Little Arc window is open, THE sidebar rows of the main window SHALL stay
  visible and clickable; WHEN a tab there is clicked, THE main window SHALL switch tab and THE
  Little Arc window SHALL keep its page and bar.
- **FR-7.** The indicator of a pinned row or Favorite tile SHALL keep following the Little Arc
  window and SHALL be cleared when it closes (059/FR-11, AC-18).
- **FR-8.** THE behavior SHALL hold on Vivaldi 8.1, 8.2 and 8.3, with the Favorites grid on and off.
- **FR-9.** THE module SHALL NOT change which module handles a `target="_blank"` link in a pinned or
  Favorite tab: Little Arc keeps that trigger (059/FR-10, AC-18), and Peek keeps its other triggers
  (015/FR-1).
- **FR-10.** AFTER the popup is created, THE module SHALL read its bounds and, IF it still overlaps
  the sidebar, SHALL move it clear with at most one `windows.update` and SHALL read the bounds again.
- **FR-11.** IF the overlap remains after that update, THEN THE module SHALL leave the normal window
  focused so its sidebar stays clickable above the popup, SHALL keep the Little Arc window open and
  SHALL log the reason once.

### Non-functional

- **NFR-1.** The change SHALL NOT add a permission, a background process or an OS-level window
  helper (005/NFR-4).
- **NFR-2.** No option is added: `widthPercent` and `heightPercent` of 005/FR-10 keep their names
  and defaults, and the sidebar measurement is not exposed in `config.json`.
- **NFR-3.** IF the sidebar box, the window bounds or the screen cannot be read, THEN THE module
  SHALL fall back to the centred placement of 005, SHALL log the reason once and SHALL NOT block
  Vivaldi (005/NFR-2).
- **NFR-4.** THE placement SHALL be computed once per opening, with at most one corrective
  `windows.update`, and without a polling loop or a `MutationObserver` left running while the popup
  is open.
- **NFR-5.** Works on macOS and Debian with the same rule; the gap and the clamp are in CSS pixels.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). The criteria follow option A of Q-1, answered
by Tore on 2026-11-25, including the fallback for a popup that still overlaps the sidebar. Test names
are exact.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a Little Arc window opens, THE module SHALL put its left edge at or to the right of the sidebar's right edge and keep the whole window inside the screen. | auto: `places the Little Arc window clear of the sidebar` |
| AC-2 | THE module SHALL place Little Arc from the sidebar's rendered box and the main window's screen, not from a hardcoded width. | auto: `places Little Arc beside the rendered sidebar` |
| AC-3 | WHEN Little Arc opens from the shortcut, the command bar, an external link or a `target="_blank"` link in a pinned or Favorite tab, THE module SHALL use the same placement. | auto: `uses the same placement for every Little Arc opening` |
| AC-4 | IF the space beside the sidebar is too narrow for the configured width, THEN THE module SHALL keep the window inside the screen, shrink it to fit and log that it could not keep the sidebar clear. | auto: `falls back when the sidebar leaves no room beside it` |
| AC-5 | IF no normal window or sidebar can be read, THEN THE module SHALL keep the centred bounds of 005 and SHALL log the reason. | auto: `centres Little Arc when the sidebar cannot be read` |
| AC-6 | THE Little Arc window SHALL keep its popup type, its back and address field and its Open in workspace action (005/FR-5, FR-11 to FR-17). | auto: `keeps the Little Arc popup bar and the Open in workspace action` |
| AC-7 | WHILE a Little Arc window is open, THE sidebar tabs of the main window SHALL stay visible and clickable, and a click on one SHALL switch tab without closing the Little Arc page. | manual |
| AC-8 | WHEN Tore checks the placement against his Arc check of 2026-11-23, THE Little Arc page SHALL sit clear of the sidebar, the sidebar SHALL stay usable while it is open, and the bar and the Open in workspace action SHALL still work; IF the popup still covers the sidebar, THEN Tore's click SHALL reach the sidebar. | manual |
| AC-9 | IF the created popup still overlaps the sidebar, THEN THE module SHALL move it clear with one `windows.update` and SHALL verify the new bounds. | auto: `moves Little Arc clear of the sidebar after creation` |
| AC-10 | IF the overlap remains after that update, THEN THE module SHALL leave the normal window focused, SHALL keep the Little Arc window open and SHALL log the reason once. | auto: `leaves the main window focused when Little Arc cannot clear the sidebar` |

## Out of scope

- The compact bar's look, the address resolver, the command bar's suggestions and the idle timer:
  [005](../005-little-arc/spec.md).
- Moving the page into a workspace and the destination picker: 005/FR-5 and FR-6.
- Which module opens a link and the indicator on its row or tile: 059/FR-10 and FR-11,
  [015](../015-peek-new-tab-links/spec.md).
- Peek's own panel and z-index: [002](../002-peek/spec.md) and 015.
- The transparent catcher of the command bar, which covers the sidebar while the bar is open:
  005/FR-25. This spec changes the placement of the page window, not the bar's overlay.
- A native window helper, an always-on-top setting or a new config option.
- Vivaldi 8.4 and later.

## Open questions

- [x] **Q-1. What "under the sidebar" means.** Answered (Tore, 2026-11-25): option A. Little Arc
  stays a separate Vivaldi popup and is moved beside the sidebar; option B, an in-window panel below
  the sidebar, is rejected. Tore also asked for the residual case: if the popup ends up over the
  sidebar anyway, move it clear once; if that fails, leave the normal window in front so the sidebar
  stays clickable, without closing the popup (FR-10, FR-11, AC-9, AC-10).
- [x] **Q-2. Which openings are covered.** Answered (Tore, 2026-11-25): all of them. The placement
  belongs to the window, so the shortcut, the command bar, external links and the `target="_blank"`
  links of 059/AC-18 all use it. One window kind has one placement.

## References

- Issue [#263 — Little Arc should sit under the sidebar](https://github.com/valsar6/VivArcDi/issues/263).
- [005 Little Arc](../005-little-arc/spec.md): the real popup, its bar, its keys and its adoption.
- [059 Pinned tabs and Favorites like Arc](../059-pinned-tabs-arc/spec.md): AC-18 and the follow-up
  this spec answers.
- [002 Peek](../002-peek/spec.md) and [015 Peek for new-tab links](../015-peek-new-tab-links/spec.md):
  the in-window panel of option B and the routing that 059 changed.
- [Chrome Extensions: windows](https://developer.chrome.com/docs/extensions/reference/api/windows):
  the available creation and focus properties; no z-order property is documented.
- Code: `src/modules/littlearc/LittleArcLauncher.ts`, `src/modules/littlearc/WindowBounds.ts`,
  `src/modules/littlearc/ScreenAreas.ts`, `src/modules/littlearc/MainWindowRole.ts`,
  `src/modules/peek/Peek.ts`, `src/page/little-arc-links.ts`, `src/styles/little-arc.scss`.
