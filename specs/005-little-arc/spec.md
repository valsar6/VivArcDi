# 005 Little Arc

| | |
|---|---|
| Status | Approved |
| Phase | 5 |
| Owner | Tore |
| Approved | 2026-11-08 |
| Change request | 2026-11-09, the look of the window (section Look, FR-11 to FR-17, AC-15 to AC-24): Approved 2026-11-09 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Little Arc is a small, minimal browser window for a quick lookup: a search, a movie time, a link
someone sent you. It opens on its own, apart from the main window with its sidebar and workspaces,
and it is closed and forgotten as fast as it opened. If the page turns out to be worth keeping, one
action moves it into a workspace as a normal tab. In practice it is a Peek that stands on its own,
not tied to the page underneath (confirmed with Tore on 2026-11-08). This spec replaces the earlier
draft "Little Arc and extras": the Mini Player is no longer part of it (see Out of scope).

## Sources

What follows is split by origin, so that nobody mistakes a guess for a fact.

**From the reviews** (files in the project folder `recensioni/`):

| Claim | Review |
|---|---|
| Opens with Cmd+Opt+N, from any app (Slack named as an example) | `1cQlDFwE-Z0` 1:19, `Kc5GuEeZBZk` 9:04, `VZKHS0gBLts` 9:40 |
| A smaller, simpler window for a quick search: open, research, close | `Kc5GuEeZBZk` 9:08, `TffkMbgsE2E` 4:08 |
| You start typing a site name and get a mini browser with almost no UI | `VZKHS0gBLts` 9:47 |
| It keeps unimportant tabs out of the main window ("prevents tab hoarding") | `VZKHS0gBLts` 9:40, `aq13trnsgq4` 2:56 |
| With Arc as the default browser, links opened from other apps (Obsidian, Zoom) open in Little Arc | `TffkMbgsE2E` 4:22, `aq13trnsgq4` 2:56 |
| Handy while taking notes in another app | `TffkMbgsE2E` 4:18 |

**Look of the window, from the reviews** (frames in the project folder `little-arc/look/`):

| Claim | Review |
|---|---|
| Cmd+Opt+N first shows a dark floating command bar with suggestions; after Enter the window appears with a white page area, then the page loads | `VZKHS0gBLts` 9:46 to 9:49, `TffkMbgsE2E` 4:14 to 4:17 |
| One bar above the page: window buttons, a wide address pill with a search icon and the domain in the middle, a link icon in the pill, and on the right a button "Open in *Space* ⌘O" with a small arrow | `VZKHS0gBLts` 9:49 and 9:53, `TffkMbgsE2E` 4:22 |
| A back arrow "‹" between the window buttons and the pill once the page has navigated | `TffkMbgsE2E` 4:22 |
| The bar takes the color of the Space: light pink with dark text in a light Space, dark grey with light text in a dark one | `VZKHS0gBLts` 9:53, `TffkMbgsE2E` 4:22 |
| The page sits in a thin frame with rounded corners, inside a window with macOS corners and shadow | `VZKHS0gBLts` 9:49, `TffkMbgsE2E` 4:22 |

Tore's recording `Registrazione schermo 2026-11-09 alle 00.58.54.mov` (32 seconds) shows Arc's main
window only: the Little Arc window never appears in it, so it is not a source for the look. It does
show the frame of Arc's main window: about 9 px of the Space color around the page, page corners of
about 5 px.

**From the earlier draft of this spec, not in any review**: moving the page to a workspace with a
button or Cmd/Ctrl+O, and closing untouched windows after six hours.

**From general knowledge of Arc, not verified here**: in Arc the moved page lands in a Space the
user can pick, and the window has a compact address field with the usual window controls. Treat these
as intentions to confirm with Tore, not as observed behavior.

## User stories

- **US-1.** As a user, I want a shortcut that opens a small window with the address field ready, so
  that I can look something up without touching my workspaces.
- **US-2.** As a user, I want links I click in other apps (Mail, Slack, Obsidian) to open in that
  small window, so that a quick lookup does not clutter my tabs.
- **US-3.** As a user, I want to move the page into a workspace when I decide to keep it, and to
  close the window without a trace when I do not.

## Expected behavior

