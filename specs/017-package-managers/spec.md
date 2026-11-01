# 017 Package managers

| | |
|---|---|
| Status | Approved |
| Phase | 0 |
| Owner | Tore |
| Approved | 2026-11-01 |

Status is one of `Draft`, `Approved`, `Implemented`, `Superseded`. See [specs/README.md](../README.md).

## Summary

Spec 016 ships a `.dmg` and a `.deb` with every GitHub release, but the user still has to come back
to the release page for each new version. This spec publishes the same files through the package
managers people already use: a VivArcDi Homebrew tap on macOS (`brew install --cask`) and a signed
VivArcDi apt repository on Debian, so that `brew upgrade` and `apt upgrade` (or the system's software
updater) bring new versions of VivArcDi like any other app. CI publishes both from the release, with
no manual step after the first setup.

## User stories

- **US-1.** As a Mac user of Homebrew, I want to install VivArcDi with one `brew install --cask`
  command and update it with `brew upgrade`, so that I manage it like my other apps.
- **US-2.** As a Debian user, I want VivArcDi updates to arrive through `apt upgrade` and the
  software updater, so that I never download a `.deb` by hand again.
- **US-3.** As a Debian user who installed the `.deb` of spec 016 with a double click, I want the
  package to enroll its own repository, so that I get updates without typing any command.
- **US-4.** As the maintainer, I want CI to publish every release to the tap and to the apt
  repository by itself, so that a release is still a merge on `main` and nothing more.

## Expected behavior

### Homebrew (macOS)

VivArcDi has its own tap, the GitHub repository `valsar6/homebrew-vivarcdi`, with one cask
`vivarcdi`. The README shows:

```sh
brew install --cask valsar6/vivarcdi/vivarcdi
```

The cask downloads `VivArcDi-<version>.dmg` from the GitHub release, checks its SHA-256 and puts
`VivArcDi.app` in Applications, exactly where the drag of spec 016 puts it. From then on the user
follows spec 016: open the app, allow it the first time ("Open Anyway", see Q2), click Install.

`brew upgrade` installs a newer app. As in spec 016 Q1, macOS asks for App Management again after
each update, because the app is ad-hoc signed; the cask prints this in its caveats and the app
explains it as today. `brew uninstall --cask vivarcdi` removes the app and its background agent; the
caveats ask to click **Uninstall** in the app first, so that Vivaldi is restored (see Q3).

The official `homebrew/cask` repository is not a target: it accepts only apps signed with an Apple
Developer ID and notarized, which Tore declined in spec 016 Q1. A personal tap has no such rule.

### apt repository (Debian)

VivArcDi has a signed apt repository served by GitHub Pages, with one suite `stable` and one
component `main`. It holds the `.deb` of the last releases, its `Release` file is signed with a
VivArcDi GPG key, and the public key is published next to it.

The `.deb` itself enrolls the repository, as Vivaldi's own package does: it installs a sources file
in `/etc/apt/sources.list.d/` and the public key in `/usr/share/keyrings/`. So a user who
double-clicks the `.deb` of spec 016 is subscribed with no further step, and the next VivArcDi
version arrives with the other system updates (GNOME Software or `apt upgrade`). The dpkg triggers
of spec 016 keep reapplying VivArcDi after Vivaldi updates.

For users who prefer the terminal, the README also documents the manual setup: download the key,
write the sources file, `sudo apt update && sudo apt install vivarcdi`.

Removing the package with `apt remove` keeps the repository; `apt purge vivarcdi` also removes the
sources file and the key.

### Publishing

When CI creates release `v<version>` (spec 006) and the `upload-packages` job of spec 016 has
attached both files, two more jobs run:

1. **publish-tap** writes the new version and SHA-256 into `Casks/vivarcdi.rb` of the tap and pushes
   it, signed by the same author as every VivArcDi commit.
2. **publish-apt** adds the new `.deb` to the repository, regenerates and signs the indexes, and
   deploys the site to GitHub Pages.

A failure in either job does not touch the release or the `dist` branch; running the job again
finishes the publication.

### Windows package managers

