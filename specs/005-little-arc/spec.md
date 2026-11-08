# 005 Little Arc

| | |
|---|---|
| Status | Approved |
| Phase | 5 |
| Owner | Tore |
| Approved | 2026-11-08 |

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
command bar. Links opened from another app open in the same kind of window, already loading.

**The window.** It is small, about a third of a screen, and has no tab bar, no panels and no
workspace switcher. It has one compact bar with back, reload, the address field and one button,
**Move to workspace**. Navigation inside it stays in it. It is a real, fully working Vivaldi window,
so extensions, passwords and cookies behave as in any other.

**Keeping the page.** **Move to workspace**, or Cmd/Ctrl+O as in [Peek](../002-peek/spec.md), moves
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
  Expected behavior. Vivaldi's `popup` window has no address field, so the module adds the compact
  bar itself (see the probe results).
- **FR-5.** Move to workspace and Cmd/Ctrl+O move the page to a new tab of the destination workspace
  of FR-6, activate it and close the Little Arc window.
- **FR-6.** The destination is the most recently used workspace of the main window. WHERE
  `askWorkspace` is on, a list of workspaces replaces the shortcut and the user picks one.
- **FR-7.** Esc in an empty address field, and Cmd/Ctrl+W, close the window and the page with it.
- **FR-8.** A Little Arc window left untouched for `idleCloseHours` hours is closed. `0` disables it.
- **FR-9.** If the main window is closed when the page is moved, the module opens one first.
- **FR-10.** Options in `config.json`: `enabled` (true), `externalLinks` (true), `askWorkspace`
  (false), `idleCloseHours` (6), `widthPercent` (34), `heightPercent` (60) of the screen.

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
| AC-7 | WHEN the user presses "Move to workspace" or Cmd/Ctrl+O, THE page SHALL become the active tab of the destination workspace and the window SHALL close. | manual |
| AC-8 | THE destination picker SHALL choose the most recent workspace unless `askWorkspace` is on. | auto: `destination picker defaults to the most recent workspace` |
| AC-9 | WHEN the user presses Cmd/Ctrl+W, or Esc in an empty address field, THE window SHALL close and no tab SHALL be created. | manual |
| AC-10 | WHEN a window has been untouched for `idleCloseHours`, THE module SHALL close it. | auto: `idle timer closes untouched windows` |
| AC-11 | WHERE `idleCloseHours` is 0, THE module SHALL never close a window by itself. | auto: `idle timer is off when set to zero` |
| AC-12 | IF the window cannot be created, THEN THE link SHALL open as without VivArcDi. | auto: `little arc falls back to the default action when the window fails` |
| AC-13 | WHEN the module stops, THE module SHALL remove its listeners and restore the default handling. | auto: `little arc module cleans up on stop` |
| AC-14 | WHEN the main window is closed and the user moves a page, THE module SHALL open a main window and put the tab in it. | manual |

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
- [ ] **Flicker.** The tab shows in the main window for a moment before moving into Little Arc.
  Proposal: accept it in version 1 and measure it on the manual check; hiding it needs a
  different interception that this probe cannot show.
- [ ] **Detector, minimized case.** Vivaldi minimized when the link arrives. Proposal: check it on
  the manual verification of the implementation, with the detector logging what it saw.

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), sections "Little Arc" and
  "Altre feature distintive".
- [Strategy and roadmap](https://claude.ai/artifact/4JHR28H3euKSPbQZPNhY38), phase 5.
- [002 Peek](../002-peek/spec.md) and [015 Peek for new-tab links](../015-peek-new-tab-links/spec.md):
  keys, Expand and the page-to-tab move to reuse.
- [012 Editable folders](../012-editable-folders/spec.md) and [011 Space header](../011-space-header/spec.md):
  where the moved tab lands.
- Review files: `1cQlDFwE-Z0`, `Kc5GuEeZBZk`, `aq13trnsgq4`, `VZKHS0gBLts`, `TffkMbgsE2E`.
