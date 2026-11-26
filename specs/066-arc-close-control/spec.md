# 066 Arc close control and title space

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-26, PR #294 |
| Implemented | 2026-11-26 |
| Refines | Nothing yet. It refines the open-tab close button of [028](../028-arc-sidebar-look/spec.md) FR-3 and AC-3, the minus size of [061](../061-pinned-minus-ui/spec.md) FR-1, FR-2, AC-1 and AC-2, and the badge of [062](../062-minus-hover-and-indent/spec.md) FR-2, AC-5 and AC-6. It changes the title width of rows that carry a close or minus control. Every press behavior stays as it is. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc draws the close control of an open tab as a small `×` at the right end of the row. On row hover
only the dark glyph appears; while the pointer rests on the glyph itself, a light rounded-square badge
appears behind it. The unload minus of a pinned row uses the same badge. VivArcDi hides Vivaldi's
close button behind `opacity: 0` but leaves its box in the row, so the title never gets that space
back, and the minus badge of 061 is smaller than the badge in the new screenshots. This spec gives
both controls Arc's look and lets a row's title use the control's space while the control is hidden.

## Seen in the screenshots

Tore's screenshots of Arc on 2026-11-26, at 2× retina pixels. The measures below are CSS pixels.

- An open tab hovered away from its close button shows a dark `×` of about 10×10 with a stroke of
  about 1, with no badge behind it.
- With the pointer on that button, the glyph sits centered in a light gray badge of about 24×24 with
  a radius of about 5. The same badge appears behind the minus of a pinned row.
- The badge starts about 6 px from the row's inline end and is vertically centered on the row.
  The minus dash is about 14×2.
- A title that does not fit ends in an ellipsis. With the control hidden the title reaches further:
  `Learn Japanese: A Ri…` becomes `Learn Japanese:…` when the `×` appears, and
  `English to French, Ital…` becomes `English to French,…` when the minus appears.

The badge of 061 was measured from the recording of 2026-11-24 as about 21×21 with an 11×2 dash.
Tore chose the 24×24 badge of these screenshots for both controls (Q-2).

## User stories

- **US-1.** As a user coming from Arc, I want the `×` of an open tab to look like Arc's, so that the
  sidebar matches the browser VivArcDi imitates.
- **US-2.** As a user, I want the `×` and the minus to show their badge only while I point at the
  control itself, so that a hovered row stays calm.
- **US-3.** As a user, I want my tab titles to use the space of a hidden close or minus control, so
  that I read more of a title at rest.
- **US-4.** As a user, I want the title to give that space back when the control appears, so that
  the control sits at the row's end without covering the title, as in Arc.
- **US-5.** As a user, I want the minus to keep its size, look and gesture on every surface where it
  appears, so that the two controls read as one set.

## Expected behavior

**The close control of an open tab.** Vivaldi's own close button keeps closing its tab. VivArcDi
restyles it as Arc's `×`: a glyph of about 10×10 with a stroke of about 1 in the row's foreground
color, at the row's inline end and vertically centered. WHILE the row is hovered, the glyph is
visible on the row's hover veil and has no badge. WHILE the pointer rests on the button itself, a
badge of about 24×24 with a radius of about 5 is drawn behind the centered glyph, in the theme's
badge color, and the glyph takes the theme's hover color. The colors come from the same theme tokens
as the minus, so they stay legible in the light and dark themes of 029 and 051. The button is hidden
when the row is not hovered, as 028/FR-3 says.

**The minus.** The minus of a pinned row, a pinned tile, a Favorites folder row and a Favorites link
row uses the same 24×24 badge with a radius of about 5. Its dash stays about 14×2 and centered. The
badge and the hover colors appear only while the pointer rests on the button, as 062/FR-2 says;
while the row is hovered elsewhere, only the dash is drawn. Visibility stays hover-only and the
labels, the unload of pinned surfaces and the close of Favorites rows stay as 061, 062 and 063 say.

**Title space.** A row's title uses the space between its icon and the control's inset from the
row's inline end while its close or minus control is hidden. When the row is hovered, the control
takes its 24 px box plus that inset out of the title's width, so an overlong title truncates earlier
with an ellipsis. The title never runs under the visible control. The change applies to the rows of
open tabs, pinned rows and the Favorites folder and link rows. A pinned tile keeps its own layout;
only its badge size changes. Other visible row indicators keep their own space and are not covered
by a title or a control.

**Versions and look.** The behavior holds on Vivaldi 8.1, 8.2 and 8.3, in the tab strip and in the
pinned group, with the Favorites grid on and off, in the light and dark themes. It follows the space
palette of 028 and 029 and is off when `sidebar-look.enabled` is false (028/NFR-2).

## Requirements

### Functional

- **FR-1.** The close button of an open tab SHALL show a `×` of about 10×10 px with a stroke of
  about 1 px, in the row's foreground color, at the row's inline end and vertically centered.
- **FR-2.** WHILE an open tab row is hovered away from its close button, THE button SHALL show only
  the `×` on a transparent background; WHILE the button itself is hovered, THE button SHALL show a
  badge of about 24×24 px with a radius of about 5 px behind the centered `×`, with badge and glyph
  colors taken from the theme.
- **FR-3.** The minus of a pinned row, a pinned tile, a Favorites folder row and a Favorites link
  row SHALL be a badge of about 24×24 px with a radius of about 5 px and a centered dash of about
  14×2 px, in the theme's colors. It SHALL start about 6 px from the row or tile's inline end.
- **FR-4.** The badge and the hover colors of both controls SHALL appear only while the pointer
  rests on the button itself; the glyph or dash alone SHALL appear while the row is hovered elsewhere.