**Opening.** The shortcut Cmd+Opt+N (Ctrl+Alt+N on Debian) opens a Little Arc window with the address
field focused. Typing a site name or a search and pressing Enter loads the page, like Arc's
command bar. Links opened from another app open in the same kind of window, already loading. Vivaldi's Notes panel uses the same key on its own, so `shortcuts apply` of [014](../014-arc-shortcuts/spec.md) removes it from that command (checked by Tore on 2026-11-08).

**The window.** It is small, about a third of a screen, and has no tab bar, no panels and no
workspace switcher. It has one compact bar with back, the address field and one button,
**Open in *workspace***, laid out as described in Look. Navigation inside it stays in it. It is a real, fully working Vivaldi window,
so extensions, passwords and cookies behave as in any other.

### Look

Little Arc looks like Arc's: one slim bar above the page, in the color of the workspace, and the page
in a thin frame of the same color. Change request of 2026-11-09: Tore liked the behavior of version 1
but not its look (white field, a plain button, the window buttons over Back and Reload).

- **One bar.** A single bar of about 40 px sits at the top of the window. Nothing else is above the
  page: Vivaldi's own title and extension row of the popup are hidden. The bar can be dragged to move
  the window, like a title bar.
- **Window buttons.** The macOS window buttons stay where macOS draws them, at the left end of the bar.
  The bar keeps that space free, so no control lies under them. On Debian the bar keeps free the place
  where Vivaldi draws its window buttons.
- **Back.** A back arrow "‹" follows the window buttons once the page has navigated inside the window;
  before that it is not shown. There is no reload button: Cmd/Ctrl+R reloads, as in any window.
- **Address pill.** A wide rounded pill takes the middle of the bar, a shade lighter than the bar, with
  a search icon on its left. When a page is loaded it shows the host of the page in the middle, without
  `www.`, for example `weather.com`. A click selects the full address for editing; Enter loads what
  was typed, Esc puts the host back (or closes the window, as before, when the field is empty). While
  the window is empty the pill has the cursor and shows the placeholder "Search or Enter URL…".
- **Open in *workspace*.** On the right, a rounded button reads "Open in" followed by the name of the
  destination workspace in bold and the shortcut, "⌘O" on macOS and "Ctrl+O" on Debian. When the name
  is unknown it reads "Open in workspace". It does what Move to workspace did.
- **Page frame.** The page sits inside a frame of the bar's color, about 6 px on the left, right and
  bottom, with corners of about 8 px. While a page loads, the page area shows the page's own
  background (white in most cases) and the pill already shows the host.
- **Colors.** The bar, the frame and the pill take the colors of the destination workspace
  ([019](../019-space-theme-color/spec.md)), or the default palette `arclight`
  ([029](../029-arc-light-theme/spec.md)) when it has none. In dark mode they use the dark values, with
  light text, as the tab bar does ([028](../028-arc-sidebar-look/spec.md)).

Where Arc and VivArcDi differ: Arc first shows a floating command bar with suggestions and only then the
window; VivArcDi opens the window at once with the cursor in the pill and no suggestions. The window's
corners, shadow and opening animation are the system's. The link icon, the arrow next to "Open in" and
the profile label of Arc's bar are not part of this change (see open questions).

**Keeping the page.** **Open in *workspace*** (called **Move to workspace** before the change
request of 2026-11-09), or Cmd/Ctrl+O as in [Peek](../002-peek/spec.md), moves
the page to a tab of a workspace in the main window and closes Little Arc. The destination is the
most recent workspace, or one chosen from a short list (see open questions). The tab keeps its
history and state, as a tab moved between windows does.

**Closing.** Esc with the address field empty, and Cmd/Ctrl+W, close the window and discard the page.
A Little Arc window nobody touched for six hours closes by itself. Little Arc windows never appear in
the workspaces and never count as a tab of the main window.

Where Arc and VivArcDi deliberately differ: the shortcut is a Vivaldi shortcut first. Working from
inside another app (the "any app" of the reviews) depends on an operating system hook, see the open
questions.

## Requirements

### Functional

- **FR-1.** A `little-arc` module opens a minimal window on the shortcut `Cmd+Opt+N` / `Ctrl+Alt+N`,
  with the address field focused.
