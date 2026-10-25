# 005 Little Arc and extras

| | |
|---|---|
| Status | Draft |
| Phase | 5 |
| Owner | Tore |
| Approved | – |

## Summary

The remaining features that complete Arc's feel: Little Arc, a minimal window for links opened from
other apps, and the Mini Player for media playing in a tab the user left. This draft also records
whether an optional browser extension is worth it. It will likely be split into one spec per feature
before approval.

## User stories

- **US-1.** As a user, I want links I click in Mail or Slack to open in a small, minimal window, so
  that a quick lookup does not clutter my workspaces.
- **US-2.** As a user, I want to move such a window into a workspace when I decide to keep it.
- **US-3.** As a user, I want controls for audio or video playing in a tab I left, without going
  back to it.

## Expected behavior

**Little Arc.** A link opened from another app shows in a small window without tab bar or panels,
with only a compact address field. A button moves the page into the most recent workspace as a
tab; Cmd/Ctrl+O does the same. Little Arc windows left alone are closed after six hours.

**Mini Player.** When the user leaves a tab playing media, a compact player appears at the bottom
of the vertical tab bar with play/pause, the title and a button to return to the tab. Videos may
continue in picture-in-picture.

## Requirements

### Functional

- **FR-1.** Links from other apps open in a Little Arc window WHERE `little-arc` is enabled.
- **FR-2.** Little Arc offers "Open in workspace" for the most recent workspace.
- **FR-3.** A Mini Player shows while a non-active tab plays media, and hides when it stops.

### Non-functional

- **NFR-1.** Turning a feature off restores Vivaldi's default handling.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a link is opened from another app, THE link SHALL open in a minimal window. | manual |
| AC-2 | WHEN the user presses "Open in workspace" or Cmd/Ctrl+O, THE page SHALL move into a tab of the most recent workspace and the window SHALL close. | manual |
| AC-3 | WHILE a non-active tab plays media, THE Mini Player SHALL show its title and a play/pause control. | manual |
| AC-4 | WHEN the user clicks the Mini Player title, THE tab SHALL become active. | manual |

## Out of scope

- Air Traffic Control beyond Vivaldi's workspace rules.
- Easels, Notes, Boosts, Library, sharing.

## Open questions

- [ ] Can a JS mod tell that a window was opened by an external link, or does it need an extension
  or an OS-level handler?
- [ ] Is Vivaldi's popup window type close enough to Little Arc to use natively?
- [ ] Mini Player: does Vivaldi's own media panel already cover it?
- [ ] Extension: is there a feature that only an MV3 extension can deliver? If not, drop it.

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), sections "Little Arc" and
  "Altre feature distintive".
- [Strategy and roadmap](https://claude.ai/artifact/4JHR28H3euKSPbQZPNhY38), phase 5.
