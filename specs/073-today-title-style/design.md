# 073 Today titles styled like the folder rows: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written only after the spec is `Approved`. It says **how**; the spec says **what**.

## Approach

Styles only, in two stylesheets and one token file. No TypeScript changes.

**Shared tokens (FR-1, NFR-1, AC-3).** `src/styles/_tokens.scss` gets `$list-title-size: 13px` and
`$list-title-weight: 400`. `folders.scss` replaces its literal `font-size: 13px` on the list with
`$list-title-size` and sets `font-weight: $list-title-weight` on the link titles (folder titles keep
their 600). `sidebar-look.scss` replaces `$row-font-size` and `$row-font-weight` in its `.title` rule
with the same two tokens. `$row-font-size` and `$row-font-weight` stay for the other users
(`base.scss`, `live-folders.scss`, `icon-picker.scss`). The title color becomes the one of the link
rows, `var(--colorFg, inherit)`, in place of `--vivarcdi-ink`. The live scenario compares the two
computed colors, so a theme where they differ is caught.

**Alignment (FR-2, AC-2).** Probe on a lab Vivaldi, 2026-11-27: `.title` is a block with
`height: 30px`, `line-height: normal`, `padding-inline-start: 4px` and `margin: 0 3px 0 0`, beside a
`.favicon` of 18 px (16 px image plus 1 px padding). The text sits at the top of the tall box and
starts 4 px from the icon. The `.title` rule of `sidebar-look.scss` becomes:

- `height: auto`, so `align-self: center` centers the text itself and not a 30 px box;
- `padding-inline-start: 0` and `margin-inline-start: $gap - 1px`, so the space from the 16 px image
  to the text is `$gap` (8 px), as in a link row (the 1 px is the favicon padding);
- everything else of the rule stays: ellipsis, `min-width: 0`, the `padding-inline-end` transition
  and the hover room of the minus badge (FR-3, AC-5).

If the probe in T1 shows other values on the lab Vivaldi, the implementer keeps the smallest set of
declarations that meets AC-2 and records them here.

Pinned rows share `$rows` and keep their own rules, so the change reaches them only where the
selector already does; AC-5 and the tile rule (`display: none` on `.title`) stay as they are.

## Files

| File | Change |
|---|---|
| `src/styles/_tokens.scss` | `$list-title-size`, `$list-title-weight` |
| `src/styles/folders.scss` | Uses the two tokens |
| `src/styles/sidebar-look.scss` | `.title` uses the tokens, the link color, `height: auto` and the new inline start |
| `tests/styles/SidebarLook.test.ts` | `title style tokens are shared` |
| `tests/live/scenarios/` | Three scenarios named as the `live:` checks |
| `package.json`, `installer/vivarcdi/__init__.py` | Patch version, read from `main` before the PR |

## Tests

| Criterion | Test | Where | What it asserts |
|---|---|---|---|
| AC-3 | `title style tokens are shared` | `tests/styles/SidebarLook.test.ts` | Both stylesheets use `$list-title-size` and `$list-title-weight`; the compiled 13 px and 400 appear in the Today `.title` rule and in the folder list; no literal `13px` remains in `folders.scss` |
| AC-1 | `today title matches link title` | `tests/live/scenarios/` | A Today title and a link title have equal computed font size, weight and color |
| AC-2 | `today title aligns with its icon` | `tests/live/scenarios/` | Title center within 1 px of the icon center; distance from the image to the text equals that of a link row |
| AC-5 | `today title keeps layout` | `tests/live/scenarios/` | Overflow gets an ellipsis; the hover padding of the minus badge is still applied |
| AC-4 | manual | | Look at the Today list next to the Favorites area |

The live scenarios are written first and fail on the current code, so each one proves the fix.