- **FR-2.** Text typed in the address field is a URL when it looks like one and a search with the
  default search engine otherwise.
- **FR-3.** WHERE `externalLinks` is on, a link opened from another app opens in a Little Arc window
  instead of a tab of the main window. The module recognizes it as a tab with no opener, active, with
  an `http` or `https` address, created within 100 ms after a window focus event that followed a "no window
  focused" event, which means the application was in the background (probes of 2026-11-08). The tab is moved into the new window, so
  the page is not loaded twice.
- **FR-4.** The window shows no tab bar, panels or workspace switcher, only the compact bar of
  Expected behavior and Look. Vivaldi's `popup` window has no address field, so the module adds the compact
  bar itself (see the probe results).
- **FR-5.** The Open in button and Cmd/Ctrl+O move the page to a new tab of the destination workspace
  of FR-6, activate it and close the Little Arc window.
- **FR-6.** The destination is the most recently used workspace of the main window. WHERE
  `askWorkspace` is on, a list of workspaces replaces the shortcut and the user picks one.
- **FR-7.** Esc in an empty address field, and Cmd/Ctrl+W, close the window and the page with it.
- **FR-8.** A Little Arc window left untouched for `idleCloseHours` hours is closed. `0` disables it.
- **FR-9.** If the main window is closed when the page is moved, the module opens one first.
- **FR-10.** Options in `config.json`: `enabled` (true), `externalLinks` (true), `askWorkspace`
  (false), `idleCloseHours` (6), `widthPercent` (34), `heightPercent` (60) of the screen.

- **FR-11.** The bar is one row of about 40 px at the top of the window, with, from left to right:
  the free space for the window buttons, back, the address pill and the Open in button. Vivaldi's own
  title and extension row of the popup are hidden. The empty parts of the bar move the window.
- **FR-12.** No control of the bar lies under the window buttons of macOS or of Vivaldi on Debian.
- **FR-13.** While the field does not have the focus, the pill shows the host of the page without a
  leading `www.`; it shows the placeholder "Search or Enter URL…" when there is no `http(s)` page. With
  the focus it shows the full address, selected.
- **FR-14.** The back button shows only after the page has navigated inside the window.
- **FR-15.** The Open in button reads "Open in" with the name of the destination workspace of FR-6 and
  the shortcut of the platform, or "Open in workspace" when the name is unknown.
- **FR-16.** The page sits in a frame of the bar's color, about 6 px wide, with corners of about 8 px.
- **FR-17.** Bar, frame and pill use the colors of the destination workspace (019) or the default palette
  (029), with dark values in dark mode; sizes and colors live in `_tokens.scss`.

### Non-functional

- **NFR-1.** The window appears in under 500 ms after the shortcut, before the page loads.
- **NFR-2.** IF the window cannot be created or the external link cannot be recognized, THEN the
  link opens as Vivaldi would have opened it, and the error is logged.
- **NFR-3.** Turning the module off restores Vivaldi's default handling of links and of the shortcut.
- **NFR-4.** No extra permission or background process is needed for the in-Vivaldi behavior. Any
  OS-level piece (global shortcut) is opt-in and removed by `uninstall`.
