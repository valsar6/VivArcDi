# 047 Snapshot watch: design

| | |
|---|---|
| Status | Approved, Tore, 2026-11-18 |
| Spec | [spec.md](spec.md) |

## Approach

The watch is development tooling next to the live harness: TypeScript under `scripts/watch/`, run by
`tsx` as `npm run watch -- --channel <snapshot|stable>`, and one workflow,
`.github/workflows/snapshot-watch.yml`. It reuses `npm run live` (spec 046) as it is and adds only
what a runner without Vivaldi needs: finding a build, unpacking it, and turning the result into an
issue.

One channel, one job of the workflow matrix:

1. `AptIndex` downloads `dists/stable/main/binary-amd64/Packages` and picks the newest
   `vivaldi-<channel>` entry by Debian version order, with its `Filename`, `SHA256` and `Depends`.
2. The workflow installs the libraries of `Depends` from Ubuntu with `apt-get satisfy
   --no-install-recommends`, which resolves alternatives, version constraints and virtual packages
   (`libasound2` is provided by `libasound2t64` on Ubuntu 24.04) as installing the package would,
   and `xvfb`. Vivaldi itself is not installed.
3. `PackageFetcher` downloads the `.deb`, checks its SHA256 and unpacks it with `dpkg-deb -x` into
   `build/watch/<channel>/root/`.
4. `WatchRun` starts `npm run live -- --channel <channel> --vivaldi <root> --vivaldi-version
   <version> --no-sandbox` under `xvfb-run -a` and reads `build/live/report.json`.
5. `IssueTracker` opens, comments on or closes the issue of the channel through the GitHub REST API
   with the workflow's `GITHUB_TOKEN`, and `WatchRun` writes the job summary.
6. The workflow uploads `build/live/` (report, screenshots, DOM dump) as the artifact
   `live-<channel>-<version>`, always.

The job ends green whenever the issue was handled, so GitHub sends one mail (the issue), not two
(the issue and a failed workflow). It ends red only when it could not report, for example a GitHub
API error.

### Changes to the live harness

- `lab.py prepare --version <v>`: with an unpacked build there is no dpkg record, so the version comes
  from the index. Both the source and the lab installation take that version.
- `cli.ts`: `--vivaldi-version <v>` passed on to `lab.py`, and `--no-sandbox` to start the lab with it
  right away instead of after the 30 second fallback.
- `VivaldiProcess.flags` adds `--password-store=basic`, so Chromium on Linux never asks for a keyring
  password under a virtual display. The lab profile stores no passwords.
- `LiveRun` saves `document.documentElement.outerHTML` to `build/live/window.html` when the run has a
  failed check, once, after the checks.

### Rejected alternatives

- **`apt-get install ./vivaldi.deb`.** Simpler, but it runs the package scripts as root, adds the
  Vivaldi apt source to the runner, and the watch would not test the `--vivaldi <root>` path the
  snapshot spec was meant to use.
- **The `gh` CLI for issues.** Present on runners, but harder to fake in tests than an injected
  `fetch`.
- **A red job on every failure.** GitHub would mail twice for the same break.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `scripts/watch/cli.ts` | Parses `--channel`, reads `GITHUB_*` variables, composes and runs `WatchRun`, sets the exit code | Composition root |
| `scripts/watch/DebianVersion.ts` | Compares Debian versions (epoch, upstream, revision; digits and non-digits as dpkg does) | |
| `scripts/watch/AptIndex.ts` | Parses a `Packages` file into entries and returns the newest entry of a package | |
| `scripts/watch/PackageFetcher.ts` | Downloads a `.deb`, verifies SHA256 with `node:crypto`, unpacks it with `dpkg-deb -x` | |
| `scripts/watch/WatchRun.ts` | Runs the steps of one channel and returns `{ channel, version, outcome: pass \| fail \| infrastructure, failures, runUrl }` | Template method |
| `scripts/watch/IssueTracker.ts` | Finds the open issues labelled `snapshot-watch` for a channel; opens, comments or closes as the outcome requires | |
| `scripts/watch/IssueText.ts` | Title `Vivaldi <channel> <version> breaks VivArcDi`, body and comments from a run result | |
| `.github/workflows/snapshot-watch.yml` | `schedule: 30 4 * * *` and `workflow_dispatch` with a `channel` input; matrix `snapshot`, `stable`; `permissions: contents: read, issues: write`; installs `Depends` and `xvfb`; runs `npm run watch`; uploads `build/live/` | |
| `tests/watch/*.test.ts` | Unit tests with a fake `fetch`, a fake command runner and fixture `Packages` text | |

### Issue rules

| Outcome | Open issue of the channel for the same version | Open issue of the channel for another version | None |
|---|---|---|---|
| `fail` | comment | open a new one, keep the old one | open |
| `infrastructure` | comment, labelled `infrastructure` | comment on the newest one, labelled | open, labelled |
| `pass` | close with a comment | close with a comment | nothing |

Issues carry the labels `snapshot-watch` and `channel:<channel>`; the watch creates missing labels.

## Vivaldi interface

None new. The watch relies on the apt index format (`Package`, `Version`, `Filename`, `SHA256`,
`Depends`) and on the `opt/vivaldi` and `opt/vivaldi-snapshot` layout that `DebianPlatform` already
knows.

## Configuration

| Place | Change |
|---|---|
| `package.json` | Script `"watch": "tsx scripts/watch/cli.ts"` |
| Workflow input | `channel`: `both` (default), `snapshot` or `stable` |
| Secrets | None; `GITHUB_TOKEN` only |

## Risks

| Risk | Mitigation |
|---|---|
| The unpacked Vivaldi misses a system library | The workflow installs the `Depends` of the index entry; a start failure is labelled `infrastructure`, not a broken selector |
| Ubuntu package names differ from Debian's in `Depends` (`libasound2` vs `libasound2t64`) | `apt-get satisfy` resolves the raw field like a package install would; the first T7 run showed that `apt-get install` of the first alternatives fails on `libasound2` |
| A snapshot opens a first-run dialog that hides the interface | The fixture preferences and `--no-first-run`; the screenshot in the artifact shows it, and the issue is opened anyway |
| Flapping infrastructure floods the issue with comments | One comment per run, and at most one run per night per channel |
| The apt index moves or changes format | `AptIndex` fails with a clear message, labelled `infrastructure` |
| The CSP bypass or the CDP injection behaves differently on Linux | The first dispatched run (AC-9) proves it; the spec 046 run on Debian (046/AC-11) covers the same path |
