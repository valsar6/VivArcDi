# 017 Package managers: design

| | |
|---|---|
| Status | Draft |
| Spec | [spec.md](spec.md) |

Written only after the spec is `Approved`. It says **how**; the spec says **what**.

## Approach

Nothing changes in what the packages of spec 016 contain, except that the `.deb` also enrolls the
apt repository. The rest is publishing, done by CI from the files of the release, and a small change
to the update notice of the window. Four parts:

1. **Cask generator**: a script renders `Casks/vivarcdi.rb` for a version and a checksum, and CI
   pushes it to the tap.
2. **Apt repository builder**: a script adds the `.deb` to a repository tree, regenerates the
   indexes and signs them, and CI deploys the tree to the `gh-pages` branch.
3. **Repository enrollment in the `.deb`**: a sources file and a keyring file, removed on purge.
4. **Update advice in the window**: the notice names the package-manager command that fits how
   VivArcDi was installed.

All scripts are Python 3.9 standard library, like the installer, and live under `packaging/`, so
`make test-py` covers them (NFR-5 is kept because the packages of 016 are only extended).

### Cask (`packaging/homebrew/`)

`cask.py` has `CaskRenderer`, which fills `templates/vivarcdi.rb` with `@VERSION@` and `@SHA256@`.
The SHA-256 is computed by `ChecksumReader` from the `.dmg` that CI downloads from the release, not
from the build artifact, so the cask matches what users download (AC-1). The cask:

```ruby
cask "vivarcdi" do
  version "@VERSION@"
  sha256 "@SHA256@"

  url "https://github.com/valsar6/VivArcDi/releases/download/v#{version}/VivArcDi-#{version}.dmg"
  name "VivArcDi"
  desc "Make Vivaldi behave like Arc"
  homepage "https://github.com/valsar6/VivArcDi"

  app "VivArcDi.app"

  uninstall launchctl: "io.github.valsar6.vivarcdi.reapply"
  zap trash: "~/Library/Application Support/VivArcDi/logs"

  caveats <<~EOS
    ...
  EOS
end
```

The launchd label in `uninstall` is the one `LaunchAgentHook` already uses; the implementation reads
it from the installer constants instead of repeating it, and the test compares both (AC-2). `zap`
trashes only the logs and the `managed-by` marker: backups of Vivaldi's `window.html` stay (AC-2).
The caveats carry three paragraphs (AC-3): the first open needs System Settings > Privacy & Security >
Open Anyway (Q2); macOS asks for App Management again after each update; click **Uninstall** in the
app before `brew uninstall` so that Vivaldi is restored (Q3).

`livecheck` is not needed: the tap is updated by CI, not by Homebrew's bot.

The tap repository holds `Casks/vivarcdi.rb` and a short README. `publish-tap` checks it out with the
`HOMEBREW_TAP_TOKEN` secret, runs `cask.py`, and commits only when the file changed, authored by
Salvatore, with the subject "Update VivArcDi to <version>" (AC-8). Before pushing it runs
`ruby -c` on the file; `brew audit` runs on the macOS runner in the pull request job.

### Apt repository (`packaging/apt/`)

`apt_repo.py` builds a standard flat-pool repository inside a folder `apt/`:

```text
apt/
  vivarcdi-archive-keyring.gpg      public key, binary
  vivarcdi-archive-keyring.asc      public key, armored
  pool/main/v/vivarcdi/vivarcdi_<version>_all.deb
  dists/stable/Release  InRelease  Release.gpg
  dists/stable/main/binary-all/Packages  Packages.gz
```

- `PackageIndex` reads the `control` file of each `.deb` with `dpkg-deb -f` and writes the
  `Packages` entry with `Filename`, `Size`, `MD5sum`, `SHA1` and `SHA256`. `Release` lists the digests
  of `Packages` and `Packages.gz`, with `Suite: stable`, `Components: main`, `Architectures: all` and
  the `Date` (AC-4).
- `RetentionPolicy` keeps the three highest versions and deletes the rest of the pool (AC-5, FR-5).
- `ReleaseSigner` calls `gpg` with a temporary home that imports the `APT_SIGNING_KEY` secret, and
  writes `InRelease` (clear-signed) and `Release.gpg` (detached). The key is Ed25519; SHA-256 is the
  digest (NFR-3). The temporary home is deleted at the end and the key never reaches a log (FR-9).
- Idempotence (AC-8, NFR-2): adding a version that is already in the pool replaces it with the same
  file and gives the same indexes, so the second run produces no git change; `Date` is taken from the
  `.deb` build time recorded in the release, not from the clock.

`publish-apt` checks out `gh-pages` into a folder, copies the new `.deb` next to the existing pool,
runs `apt_repo.py`, commits with the subject "Publish VivArcDi <version> to the apt repository"
(Salvatore as author) and pushes. GitHub Pages then serves it at
`https://valsar6.github.io/vivarcdi/apt` (Q4). The `gh-pages` branch is rewritten only by this job;
`.nojekyll` at its root keeps Pages from processing the files. Four versions of a 1 MB package stay
far under the 100 MB limit (NFR-4).

### Enrollment in the `.deb`

`build_deb.py` adds two files from templates (AC-6):

```text
etc/apt/sources.list.d/vivarcdi.sources
usr/share/keyrings/vivarcdi-archive-keyring.gpg
```

```text
Types: deb
URIs: https://valsar6.github.io/vivarcdi/apt
Suites: stable
Components: main
Signed-By: /usr/share/keyrings/vivarcdi-archive-keyring.gpg
```

