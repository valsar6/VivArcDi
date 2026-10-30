# 015 Peek for new-tab links: design

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |

## Approach

Both changes sit inside the Peek module of [002](../002-peek/design.md); no new module and no new
page script. The page script already sends `target` to `LinkClassifier`, so the new triggers are two
more rules there: `pinnedNewTab` accepts a click on a link whose target is `_blank` when the page is
pinned, `anyNewTab` does the same when it is not. The rule ignores the site, which is what lets a
same-site link open in Peek. A `_blank` link in a pinned tab that is also cross-site is accepted by
either rule; the decision stays a single boolean, and the disposition handed back for the fallback
(NFR-1) is already `new-tab` for `_blank`.

The buttons leave the toolbar inside the panel and become a column in the backdrop's layer, next to
the panel's top right corner, so that the panel is just the page. `PeekPanel` builds the column as a
sibling of the panel; both are removed together. The order is Close, Expand, Split. Close and Expand
get the shortcut in their tooltip, taken from `PeekKeyMap` so that the text and the keys cannot
drift apart.

Rejected alternatives:

- **A second page script for `_blank` links**: the existing one already sees the click and the
  target.
- **Catching `newwindow` events of the tab webview**: also covers `window.open`, but arrives after the
  page has acted and cannot be cancelled in time; left to a later spec, as the spec says.
- **Keeping the toolbar and adding the column**: two sets of buttons for the same commands.

## Components

| Class or file | Change | Pattern |
|---|---|---|
| `src/modules/peek/LinkClassifier.ts` | `PeekTriggers` gains `pinnedNewTab` and `anyNewTab`; two rules added | Strategy, one rule per trigger |
| `src/modules/peek/Peek.ts` | Reads and clamps the two options, passes them in the page policy; default size 90 by 94 | |
| `src/modules/peek/PageScripts.ts` | The policy carries the two triggers | |
| `src/modules/peek/PeekPanel.ts` | Removes the toolbar; builds the button column; tooltips with shortcuts | |
| `src/modules/peek/PeekKeyMap.ts` | Exposes the shortcut labels used in tooltips, per platform | |
| `src/styles/peek.scss` | Column layout outside the panel, round buttons, panel without toolbar | |
| `src/config.json` | New options and sizes | |

## Vivaldi interface

No new selectors, APIs or marks. The button column is a child of `#webview-container`, like the
backdrop and the panel, and carries the class `vivarcdi-peek-actions`; it is removed with them on
close and on stop (002/NFR-4). The fallback of 002 applies unchanged: if the panel cannot be created,
`PeekController` opens the link as a new tab.

## Configuration

```json
"peek": {
  "enabled": true,
  "shiftClick": true,
  "pinnedCrossSite": true,
  "anyCrossSite": false,
  "pinnedNewTab": true,
  "anyNewTab": false,
  "widthPercent": 90,
  "heightPercent": 94
}
```

Sizes keep the 40-100 clamp. Users who set sizes explicitly keep them.

## Risks

| Risk | Mitigation |
|---|---|
| Sites that open every internal link with `_blank` make pinned tabs full of Peeks | That is Arc's behavior; `pinnedNewTab` turns it off |
| At 90% width the margin beside the panel is narrow in small windows, and the column would overlap the page | The column sits in the margin; when the margin is too narrow the column is held inside the page area, over the panel's top right corner |
| The tooltip shows the wrong key on Debian | Labels come from `PeekKeyMap`, which already picks Cmd or Ctrl by platform |