Chocolatey, winget and Scoop install Windows software only, and Windows is out of scope of VivArcDi
(spec 000 FR-1). See Q1: set aside with the future Windows extension.

## Requirements

### Functional

- **FR-1.** A tap repository `valsar6/homebrew-vivarcdi` holds a cask `vivarcdi` that installs
  `VivArcDi.app` from the `.dmg` of the GitHub release and verifies its SHA-256.
- **FR-2.** The cask declares macOS and both architectures supported by the universal app, and its
  caveats explain "Open Anyway", the App Management grant after each update, and uninstalling from
  the app before `brew uninstall`.
- **FR-3.** `brew uninstall --cask vivarcdi` removes the app and unloads and deletes its launchd
  agent; `brew uninstall --zap` also removes the app's support folder but never the Vivaldi backups.
- **FR-4.** An apt repository on GitHub Pages serves suite `stable`, component `main`, architecture
  `all`, with `InRelease` and `Release.gpg` signed by a dedicated VivArcDi key.
- **FR-5.** The repository keeps the `.deb` of at least the last three releases, so a user can
  downgrade with apt.
- **FR-6.** The `.deb` installs a deb822 sources file `/etc/apt/sources.list.d/vivarcdi.sources`
  with `Signed-By: /usr/share/keyrings/vivarcdi-archive-keyring.gpg`, and that keyring file.
- **FR-7.** `apt purge vivarcdi` removes the sources file and the keyring; `apt remove` keeps them.
- **FR-8.** CI publishes each release to the tap and to the apt repository after the packages are
  attached to the release, and does nothing on pull requests except validating the cask and the
  repository layout.
- **FR-9.** The signing key and the tap token live only in GitHub Actions secrets; no private key or
  token is ever committed or printed in logs.
- **FR-10.** The README Download section lists, per system, the package manager command first and
  the direct download second.
- **FR-12.** A runbook in `docs/` lists every one-time step for the maintainer (tap repository,
  token and secret, GitHub Pages, signing key and secret, key rotation) and how to check each one.
- **FR-11.** The window of spec 016, when it reports a newer release (016 Q5), names the command
  that installs it for a package-manager install (`brew upgrade --cask vivarcdi`, or the software
  updater on Debian) instead of only the release link.

### Non-functional

- **NFR-1.** A release stays a merge on `main`: no manual step after the one-time setup (tap
  repository, GitHub Pages, secrets).
- **NFR-2.** Publication is idempotent: running a publish job again for the same version changes
  nothing or repairs a half-done publication.
- **NFR-3.** apt never warns about an unsigned or weakly signed repository on Debian 13 (RSA 4096 or
  Ed25519 key, SHA-256 digests).
- **NFR-4.** The site on GitHub Pages stays under 100 MB.
- **NFR-5.** Spec 016 keeps working unchanged for users who do not use a package manager.

## Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC-1 | THE generated cask SHALL point to the `.dmg` of release `v<version>` and carry its SHA-256. | auto: `test_cask_points_to_the_release_dmg_with_its_checksum` |
| AC-2 | THE cask SHALL unload and delete the launchd agent on uninstall and keep the Vivaldi backups on zap. | auto: `test_cask_uninstall_removes_agent_and_keeps_backups` |
| AC-3 | THE cask caveats SHALL mention Open Anyway, App Management after updates and Uninstall in the app. | auto: `test_cask_caveats_explain_gatekeeper_and_app_management` |
| AC-4 | THE generated apt repository SHALL contain `dists/stable/InRelease`, `Release.gpg` and a `Packages` index listing the new `.deb` with its SHA-256. | auto: `test_apt_repository_indexes_the_new_package` |
| AC-5 | THE apt repository SHALL keep the last three versions and drop older ones. | auto: `test_apt_repository_keeps_the_last_three_versions` |
| AC-6 | THE `.deb` SHALL install `vivarcdi.sources` with `Signed-By` and the keyring file. | auto: `test_deb_enrolls_the_vivarcdi_repository` |
| AC-7 | WHEN the package is purged, THE post-removal step SHALL delete the sources file and the keyring; WHEN it is only removed, it SHALL keep them. | auto: `test_deb_purge_removes_the_repository` |
| AC-8 | IF a publish job runs twice for the same version, THEN the second run SHALL leave the tap and the repository unchanged. | auto: `test_publication_is_idempotent` |
| AC-9 | WHEN the window reports a newer release for a Homebrew install, IT SHALL show `brew upgrade --cask vivarcdi`. | auto: `test_update_notice_names_the_package_manager_command` |
| AC-16 | THE repository SHALL contain a runbook that names each one-time setup step and the secret it produces. | auto: `test_runbook_lists_every_one_time_setup_step` |
| AC-10 | WHEN a version is released, the tap SHALL show the new cask version and the apt repository SHALL list the new package. | manual: `brew info --cask valsar6/vivarcdi/vivarcdi` and the Pages site show the new version |
| AC-11 | WHEN the user runs `brew install --cask valsar6/vivarcdi/vivarcdi`, `VivArcDi.app` SHALL be in Applications and Install SHALL work as in 016/AC-15. | manual |
| AC-12 | WHEN a newer release exists, `brew upgrade --cask vivarcdi` SHALL install it and the app SHALL report it as current. | manual |
| AC-13 | WHEN the user double-clicks the `.deb` on Debian 13, `apt update` SHALL then read the VivArcDi repository with no warning. | manual |
| AC-14 | WHEN a newer release exists, the software updater (or `apt upgrade`) on Debian 13 SHALL offer and install it. | manual |
| AC-15 | WHEN the user runs `brew uninstall --cask vivarcdi` after Uninstall in the app, no VivArcDi app, agent or Vivaldi change SHALL remain. | manual |

## Out of scope

- Windows and its package managers (Chocolatey, winget, Scoop): set aside with the future Windows
  extension (Q1).
- The official `homebrew/cask` and the official Debian archive: they need a notarized app and a
  Debian sponsor respectively.
- MacPorts, Flatpak, Snap, AUR, rpm repositories (other Linux families stay out, spec 000 FR-1).
- Automatic updates of VivArcDi inside the app: updates come from the package manager.
- An apt mirror outside GitHub Pages or a custom domain.

## Open questions

Answered by Tore on 2026-11-01.

- [x] **Q1. Chocolatey.** Windows is out of scope (spec 000 FR-1) and Chocolatey installs Windows
  software only. Chocolatey and winget are set aside together with the future Windows extension
  of VivArcDi, and come after it.
- [x] **Q2. Gatekeeper with Homebrew.** Keep the quarantine flag. The "Open Anyway" step is stated
  in the cask caveats, as with the `.dmg`.
- [x] **Q3. Restoring Vivaldi on `brew uninstall`.** Accepted: the caveats and README say "click
  Uninstall in the app first"; the cask only removes the app and the agent.
- [x] **Q4. Where the apt repository lives.** The `gh-pages` branch of this repository, served at
  `https://valsar6.github.io/vivarcdi/apt`, so no second repository is needed (Tore accepted the
  proposal, 2026-11-01).
- [x] **Q5. The `.deb` enrolls the repository.** Accepted (US-3).
- [x] **Q6. One-time setup.** Accepted, and documented as a runbook (FR-12): creating the tap
  repository, the token, GitHub Pages and the signing key, step by step.
- [x] **Q7. Version.** Accepted: a feature (`features/package-managers`, next minor version; 0.16.0
  went to spec 012, so 0.17.0). Everything that Tore has to do by hand is documented in the
  repository.

## References

- [Spec 000 Foundations](../000-foundations/spec.md): supported systems (FR-1).
- [Spec 006 Versioning and releases](../006-versioning-and-releases/spec.md): release tags.
- [Spec 016 Plug-and-play installer](../016-plug-and-play-installer/spec.md): the `.dmg`, the `.deb`
  and the `upload-packages` job this spec publishes from.
- [Homebrew: How to create and maintain a tap](https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap)
- [Homebrew: Cask Cookbook](https://docs.brew.sh/Cask-Cookbook)
- [Debian wiki: DebianRepository/UseThirdParty](https://wiki.debian.org/DebianRepository/UseThirdParty)
- [Debian wiki: DebianRepository/Format](https://wiki.debian.org/DebianRepository/Format)
