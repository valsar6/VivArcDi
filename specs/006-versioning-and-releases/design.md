# 006 Versioning and releases: design

| | |
|---|---|
| Status | Approved |
| Spec | [spec.md](spec.md) |

## Approach

A small TypeScript command line in `scripts/release/`, run with `tsx` in CI, holds the rules so they
are unit tested like the payload. The workflow only calls it and `gh`.

## Components

| File | Responsibility | Pattern |
|---|---|---|
| `scripts/release/SemanticVersion.ts` | Parses versions, names the bump between two versions, gives the tag | Value Object |
| `scripts/release/BranchPolicy.ts` | Maps branch prefixes to the required bump, gives a verdict | Strategy table |
| `scripts/release/VersionSources.ts` | Reads both version files, from disk or from a git ref, and checks they agree | |
| `scripts/release/cli.ts` | `version`, `tag`, `check --base <ref> --branch <name>` | Command |

`npm run release -- <command>` runs it.

## CI

In `.github/workflows/tests.yml`:

| Job | When | What |
|---|---|---|
| `branch-policy` | Pull requests | Fetches the base branch and runs `check` with the pull request branch name |
| `release` | Push to `main`, after `test` | Reads the tag; if it does not exist on the remote, runs `gh release create <tag> --target <sha> --generate-notes` |

The release job needs `contents: write`. Tags created with the workflow token do not trigger other
workflows, so the release cannot loop.

## Risks

| Risk | Mitigation |
|---|---|
| Two pull requests raise the version to the same number | The second fails nothing on its own; the reviewer rebases it and bumps again. The release job never retags an existing version. |
| Branches created by tools with other names (e.g. `claude/…`) | They count as "other" and must keep the version; feature work uses `features/` |
