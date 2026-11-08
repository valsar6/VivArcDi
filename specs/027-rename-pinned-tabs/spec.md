# 027 Rename and re-icon pinned tabs

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Arc lets the user rename a pinned tab and change its icon, so that a long page title becomes a short label (1cQ at 3:33; the split view that gets a name and an icon in the Vivaldi user's review). VivArcDi's pinned rows and Favorites show the page title and favicon, which on many sites is long or generic.

## User stories

- **US-1.** As a user, I want to give a pinned tab a short name, so that the row is readable.
- **US-2.** As a user, I want to pick an icon for it, so that I recognize it.

## Expected behavior

A right click on a pinned row or a Favorite tile adds "Rename…" and "Change icon…" to the menu. Rename edits the label in place. Change icon opens a small grid of emoji; the chosen one replaces the favicon. "Reset" brings back the page title and favicon. The name and icon belong to the bookmark, so they follow it between sessions.

## Requirements

### Functional

- **FR-1.** Name and icon are stored in the bookmark's `vivExtData`, next to the other VivArcDi data.
- **FR-2.** Rows and tiles show the stored values when present.
- **FR-3.** Rename never changes the bookmark's URL.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the user renames a pinned row, THE row SHALL show the new name after a restart. | manual |
| AC-2 | WHEN the user chooses an emoji, THE row or tile SHALL show it instead of the favicon. | manual |
| AC-3 | WHEN the user resets, THE title and favicon SHALL return. | auto: `resets name and icon` |
| AC-4 | THE stored name SHALL not change the bookmark's URL. | auto: `rename keeps the url` |

## Out of scope

- Renaming ordinary Today tabs.
- Custom image icons.

## Open questions

- [ ] Show the stored name in Vivaldi's own bookmarks panel too, or only in VivArcDi rows?

## References

- 1cQ review 3:33; Project files: `video-arc/gap-list-arc-consolidata.md` (G15).
