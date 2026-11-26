# 066 Arc close control and title space: design

| | |
|---|---|
| Status | Approved (2026-11-26, PR #295) |
| Spec | [spec.md](spec.md) |

Tore approved the spec on 2026-11-26 (PR #294) and the design on the same day (PR #295). This
document says **how** to implement it. It builds
on the row look of [028](../028-arc-sidebar-look/design.md) and the shared minus of
[061](../061-pinned-minus-ui/design.md) and [062](../062-minus-hover-and-indent/design.md).

## Approach

The change is a stylesheet change plus documentation. No module, listener, selector file or option
changes: the close button stays Vivaldi's and the minus stays VivArcDi's button with the same press
handlers. Four local changes:

| Area | What changes | Where |
|---|---|---|
| Tokens | Minus badge 24 px, dash 14×2, close glyph and badge from the same theme colors | `src/styles/_tokens.scss` |
| Close button | Zero-width at rest, 24 px badge on row hover, `×` badge on button hover | `src/styles/sidebar-look.scss` |
| Title space | Row title gives up the control's 24 px + 6 px only while the row is hovered | `src/styles/sidebar-look.scss`, `src/styles/pinned.scss`, `src/styles/folders.scss` |
| Superseded values | 061 and 062 point at the new badge size and at 066's checks | `specs/061`, `specs/062`, `docs/manual/tab-bar.md`, `README.md` |

The controls keep their colors from the theme: `--vivarcdi-ink` for the glyph and dash, and the same
`color-mix` tokens the minus already uses for the badge and its hover state. The look is scoped by
`#browser[data-vivarcdi-look]`, so `sidebar-look.enabled: false` changes nothing.

### Tokens

`_tokens.scss` keeps one badge size for both controls, because both must read as one set:

```scss
$minus-badge-size: 24px;
$minus-badge-radius: 5px;
$minus-offset: 6px;
```

`$minus-glyph` becomes a 16-unit square whose dash spans 14 units by 2 units, so `$minus-size` stays
`16px` and the painted dash is about 14×2 CSS px. `$minus-badge-hover-tint` and
`$minus-dash-hover-mix` stay as they are: the badge and dash hover colors are already theme-based.

The close glyph gets its own tokens. `$close-glyph` becomes a 12-unit square with a centered `×`
whose arms span 10 units and are about 1 unit thick; `$close-glyph-size: 12px` paints it as about
10×10 with a 1 px stroke. The close badge reuses `$minus-badge-size`, `$minus-badge-radius` and
`$minus-offset`, and the hover colors reuse the minus mixes. No color is hardcoded.

### The close button of an open tab

`sidebar-look.scss` replaces the current two opacity rules with one base rule and two state rules:

```scss
#{$rows} .close {
  position: relative !important;
  box-sizing: border-box;
  flex: none;
  width: 0;
  height: $minus-badge-size;
  margin: 0;
  padding: 0;
  border: 0;
  appearance: none;
  overflow: hidden;
  color: var(--vivarcdi-ink);
  opacity: 0;
  pointer-events: none;
  transition: width $transition, margin-inline-end $transition, opacity $transition;

  &::before { /* 10 px masked ×, centered in the button */ }
  > * { display: none !important; }
}

#{$rows}:hover .close {
  width: $minus-badge-size;
  margin-inline-end: $minus-offset;
  opacity: 1;
  pointer-events: auto;
}

#{$rows} .close:hover {
  background-color: color-mix(in srgb, var(--colorFg, #fff) $minus-badge-hover-tint, transparent);

  &::before {
    background-color: color-mix(in srgb, currentcolor $minus-dash-hover-mix, var(--colorHighlightBg, currentcolor));
  }
}
```

Forcing `position: relative` makes the button take part in Vivaldi's flex `.tab-header`, so a zero
width gives the title its space back and a hovered width gives it to the badge. `overflow: hidden`
keeps the `×` out of sight until the button has its box. The child rule hides Vivaldi's own icon;
the `::before` mask draws ours. The button is clickable only while its row is hovered, which is
when it is visible. Clicking it still closes the tab through Vivaldi.

### The minus badge

The shared `minus-badge` mixin in `_minus.scss` needs no structural change: it already reads the
badge tokens and masks `$minus-glyph` in `::before`. Only the token values change, so the pinned row,
the pinned tile, the Favorites folder row and the Favorites link row all grow to 24 px with the
same 5 px radius and the same 14×2 dash. Their hover-only visibility and badge-on-button-hover
rules stay exactly as 062 wrote them.

The existing style tests keep their names from 061's and 062's criteria but assert the new values;
066 adds one combined test under its own AC-3 name. This keeps the older criteria traceable.

### Title space

The title is a flex child with `min-width: 0` and an ellipsis. While a control is hidden it must be
able to grow to the row's end; while the row is hovered the visible control takes 30 px
(`$minus-badge-size + $minus-offset`) from it. How it loses that space depends on where the control
lives: a control in the flex row takes it by its width, while an absolutely positioned minus needs
the title to give up the same space as padding.

- Open tab rows: the close button goes from zero width to 24 px plus a 6 px end margin, so the flex
  title loses 30 px on its own. Vivaldi hides the favicon when the close appears; the style keeps
  the favicon visible on hover, otherwise the row would give back 18 px and the ellipsis would sit
  too far from the button. No padding is added here. The title is forced to `display: block` because
  Vivaldi's flex title does not render `text-overflow: ellipsis`; the close button is forced to
  `order: 0` because Vivaldi otherwise moves it to the start of the header on hover.
- Pinned rows: Vivaldi's close is `display: none` and the VivArcDi minus is absolutely positioned,
  so `.title` gets `padding-inline-end: $minus-badge-size + $minus-offset` under
  `.tab-position.is-pinned:hover`.
- Favorites folder and link rows: `.vivarcdi-folders-title` gets the same padding under
  `[data-vivarcdi-folder-unload]:hover` and `[data-vivarcdi-link-open]:hover`, the same row states
  that reveal their minuses (062).
- Pinned tiles: no title-padding rule; 060 and 062 keep the tile's own layout. Only the badge token
  changes there.

The padding is on the title, not on the row, so the icon and the row's indentation stay put. The
title's `overflow: hidden`, `text-overflow: ellipsis` and `white-space: nowrap` are set in the same
rule to make the truncation deterministic on all three Vivaldi versions. A short title is
unchanged; other indicators are siblings of the title and keep their own space.

### Superseded criteria and docs

066 refines approved specs. In the implementation's docs task:

- 061's header gets a `Refined by` row for 066; FR-1, AC-1 and AC-2 take the 24 px values and point
  at 066/AC-3's check where it replaces the old size assertion. The unload, label and press
  criteria keep their names and checks.
- 062's header gets the same row; FR-2, AC-5 and AC-6 point at 066/AC-3 and 066/AC-4 where the new
  badge and padding rules prove the behavior.
- 028's FR-3 and AC-3 get a note that the close button's look is refined by 066; the existing manual
  check stays.
- `specs/README.md` marks 066 `Implemented` when the code task is merged.
- `docs/manual/tab-bar.md` describes the `×` and its badge-on-button-hover, and says a title gives
  up space to a visible close or minus. `README.md` gets the same short wording where it lists the
  sidebar look.

### Risks

- Vivaldi may position `.close` absolutely. The base rule forces `position: relative` and `flex:
  none` inside the flex `.tab-header`; the compiled-CSS tests assert those declarations. If a
  version needs another override, it belongs in a follow-up spec, not in a silent JS workaround.
- A row with a warning icon, an audio icon or a Little Arc indicator has more siblings than the
  screenshots. Padding only the title means those indicators keep their space and the control does
  not cover them.
- No live Vivaldi is run as part of this design. Tore's manual check (AC-8) is the visual verdict;
  `npm run live` needs his explicit agreement (AGENTS.md).

### Version

The implementation runs on `features/066-arc-close-control` and makes a minor version bump, read
from `origin/main` right before that task as CONTRIBUTING requires.