- **NFR-5.** Works on macOS and Debian.
- **NFR-6.** The Peek key handling and the "page to tab" move are reused, not rewritten (DRY).

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user presses Cmd+Opt+N (Ctrl+Alt+N on Debian), THE module SHALL open a minimal window with the address field focused. | manual |
| AC-2 | THE Little Arc window SHALL show no tab bar, no panels and no workspace switcher. | manual |
| AC-3 | WHEN the user types a site name or a search and presses Enter, THE window SHALL load the matching page. | manual |
| AC-4 | THE address resolver SHALL turn text that looks like a URL into a URL and any other text into a search. | auto: `address resolver tells URLs from searches` |
| AC-5 | WHEN a link is opened from another app and `externalLinks` is on, THE link SHALL open in a Little Arc window. | manual |
| AC-6a | THE external link detector SHALL accept an active tab with no opener and an `http(s)` address that appears as the app regains focus. | auto: `external link detector accepts a link that wakes the app` |
| AC-6b | THE external link detector SHALL reject tabs with an opener, inactive tabs, new-tab pages and tabs created while the app was already in front. | auto: `external link detector rejects tabs that are not external links` |
| AC-6 | WHERE `externalLinks` is off, THE module SHALL leave external links to Vivaldi. | auto: `little arc ignores external links when disabled` |
| AC-7 | WHEN the user presses the Open in button or Cmd/Ctrl+O, THE page SHALL become the active tab of the destination workspace and the window SHALL close. | manual |
| AC-8 | THE destination picker SHALL choose the most recent workspace unless `askWorkspace` is on. | auto: `destination picker defaults to the most recent workspace` |
| AC-9 | WHEN the user presses Cmd/Ctrl+W, or Esc in an empty address field, THE window SHALL close and no tab SHALL be created. | manual |
| AC-10 | WHEN a window has been untouched for `idleCloseHours`, THE module SHALL close it. | auto: `idle timer closes untouched windows` |
| AC-11 | WHERE `idleCloseHours` is 0, THE module SHALL never close a window by itself. | auto: `idle timer is off when set to zero` |
| AC-12 | IF the window cannot be created, THEN THE link SHALL open as without VivArcDi. | auto: `little arc falls back to the default action when the window fails` |
| AC-13 | WHEN the module stops, THE module SHALL remove its listeners and restore the default handling. | auto: `little arc module cleans up on stop` |
| AC-14 | WHEN the main window is closed and the user moves a page, THE module SHALL open a main window and put the tab in it. | manual |
| AC-15 | THE Little Arc window SHALL show one bar above the page and no other row: no Vivaldi title and no extension row. | manual |
| AC-16 | THE window buttons SHALL not overlap any control of the bar, on macOS and on Debian. | manual |
| AC-17 | WHEN the user drags an empty part of the bar, THE window SHALL move. | manual |
| AC-18 | THE address display SHALL show the host of an `http(s)` page without a leading `www.`, and nothing for any other address. | auto: `address display shows the host of a loaded page` |
| AC-19 | WHEN the user clicks the address pill, THE pill SHALL show the full address selected, and WHEN the user presses Esc with text in it, THE pill SHALL show the host again. | manual |
| AC-20 | THE back button state SHALL be hidden until the page navigates inside the window, and shown after. | auto: `back button appears after the first navigation` |
| AC-21 | THE keep label SHALL read "Open in" with the workspace name and the platform shortcut, or "Open in workspace" without a name. | auto: `keep label names the destination workspace` |
| AC-22 | THE page SHALL sit in a frame of the bar's color of about 6 px with rounded corners, and the bar, frame and pill SHALL take the destination workspace's colors. | manual |
| AC-23 | WHILE Vivaldi is in dark mode, THE bar SHALL use the dark values with light text, and the text SHALL stay readable in both modes. | manual |
| AC-24 | WHEN the user presses Cmd/Ctrl+R in a Little Arc window, THE page SHALL reload. | manual |

## Out of scope

- The **Mini Player** (controls for media playing in a tab you left). It was in the earlier draft.
  Vivaldi already has media controls in its own UI, and it is a separate feature: it will get its own
  spec once Tore decides whether it is wanted.
- The optional browser extension of the earlier draft: no feature needing an MV3 extension was found.
- Air Traffic Control beyond Vivaldi's workspace rules.
- Easels, Notes, Boosts, Library, sharing.
- Several Little Arc windows merged into one, or a tab strip inside the window.
- A global shortcut that works with Vivaldi closed or in the background (see open questions).

## Probe results

Tore ran the probe on Vivaldi 8.2 for macOS on 2026-11-08.

- **External links.** Two links opened from other apps, one from a news site and one from a bank
  e-mail, produced no new window: each was a new tab in the last active window, `opener` empty,
  `active` true, an `http(s)` host, and a window focus event within a few milliseconds of the
  tab (first case: focus back from "no window" 40 ms before; second: 2 ms after). Links Tore
  opened from inside Vivaldi had the opener set and `active` false. So a detector is feasible
  with those signals. A second run confirmed it with two more links (a tracking link and a
  newsletter link): in both the application was in the background (focus on "no window"), then a
  window got focus, and the tab appeared 2 to 41 ms later, in the main window even though a popup
  was the last focused window. Not yet proven: Vivaldi minimized, and telling apart other tabs with
  no opener (new tab page, bookmarks, Quick Commands, link tabs of 009, Expand of Peek), which the
  detector must reject by address and by the missing background event. Vivaldi already in front
  cannot happen for a link clicked in another app, because that app comes to the front first.
