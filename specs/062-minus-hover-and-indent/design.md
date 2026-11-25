# 062 Minus on hover and open-link indent: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Tore approved the spec on 2026-11-25 (PR #277) and answered Q-1 and Q-2 in it. This document says
**how**; the spec says **what**. It builds on the badge of
[061](../061-pinned-minus-ui/design.md) and on the folder rows of
[009](../009-bookmark-folders-in-tab-bar/design.md).

## Approach

Three local changes: the hover-only selectors, the badge's hover-only surface, and the open-tab
indent that replaces the dot. No module, option, selector file or listener changes; the unload path
and every button stay as in 061.

| Area | What changes | Where |
|---|---|---|
| Visibility | Remove the current-tab and active-link selectors; keep one row/tile hover selector per surface | `styles/pinned.scss`, `styles/favorites.scss`, `styles/folders.scss` |
| Badge | Move the surface tint and the dash's hover color into the button's `:hover` rule | `styles/_tokens.scss`, `styles/_minus.scss` |
| Open tabs | Show one extra indent step on rows with a tab, by changing only the CSS variable; remove the dot rules and token | `modules/folders/view/FolderRowElement.ts`, `styles/folders.scss`, `styles/_tokens.scss` |
| Superseded checks | Point 061's and 009's affected criteria at 062 and rename their checks | `specs/061`, `specs/009` |
| Docs | Describe hover-only minus and indent instead of the dot | `docs/manual/tab-bar.md`, `README.md` |

### Visibility

The four surfaces keep `opacity: 0` and `pointer-events: none` in the base rule, the short opacity
transition, and one hover rule that sets `opacity: 1` and `pointer-events: auto`:

- `pinned.scss`: `.tab-position.is-pinned:hover #{$pinned-minus}`; drop the
  `.tab-position.is-pinned:has(.tab.active) #{$pinned-minus}` selector.
- `favorites.scss`: `#{$tiles}[data-vivarcdi-tile-source='pinned'] #{$own-tile}:hover #{$tile-minus}`;
  drop the selector that also matches `#{$tile-current}`. The `$tile-current` token becomes unused
  and is removed with it.
- `folders.scss`: `[data-vivarcdi-link-open]:hover [data-vivarcdi-link-minus]` and
  `[data-vivarcdi-folder-unload]:hover [data-vivarcdi-folder-minus]`; drop
  `[data-vivarcdi-link-active] [data-vivarcdi-link-minus]`. The active attribute stays on the row:
  it still paints the active link's background.

The buttons themselves keep their size, position, labels and press listeners. A row that becomes
current while the pointer is elsewhere no longer reveals its minus.

### The badge on button hover

`_tokens.scss` keeps `$minus-glyph`, `$minus-badge-size`, `$minus-badge-radius`, `$minus-offset` and
`$minus-size`. It replaces `$minus-badge-tint` with a hover mix and a dash mix:

```scss
$minus-badge-hover-tint: 26%;
$minus-dash-hover-mix: 85%;
```

The shared mixin in `_minus.scss` styles the button as the same 21 px rounded square, with no
background and no border in its base rule, and gives its `::before` the masked dash in
`currentcolor`. The hover rule adds the surface and changes the dash's color:

```scss
&:hover {
  background-color: color-mix(in srgb, var(--colorFg, #fff) $minus-badge-hover-tint, transparent);

  &::before {
    background-color: color-mix(in srgb, currentcolor $minus-dash-hover-mix, var(--colorHighlightBg, currentcolor));
  }
}
```

Both colors come from theme variables, so the light and dark themes keep their contrast. The badge
is visible only in this rule; the dash is visible in the base rule, so a hovered row still shows the
minus before the pointer reaches the button. The opacity and pointer-events rules above decide when
the button can be hovered at all. No new CSS property on the row changes with button hover.

Because the mixin is shared, this one change covers the pinned row, the pinned tile, the folder row
and the link row. The style tests assert the base rule has no `background-color`, the `&:hover` rule
has it, and the hovered dash rule exists, in all three compiled stylesheets.

### Open-tab indentation and the dot

