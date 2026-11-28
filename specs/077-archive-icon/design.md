# 077 Archive button as an icon: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |
| Approved | Tore, 2026-11-28 |

## Approach

Two small changes and a clean-up of 032. The markup moves from a text button to an inline SVG button, built
once with `createElementNS`; the stylesheet loses the label rules and the mask glyph and gains a square
button; 032's footer rules and tests go. No new module, no `config.json` change, no selector. Tore's answers
are final: the drawing has the sparkle, aligned left at every width (Q-1, Q-5); 032 is amended, not
superseded (Q-2); the tooltip text is unchanged (Q-4).

## New file

`src/modules/today/ArchiveIcon.ts`, one class with one static method, drawn like `LabelIcon` in
`src/shared/icons/LabelIcon.ts` (same namespace constant, attributes set from a table):

```ts
export const ARCHIVE_SHAPES: ReadonlyArray<readonly [string, Record<string, string>]> = [
  ['rect', { x: '1.75', y: '6', width: '12.5', height: '2.25', rx: '0.75' }],
  ['path', { d: 'M2.75 8.25V12.5a1.75 1.75 0 0 0 1.75 1.75h7a1.75 1.75 0 0 0 1.75-1.75V8.25' }],
  ['path', { d: 'M6.25 10.75h3.5' }],
  ['path', { d: 'M12.25 1Q12.25 2.75 14 2.75Q12.25 2.75 12.25 4.5Q12.25 2.75 10.5 2.75Q12.25 2.75 12.25 1z' }],
];

export class ArchiveIcon {
  public static create(document: Document): SVGElement;
}
```

`create` returns an `svg` with `viewBox="0 0 16 16"`, `fill="none"`, `stroke="currentColor"`,
`stroke-width="1.3"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `aria-hidden="true"`,
`focusable="false"`, and no `width` or `height` (the stylesheet sizes it, FR-5). The four shapes are the lid,
the body with rounded bottom corners, the handle slot and the four-point sparkle above the right corner of the
lid (FR-7). The coordinates are the starting drawing; Tore judges the look in the manual step and any change
of path is a change of `ARCHIVE_SHAPES` only, which its test follows.

`svgIcon` in `src/modules/littlearc/SvgIcon.ts` is not reused: it is a 24 grid, belongs to another module and
modules never import each other.

## Changed files

| File | Change |
|---|---|
| `src/modules/today/ArchiveButton.ts` | The button gets `aria-label="Archive"`, keeps `title` and the click handler, and holds `ArchiveIcon.create(document)` instead of `textContent = 'Archive'` (FR-1, FR-2, FR-3) |
| `src/styles/_tokens.scss` | Add `$archive-button-size: 28px;`; keep `$archive-icon-size: 18px;`; remove `$archive-glyph` (FR-5, FR-6) |
| `src/styles/today.scss` | Replace the footer block (lines 216-255, today) as below |
| `src/styles/compact-tab-bar.scss` | Remove the `#{$archive-footer}` block (lines 42-50, today) (AC-7) |
| `src/styles/column-scroll.scss` | None: the sticky footer rule stays |

### Footer block in `today.scss`

```scss
#{$root} #{$archive-footer} {
  flex: none;
  box-sizing: border-box;
  align-self: flex-start;
  width: fit-content;
  margin-inline-start: $gap;
  padding-block: $gap * 0.5;

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: $archive-button-size;
    height: $archive-button-size;
    padding: 0;
    border: 0;
    border-radius: var(--vivarcdi-radius);
    background: transparent;
    color: var(--colorFg, inherit);
    opacity: 0.7;
    cursor: pointer;
    transition: background-color var(--vivarcdi-transition), opacity var(--vivarcdi-transition);

    svg {
      flex: none;
      width: $archive-icon-size;
      height: $archive-icon-size;
    }

    &:hover,
    &:focus-visible {
      background-color: color-mix(in srgb, var(--colorFg, #fff) #{$folders-tint-hover}, transparent);
      opacity: 1;
    }

    &:focus-visible {
      outline: 2px solid var(--colorHighlightBg, currentcolor);
      outline-offset: -2px;
    }
  }
}
```

Rules that hold the live sizes of AC-9: the side offset is a margin, not padding, so the footer is 28 px wide
and `28 + 2 * 4 = 36` px high, within "at most 36 px". The left edge is the same at every width because no rule
depends on the narrow class. The sticky `background-color` of `column-scroll.scss` now covers only the footer,
28 px wide; this is what the spec asks ("no wider than the button", FR-5) and is noted as a doubt in the
report, not changed here.

## Fit with 076

076 moves the footer element into the compact bottom row of the Breaking wave and owns its layout. 077 leaves
that possible: the footer keeps `data-vivarcdi-archive-footer`; the button sizes come from two tokens, so 076
can read `$archive-button-size` (28 px) and override the icon to about 13 px with a rule of its own under its
marker (specificity higher than `#{$root} #{$archive-footer} button svg`); no rule here assumes a parent, a
full-width block or `#tabs-container`, except `align-self: flex-start`, which a non-flex parent ignores.

## Changes to 032 (docs task, lead)

- `specs/032-compact-tab-bar/spec.md`: add an `Amended by` row to the header, as 004 has for 071, naming FR-4,
  FR-8 and AC-12 as replaced by 077 FR-1 and AC-6, and AC-9 and AC-11 (archive part) as true in meaning only;
  Summary and the "In the full form too" paragraph get a short pointer to 077. 032 stays `Implemented`.
