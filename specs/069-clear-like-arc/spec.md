# 069 Clear like Arc

| | |
|---|---|
| Status | Implemented |
| Phase | 3 |
| Owner | Tore |
| Approved | 2026-11-26 (PR #307) |
| Implemented | 2026-11-26 |
| Amended by | [071 Clear archives the active tab too](../071-clear-active-tab/spec.md) (2026-11-26): AC-10 (the live scenario `the Clear shortcut archives the Today tabs` expects the active tab to stay open) is replaced, and "Today tabs" in FR-8 and AC-7 include the active tab. |
| Supersedes | [067](../067-clear-line-and-titles/spec.md) FR-8 to FR-10 and AC-9 to AC-11 (Clear shown at rest), and the 6 px line inset of 067 FR-4, FR-5, AC-5 and AC-6. 067 FR-1 to FR-3 (nothing shows with no Today tab) and FR-6 (centered titles) stay. |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Tore recorded Arc on 2026-11-26 (screen recording `Registrazione schermo 2026-11-26 alle
17.37.03.mov`, 16 s). It shows that 067's amendment misread Arc: Arc does not show `↓ Clear` at
rest. The line above the Today tabs is a plain full line while the pointer is outside the sidebar;
`↓ Clear` fades in, muted, while the pointer is in the sidebar, and the line then stops short of it;
pointing at Clear darkens it and shows the tooltip `Clear Today tabs ⇧⌘K`. The line is aligned with
the icons and trailing icons of the rows, not with the row backgrounds. This spec makes VivArcDi
match the recording, and adds the shortcut the tooltip names: ⇧⌘K (Ctrl+Shift+K on Debian) runs Clear.

Measures read from the recording (Retina, 2 device pixels per CSS pixel; sidebar 228 px wide):

| What | Arc |
|---|---|
| Line start | the left edge of the row icons (≈ 18 px from the sidebar edge) |
| Line end at rest | the right edge of the row's trailing icon (≈ 17 px from the sidebar edge) |
| Line end with Clear shown | ≈ 10 px before the arrow of `↓ Clear` |
| Clear's right edge | the line's end at rest |
| Vertical place | midway between the last row above and `+ New Tab`, ≈ 33 px from each row center |
| Clear at rest in the sidebar | muted grey, semi-bold, small (≈ 11 px) |
| Clear pointed at | full text color, plus the tooltip `Clear Today tabs ⇧⌘K` |

## User stories

- **US-1.** As a user, I want a quiet sidebar where the line above Today is just a line until I move
  into the sidebar, so that it looks like Arc.
- **US-2.** As a user, I want `↓ Clear` to appear while I am in the sidebar and to stand out when I
  point at it, so that I find it when I need it.
- **US-3.** As a user, I want the line to line up with the icons of the rows, as in Arc.

## Expected behavior

While the workspace has a Today tab, a 1 px line sits midway between the last row above it (a
folder, a pinned row or the Favorites) and `+ New Tab`. It runs from the left edge of the row icons
to the right edge of the rows' trailing icons. While the pointer is outside the sidebar, nothing else
shows. When the pointer enters the sidebar, `↓ Clear` fades in at the right end, muted, and the line
shortens so it ends about 10 px before the arrow; when the pointer leaves the sidebar, Clear fades
out and the line grows back. Pointing at Clear, or focusing it with the keyboard, gives it the full
text color and shows the tooltip `Clear Today tabs ⇧⌘K`. A click, or the shortcut ⇧⌘K, archives the Today tabs as before
([004](../004-today-tabs-and-keyboard/spec.md), [060](../060-clear-bar-and-pinned-unload/spec.md));
with no Today tab, the shortcut does nothing; with no Today tab left, the line and Clear disappear and `+ New Tab` moves up under the rows above,
as 067 FR-1 already does.

## Requirements

### Functional

- **FR-1.** WHILE a Today tab is visible and the pointer is outside the sidebar (the tab bar column),
  THE separator SHALL
  be a full line with no Clear label.
- **FR-2.** WHILE a Today tab is visible and the pointer is inside the sidebar, THE Clear label
  SHALL show in the muted text color and THE line SHALL end about 10 px before its arrow.
- **FR-3.** WHEN the pointer is on Clear or Clear has keyboard focus, THE label SHALL use the full
  text color. THE tooltip of Clear SHALL read `Clear Today tabs ⇧⌘K` on macOS and
  `Clear Today tabs Ctrl+Shift+K` on other platforms, the platform being read as the Little Arc Keep
  label does (`navigator.platform`, `KeepLabel.isMac`).
- **FR-4.** THE line SHALL start at the left edge of the row icons and, at rest, end at the right
  edge of the rows' trailing icons; Clear's right edge SHALL sit at that same end.
- **FR-5.** THE line SHALL sit midway between the last row above it and `+ New Tab`. WHILE the
  Favorites grid is off and the tab strip holds Vivaldi's own pinned group (where `+ New Tab` sits
  above the pinned rows), THE line SHALL sit midway between the bottom of the pinned group and the
  first Today tab (Q-4).
- **FR-6.** Showing and hiding Clear SHALL fade, with the sidebar's usual transition, and the line's
  end SHALL move with it.
- **FR-8.** WHEN the user presses Cmd/Ctrl+Shift+K, in the interface or with the focus in a page,
  THE module SHALL archive the Today tabs of the workspace of the active tab in the active window by
  the same path as a click on Clear (`TodayArchive.#clear`); WHILE there is no Today tab to archive
  it SHALL do nothing. Like the other shortcuts of VivArcDi, Cmd and Ctrl are both accepted on every
  platform ([014](../014-arc-shortcuts/spec.md)).
- **FR-7.** The behavior SHALL hold on Vivaldi 8.1 to 8.3, with the Favorites grid on and off, and in
  the light and dark themes.

