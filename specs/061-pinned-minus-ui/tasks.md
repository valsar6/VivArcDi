# 061 Pinned minus UI: tasks

| | |
|---|---|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |

Branch `features/pinned-minus-ui` for the code, with a minor version change per CONTRIBUTING: read
the version on `origin/main` right before T5 and bump both `package.json` and
`installer/vivarcdi/__init__.py`. Each task follows TDD: first the failing tests with the verbatim
`auto:` names of the criteria, then the code, then `make check`.

## Order

```
T1 ──> T3 ──> T5 (lead: live scenario, docs and version) ──> T6 (Tore: manual)
   └──> T2 ──┘
```

T1 owns the styles shared by T2 and T3. T2 and T3 touch disjoint folders and can run in parallel
after T1. T5 runs last on the code; the live scenario needs T1 and T2.

## Files each task owns

| Task | Owns |
|---|---|
| T1 | `src/styles/_tokens.scss`, `src/styles/_minus.scss`, `src/styles/pinned.scss`, `src/styles/favorites.scss`, `tests/styles/Pinned.test.ts`, `tests/styles/Favorites.test.ts` |
| T2 | `src/modules/pinned/PinnedMinus.ts`, `tests/modules/pinned/PinnedTabs.test.ts` |
| T3 | `src/modules/folders/view/FolderRowElement.ts`, `src/modules/folders/view/FolderSectionView.ts`, `src/modules/folders/FolderSection.ts`, `src/styles/folders.scss`, `tests/modules/folders/`, `tests/styles/Folders.test.ts` |
| T4 | `tests/live/scenarios/the-pinned-minus-is-a-badge-on-the-tile-of-a-pinned-tab.live.ts`, `specs/061-pinned-minus-ui/spec.md` (AC-14 check) |
| T5 | `specs/009-bookmark-folders-in-tab-bar/spec.md`, `docs/manual/tab-bar.md`, `README.md`, `package.json`, `package-lock.json`, `installer/vivarcdi/__init__.py` |
| T6 | Nothing in the repository; the checklist comes from AC-14, AC-15 and AC-16 |

## Tasks

- [ ] **T1. The badge on rows and tiles** (TDD). Failing tests first, in `tests/styles/Pinned.test.ts`:
  `draws the pinned row minus as a badge like Arc` (AC-1) and
  `shows the pinned row minus on hover and on the current row` (AC-3); in
  `tests/styles/Favorites.test.ts`: `draws the pinned tile minus as the same badge` (AC-2),
  `shows the pinned tile minus on hover and on the current tile` (AC-4) and
  `keeps the minus off a Favorite tile` (AC-13). Assert the token values, the badge's background,
  radius, size and offset, the masked dash on `::before`, and the unchanged hover/current selectors.
  Then add `_minus.scss` with the shared mixin, change the tokens, apply it in both stylesheets and
  remove the mask from the button itself. Done when `make check` is green.
- [ ] **T2. The press and the label** (TDD; after T1). Failing tests first in
  `tests/modules/pinned/PinnedTabs.test.ts`: `labels the pinned minus as Unload tab` (AC-5),
  `unloads a pinned tab from its minus` (AC-6) and
  `does not start a drag from the pinned row minus` (AC-8); in
  `tests/modules/favorites/PinnedFavorites.test.ts`: `unloads a pinned tab from its tile minus`
  (AC-7) and `does not drag or open a pinned tile from its minus` (AC-9). Add `pointerdown` to the
  listeners `PinnedMinus` swallows; keep the unload path and both labels. Done when `make check` is
  green.
- [ ] **T3. The minus on folder and link rows** (TDD; after T1; Q-1 option A). Failing tests first
  with the verbatim names `shows the link row minus on hover and on the current link` (AC-10),
  `unloads a link tab from its minus` (AC-11) and
  `unloads the link tabs of a folder from its minus` (AC-12) in `tests/modules/folders/`, plus the
  badge assertions of AC-1 to AC-4 in `tests/styles/Folders.test.ts`. In `FolderRowElement`, replace
  the link row's close span with a minus button and add a folder minus when open link rows follow
  it. In `FolderSectionView`, route both presses to `onUnload` and swallow their pointer events;
  collect the descendant tab ids from `#links` and `data-vivarcdi-depth`. In `FolderSection`, wire
  `onUnload` to `TabUnloader`. Apply the mixin in `folders.scss`. Keep `onClose` for the other close
  routes. Done when `make check` is green.
- [ ] **T4. The live scenario** (after T1 and T2). Add the scenario named
  `the pinned minus is a badge on the tile of a pinned tab`, read the tile minus's box, radius and
  position, and change AC-14's check in the spec from `manual; becomes live:` to
  `live: the pinned minus is a badge on the tile of a pinned tab`. Run `npm run live -- --only 061`
  only with Tore's agreement on a machine with Vivaldi and a desktop session; otherwise leave the
  scenario to Tore's manual run. Done when the scenario passes or Tore has run it.
- [ ] **T5. Docs and version** (lead; after T3 and T4). Amend 009/FR-12 so an open link row shows the
  unloading minus instead of a closing `×`; name the badge, the folder/link behavior and the live
  check in `docs/manual/tab-bar.md` and `README.md`; bump the minor version read from `origin/main`
  in the three version files. Done when `make check` is green.
- [ ] **T6. Tore's manual check** (last). On macOS and Debian, with the Favorites grid on and off,
  compare the badge and its placement with the recording; press each minus and check that the tab
  unloads, the row or tile stays, no bookmark or folder is removed and nothing drags or opens. Record
  the result in the checklist built from AC-14, AC-15 and AC-16.
