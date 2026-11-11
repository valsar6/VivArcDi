# 2026-11-11: workspace sections lost after a sidebar layout change

| | |
|---|---|
| Affected versions | Every version with `TabBarAnchor`, from 0.6.0 to 0.40.0 |
| Fixed in | 0.40.1 ([#133](https://github.com/valsar6/VivArcDi/pull/133)) |
| Spec | [003](../../specs/003-pinned-tabs-and-folders/spec.md), AC-20 and AC-21 |
| Reported and verified by | Tore, Vivaldi 8.2 on macOS |

## What happened

After a change of the sidebar layout, the space header, the Favorites grid and the folders disappeared
from the tab bar. Only today's tabs and the `Archive` footer were left, and the sections did not come
back on their own. The screen recording shows the auto-hide sidebar being turned on and off; the
sections were there in the floating sidebar and gone once it was docked again.

The pasted DOM of the tab bar had no `[data-vivarcdi-anchor]` element, while
`[data-vivarcdi-archive-footer]` was still there.

## Cause

Every section above the tab list lives in one host, `[data-vivarcdi-anchor]`, kept by
`TabBarAnchor` (`src/core/TabBarAnchor.ts`) right before the element that holds `.tab-strip`.

`TabBarAnchor` watched only the children of the tab list's parent, with a `MutationObserver`
attached once. That covered Vivaldi removing the host from the same container, which the probes of 009
had seen. It did not cover a change of layout: Vivaldi then builds a new container for the tab list.
The host went away with the old container, and the observer stayed attached to that detached node, so
it never fired again and nothing put the host back.

The `Archive` footer survived because it is kept by `KeptElement`, which watches the subtree of
`#browser` and looks up its parent again on every change.

## Fix

`TabBarAnchor` now watches the whole document (`childList` and `subtree`). Every change asks
`FrameTask` for one check per frame; the check looks the tab list up again and moves the host before
it, wherever it is. The check is a `querySelector` and a comparison of children, so the extra
notifications are cheap.

The new unit test `puts the host back when Vivaldi moves the tab list to a new container` moves the
tab list into a new container and checks that the host follows it and that the document is the
watched node.

## Why it was missed

- The 009 probe (2026-10-27) tested workspace switches, opening and closing tabs, pinning and the
  auto-hide sidebar on its own, but not switching the layout back and forth while VivArcDi was
  running.
- The unit tests used a fake watcher that called back whatever node it was given, so they could not
  tell a watcher on the parent from a watcher on a stable root.

## Lessons

- Vivaldi does not only re-render the content of its containers: it can replace the containers
  themselves. Anything that must stay in Vivaldi's interface watches a node that outlives the layout
  (the document or `#browser`) and finds its place again on each check, as `KeptElement` and now
  `TabBarAnchor` do. Never keep an observer on a node that Vivaldi may throw away.
- Tests of such watchers check which node is watched, not only what happens when they fire.
- Manual checklists for features drawn in the tab bar include a change of layout: auto-hide on and
  off, and the address field moved into and out of the tab bar.