- **FR-5.** WHILE a close or minus control is hidden, THE title of its row SHALL use the space up to
  the control's inset from the row's inline end. WHEN the row is hovered, THE visible control SHALL
  take its badge width plus that inset out of the title's width, and an overlong title SHALL end in
  an ellipsis before the control.
- **FR-6.** A press on the close button of an open tab SHALL keep closing that tab. A press on a
  minus SHALL keep unloading pinned tabs and closing Favorites rows as 061, 062 and 063 specify.
- **FR-7.** The behavior SHALL hold on Vivaldi 8.1, 8.2 and 8.3, in the tab strip and in the pinned
  group, with the Favorites grid on and off, and in the light and dark themes.

### Non-functional

- **NFR-1.** The colors of the badge, glyph and dash SHALL come from theme tokens and SHALL keep a
  legible contrast on the row's hover veil and active pill in every palette of 029 and 051.
- **NFR-2.** The title-space change SHALL NOT add a module, an option in `config.json`, a runtime
  dependency or a listener; it SHALL be a stylesheet change under the `sidebar-look` scope.
- **NFR-3.** The change SHALL keep the cost of at most one redraw per animation frame.
- **NFR-4.** VivArcDi SHALL never block Vivaldi; no click, close or unload behavior changes.
- **NFR-5.** Works on macOS and Debian; texts in English.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). Test names and live scenario names are exact.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE close button of an open tab SHALL show a `×` of about 10×10 px with a 1 px stroke at the row's inline end. | auto: `draws the open tab close as an Arc X` |
| AC-2 | WHILE the close button of an open tab is hovered, THE badge SHALL be about 24×24 px with a 5 px radius, and WHILE the row is hovered elsewhere, NO badge SHALL be drawn. | auto: `shows the Arc close badge only on button hover` |
| AC-3 | THE minus of a pinned row, a pinned tile and a Favorites row SHALL be a badge of about 24×24 px with a 5 px radius, a 14×2 px dash and a 6 px inset. | auto: `draws the minus badge at twenty-four pixels` |
| AC-4 | WHILE an open tab row is at rest, THE title SHALL reach the control's inset, and WHEN the row is hovered, THE title SHALL end before the visible control. | auto: `gives the title the hidden close space at rest` |
| AC-5 | WHILE a pinned row or a Favorites row is at rest, THE title SHALL reach the control's inset, and WHEN the row is hovered, THE title SHALL end before the visible minus. | auto: `gives the title the hidden minus space at rest` |
| AC-6 | WHEN the close button of an open tab is pressed, THE tab SHALL close as before, and WHEN a minus is pressed, THE pinned tab SHALL unload or the Favorites row SHALL close as before. | auto: `keeps the close and minus gestures` |
| AC-7 | WHERE `sidebar-look.enabled` is false, THE stylesheet SHALL NOT change the close button, the minus or the title width. | auto: `disabled sidebar look changes nothing` |
| AC-8 | WHEN Tore compares VivArcDi with his screenshots of 2026-11-26, THE close `×`, its badge and the minus badge SHALL look and sit as in Arc, and a hovered title SHALL give up only the space the visible control needs. | manual |

AC-1 to AC-7 are checked by reading the rendered rules and the row markup; the look of the controls
and of the ellipsis stays with the manual check of AC-8.

## Out of scope

- A new close control or a change of the close or unload action: 028, 061, 062, 063 and Vivaldi's
  own close keep their models.
- The title-space of tiles, the Favorites grid layout and the indentation of open link rows:
  001, 059, 060 and 062.
- The theme palettes themselves: 029 and 051.
- The two-line address field, the panel bar and the page frame: 028.
- Vivaldi 8.4 and later.

## Open questions

- [x] **Q-1. What happens to the title when the control appears.** Tore chose "Più spazio a riposo"
  on 2026-11-26: at rest the title uses the control's box; on row hover the visible control takes
  its badge width and inset out of the title, as in the screenshots. Making the control float over
  a never-shrinking title is rejected.
- [x] **Q-2. Which badge size the two controls use.** Tore chose "Allinea tutto a 24" on
  2026-11-26: the close badge, the minus badge and the minus dash take the sizes read from the new
  screenshots, 24×24, radius 5, dash 14×2; the 21×21 and 11×2 values of 061 are superseded.
- [x] **Q-3. When the badge is drawn.** The screenshots of 2026-11-26 show the bare glyph on row
  hover and the badge only under the pointer on the control, the rule 062/FR-2 already applies to
  the minus. The close button follows the same rule.

## References

- [028 Arc sidebar look](../028-arc-sidebar-look/spec.md): the row, its hover veil and the close
  button this spec restyles.
- [061 Pinned minus UI](../061-pinned-minus-ui/spec.md) and
  [062 Minus on hover and open-link indent](../062-minus-hover-and-indent/spec.md): the minus badge,
  its surfaces, its visibility and the open-link layout this spec keeps.
- [063 Minus closes folder link tabs](../063-minus-closes-folder-tabs/spec.md): the press of a
  Favorites row's minus this spec keeps.
- [029 Arc Light theme](../029-arc-light-theme/spec.md) and [051 More Arc themes](../051-more-themes/spec.md):
  the colors the controls follow.
- Tore's screenshots of Arc, 2026-11-26: the hovered `×`, its badge, the pinned minus and the two
  pairs of titles with and without a visible control.
- Code: `src/styles/sidebar-look.scss`, `src/styles/_minus.scss`, `src/styles/pinned.scss`,
  `src/styles/favorites.scss`, `src/styles/folders.scss`, `src/styles/_tokens.scss`.
