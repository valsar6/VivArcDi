# 067 Clear line, its inset and centered titles

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-26 (PR #298); amendment approved 2026-11-26 (PR #303) |
| Implemented | 2026-11-26 |
| Superseded in part by | [069](../069-clear-like-arc/spec.md): FR-8 to FR-10 and AC-9 to AC-11 (Clear at rest), and the 6 px line inset of FR-4, FR-5, AC-5 and AC-6. FR-1 to FR-3, FR-6 and AC-1 to AC-4 and AC-7 stay. |
| Amends | [060](../060-clear-bar-and-pinned-unload/spec.md) FR-1: the Clear control keeps a non-zero box only while the workspace has a Today tab. It also refines the divider with Clear of [004](../004-today-tabs-and-keyboard/spec.md) FR-5 and [028](../028-arc-sidebar-look/spec.md) FR-5, and the title of the row of 028. FR-8 supersedes the hover-only Clear of 004/FR-5 and 060/AC-12. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Tore compared VivArcDi on Vivaldi 8.3 with Arc (2026-11-26) and found three differences. First, with
no Today tab in the workspace Arc shows no separator line and no "↓ Clear"; it shows only "+ New Tab"
under the folders, while VivArcDi still draws a line. Second, the line with "↓ Clear" runs the full
width of the strip, while Arc aligns it with the sidebar rows, with Clear at the right end of the
line. Third, Today tab titles are not vertically centered in their 36 px rows.

No spec describes any of the three. 060/FR-1 says the Clear control "SHALL have a non-zero box
whenever the tab bar is shown", so the first change amends it. This spec states the three behaviors
and leaves Clear itself as 004 and 060 define it.

What the code does today:

- `ClearSeparator.sync()` (`src/modules/today/ClearSeparator.ts:87-100`) already removes its own
  Clear row when there is no Today slot. The line that stays is most likely the native
  pinned-last border of `src/styles/pinned.scss:3-8` (`border-bottom: 1px`, `padding-bottom` and
  `margin-bottom` of `$separator-gap`), which nothing hides when Today is empty.
- `ClearSeparator.#line()` (`:144-150`) draws `data-vivarcdi-clear-line` only when no visible
  `[data-vivarcdi-pinned-last]` exists.
- `src/styles/today.scss:142-190` places the Clear row, its line and its button with
  `inset-inline: 0`, the full strip width, not the 6 px inset (`$folders-padding`,
  `src/styles/_tokens.scss:39`) the New Tab row uses.
- `src/styles/sidebar-look.scss:60-88` gives the rows `height: $row-height` (36 px) and the `.title`
  only color, size and weight; nothing centers `.tab-header` or `.title` vertically.

## User stories

- **US-1.** As a user coming from Arc, I want no separator line and no Clear while I have no Today
  tab, so that "+ New Tab" sits right under my folders.
- **US-2.** As a user, I want the line and Clear to come back as soon as a Today tab opens, so that I
  can still archive my tabs.
- **US-3.** As a user, I want the line to start and end where the rows start and end, with Clear at
  its right end, so that the sidebar reads as one column.
- **US-4.** As a user, I want every Today title centered in its row, so that the list looks as in Arc.

## Expected behavior

**No Today tab.** WHILE the workspace has no visible Today tab, VivArcDi shows no separator line
(neither the native pinned-last border nor the Clear line) and no Clear control, and the space of
the line is not reserved, so the New Tab row follows the folders as in Arc. WHEN a Today tab appears,
the line and Clear appear, with the pinned-last border or the Clear line as 004, 028 and 050 say.
Pinned tiles, folders and rows of pinned tabs are not touched.

**Inset.** The Clear row, its line and its button start and end at the inline inset of the sidebar
rows, 6 px (`$folders-padding`), and Clear sits at the right end of the line. The pinned-last border
shown when pinned rows are visible uses the same inset.

**Centered titles.** A Today tab's title is centered vertically in its 36 px row, as in Arc: the
vertical center of the title box is within 1 px of the center of the row.

## Requirements

### Functional

- **FR-1.** WHILE the workspace has no visible Today tab, THE module SHALL show no Clear control and
  no separator line, and SHALL NOT reserve the line's gap or border. This amends 060/FR-1.
- **FR-2.** WHEN a Today tab becomes visible, THE separator line and Clear SHALL appear again, and
  WHEN the last one is closed, archived or hidden, they SHALL disappear, at most one frame later.
- **FR-3.** Only a visible Today slot SHALL count as a Today tab; a tab hidden by a folder and a
  linked tab SHALL NOT count, as `ClearSeparator` counts today.
- **FR-4.** The Clear row, its line and its button SHALL share the horizontal inset of the sidebar
  rows, `$folders-padding` (6 px), with Clear at the right end of the line.
- **FR-5.** The pinned-last border drawn while pinned rows are visible SHALL use the same inset.
- **FR-6.** The title of a Today tab SHALL be vertically centered in its row, within 1 px.
- **FR-8.** WHILE a Today tab is visible, THE Clear label (`↓ Clear`) SHALL show at rest, without
  hover, as in Arc. This supersedes the hover-only Clear of 004/FR-5 and 060/AC-12; the action of
  Clear does not change.
- **FR-9.** THE separator line SHALL run from the left inset of the rows to just before the Clear
  label, end with a gap before the arrow, and sit on the label's vertical center, as in Arc.
- **FR-10.** THE line and the label SHALL use Arc's look: a 1 px line in the sidebar line color, and
  a muted, semi-bold label of the sidebar's small text size, with stronger contrast on hover and
  focus.
- **FR-7.** The behavior SHALL hold on Vivaldi 8.1, 8.2 and 8.3, with the Favorites grid on and off,
  and in the light and dark themes.

### Non-functional

- **NFR-1.** The change SHALL NOT add a module, an option in `config.json`, a runtime dependency or
  a listener; it uses `ClearSeparator` and the `sidebar-look` and `today` stylesheets.
- **NFR-2.** The hiding SHALL cost at most one pass per animation frame.
- **NFR-3.** VivArcDi SHALL never block Vivaldi; the action of Clear (004, 060) does not change.
- **NFR-4.** Works on macOS and Debian; texts in English.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria). Test names are exact; a `manual` criterion
becomes `live:` with its scenario when the implementation adds one.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHILE the workspace has no visible Today tab, THE module SHALL show no Clear row and no separator line mark. | auto: `hides the Clear line while there is no Today tab` |
| AC-2 | WHILE the workspace has no visible Today tab, THE native pinned-last border and its gap SHALL NOT be drawn. | auto: `hides the pinned-last border while there is no Today tab` |
| AC-3 | WHEN a Today tab becomes visible, THE Clear row and the line SHALL appear again. | auto: `shows the Clear line when a Today tab opens` |
| AC-4 | WHERE the only Today slots are hidden by a folder or linked, THE module SHALL treat the workspace as having no Today tab. | auto: `ignores hidden and linked tabs for the Clear line` |
| AC-5 | THE Clear row, its line and its button SHALL use an inline inset of 6 px, with Clear at the right end. | auto: `insets the Clear line like the rows` |
| AC-6 | WHILE pinned rows are visible, THE pinned-last border SHALL use the same 6 px inset. | auto: `insets the pinned-last border like the rows` |
| AC-7 | THE title of a Today tab SHALL be vertically centered in its row. | auto: `centers the Today title in its row` |
| AC-9 | WHILE a Today tab is visible, THE Clear label SHALL be shown at rest, without hover. | auto: `shows the Clear label at rest` |
| AC-10 | THE separator line SHALL end before the Clear label and SHALL be vertically centered on it. | auto: `ends the Clear line before its label` |
| AC-11 | WHEN the pointer rests on Clear or it has keyboard focus, THE label SHALL show with stronger contrast than at rest. | auto: `strengthens the Clear label on hover` |
| AC-8 | WHEN Tore compares VivArcDi on Vivaldi 8.3 with Arc, THE empty-Today sidebar, the line with its Clear and the Today titles SHALL look and sit as in Arc. | manual |

