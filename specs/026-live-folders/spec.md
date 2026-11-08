# 026 Live folders

| | |
|---|---|
| Status | Draft |
| Phase | 3 |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

A live folder in Arc fills itself from a source. The Browser Company's clip shows a folder called "Pull Requests" in the sidebar with one row per open pull request of a GitHub repository, with the title and the author's name under it; a click opens the pull request. Rows are not managed by hand: closed pull requests leave the folder. Arc's space menu has a "Live Folders" item for them (Tore's recording of 2026-11-08). This spec brings the same to the folders of [009](../009-bookmark-folders-in-tab-bar/spec.md).

## User stories

- **US-1.** As a user, I want a folder that lists the open pull requests of a repository, so that I do not watch GitHub by hand.
- **US-2.** As a user, I want the folder to update on its own.

## Expected behavior

In `config.json` the user adds a live folder: a name, the source `github-pull-requests`, a repository and, for private ones, a token read from the macOS Keychain or a file. The folder shows in the tab bar like a folder of 009 with a pull-request icon. Each row is a link: favicon of GitHub, the title, the author under it. VivArcDi refreshes the list every five minutes and when the user opens the folder. A row whose pull request closed or merged disappears. If the source fails, the folder keeps its last list and shows a warning mark, as in Arc's recording.

## Requirements

### Functional

- **FR-1.** A `live-folders` module reads the `live-folders` list of `config.json`.
- **FR-2.** The only source in the first version is `github-pull-requests`.
- **FR-3.** Rows are virtual: they are not bookmarks and not written to Vivaldi's bookmarks.
- **FR-4.** A failed refresh keeps the last rows and marks the folder with a warning.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the refresh runs, THE folder SHALL list exactly the open pull requests of the repository. | auto: `lists open pull requests only` |
| AC-2 | WHEN a pull request closes, THE row SHALL disappear at the next refresh. | auto: `drops closed pull requests` |
| AC-3 | WHEN the user clicks a row, THE pull request SHALL open as a link tab of the workspace. | manual |
| AC-4 | IF the refresh fails, THEN THE folder SHALL keep its last rows and show a warning. | auto: `keeps rows when the refresh fails` |

## Out of scope

- Sources other than GitHub pull requests; issue lists; notifications.
- Creating a live folder from a menu.

## Open questions

- [ ] Where to store the token? Keychain on macOS and a file with mode 600 on Debian is the proposal.
- [ ] Filter by author or label in the first version?
- [ ] Do virtual rows fit the 009 tree, or must they be real bookmarks in a hidden folder?

## References

- Live Folders clip (`recensioni/live-folders.md`); Project files: `video-arc/gap-list-arc-consolidata.md` (G11).