`FolderRowElement.create` already writes two values on each row: `data-vivarcdi-depth` with the
bookmark depth, and `--vivarcdi-depth` with the depth `folders.scss` uses for padding. It now gives
the CSS variable one extra step for a link row whose `tab` is set:

```ts
const OPEN_TAB_INDENT = 1;
const depth = row.kind === 'link' && row.tab !== undefined ? row.depth + OPEN_TAB_INDENT : row.depth;
element.style.setProperty('--vivarcdi-depth', String(depth));
element.setAttribute('data-vivarcdi-depth', String(row.depth));
```

`FolderRows` needs no change: it already sets `tab` on the rows it draws below a closed folder and
in a collapsed space, even though Vivaldi hides those tabs from its tab list. An unloaded link
keeps its `tab`, so it keeps the indent. Folder rows are unaffected.

`data-vivarcdi-depth` stays the bookmark depth because `DropTargets` and `FolderMinus` read it to
find a row's parent, its drop position and the tabs a folder minus unloads. Only the CSS variable
moves, so drag, drop and unload keep their current targets.

In `folders.scss` the `[data-vivarcdi-link-open]::after` dot rule and the rule that hides it on
hover are deleted, and `$folders-dot-size` is removed from `_tokens.scss`. The
`data-vivarcdi-link-open` attribute stays: the minus's hover selector above still uses it. Nothing
takes the dot's place as a separate mark; the extra indentation is the only open-tab sign.

### Superseded criteria and docs

062 refines criteria of two merged specs. In the implementation's docs task:

- 061/FR-1, AC-1, AC-3, AC-4 and AC-10 are annotated as refined by 062, and their checks are
  renamed to 062's verbatim `auto:` names where the same test now proves the new behavior.
- 009/FR-4 and AC-13 are annotated as refined by 062; AC-13's manual step becomes "indented, with
  no dot".
- `docs/manual/tab-bar.md` and `README.md` replace the dot with the indent and say the minus is
  shown on row or tile hover only, with its badge on button hover.

The press, label and unload criteria of 061 keep their original names and checks.

### Version

The implementation runs on `features/062-minus-hover-and-indent` and makes a minor version bump,
read from `origin/main` right before that task as CONTRIBUTING requires.

## Files

| File | Role |
|---|---|
| `src/styles/_tokens.scss` | Hover tints, dash mix; remove the dot and tile-current tokens |
| `src/styles/_minus.scss` | Shared badge rules and the new `&:hover` surface |
| `src/styles/pinned.scss`, `src/styles/favorites.scss` | Hover-only visibility selectors |
| `src/styles/folders.scss` | Hover-only visibility, no dot |
| `src/modules/folders/view/FolderRowElement.ts` | Display indent for rows with a tab |
| `tests/styles/Pinned.test.ts`, `tests/styles/Favorites.test.ts`, `tests/styles/Folders.test.ts` | AC-1 to AC-7 |
| `tests/modules/folders/view/FolderSectionView.test.ts` | AC-3's DOM check and AC-8's row check |
| `specs/061-pinned-minus-ui/spec.md`, `specs/009-bookmark-folders-in-tab-bar/spec.md` | Refined criteria |
| `docs/manual/tab-bar.md`, `README.md` | User-facing wording |
| `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` | Minor version bump |

## Risks

| Risk | Answer |
|---|---|
| The badge disappears from a hovered row before the pointer reaches the button | The dash is in the base rule and the row's hover rule keeps `pointer-events: auto` on the button |
| The dot removal leaves a gap in the row | The dot is a flex item with no margin; the minus is absolutely positioned |
| The extra indent moves a drag or unload target | Only `--vivarcdi-depth` changes; `data-vivarcdi-depth` stays the bookmark depth |
| An open tab hidden by Vivaldi has no row to indent | `FolderRows` still draws its link row below a closed folder or in a collapsed space, with `tab` set |
| An old test with a stale name keeps passing | The docs task renames the check and the test together; `make check` proves no duplicate name is left |
| Colors lose contrast in a dark theme | Both hover colors are mixed from theme variables and covered by AC-9's manual check |
