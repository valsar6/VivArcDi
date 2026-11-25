# 065 Little Arc under the sidebar: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

Written after Tore approved the spec and merged pull request #289 on 2026-11-25. It says **how**;
the spec says **what**. It builds on the launcher of
[005](../005-little-arc/design.md) and on the routing of
[059](../059-pinned-tabs-arc/design.md). Tore answered Q-1 with the moved window plus a fallback
for a residual overlap, and Q-2 with all openings.

## Approach

One placement path serves every opening, because every opening already ends in
`LittleArcLauncher.#open`. The launcher asks for bounds beside the sidebar before creating the
window, then reads the window back and corrects it once if Vivaldi put it over the sidebar. The
compact bar, the registry mark, the indicator and the adoption path stay as they are.

| Area | What changes | Where |
|---|---|---|
| Bounds | Compute a position beside the rendered sidebar, with a shrink and a centred fallback | `src/modules/littlearc/SidebarBox.ts`, `src/modules/littlearc/SidebarPlacement.ts` |
| Windows API | Read and update a window's bounds, and focus the main window | `src/core/browser/BrowserWindows.ts`, `src/core/browser/BrowserTabs.ts` |
| Launcher | Pass the new bounds to `create`, then verify and correct once | `src/modules/littlearc/LittleArcLauncher.ts`, `src/modules/littlearc/MainWindowRole.ts` |
| Tests | Fake sidebar boxes and window bounds; assert the `auto:` names of the criteria | `tests/modules/littlearc/` |
| Docs | The manual and the README describe the new placement | `docs/manual/little-arc.md`, `README.md` |

FR-1 is worded for a left sidebar. `SidebarPlacement.beside` also tries the free side to the left
when Vivaldi puts the vertical tab bar on the right; that keeps the spec's intent — the popup does
not cover the sidebar — without adding an option.

### Reading the sidebar

`SidebarBox` is a class with screen-coordinate edges and a reader:

```ts
export class SidebarBox {
  public readonly left: number;
  public readonly right: number;
  public readonly top: number;
  public readonly bottom: number;

  public static read(document: Document, selector: string): SidebarBox | null;
}

export function sidebarOf(context: Pick<ModuleContext, 'document' | 'selectors'>): SidebarBox | null;
```

`MainWindowRole` passes `sidebarOf(context)` to the launcher; the helper checks that the selector
exists before reading it.

The selector is the existing `verticalTabBar` entry of
[8.1.json](../../src/selectors/8.1.json) (`#tabs-tabbar-container:is(.left, .right)`); 8.2 and 8.3
resolve to that catalog. No selector, stylesheet or config key is added. `getBoundingClientRect()`
is translated with `document.defaultView?.screenX` and `screenY`, defaulting to 0 when the view or
its position is missing. A missing element, a zero width or a zero height returns `null`, which
takes the centred fallback of 005.

### Choosing the bounds

`SidebarPlacement` is pure and holds two named constants:

```ts
const SIDEBAR_GAP = 12;
const MIN_POPUP_WIDTH = 320;

export interface PlacementResult {
  bounds: Bounds;
  shrunk: boolean;
}

export class SidebarPlacement {
  public beside(sidebar: SidebarBox | null, screen: ScreenArea, size: WindowBoundsSettings): PlacementResult | null;
  public overlaps(sidebar: SidebarBox | null, bounds: Bounds): boolean;
}
```

It reuses `Bounds`, `ScreenArea` and `WindowBoundsSettings` from
[WindowBounds.ts](../../src/modules/littlearc/WindowBounds.ts). Width and height, and the vertical
centre, come from the same arithmetic as `WindowBounds.centred`; only `left` changes.

`beside` tries `sidebar.right + SIDEBAR_GAP` first, then `sidebar.left - width - SIDEBAR_GAP`, and
accepts the first candidate wholly inside `screen`. If neither fits, it takes the side with more
free space, shrinks the width to that space, and returns `shrunk: true`. If even the shrunk width
would be below `MIN_POPUP_WIDTH`, it returns `null` and the launcher keeps the centred bounds.
`overlaps` is a rectangle intersection of the popup's bounds with the sidebar's box, so a popup
that merely sits inside the gap does not trigger a correction.

### Windows API

[BrowserWindows.ts](../../src/core/browser/BrowserWindows.ts) gains two methods next to `create`:

```ts
public get(windowId: number): Promise<WindowDetails>;
public update(windowId: number, properties: WindowUpdate): Promise<WindowDetails>;
```

`WindowDetails` gains optional `left`, `top`, `width` and `height`; `WindowUpdate` carries the same
four numbers plus an optional `focused: boolean`. Both go through the existing `#call` helper, so
`runtime.lastError` and a missing API reject the same way as `create`. The `windows` member of
`ChromeApi` in [BrowserTabs.ts](../../src/core/browser/BrowserTabs.ts) gains the matching optional
`get` and `update` signatures and `#call` accepts both method names. `NewWindow` is unchanged.

