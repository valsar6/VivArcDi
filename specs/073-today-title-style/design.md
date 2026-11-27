# 073 Today titles aligned like the folder rows: design

| | |
|---|---|
| Status | Implemented |
| Spec | [spec.md](spec.md) |

Written only after the spec is `Approved`. It says **how**; the spec says **what**.

## Approach

Styles only, in `sidebar-look.scss` and one token. No TypeScript changes.

**Font and color (FR-1, AC-1).** No change. In the Arc look `sidebar-look.scss` already gives link
and Today titles the same size, weight and color; `today title matches link title` guards it.

**Alignment (FR-2, AC-2).** Probe on a lab Vivaldi, 2026-11-27: `.title` is a block with
`height: 30px`, `line-height: normal`, `padding-inline-start: 4px` and `margin: 0 3px 0 0`, beside a
`.favicon` of 18 px (16 px image plus 1 px padding). The text sits at the top of the tall box and
starts 4 px from the icon. The `.title` rule of `sidebar-look.scss` becomes:

- `height: auto`, so `align-self: center` centers the text itself and not a 30 px box;
- `padding-left: 0` (Vivaldi pads the left, and stylelint forbids two logical longhands that could be a shorthand while a test expects `padding-inline-end: 0`) and `margin-inline-start: $gap - $favicon-padding`, so the space from the 16 px image
  to the text is `$gap` (8 px), as in a link row (`$favicon-padding`, 1 px, is the favicon padding);
- everything else of the rule stays: ellipsis, `min-width: 0`, the `padding-inline-end` transition
  and the hover room of the minus badge (FR-3, AC-5).

If the probe in T1 shows other values on the lab Vivaldi, the implementer keeps the smallest set of
declarations that meets AC-2 and records them here.

Pinned rows share `$rows` and keep their own rules, so the change reaches them only where the
selector already does; AC-5 and the tile rule (`display: none` on `.title`) stay as they are.

## Files

| File | Change |
|---|---|
| `src/styles/_tokens.scss` | `$favicon-padding` |
| `src/styles/sidebar-look.scss` | `.title`: `height: auto`, `padding-left: 0`, the inline start margin |
| `tests/live/scenarios/` | Three scenarios named as the `live:` checks, and their helper `titles.ts` |
| `package.json`, `installer/vivarcdi/__init__.py` | Patch version |

## Tests

| Criterion | Test | Where | What it asserts |
|---|---|---|---|
| AC-1 | `today title matches link title` | `tests/live/scenarios/` | A Today title and a link title have equal computed font size, weight and color |
| AC-2 | `today title aligns with its icon` | `tests/live/scenarios/` | Text center within 1 px of the icon center; distance from the image to the text equals that of a link row |
| AC-5 | `today title keeps layout` | `tests/live/scenarios/` | Overflow gets an ellipsis; the hover transition of the minus badge is still applied |
| AC-4 | manual | | Look at the Today list next to the Favorites area |

The alignment scenario failed on the code before the change (6.75 px off the center, 4 px from the
icon) and passes after it.
