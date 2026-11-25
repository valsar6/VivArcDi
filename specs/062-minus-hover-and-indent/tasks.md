# 062 Minus on hover and open-link indent: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/062-minus-hover-and-indent` for the code, with a minor version change per
CONTRIBUTING: read the version on `origin/main` right before T4 and bump both `package.json` and
`installer/vivarcdi/__init__.py`. Each code task follows TDD: first the failing tests with the
verbatim `auto:` names of the criteria, then the code, then `make check`. There is no live scenario:
all behavior checks are `auto` or `manual` in the spec.

## Order

```
T1 ──> T3 ──> T4 (lead: docs and version) ──> T5 (Tore: manual)
   └──> T2 ──┘
```

T1 owns the shared tokens and mixin. T2 and T3 touch disjoint files and can run in parallel after
T1. T4 runs last on the code and reads the version from `origin/main` at that point.

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `src/styles/_tokens.scss`, `src/styles/_minus.scss`, `src/styles/pinned.scss`, `src/styles/favorites.scss`, `tests/styles/Pinned.test.ts`, `tests/styles/Favorites.test.ts` |
| T2 | `src/styles/folders.scss`, `src/modules/folders/view/FolderRowElement.ts`, `tests/styles/Folders.test.ts`, `tests/modules/folders/view/FolderSectionView.test.ts` |
| T3 | `specs/061-pinned-minus-ui/spec.md`, `specs/009-bookmark-folders-in-tab-bar/spec.md` |
| T4 | `docs/manual/tab-bar.md`, `README.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` |
| T5 | Nothing in the repository; the checklist comes from AC-9 |

## Tasks

- [x] **T1. Hover-only minus and badge** (TDD). In `tests/styles/Pinned.test.ts`, rename
  `shows the pinned row minus on hover and on the current row` to
  `shows the pinned row minus only while the row is hovered` (AC-1), assert the hover selector is
  present and the `:has(.tab.active)` one is gone, and add
  `shows the pinned minus badge only while the button is hovered` (AC-5): the base rule has no
  `background-color`, the `&:hover` rule has one, and the hovered dash rule is compiled. Keep the
  name `draws the pinned row minus as a badge like Arc` but change its background assertion to the
  hover rule. In `tests/styles/Favorites.test.ts`, rename
  `shows the pinned tile minus on hover and on the current tile` to
  `shows the pinned tile minus only while the tile is hovered` (AC-2), assert the
  `[data-vivarcdi-current]` selector is gone, and update the badge assertion under its existing
  name. Then change `_minus.scss` and the two stylesheets, and remove `$minus-badge-tint` and
  `$folders-dot-size` from `_tokens.scss`. `$tile-current` stays for the current tile's background.
  Done when `make check` is green.
- [x] **T2. Indent open rows and remove the dot** (TDD; after T1). With the verbatim names
  `shows the link row minus only while the row is hovered` (AC-3),
  `shows the folder row minus only while the row is hovered` (AC-4),
  `shows the folder and link minus badges only while the buttons are hovered` (AC-6),
  `removes the dot from an open link row` (AC-7) and
  `indents every row of an open tab one step further than a closed link row` (AC-8), write failing
  tests in `tests/styles/Folders.test.ts` and `tests/modules/folders/view/FolderSectionView.test.ts`.
  Assert the CSS rules, the absence of `::after` on open links, and the `--vivarcdi-depth` value on
  rows with and without a tab, including a link below a closed folder. Keep the name
  `draws the folder and link minus as the same badge` and move its background assertion to the hover
  rule. Then remove the dot rules from `folders.scss`, move the minus's visibility to row hover only,
  and set the display indent in `FolderRowElement.create` while leaving `data-vivarcdi-depth` as the
  bookmark depth. Rename the old DOM test `shows the link row minus on hover and on the current link`
  to AC-3's name. Done when `make check` is green.
- [x] **T3. Retire the superseded checks** (after T1; can run with T2). In 061, mark FR-1, AC-1,
  AC-3, AC-4 and AC-10 as refined by 062 and point their `auto:` checks at 062's verbatim names;
  keep the press, label and unload criteria untouched. In 009, mark FR-4 and AC-13 as refined by
  062 and replace "with a dot" with the indented, dot-free look. Do not edit the approved 062 spec.
  Done when `make check` is green.
- [x] **T4. Docs and version** (lead; after T2 and T3). In `docs/manual/tab-bar.md` and `README.md`,
  replace the open-link dot with the one-step indent and describe the minus as shown on row or tile
  hover with its badge on button hover. In the three version files, make the minor bump read from
  `origin/main` right before editing. Done when `make check` is green.
- [ ] **T5. Tore's manual check** (last). On macOS and Debian, with the Favorites grid on and off,
  compare the sidebar with the screenshots of 2026-11-25: the minus appears on row or tile hover
  only, its badge and colors on button hover only, and every open tab's row is indented with no dot.
  Press each minus and check that the tab unloads, the row or tile stays, and nothing closes, drags,
  opens, or removes a bookmark or folder. Record the result in the checklist built from AC-9.