### Non-functional

- **NFR-1.** No new module, option or runtime dependency; `ClearSeparator` and the `today`,
  `pinned` and `sidebar-look` stylesheets.
- **NFR-2.** The hover state comes from CSS (`:hover` of the sidebar) where possible; any listener
  added runs at most one pass per animation frame.
- **NFR-3.** The action of Clear and the empty state of 067 do not change.
- **NFR-4.** The shortcut adds no module and no option: it extends the archive key handler
  (`ArchiveKeys` and the `archive-keys` page script) with a second key and a second action.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHILE the pointer is outside the sidebar, THE Clear label SHALL be hidden and the line SHALL reach its end at rest. | auto: `hides the Clear label outside the sidebar` |
| AC-2 | WHILE the pointer is inside the sidebar, THE Clear label SHALL show in the muted color and the line SHALL end before its arrow. | auto: `shows the muted Clear label while the pointer is in the sidebar` |
| AC-3 | WHEN Clear is hovered or focused, THE label SHALL use the full text color. | auto: `strengthens the Clear label when pointed at` |
| AC-4 | THE Clear control SHALL carry the tooltip `Clear Today tabs ⇧⌘K` on macOS and `Clear Today tabs Ctrl+Shift+K` elsewhere. | auto: `titles the Clear control like Arc` |
| AC-5 | THE line SHALL start at the row icons' left edge and end at the trailing icons' right edge. | auto: `aligns the Clear line with the row icons` |
| AC-6 | WHEN Tore compares VivArcDi on Vivaldi 8.3 with the recording, THE line, its place, the fade of Clear, its colors and the tooltip SHALL look and behave as in Arc, with the grid on and off, light and dark. | manual |
| AC-7 | WHEN the user presses Cmd/Ctrl+Shift+K, THE Today tabs of the workspace SHALL be archived as a click on Clear does. | auto: `clears the Today tabs on the Clear shortcut` |
| AC-8 | WHILE there is no Today tab, THE Clear shortcut SHALL archive nothing. | auto: `does nothing on the Clear shortcut without Today tabs` |
| AC-9 | WHILE the Favorites grid is off and the tab strip holds a pinned group, THE line SHALL sit midway between the pinned group and the first Today tab. | auto: `puts the Clear line below a native pinned group when the Favorites grid is off` |
| AC-10 | WHEN the user presses Cmd+Shift+K in a lab Vivaldi with two Today tabs, THE inactive Today tab SHALL be archived and the active and pinned tabs SHALL stay open. | live: `the Clear shortcut archives the Today tabs` |

AC-6 becomes a live check with a scenario that measures the line's ends and center against the rows,
once the implementation adds it.

## Out of scope

- The Clear action, the archive and its panel: 004, 060.
- The empty state and the centered titles: 067 FR-1 to FR-3 and FR-6, unchanged.
- Arc's other sidebar sections and the Incognito header's Clear (013).

## Open questions

- [x] **Q-1. What "in the sidebar" means.** The recording shows Clear while the pointer is anywhere
  in the sidebar near Today, including on `+ New Tab`, and never while it is outside. Proposal: the
  whole tab bar column (`:hover` on the tab bar container), the simplest rule that matches every
  frame. Answered (Tore, 2026-11-26): correct, exactly so: the hover of the whole tab bar column.
- [x] **Q-2. The `⇧⌘K` shortcut.** VivArcDi has no Clear shortcut today. Proposal: the tooltip reads
  `Clear Today tabs` now and the shortcut is its own spec. Answered (Tore, 2026-11-26): changed, add
  the shortcut in this spec. ⇧⌘K (Ctrl+Shift+K on Debian) runs the Clear command: it archives the Today
  tabs of the workspace exactly as clicking Clear does; with no Today tab it does nothing; the tooltip
  reads `Clear Today tabs` with the shortcut (FR-3, FR-8).
- [x] **Q-3. Exact numbers.** Proposal: the design takes the icon edges from the existing row tokens
  (row inset plus row padding) rather than fixed pixels, and the lab probe checks the 10 px gap and
  the midway place within 1 px. Answered (Tore, 2026-11-26): perfect, tokens and a probe within 1 px.
  The lab probe on Vivaldi 8.3 found the line 0 px off midway in the four layouts (grid on and off,
  with and without a pinned tab); the line starts 12 px from the bar edge and sits 19 px from each
  row center, because Vivaldi's rows are 36 px with a 2 px gap, where Arc's are taller.
- [x] **Q-4. The line with the grid off and a pinned tab.** Found by the T2 probe: Vivaldi then puts
  `+ New Tab` above its own pinned group, and one offset put the line inside the group. Answered
  (Tore, 2026-11-26): the line sits midway between the pinned group and the first Today tab (FR-5,
  AC-9). Moving `+ New Tab` below the pinned rows as in Arc is out of scope.

## References

- [067 Clear line, its inset and centered titles](../067-clear-line-and-titles/spec.md)
- [004 Today tabs and keyboard](../004-today-tabs-and-keyboard/spec.md) FR-5,
  [060 Clear bar and pinned tile unload](../060-clear-bar-and-pinned-unload/spec.md),
  [014 Arc shortcuts](../014-arc-shortcuts/spec.md), the home of the Arc shortcuts, where
  Cmd/Ctrl+Shift+A and Cmd/Ctrl+Shift+C already live; the design and tasks are in
  [design.md](design.md) and [tasks.md](tasks.md)
- `src/modules/today/ClearSeparator.ts` (title `Archive the Today tabs of this workspace`),
  `src/styles/today.scss` (Clear row and label), `src/styles/sidebar-look.scss`,
  `src/styles/_tokens.scss` (`$gap`, `$folders-padding`)
