# 005 Little Arc

| | |
|---|---|
| Status | Draft |
| Phase | 5 |
| Owner | Tore |
| Approved | – |

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
  instead of a tab of the main window.
- **FR-4.** The window shows no tab bar, panels or workspace switcher, only the compact bar of
  Expected behavior.
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

## Open questions

Each question has a proposal; unanswered proposals are what the design will assume.

- [ ] **Recognizing external links.** Can a mod tell that a new tab or window came from another app
  (for example a new tab with no opener while Vivaldi is not the frontmost app)? Proposal: write a
  probe script like the earlier ones, run by Tore, before the design; if it is unreliable,
  `externalLinks` ships off and this spec says so.
- [ ] **Native window or own window.** Is Vivaldi's `popup` window type close enough to Little Arc
  (compact bar, no tab bar)? Proposal: probe it together with the question above; fall back to a
  normal window with the interface hidden by CSS.
- [ ] **"From any app".** The reviews' main appeal is the shortcut working in other apps. A mod only
  sees keys while Vivaldi has focus. Proposal: version 1 is the shortcut inside Vivaldi plus external
  links, which covers the "links from other apps" story; a global shortcut becomes a follow-up that
  the installer ([016](../016-plug-and-play-installer/spec.md)) sets up, opt-in, a macOS Service or
  Shortcut and a Debian desktop entry.
- [ ] **Default for `externalLinks`.** It changes how every link from other apps behaves, and Arc does
  it by default. Proposal: on, with the option as the off switch.
- [ ] **Destination workspace.** Most recent workspace always, or a picker? Proposal: most recent
  by default and `askWorkspace` for the picker, as written.
- [ ] **Six hours.** The idle close comes from the earlier draft, with no source. Keep it,
  change it or drop it? Proposal: keep, as the option `idleCloseHours`.
- [ ] **Window size.** One third of the screen wide by 60% high is a guess. Proposal: keep as default,
  adjust after Tore sees it.
- [ ] **Mini Player.** Make it a separate spec later, or drop it? Proposal: separate and later.
- [ ] **Folder name.** The folder was renamed from `005-little-arc-and-extras` to `005-little-arc`,
  since it no longer holds extras, and the two links to it were updated. OK?

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), sections "Little Arc" and
  "Altre feature distintive".
- [Strategy and roadmap](https://claude.ai/artifact/4JHR28H3euKSPbQZPNhY38), phase 5.
- [002 Peek](../002-peek/spec.md) and [015 Peek for new-tab links](../015-peek-new-tab-links/spec.md):
  keys, Expand and the page-to-tab move to reuse.
- [012 Editable folders](../012-editable-folders/spec.md) and [011 Space header](../011-space-header/spec.md):
  where the moved tab lands.
- Review files: `1cQlDFwE-Z0`, `Kc5GuEeZBZk`, `aq13trnsgq4`, `VZKHS0gBLts`, `TffkMbgsE2E`.