AC-1 to AC-7 read the module's marks and the stylesheet rules. The measures (line inset equal to the
row inset within 1 px, title center within 1 px of the row center, no line with zero Today tabs) are
proposed as future `live:` checks on a lab Vivaldi; until then AC-8 covers them.

## Out of scope

- The Clear action, archiving and its keyboard behavior: 004 and 060.
- The look of pinned tiles and of the unload minus: 059, 060 to 062, 066.
- The pinned group of Vivaldi 8.3: 058.
- Title widths and the close control: 066.
- Vivaldi 8.4 and later.

## Open questions

- [x] **Q-1. What is hidden with no Today tab.** Proposal: the native pinned-last border and the Clear
  line, and also the gap and margin they reserve, so New Tab sits right under the folders as in Arc.
  The alternative hides only the drawn line and keeps the gap. Answered (Tore, 2026-11-26): the proposal.
- [x] **Q-2. What counts as "no Today tab".** Proposal: only visible Today slots count, as
  `ClearSeparator` already does; hidden-by-folder and linked tabs do not (FR-3). Answered (Tore, 2026-11-26): the proposal.
- [x] **Q-3. Does the inset apply to the line when pinned rows show it.** Proposal: yes, one inset
  of 6 px for both lines (FR-5). Answered (Tore, 2026-11-26): the proposal.