- `specs/032-compact-tab-bar/design.md`: the rows that name `$archive-glyph` and the footer mask get a
  "replaced by 077" note.
- `tests/styles/CompactTabBar.test.ts`: remove `archive footer shows the archive icon beside its label`;
  in `compact rules apply only to the narrow tab bar` drop the archive footer from the list of rows with a
  compact rule; in `compact tab bar uses tokens` drop the `$archive-glyph` and `$archive-icon-size` checks
  (the second now belongs to `archive icon button uses size tokens`). The names of the kept tests do not change.

## Test mapping

New style tests go in `tests/styles/ArchiveIcon.test.ts` (compiles `today.scss` and `compact-tab-bar.scss`
with `sass`, as `CompactTabBar.test.ts` does); button and icon tests are added to
`tests/modules/today/TodayParts.test.ts` next to `keeps the archive footer at the end of the tab container`,
using `TodayDocument`, which already has `createElementNS` through `DomDocument` in `tests/core/dom.ts` (add it
there if the base class lacks it; `tests/shared/icons/fakes.ts` shows the shape).

| AC | Test (name verbatim) | File and what it asserts |
|---|---|---|
| AC-1 | `archive button holds an icon and no text` | `TodayParts.test.ts`: the button has one child, an `svg`, and `textContent` is empty |
| AC-2 | `archive button keeps its tooltip and gets an accessible name` | `TodayParts.test.ts`: `aria-label` is `Archive`, `title` is `Archive (Cmd/Ctrl+Shift+A)`, `type` is `button` |
| AC-3 | `archive icon is a stroke svg colored with currentColor` | `TodayParts.test.ts`: `viewBox` `0 0 16 16`, `fill` none, `stroke` `currentColor`, `aria-hidden` `true`, `focusable` `false`, no `width` or `height` |
| AC-4 | `archive icon button opens the archive on click` | `TodayParts.test.ts`: one click on the button calls the handler once |
| AC-5 | `archive icon button uses size tokens` | `ArchiveIcon.test.ts`: `_tokens.scss` has `$archive-button-size: 28px;` and `$archive-icon-size: 18px;`; `today.scss` uses both; the compiled button rule has `width: 28px` and `height: 28px`, the `svg` rule 18px |
| AC-6 | `archive footer has no label rules` | `ArchiveIcon.test.ts`: compiled `today.scss` has no `::before` under the footer, no `mask`, no `font-size: 0`, no `width: 100%` in an archive footer rule; `_tokens.scss` has no `$archive-glyph` |
| AC-7 | `compact tab bar leaves the archive footer alone` | `ArchiveIcon.test.ts`: compiled `compact-tab-bar.scss` has no selector with `archive-footer` and the source has no `$archive-footer` |
| AC-8 | `archive icon button follows the theme` | `ArchiveIcon.test.ts`: the button rules have `:hover` and `:focus-visible` with `var(--colorFg` and `color-mix`, an `outline` using a `var(`, and no `#` hex or `rgb(` color in the footer block |
| AC-12 | `archive icon button is aligned to the start` | `ArchiveIcon.test.ts`: the footer rule has `align-self: flex-start`; neither stylesheet has `justify-content: center` outside the button, `margin: auto`, `margin-inline: auto` or `text-align: center` on an archive footer selector |
| AC-13 | `archive icon draws the box with the sparkle` | `TodayParts.test.ts`: `stroke-width` `1.3`, `stroke-linecap` and `stroke-linejoin` `round`; the children are `rect`, `path`, `path`, `path` in that order, the last with four `Q` segments; the `d` values equal `ARCHIVE_SHAPES` |
| AC-9 | `the archive footer is only an icon` | live scenario `tests/live/scenarios/the-archive-footer-is-only-an-icon.live.ts`, `spec: '077'` |
| AC-10 | `the archive icon opens the archive panel` | live scenario `tests/live/scenarios/the-archive-icon-opens-the-archive-panel.live.ts`, `spec: '077'` |
| AC-11 | manual | Italian checklist, last task |

`ArchiveIcon.test.ts` is the style test file named in the table (`tests/styles/ArchiveIcon.test.ts`).

### Live scenarios

- `the archive footer is only an icon`: read `getBoundingClientRect()` of `[data-vivarcdi-archive-footer]`
  and its left edge relative to `#tabs-tabbar-container`; add the class `narrow` to `#tabs-tabbar-container`
  (the stylesheet reads the class only, 032 NFR-1), read again, remove the class. Fail if width or height
  exceeds 36 px, or if the two left offsets differ by more than `TOLERANCE` from `column.ts`.
- `the archive icon opens the archive panel`: `driver.click('[data-vivarcdi-archive-footer] button')`, then
  `driver.waitForElement('[data-vivarcdi-archive]')`; press Escape to leave the lab as it was.

`favorites and footer stay fixed while the column scrolls` (053) must still pass unchanged.

## Texts

Tooltip `Archive (Cmd/Ctrl+Shift+A)` and accessible name `Archive`, both English like the other labels of the
module. No log line is added.

## Risks

- The sparkle at 18 px and 1.3 px stroke may read as noise at small sizes; the drawing is one constant, so a
  change after the manual look touches `ARCHIVE_SHAPES` and its test only.
- 076 reduces the glyph to about 13 px: at that size the sparkle is the first detail to blur. 076 owns that
  look; 077 gives it the same drawing.
