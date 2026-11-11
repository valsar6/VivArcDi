# 032 Compact tab bar: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

## Approach

The whole spec is style. Vivaldi already tells when the bar is narrow: it adds the class `narrow` to
`#tabs-tabbar-container` while the bar is at its minimum width and removes it as the bar grows on hover
(probe, Tore, 2026-11-11). A new stylesheet, `compact-tab-bar.scss`, holds every compact rule under one
selector:

```scss
#browser[data-vivarcdi-active]:has(#tabs-tabbar-container.narrow)
```

`:has()` on `#browser` is used instead of a descendant selector because the archive footer and the
anchor do not need to sit inside the container for the rule to match, and a container that Vivaldi
rebuilds after a layout change carries the class by itself (FR-6). Reading a class is safe; VivArcDi
never writes Vivaldi's classes (they are rewritten on re-render).

The three rows already exist and keep their elements, tooltips, `aria-*` attributes and click handlers
(FR-5). Only what is drawn changes:

| Row | Compact rule |
|---|---|
| Space header | `justify-content: center`; `.vivarcdi-space-arrow`, `.vivarcdi-space-name` and `.vivarcdi-space-add` are `display: none`; a `::after` draws the chevron with `mask: $chevron-glyph`, turned 180 degrees while `[data-vivarcdi-collapsed]` is set, so it points up while the space is expanded and down while collapsed (AC-4). The space icon stays as it is. |
| New Tab | `justify-content: center`; padding 0; the label `span` without a class is `display: none`; `.vivarcdi-new-tab-icon` stays, it already draws `$plus-glyph`. |
| Archive footer | The `button` keeps its text for screen readers but with `font-size: 0`; a `::before` of `$archive-icon-size` draws `$archive-glyph` with `mask`, centered. |

The archive glyph is a new 16 x 16 line drawing made for VivArcDi: an open box with a slot handle and
two sheets of paper rising from it, stroke 1.5 like the other glyphs. Tore's example image is a
reference for the shape only.

When the bar is wide, no rule of the new stylesheet matches, so the rows look as in 011, 004 and 028
(NFR-3, AC-2). The stylesheet is listed last in `config.json` after `sidebar-look.css`, so it wins over
equal selectors; its selector has an extra id anyway.

Rejected:

- A `ResizeObserver` on the tab bar width and a VivArcDi mark: Vivaldi's own class already says the same,
  without script work and without re-finding the container after a layout change.
- Reading the preference `vivaldi.tabs.bar.expand_on_hover`: the bar can also be narrow because the user
  dragged it; the class covers both.
- A CSS container query: it needs `container-type` on a Vivaldi element, which changes its layout.

## Components

| File | Responsibility |
|---|---|
| `src/styles/_tokens.scss` | `$narrow-tab-bar` selector, `$chevron-glyph`, `$archive-glyph`, `$archive-icon-size`, `$chevron-size` (FR-7, AC-5) |
| `src/styles/compact-tab-bar.scss` | The compact rules of the table above, all under `#{$root}:has(#{$narrow-tab-bar})` |
| `src/config.json` | Adds `styles/compact-tab-bar.css` to `styles`, last |
| `tests/styles/CompactTabBar.test.ts` | AC-1, AC-2, AC-4, AC-5 on the compiled CSS |

No TypeScript module changes.

## Tests

| Test | How |
|---|---|
| `compact rules apply only to the narrow tab bar` | Every selector of the compiled CSS starts with `#browser[data-vivarcdi-active]:has(#tabs-tabbar-container.narrow)` |
| `wide tab bar keeps the full rows` | The stylesheet has no rule outside that selector and does not change `space-header.scss`, `today.scss` or `sidebar-look.scss` output |
| `compact header chevron follows the collapsed state` | The compiled CSS turns the chevron 180 degrees only under `[data-vivarcdi-collapsed]`, and the up-pointing glyph is the default |
| `compact tab bar uses tokens` | The tokens exist in `_tokens.scss`, are used in the stylesheet and their values are not repeated there |

## Risks

- **Vivaldi renames `narrow`.** Then nothing compact shows and the bar looks as today (cut texts), never
  broken. The probe in `compact-tab-bar/` reads the class again.
- **Debian.** The probe ran on macOS; the class comes from Vivaldi's shared UI code, so it should be the
  same on Linux. Checked in the manual checklist.
- **Width of the header in the narrow bar.** The probe measured 30 px for the header: an 18 px icon and a
  10 px chevron with a 2 px gap fit.