### The launcher

`LauncherDependencies` gains `sidebar: () => SidebarBox | null` and `mainWindowId: number`;
`windows` becomes `Pick<BrowserWindows, 'create' | 'get' | 'update'>`. `MainWindowRole` supplies both
new values at [MainWindowRole.ts](../../src/modules/littlearc/MainWindowRole.ts) lines 52-58; it
already owns the window id and has the document and selectors. `CommandBarAssembly` keeps using the
same launcher instance and needs no change.

`LittleArcLauncher.#open` keeps its one `windows.create` call with `type: 'popup'` and
`focused: true`, and uses the computed bounds when `beside` returns a result, otherwise
`WindowBounds.centred`. It marks the registry as soon as the id is known, then awaits
`#keepClear(popupId, bounds, sidebar)`:

1. read the actual window with `windows.get`; skip when it has no bounds or no longer exists;
2. IF the actual bounds overlap the sidebar, call `windows.update(popupId, bounds)` once;
3. read the window again; IF it still overlaps, call `windows.update(mainWindowId, { focused: true })`
   so the sidebar is in front, and keep the popup open;
4. catch every error in this sequence, log it once and leave the created window alone.

This correction is bounded by one update: no polling, no focus listener and no `MutationObserver`.
The fallback in step 3 makes the main window clickable but may put the popup behind it; Tore chose
that over closing the page in Q-1.

### Texts and logs

No user-visible text changes. The bar keeps `Open in <workspace>`, back and the address pill. The
launcher keeps `could not open a Little Arc window, leaving the link to Vivaldi` on a failed create.
One warning per reason, logged once per launcher instance through a small set of already-warned
keys:

- `could not read the sidebar: centring the Little Arc window`;
- `the sidebar leaves no room: the Little Arc window was shrunk`;
- `no room beside the sidebar: centring the Little Arc window`;
- `the Little Arc window still covers the sidebar: the main window stays in front`.

### Configuration

No key is added or removed. `widthPercent` and `heightPercent` of 005/FR-10 keep their defaults of
34 and 60 and still set the size when there is room. `SIDEBAR_GAP` and `MIN_POPUP_WIDTH` are design
constants, not options.

## Risks

| Risk | Mitigation |
|---|---|
| `screenX`/`screenY` and the window bounds use different coordinate spaces on a scaled or multi-monitor desktop | The `get` read detects an overlap; one `update` and the focus fallback keep the sidebar usable. Probe on macOS and Debian before the manual check. |
| Vivaldi ignores the requested bounds of a `popup` window | Same read-back; the original centred behavior stays when `get` or `update` is unavailable. |
| A right-hand tab bar leaves no room on either side | The wider side wins; below `MIN_POPUP_WIDTH` the launcher centres and logs. |
| Auto-hide leaves a sidebar box of zero size | `sidebarBox` returns `null`, so the centred fallback of 005 applies. |
| Focusing the main window hides the popup and looks like a loss of the page | Accepted in Q-1; the window keeps its tab, bar and indicator, and a click on the popup brings it back. |
| Existing test fakes do not implement `get` or `update` | Add the two callbacks to the fake `windows` object in `tests/modules/littlearc/module.test.ts` before the launcher tests run. |

## Verification

Every `auto:` name below is the exact test name; the two manual criteria become Tore's checklist in
[tasks.md](tasks.md).

| Criterion | Test or check |
|---|---|
| AC-1 | `places the Little Arc window clear of the sidebar` in `tests/modules/littlearc/placement.test.ts` |
| AC-2 | `places Little Arc beside the rendered sidebar` in `tests/modules/littlearc/placement.test.ts` |
| AC-3 | `uses the same placement for every Little Arc opening` in `tests/modules/littlearc/module.test.ts` |
| AC-4 | `falls back when the sidebar leaves no room beside it` in `tests/modules/littlearc/placement.test.ts` |
| AC-5 | `centres Little Arc when the sidebar cannot be read` in `tests/modules/littlearc/placement.test.ts` |
| AC-6 | `keeps the Little Arc popup bar and the Open in workspace action` in `tests/modules/littlearc/module.test.ts` |
| AC-7 | Manual: the sidebar stays visible and clickable while the page is open |
| AC-8 | Manual: the placement matches Tore's Arc check, including the residual overlap |
| AC-9 | `moves Little Arc clear of the sidebar after creation` in `tests/modules/littlearc/module.test.ts` |
| AC-10 | `leaves the main window focused when Little Arc cannot clear the sidebar` in `tests/modules/littlearc/module.test.ts` |

There is no separate wrapper test file today: the `BrowserWindows` tests stay in
`tests/modules/littlearc/module.test.ts` and gain the two new calls there. No `live:` criterion is
added, so no scenario file is needed.