- **Popup window.** `windows.create({ type: 'popup' })` made a window of the requested size with
  rounded corners, the traffic lights, the page title in the title bar, the extension icons row
  and the theme colour. It has **no address field, no back or reload, no tab bar**. It is minimal
  as Little Arc wants, but it cannot take a typed address by itself. The interface document of
  the popup is a `window.html` of 700x500 with `#browser`, the VivArcDi styles loaded (11 links) and
  one text field, so the module runs there and can add its compact bar.

## Open questions

- [x] **"From any app".** Decided 2026-11-08: version 1 is the shortcut inside Vivaldi plus external
  links. The global shortcut is a follow-up that uses an operating system hook set up by the
  installer ([016](../016-plug-and-play-installer/spec.md)), opt-in and removed by `uninstall`.
- [x] **Default for `externalLinks`.** On, with the option as the off switch.
- [x] **Destination workspace.** Always the most recent workspace. The picker (`askWorkspace`) stays
  as an option, off.
- [x] **Six hours.** Kept, as the option `idleCloseHours`.
- [x] **Window size.** Kept: a third of the screen wide by 60% high.
- [x] **Mini Player.** A separate feature, with its own spec later.
- [x] **Folder name.** `005-little-arc` accepted.
- [x] **Recognizing external links.** Feasible (see Probe results), with the detector of FR-3.
- [x] **Compact bar in the popup.** Yes: the mod runs in the popup's interface (see Probe results).
  The module adds the address field, back, reload and Move to workspace button there. The fallback
  of a normal window with the interface hidden stays for Vivaldi versions where this breaks.
- [x] **Flicker.** The tab shows in the main window for a moment before moving into Little Arc.
  Proposal: accept it in version 1 and measure it on the manual check; hiding it needs a
  different interception that this probe cannot show.
- [x] **Detector, minimized case.** Vivaldi minimized when the link arrives. Proposal: check it on
  the manual verification of the implementation, with the detector logging what it saw.

### Change request of 2026-11-09 (look)

- [x] **No reload button.** Arc's bar has none. Proposal: no button; Cmd/Ctrl+R reloads (AC-24).
- [x] **Colors.** Proposal: the destination workspace's colors (019), the default palette `arclight`
  otherwise. Alternative: always the default palette.
- [x] **Arrow next to "Open in".** In Arc it seems to offer other Spaces (guess, not seen open).
  Proposal: not in this change; the `askWorkspace` option stays the way to choose.
- [x] **Link icon and profile label in the pill.** Arc shows a link icon (probably copy link, not seen
  used) and, in one review, a profile label "Default". Proposal: not in this change.
- [x] **Command bar first.** Arc opens a floating command bar with suggestions and the window only after
  Enter. Proposal: not in this change; the window opens at once with the cursor in the pill.
- [x] **Window size.** In the reviews the window looks larger than a third of the screen (guess, the
  videos are zoomed). Proposal: keep `widthPercent` 34 and `heightPercent` 60.
- [x] **Source.** Tore's recording of 2026-11-09 does not show the Little Arc window. Proposal: the
  review frames are enough; Tore compares with his Arc on the manual check.

Tore approved every proposal on 2026-11-09.

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), sections "Little Arc" and
  "Altre feature distintive".
- [Strategy and roadmap](https://claude.ai/artifact/4JHR28H3euKSPbQZPNhY38), phase 5.
- [002 Peek](../002-peek/spec.md) and [015 Peek for new-tab links](../015-peek-new-tab-links/spec.md):
  keys, Expand and the page-to-tab move to reuse.
- [012 Editable folders](../012-editable-folders/spec.md) and [011 Space header](../011-space-header/spec.md):
  where the moved tab lands.
- Review files: `1cQlDFwE-Z0`, `Kc5GuEeZBZk`, `aq13trnsgq4`, `VZKHS0gBLts`, `TffkMbgsE2E`.
