# 006 Versioning and releases

| | |
|---|---|
| Status | Approved |
| Phase | Tooling |
| Owner | Tore |
| Approved | 2026-10-25, rules given by Tore; approved together with the implementation by merging its pull request |

## Summary

Branch names tell what a change is, the version tells users what they run, and every version that
reaches `main` is tagged and released without manual steps.

## User stories

- **US-1.** As Tore, I want feature and fix branches named in a fixed way, so that the history reads
  at a glance.
- **US-2.** As Tore, I want every feature to raise the minor version and every fix the patch
  version, so that the version says how much changed.
- **US-3.** As a user, I want each release tagged, so that I can see what I installed and go back to
  an earlier one.

## Expected behavior

A feature is developed on `features/<name>` and its pull request raises the minor version
(`0.2.3` to `0.3.0`). A fix is developed on `fix/<name>` and raises the patch version (`0.3.0` to
`0.3.1`). Other branches, such as spec or documentation work, leave the version unchanged. A CI job
fails the pull request when the version change does not match the branch.

The project stays at `0.x.y` until its base is complete. When a pull request is merged into `main`
with a version that has no tag yet, CI tags the merge commit `v<version>` and publishes a GitHub
release with notes generated from the merged pull requests.

Phase 0 was `0.1.0` and the Favorites grid raised it to `0.2.0`; neither was tagged. This spec is
itself a feature (`features/sdd`) and raises the version to `0.3.0`, the first tagged release.

## Requirements

### Functional

- **FR-1.** Branch prefixes: `features/` for features, `fix/` for fixes.
- **FR-2.** Required version change: minor for `features/`, patch for `fix/`, none otherwise. A
  change that skips or mixes steps is refused.
- **FR-3.** Major version 0 until Tore changes this spec.
- **FR-4.** The version is kept in `package.json` and `installer/vivarcdi/__init__.py`, and they must
  match.
- **FR-5.** A push to `main` whose version has no tag creates the tag `v<version>` and a GitHub
  release. A version that is already tagged is not released again.
- **FR-6.** The first `dist` commit of a version is tagged `dist-v<version>`, so users can check out
  the build of any release. A version whose `dist` tag exists is not tagged again.

### Non-functional

- **NFR-1.** No manual tagging or release step.
- **NFR-2.** The release job runs only after the test job passed on the same commit.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN a `features/` branch raises the minor version, THE policy SHALL accept it, and refuse any other change. | auto: `a features branch must raise the minor version` |
| AC-2 | WHEN a `fix/` branch raises the patch version, THE policy SHALL accept it, and refuse any other change. | auto: `a fix branch must raise the patch version` |
| AC-3 | WHEN any other branch changes the version, THE policy SHALL refuse it. | auto: `any other branch must keep the version` |
| AC-4 | IF a change reaches major version 1, THEN THE policy SHALL refuse it. | auto: `the project stays below 1.0.0` |
| AC-5 | IF `package.json` and the installer disagree on the version, THEN THE check SHALL fail. | auto: `version fails when package.json and the installer disagree`, `the repository versions agree` |
| AC-6 | THE version comparison SHALL recognize single minor, patch and major steps and call anything else irregular. | auto: `bumpFrom names a single step`, `bumpFrom calls skipped or mixed steps irregular` |
| AC-7 | WHEN a pull request is opened, THE `branch-policy` CI job SHALL report whether it follows the policy. | manual: open a `fix/` pull request without a version change and see the job fail |
| AC-8 | WHEN a new version is merged into `main`, THE CI SHALL create the tag `v<version>` and a GitHub release. | manual: after merging this spec, `v0.3.0` exists in the releases |
| AC-9 | WHEN `main` gets a commit without a version change, THE CI SHALL create no release. | manual |
| AC-10 | WHEN CI publishes a version on `dist` for the first time, THE CI SHALL tag that `dist` commit `dist-v<version>`. | manual: after merging 0.4.4, `git ls-remote --tags origin dist-v0.4.4` points at the head of `dist` |

## Out of scope

- Separate versions or tags per module: a single payload is installed, so one version describes it.
  To be revisited if Tore asks for per-module tags.
- Changelog files in the repository: release notes live on GitHub.
- Pre-release versions such as `0.3.0-beta.1`.

## Open questions

None.