- [x] **Q-4. The gap and the label's look.** Tore asked for the exact look of Arc's line (screenshot of
  2026-11-26 16:36). Proposal: the line ends 8 px before the arrow; the label is 11 px, weight 600,
  in the sidebar's muted text color at rest and the full text color on hover; the arrow and the word
  keep 4 px between them. The design measures Arc's screenshot and the lab, and adjusts within 1 px. Answered (Tore, 2026-11-26): the proposal.
- [x] **Q-5. One line or two.** With the Favorites grid off the visible line is today the pinned-last
  border (FR-5), and the Clear row draws no line of its own, so the line could not stop before the
  label. Proposal: while a Today tab is visible, the Clear row always draws the only separator line
  (FR-9) and the pinned-last line is not drawn; with no Today tab both stay hidden (FR-1). FR-5 and
  AC-6 then apply to that single line. In Arc the line sits between the folders and Today whether or
  not pinned tabs exist. Answered (Tore, 2026-11-26): the proposal.
- [x] **Q-6. Hover state.** Proposal: keep a hover state (FR-10, AC-11) so the label still reads as a
  button; if Arc shows none, drop AC-11 and FR-10's last clause. Answered (Tore, 2026-11-26): the proposal.

## References

- [004 Today tabs and keyboard](../004-today-tabs-and-keyboard/spec.md) FR-5 and
  [028 Arc sidebar look](../028-arc-sidebar-look/spec.md) FR-5: the divider with Clear and the rows.
- [050 Tab strip gap](../050-tab-strip-gap/spec.md) FR-4, AC-5, AC-6: the separator hides only while no
  pinned tab is visible.
- [058 Pinned tabs on Vivaldi 8.3](../058-pinned-tabs-83/spec.md) and
  [060 Clear bar and pinned tile unload](../060-clear-bar-and-pinned-unload/spec.md) FR-1: the
  Clear placement this spec amends.
- Tore's comparison with Arc screenshots, 2026-11-26, Vivaldi 8.3.
- Code: `src/modules/today/ClearSeparator.ts`, `src/shared/tabs/TabBarMarks.ts`,
  `src/styles/pinned.scss`, `src/styles/today.scss`, `src/styles/sidebar-look.scss`,
  `src/styles/_tokens.scss`.
- Existing checks: `tests/modules/today/ClearSeparator.test.ts` and the live scenario
  `the Clear bar keeps a box above Today with the Favorites grid on`
  (`tests/live/scenarios/the-clear-bar-keeps-a-box-above-today.live.ts`); the implementation must
  update the scenario to the amended 060/FR-1.

Refer to a criterion from elsewhere as `<spec number>/<id>`, for example `001/AC-4`.

## Sources

- [Arc: features and behaviors to replicate](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr)
- [VivArcDi: strategy and roadmap](https://claude.ai/artifact/4JHR28H3euKSPbQZPNhY38)
- [Spec-driven development](https://www.thebcms.com/blog/spec-driven-development/)
