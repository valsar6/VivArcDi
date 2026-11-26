# 066 Arc close control and title space: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/066-arc-close-control` for the code, with a minor version bump per CONTRIBUTING:
read the version on `origin/main` right before T4 and bump both `package.json` and
`installer/vivarcdi/__init__.py`. Each code task follows TDD: first the failing tests with the
verbatim `auto:` names of the criteria, then the stylesheet change, then `make check`. There is no
live scenario: all behavior checks are `auto` or `manual` in the spec.

## Order

```text
T1 ──> T2 ──> T3 ──> T4 (lead: docs and version) ──> T5 (Tore: manual)
```

T1 owns the shared tokens, so T2 and T3 build on it. T4 reads the version only when the code tasks
are done.

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `src/styles/_tokens.scss`, `tests/styles/Pinned.test.ts`, `tests/styles/Favorites.test.ts`, `tests/styles/Folders.test.ts`, `tests/styles/Minus.test.ts` |
| T2 | `src/styles/sidebar-look.scss`, `tests/styles/SidebarLook.test.ts` |
| T3 | `src/styles/sidebar-look.scss`, `src/styles/pinned.scss`, `src/styles/folders.scss`, `tests/styles/SidebarLook.test.ts`, `tests/styles/Minus.test.ts` |
| T4 | `specs/028-arc-sidebar-look/spec.md`, `specs/061-pinned-minus-ui/spec.md`, `specs/062-minus-hover-and-indent/spec.md`, `specs/066-arc-close-control/spec.md`, `specs/README.md`, `docs/manual/tab-bar.md`, `README.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` |
| T5 | Nothing in the repository; the checklist comes from AC-8 |

## Tasks

- [ ] **T1. Shared badge tokens** (TDD). In `tests/styles/Pinned.test.ts`,
  `tests/styles/Favorites.test.ts` and `tests/styles/Folders.test.ts`, change the token and compiled
  assertions from 21 px to 24 px; keep every test name from 061/062. Add
  `tests/styles/Minus.test.ts` with the verbatim name `draws the minus badge at twenty-four pixels`
  (AC-3): read the three compiled stylesheets and assert that the pinned row, pinned tile and
  Favorites minus all use a 24×24 box, a 5 px radius, a 6 px inset and a 14×2 dash glyph. Then set
  `$minus-badge-size: 24px` and replace `$minus-glyph` with the 14×2 dash in `_tokens.scss`, leaving
  `$minus-offset`, `$minus-badge-radius`, `$minus-size` and the hover mixes unchanged. Done when
  `make check` is green.
- [ ] **T2. Arc close button** (TDD; after T1). In `tests/styles/SidebarLook.test.ts`, add the
  verbatim names `draws the open tab close as an Arc X` (AC-1) and
  `shows the Arc close badge only on button hover` (AC-2). Assert the close button is zero-width at
  rest with no badge, becomes a 24×24 badge with a 5 px radius on row hover, draws a 10×10 masked
  `×`, and gets its badge surface and hover color only on button hover. Then add `$close-glyph` and
  `$close-glyph-size` to `_tokens.scss` and replace the two opacity rules in `sidebar-look.scss`
  with the base and state rules of `design.md`. Keep all selectors under `#browser[data-vivarcdi-look]`.
  Done when `make check` is green.
- [ ] **T3. Title space** (TDD; after T2). In `tests/styles/SidebarLook.test.ts`, add
  `gives the title the hidden close space at rest` (AC-4) and, in `tests/styles/Minus.test.ts`,
  `gives the title the hidden minus space at rest` (AC-5) and `keeps the close and minus gestures`
  (AC-6). Assert that `.title` and `.vivarcdi-folders-title` have no end padding at rest, get
  `padding-inline-end: 30px` on the row states that reveal their control, and that no rule disables
  the close or minus button on hover. Then add the padding rules to `sidebar-look.scss`,
  `pinned.scss` and `folders.scss`, leaving the tile layout and every press handler alone.
  Done when `make check` is green.
- [ ] **T4. Docs and version** (lead; after T3). Add the `Refined by 066` rows to 028, 061 and 062,
  update the 24 px values where their criteria name the badge size, and point their affected checks
  at 066's verbatim names. Mark 066 `Implemented` with the merge date in its header and set the
  index row to `Implemented`. In `docs/manual/tab-bar.md` and `README.md`, describe the Arc `×` with
  its badge on button hover and say that a title gives up space to a visible close or minus. Read
  the version on `origin/main` right before editing and make the minor bump in the three version
  files. Done when `make check` is green.
- [ ] **T5. Tore's manual check** (last). On macOS and Debian, with the Favorites grid on and off:
  hover an open tab away from its close button and check the bare dark `×`; hover the button and
  check the 24 px light badge; hover a pinned row and check the same badge behind its dash. Compare
  a long title with and without a visible control: it must reach the row's end at rest and truncate
  before the control on hover, as in the screenshots of 2026-11-26. Press a close button and each
  minus to confirm the old close and unload gestures still work. Record the result in the checklist
  built from AC-8.