The keyring is the public key committed in `packaging/apt/vivarcdi-archive-keyring.gpg`. The sources
file is a conffile so a user can edit or delete it, and dpkg keeps their change. The `postrm`
template gains a purge branch that deletes both files (AC-7); on `remove` it does nothing. The keyring
file belongs to the package, so `remove` leaves it and `purge` deletes it, as conffile semantics ask.

Version bump of the key: the package ships the key that signed it; a rotation (runbook) publishes a
release signed by the old key that carries the new keyring, then switches CI to the new key.

### Update advice in the window

`ReleaseChecker` already finds the newer release. A new `UpdateAdvisor` turns it into text:

| Install source | Detected by | Text |
|---|---|---|
| Homebrew | `Caskroom/vivarcdi` exists under `/opt/homebrew` or `/usr/local` | `brew upgrade --cask vivarcdi` |
| Debian package | mode is `DebPackageMode` | "Install the update from the software updater or run `sudo apt update && sudo apt upgrade`" |
| Other | everything else | the release link, as today |

The detector is `InstallSource`, a small strategy with `HomebrewSource`, `AptSource` and
`DirectSource`; the presenter asks it for the advice. The window shows the text with the version
(FR-11, AC-9).

### Runbook (`docs/package-managers-setup.md`)

One-time steps for the maintainer, each with its check (FR-12, AC-16):

1. Create the empty public repository `valsar6/homebrew-vivarcdi`.
2. Create a fine-grained token with Contents write on that repository only; add it as secret
   `HOMEBREW_TAP_TOKEN`.
3. Run `scripts/make-apt-key.sh`, which creates an Ed25519 key in a temporary home, commits nothing,
   writes the public keyring to `packaging/apt/` and prints the private key to paste as secret
   `APT_SIGNING_KEY`; then deletes the temporary home.
4. Create the `gh-pages` branch (the first `publish-apt` run does it) and enable GitHub Pages from
   that branch.
5. Check: a test release, `brew info`, `apt update`.
6. Rotate the key; revoke the token.

`test_runbook_lists_every_one_time_setup_step` checks that the runbook mentions both secrets, the
tap repository and Pages.

## Components

| Class or file | Responsibility | Pattern |
|---|---|---|
| `packaging/homebrew/cask.py` `CaskRenderer`, `ChecksumReader` | Renders the cask for a version and the `.dmg` checksum | Builder |
| `packaging/homebrew/templates/vivarcdi.rb` | The cask text with placeholders | |
| `packaging/apt/apt_repo.py` `PackageIndex`, `RetentionPolicy`, `ReleaseSigner`, `AptRepository` | Pool, indexes, retention, signing | Facade over small steps |
| `packaging/apt/vivarcdi-archive-keyring.gpg` | The public key shipped in the repository and the `.deb` | |
| `packaging/debian/build_deb.py`, `templates/vivarcdi.sources`, `templates/postrm` | Enrollment files and purge | |
| `installer/vivarcdi/update_advice.py` `InstallSource`, `HomebrewSource`, `AptSource`, `DirectSource`, `UpdateAdvisor` | Update text per install source | Strategy |
| `installer/vivarcdi/window/presenter.py` | Shows the advice | |
| `scripts/make-apt-key.sh` | Creates the signing key once | |
| `docs/package-managers-setup.md` | The runbook | |
| `.github/workflows/tests.yml` | `publish-tap`, `publish-apt`; validation on pull requests | |

Tests: `tests/packaging/test_cask.py`, `test_apt_repo.py` (runs `gpg` and `dpkg-deb`, available on
the Ubuntu runner and skipped with a message elsewhere), extended `test_deb.py`, and
`tests/installer/test_update_advice.py`.

## Vivaldi interface

Not touched: no selector and no change to the loader.

## Configuration

None in `config.json`. Secrets in GitHub Actions: `HOMEBREW_TAP_TOKEN`, `APT_SIGNING_KEY`.
Without them the two publish jobs report "not configured" and pass, so the release of a fork or of a
repository that has not done the setup yet still succeeds.

## CI and releases

- Pull requests: `package-deb` also checks that the sources file and the keyring are in the `.deb`
  and that `apt_repo.py` builds a repository from it and `apt-get` can read it with `file:` and the
  test key; `package-macos` runs `brew audit --cask` on the rendered cask with a placeholder
  checksum.
- `main`: after `upload-packages`, `publish-tap` and `publish-apt` run in parallel. Both are skipped
  when the release was not created, both can be re-run alone (NFR-2), and neither touches the release
  or the `dist` branch.
- The key is imported only in `publish-apt`; no pull request job can read it (FR-9).

## Risks

- **Pages latency**: Pages can take a minute to serve a new push; `apt update` right after a release
  may not see it yet. Acceptable.
- **Lost signing key**: users would have to install a `.deb` with a new key by hand. The runbook asks
  Tore to keep an offline copy of the private key.
- **Token expiry**: a fine-grained token expires; `publish-tap` fails with the GitHub error and the
  runbook says to renew it.
- **Quarantine and App Management after `brew upgrade`**: unchanged from spec 016 and explained in
  the caveats.
- **Detection of Homebrew installs**: the `Caskroom` check finds a cask installed once and removed by
  hand; the advice would be wrong. `brew upgrade` then reports that VivArcDi is not installed, which
  is a clear message, so no further check is made.
