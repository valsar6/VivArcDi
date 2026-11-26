# 069 Clear like Arc: design

| | |
|---|---|
| Status | Approved (2026-11-26) |
| Spec | [spec.md](spec.md) |

Tore approved the spec on 2026-11-26 (PR #307) with these answers: Q-1 the whole tab bar column
decides "in the sidebar"; Q-2 changed, the shortcut Cmd/Ctrl+Shift+K (⇧⌘K on macOS) is part of this
spec; Q-3 the icon edges come from tokens and a lab probe checks the numbers within 1 px. This
document says **how**; the spec says **what**. The Clear action of
[004](../004-today-tabs-and-keyboard/spec.md) and [060](../060-clear-bar-and-pinned-unload/spec.md)
and the empty state of [067](../067-clear-line-and-titles/spec.md) do not change.

## Approach

| Area | What changes | Where |
|---|---|---|
| Show and hide | The label is collapsed and transparent at rest and opens while the tab bar is hovered or the label is focused; the line is the flex item that gives way | `styles/today.scss` |
| Line ends | The row's inline inset takes two tokens, one per end, replacing `$folders-padding` | `styles/_tokens.scss`, `styles/today.scss` |
| Place | One token adjusts the vertical offset so the line is midway; set from the probe | `styles/today.scss` |
| Tooltip | `Clear Today tabs ⇧⌘K` or `Clear Today tabs Ctrl+Shift+K` from the platform | `modules/today/ClearSeparator.ts`, `core/dom/ShortcutKeys.ts` |
| Shortcut | `ArchiveKeys` and the `archive-keys` page script also catch Cmd/Ctrl+Shift+K and run the module's `#clear` | `modules/today/ArchiveKeys.ts`, `ArchiveMessage.ts`, `TodayArchive.ts`, `page/archive-keys.ts` |

No second watcher, mark or option is added. The hover state is pure CSS (NFR-2).

## Styles

`_tokens.scss` gets four tokens, next to `$folders-padding`:

```scss
$clear-line-start: 14px;
$clear-line-end: 14px;
$clear-gap: 10px;
$clear-line-offset: 0px;
```

The first two are the distance from the tab strip's edge to the left edge of the row icons and to the
right edge of the rows' trailing icon (spec: about 18 and 17 px from the sidebar edge). They are
written as sums of the existing tokens (`$folders-padding` plus the row's inline padding, the
`$gap` of the New Tab row) when the probe shows that a sum equals the measure within 1 px, and as a
plain value otherwise. The values above are the sums the design expects and
are replaced by the probe's numbers in T2. `$clear-gap` is 10 px (FR-2). `$clear-line-offset` starts
at 0 and moves the line vertically until it is midway (FR-5).

`today.scss`, the Clear row:

```scss
#{$root} #{$clear-row} {
  inset-inline: $clear-line-start $clear-line-end;
  transform: translateY(calc(var(--PositionY) - var(--vivarcdi-gap-shift, 0px) + #{$clear-line-offset}));
}
```

The label, collapsed at rest and open when the column is hovered or Clear has focus:

```scss
#{$root} #{$clear-row} #{$clear} {
  max-width: 0;
  margin-inline-start: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  white-space: nowrap;
  transition:
    max-width var(--vivarcdi-transition),
    margin-inline-start var(--vivarcdi-transition),
    opacity var(--vivarcdi-transition),
    color var(--vivarcdi-transition);
}

#{$root} :is(#{$tab-bar}:hover, #{$clear-row}:focus-within) #{$clear} {
  max-width: $clear-max-width;
  margin-inline-start: $clear-gap;
  opacity: 1;
  pointer-events: auto;
}
```

`$clear-max-width` (60px) is a local variable of `today.scss`, wider than the label; the line
(`flex: 1 1 auto`) shrinks by the same amount, so its end moves with the fade (FR-6). The label
keeps `color: var(--vivarcdi-muted, ...)`, 11 px, weight 600 and its `:hover, :focus-visible` rule
with `var(--vivarcdi-ink, ...)` (FR-3). `$tab-bar` (`#tabs-tabbar-container:is(.left, .right)`) is the
stylesheet's copy of the catalog's `tabBar`; the Clear row lives inside it, so `:hover` of the bar
covers the Clear row and the `+ New Tab` row (Q-1). `--vivarcdi-transition` is the sidebar's usual
transition.

The pinned-last border is already one line with the Clear row (067), so `pinned.scss` and
`sidebar-look.scss` do not change.

## Shortcut and tooltip

`ShortcutKeys` gets `isMac`, the check `KeepLabel.isMac` does in the Little Arc module, which cannot
be imported from `today` (modules never import each other):

```ts
public static isMac(platform: string): boolean
```

`ClearSeparator` takes one more optional dependency and builds its tooltip once:

```ts
export interface ClearSeparatorDependencies {
  /** `navigator.platform`, to name the shortcut in the tooltip; empty means not macOS. */
  platform?: string;
}
```

`#button` becomes an instance step so it can read it: the title is
`Clear Today tabs ${ShortcutKeys.isMac(platform) ? '⇧⌘K' : 'Ctrl+Shift+K'}`. `TodayArchive` passes
`platform: document.defaultView?.navigator.platform ?? ''`.

`ArchiveKeys` changes its second constructor argument from one callback to two:

```ts
export interface ArchiveActions { open: () => void; clear: () => void }
constructor(context: ArchiveKeysContext, actions: ArchiveActions)
```

`#handleKey` handles `a` as before, and Cmd/Ctrl+Shift+K with `ShortcutKeys.isCommandShift(event, 'k')`:
`preventDefault`, `stopImmediatePropagation`, `actions.clear()`. `#receive` dispatches on the message
`action`: `open` to `actions.open`, `clear` to `actions.clear`, after the token check. The log text
for a missing page script reads `Cmd/Ctrl+Shift+A and Cmd/Ctrl+Shift+K work only while the interface has the focus`.

`ArchiveMessage.action` becomes `'open' | 'clear'`; `isArchiveMessage` accepts both and still rejects
any other value (`close`). `page/archive-keys.ts` sends `action: 'clear'` for Cmd/Ctrl+Shift+K,
through the same `sendToInterface` and console prefix. `TodayArchive.#startInterface` passes
`{ open: toggle, clear: (): void => void this.#clear() }`, the same function the Clear click gets
(`onClear`), so the shortcut and the click share one path: `ArchiveSweeper.clear` archives the
Today tabs of the active tab's workspace in the current window, and with none (`#archive([])`) it
returns without a write or a notice (FR-8, AC-8). `#clear` also refreshes an open archive panel.

### Does Vivaldi bind it?

Neither the specs nor `docs/native-settings.md` list a Vivaldi binding for Cmd/Ctrl+Shift+K. The
capture-phase handler runs before Vivaldi's own shortcut handling in the interface and the page
script runs in the page, as Cmd/Ctrl+Shift+A does. The probe below reads `vivaldi.actions` from the
lab profile and reports any command bound to `Meta+Shift+K` or `Ctrl+Shift+K`. If one exists, T1 does
not change anything: the result goes to Tore, who decides whether `installer shortcuts apply` of 014
should unbind it.

## Probe (lab Vivaldi 8.3, with Tore's agreement)

One `npm run live -- --probe <file>` run with a Today tab, on the lab copy, with the Favorites grid
on and off and with and without a pinned tab. It prints, in px:

- `firstRow.icon.left - strip.left` and `firstRow.trailing.right - strip.left`, where the first row is a
  Today row, its icon the `.favicon` and its trailing icon the `.close`/minus slot: these are
  `$clear-line-start` and `$clear-line-end`; compare them with the sums of the tokens;
- with the pointer moved over the tab bar (`Input.dispatchMouseEvent`) and away: the rect of the line
  (the row's `::before`, measured through the row and the button rect) and of the label at both
  states; the gap `button.arrow.left - line.right` must be 10 within 1 px and `button.right` must equal
  the line's end at rest within 1 px; the computed `opacity` and `color` of the label in each state;
- the line's center y minus the center of the last row above and of the `+ New Tab` row: each about
  33 px from a row center, and the two within 1 px of each other; the difference sets
  `$clear-line-offset`;
- the `vivaldi.actions` shortcuts bound to Meta/Ctrl+Shift+K.

The probe only reads, so `ProbeGuard` accepts it. The numbers go in the pull request.

## Tests

Names are the `auto:` texts of the spec, verbatim.

| AC | Test | File |
|---|---|---|
| AC-1 | `hides the Clear label outside the sidebar` | `tests/styles/Today.test.ts` |
| AC-2 | `shows the muted Clear label while the pointer is in the sidebar` | `tests/styles/Today.test.ts` |
| AC-3 | `strengthens the Clear label when pointed at` | `tests/styles/Today.test.ts` |
| AC-4 | `titles the Clear control like Arc` | `tests/modules/today/ClearSeparator.test.ts` |
| AC-5 | `aligns the Clear line with the row icons` | `tests/styles/Today.test.ts` |
| AC-7 | `clears the Today tabs on the Clear shortcut` | `tests/modules/today/TodayArchive.test.ts` |
| AC-8 | `does nothing on the Clear shortcut without Today tabs` | `tests/modules/today/TodayArchive.test.ts` |
| AC-6 | manual (checklist in tasks T5) | |

What each asserts:

- `hides the Clear label outside the sidebar`: the base label rule has `max-width: 0`, `opacity: 0`,
  `pointer-events: none`; the row has no `::before` gap rule other than `flex: 1 1 auto`.
- `shows the muted Clear label while the pointer is in the sidebar`: a rule whose selector holds
  `#tabs-tabbar-container:is(.left, .right):hover` and `[data-vivarcdi-clear-row]:focus-within` sets
  `opacity: 1`, a non-zero `max-width`, `margin-inline-start: 10px` and `pointer-events: auto`; the
  label's base `color` is `var(--vivarcdi-muted`, `font-size: 11px`, `font-weight: 600`; the label
  transitions `max-width`, `opacity` and `color` with `var(--vivarcdi-transition)`.
- `strengthens the Clear label when pointed at`: the `:hover, :focus-visible` rule uses
  `var(--vivarcdi-ink` and sets no `opacity`.
- `aligns the Clear line with the row icons`: the row has `inset-inline: 14px 14px` (the probe's final
  values), the compiled `$clear-line-start` and `$clear-line-end` match the tokens in `_tokens.scss`,
  and `today.scss` no longer uses `$folders-padding` for the row.
- `titles the Clear control like Arc`: with platform `MacIntel` the control's `title` is
  `Clear Today tabs ⇧⌘K`; with `Linux x86_64` and with no platform, `Clear Today tabs Ctrl+Shift+K`.
- `clears the Today tabs on the Clear shortcut`: in the module test of the Cmd/Ctrl+Shift+A toggle
  (same `TodayDocument`, fake tabs with Today tabs), a `keydown` `{ key: 'K', metaKey: true, shiftKey: true }`
  removes the Today tabs and adds them to the archive, and the same press with `ctrlKey` does too.
- `does nothing on the Clear shortcut without Today tabs`: with only pinned and active tabs the same
  press removes nothing and adds nothing to the archive.

The tests of 067 that this spec supersedes:

| 067 | Test | What happens |
|---|---|---|
| AC-5 | `insets the Clear line like the rows` | removed from `tests/styles/Today.test.ts`; `aligns the Clear line with the row icons` replaces it (the 6 px inset is gone) |
| AC-6 | `insets the pinned-last border like the rows` | kept in `tests/styles/Pinned.test.ts`; its last assertion (`today.scss` has `inset-inline: $folders-padding;`) becomes `inset-inline: $clear-line-start $clear-line-end;`; the 6 px in the criterion is superseded |
| AC-9 | `shows the Clear label at rest` | removed; AC-1 and AC-2 here replace it |
| AC-10 | `ends the Clear line before its label` | removed; AC-2 (gap) and AC-5 (ends) replace it |
| AC-11 | `strengthens the Clear label on hover` | removed; AC-3 here replaces it |

`tests/styles/Today.test.ts` keeps `draws the Clear bar on the separator above the Today tabs`; if the
probe changes the `translateY` expression, T2 updates its regular expression in the same task. Other
tests also written for the new behavior and not tied to an AC: `ShortcutKeys.isMac` in
`tests/core/dom/ShortcutKeys.test.ts` (macOS and non-macOS values), `reads archive messages from the
runtime and the console` extended with `action: 'clear'` in `tests/modules/today/TodayParts.test.ts`,
and the `archive-keys` case in `tests/page/PageScripts.test.ts` extended to send `clear` for
Cmd/Ctrl+Shift+K and `open` for Cmd/Ctrl+Shift+A.

The 067 header of `spec.md` already names 069 as superseding these criteria; T4 marks the superseded
rows of its table.

## Live scenario

AC-6 stays `manual`: the driver cannot move the pointer without a click. One cheap scenario covers the
shortcut on a lab Vivaldi: `tests/live/scenarios/the-clear-shortcut-archives-the-today-tabs.live.ts`
(spec `069`) opens two Today tabs, presses `k` with `Meta` and `Shift` (the driver's `press`), waits for
the Clear control to disappear and for the tabs to leave the strip, and closes what it opened. It runs
only with `npm run live` and Tore's agreement.

## Files

| File | Change |
|---|---|
| `src/core/dom/ShortcutKeys.ts` | `isMac` |
| `src/modules/today/ClearSeparator.ts` | `platform`, the tooltip |
| `src/modules/today/ArchiveKeys.ts`, `ArchiveMessage.ts`, `TodayArchive.ts` | second key, second action, wiring |
| `src/page/archive-keys.ts` | Cmd/Ctrl+Shift+K sends `clear` |
| `src/styles/_tokens.scss`, `src/styles/today.scss` | tokens, the hover and the line ends |
| `tests/...` | as in the tables above |
| `tests/live/scenarios/the-clear-shortcut-archives-the-today-tabs.live.ts` | the scenario |

## Risks

| Risk | Answer |
|---|---|
| The tab bar `:hover` misses while a pointer drag leaves the column | The label stays hidden then; it returns with the next pointer move |
| Vivaldi already binds Cmd/Ctrl+Shift+K | The probe reports it; the handler runs first in the interface; unbinding is Tore's decision (014) |
| The label does not fit a narrow tab bar | `max-width` only caps it; the line gives way first; T2's probe run checks the narrow case and reports it |
| The icon edges are not a sum of tokens | The probe sets plain values; the test reads `_tokens.scss` |
| The shortcut fires while typing | `isCommandShift` needs Cmd/Ctrl and Shift; a handled press is consumed only for K and A |
| `ArchiveKeys` signature change breaks callers | `TodayArchive` is the only caller; the module test runs it |

## Version

Branch `fix/069-clear-like-arc` with a patch bump, as Tore asked, read from `origin/main` right before
the docs task. The new shortcut is user-visible; if Tore prefers a minor bump, T4 follows him.
