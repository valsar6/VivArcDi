# 047 Snapshot watch

| | |
|---|---|
| Status | Implemented |
| Phase | Tooling |
| Owner | Tore |
| Approved | Tore, 2026-11-18 |
| Implemented | 2026-11-18 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Vivaldi rewrites its interface between versions, and VivArcDi depends on that interface through the
selector catalog. Today a breaking Vivaldi release is found when Tore's sidebar breaks. This spec adds
a scheduled job that downloads the newest Vivaldi snapshot and stable builds every night, runs the
live verification of [spec 046](../046-live-verification/spec.md) against each one, and opens a GitHub
issue with the report and a DOM dump when something breaks, weeks before the snapshot becomes a stable
release.

It is the second step of the automation roadmap, after live verification and before running several
specs in parallel.

## User stories

- **US-1.** As Tore, I want to learn that a Vivaldi snapshot breaks VivArcDi from an issue, so that I
  fix the selectors before the version reaches my browser and the users'.
- **US-2.** As Tore, I want the issue to carry what is needed to fix it (which selectors and
  scenarios fail, a screenshot, the DOM of `window.html`), so that a fix can be drafted without
  installing the snapshot.
- **US-3.** As Tore, I want one issue per broken Vivaldi version, closed by itself when a later run
  passes, so that the job never floods my inbox.

## Expected behavior

Every night a GitHub Actions job reads the Vivaldi apt index, takes the newest `vivaldi-snapshot` and
`vivaldi-stable` packages, unpacks each into a folder without installing it, and runs `npm run live`
on it under a virtual display. Vivaldi itself is never installed on the runner: only the system
libraries its package depends on are installed from Ubuntu.

When a run fails, the job opens an issue titled `Vivaldi <channel> <version> breaks VivArcDi`, or
comments on it if it is already open, with the summary of `build/live/report.md`, and attaches the
report, the screenshots and a dump of `window.html` as a workflow artifact linked from the issue. When
a later run of the same channel passes, the job closes the open issue of that channel with a comment
naming the passing version. A run that fails for a reason outside VivArcDi (download, unpack, Vivaldi
does not start) is reported in the same issue, marked as an infrastructure failure, so it is not
mistaken for a broken selector.

The job can also be started by hand for any channel, and it never touches the selector catalog or
opens pull requests: drafting a fix is a later step.

## Requirements

### Functional

- **FR-1.** A scheduled workflow runs every night and on manual dispatch, for the channels `snapshot`
  and `stable`, each in its own job.
- **FR-2.** The newest version of each channel is read from the Vivaldi apt index
  (`repo.vivaldi.com/archive/deb`), and the downloaded package is checked against the SHA256 the
  index lists.
- **FR-3.** The package is unpacked with `dpkg-deb -x` into a root folder and handed to the harness
  with `--vivaldi <root>` and the version from the index, since an unpacked package has no dpkg
  record.
- **FR-4.** On failure, the harness also saves the `outerHTML` of `window.html` next to the report.
- **FR-5.** A failed run opens one issue per channel and Vivaldi version, or comments on the open one;
  the issue body has the failing checks, the run link and the artifact link.
- **FR-6.** A passing run closes the open issue of its channel with a comment naming the version.
- **FR-7.** An error before the checks run (download, checksum, unpack, start) is labelled
  `infrastructure` in the issue and in the job summary.

### Non-functional

- **NFR-1.** The job needs no secret beyond the workflow's own `GITHUB_TOKEN` with `issues: write`.
- **NFR-2.** One channel finishes within 15 minutes, download included.
- **NFR-3.** `make check` stays offline: the index reader, the issue logic and the DOM dump are unit
  tested with fakes.
- **NFR-4.** The workflow never writes to the repository, its branches or its releases.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria) and verifiable one by one. `Check` says how:
`auto` names the test that proves it, `live` names the scenario that proves it on a lab Vivaldi,
`manual` is a step Tore performs on a real Vivaldi.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN the apt index lists several versions of a channel, THE watch SHALL pick the newest by Debian version order | auto: `picks the newest package of a channel from the apt index` |
| AC-2 | IF a downloaded package does not match the SHA256 of the index, THEN THE watch SHALL stop and report an infrastructure failure | auto: `refuses a package whose checksum differs` |
| AC-3 | WHEN given an unpacked build and its version, THE lab SHALL use that version instead of asking dpkg | auto: `test_lab_uses_the_given_version_for_an_unpacked_build` |
| AC-4 | IF a check fails, THEN THE harness SHALL save the outerHTML of window.html next to the report | auto: `harness saves a dom dump on a failed check` |
| AC-5 | WHEN a run fails and no issue of that channel and version is open, THE watch SHALL open one | auto: `a failed run opens one issue per channel and version` |
| AC-6 | WHEN a run fails and its issue is already open, THE watch SHALL comment on it instead | auto: `a failed run comments on the open issue` |
| AC-7 | WHEN a run passes, THE watch SHALL close the open issue of its channel naming the version | auto: `a passing run closes the open issue of its channel` |
| AC-8 | IF the run fails before the checks, THEN THE watch SHALL label the failure infrastructure | auto: `failures before the checks are labelled infrastructure` |
| AC-9 | WHEN Tore dispatches the workflow for snapshot and stable, BOTH jobs SHALL finish within 15 minutes with a result in the job summary | manual |
| AC-10 | WHEN Tore dispatches the workflow from a branch with one selector renamed, THE watch SHALL open an issue that names that selector and links the artifact | manual |
| AC-11 | WHEN the run of AC-10 is repeated from main, THE watch SHALL close that issue | manual |

## Out of scope

- Drafting selector fixes, by a person or by an agent, from the issue: a later spec, which can use the
  DOM dump this spec saves.
- macOS builds: the selector catalog is the same on both platforms and a macOS runner costs ten times
  more; a macOS-only break is still caught by `npm run live` on Tore's Mac.
- Vivaldi builds older than the newest of each channel.
- Running the watch on Tore's machine with launchd.

## Open questions

- [x] **Where the job runs.** Decided: GitHub Actions on `ubuntu-latest` with `xvfb-run`, so it runs
  without anyone's computer being on. Alternative: launchd on Tore's Mac, which also covers macOS but
  only runs when the Mac is awake.
- [x] **Sandbox on the runner.** Decided: start the lab with `--no-sandbox` on the runner. Ubuntu
  24.04 restricts unprivileged user namespaces, the unpacked `chrome-sandbox` has no setuid bit, and
  the runner is thrown away after the job. The harness already falls back to `--no-sandbox` on Linux.
- [x] **Schedule.** Decided: every night at 04:30 UTC. Vivaldi publishes snapshots a few times a
  week, so a nightly run finds a new build within a day.
- [x] **How Tore is told.** Decided: the GitHub issue, which GitHub mails to the repository owner.
  Alternative: also a Telegram message, which needs a bot token as a secret.

## References

- [Spec 046, live verification](../046-live-verification/spec.md)
- Vivaldi apt index: `https://repo.vivaldi.com/archive/deb/dists/stable/main/binary-amd64/Packages`,
  which on 2026-11-18 listed `vivaldi-snapshot 8.4.4226.3-1` and `vivaldi-stable 8.3.4191.44-1`.
