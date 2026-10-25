# NNN Feature name

| | |
|---|---|
| Status | Draft |
| Phase | N |
| Owner | Tore |
| Approved | – |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Two or three sentences: what the feature is and why it matters for making Vivaldi behave like Arc.

## User stories

- **US-1.** As a Vivaldi user, I want …, so that ….

## Expected behavior

How the feature behaves from the user's point of view, in plain prose. Describe what happens, not
how the code does it. Point out where Arc and VivArcDi deliberately differ.

## Requirements

### Functional

- **FR-1.** …

### Non-functional

- **NFR-1.** …

Typical topics: Vivaldi must never be blocked, behavior on unsupported Vivaldi versions,
performance, configuration in `config.json`, macOS and Debian support.

## Acceptance criteria

Written in [EARS](../README.md#acceptance-criteria) and verifiable one by one. `Check` says how:
`auto` names the test that proves it, `manual` is a step Tore performs on a real Vivaldi.

| ID | Criterion | Check |
|---|---|---|
| AC-1 | WHEN … THE module SHALL … | auto: `test name` |
| AC-2 | WHILE … THE module SHALL … | manual |

## Out of scope

- … (as important as what is in scope)

## Open questions

- [ ] …

## References

- [Arc analysis](https://claude.ai/artifact/DatMo1dCfNV89fWfFSjVyr), section …
