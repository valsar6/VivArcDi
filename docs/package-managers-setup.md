# Package managers: one-time setup

[Spec 017](../specs/017-package-managers/spec.md) publishes every release to a Homebrew tap and to a
signed apt repository. CI does the publishing; this runbook lists what the maintainer does once by
hand. Until a step is done, the matching CI job prints "not configured" and passes, so releases keep
working.

| Step | What you do | Secret or file it produces |
|---|---|---|
| 1 | Create the tap repository | `valsar6/homebrew-vivarcdi` |
| 2 | Create a token for it | secret `HOMEBREW_TAP_TOKEN` |
| 3 | Create the apt signing key | secret `APT_SIGNING_KEY` and the file `packaging/apt/vivarcdi-archive-keyring.gpg` |
| 4 | Enable GitHub Pages | the site `https://valsar6.github.io/vivarcdi/apt` |
| 5 | Check with a test release | |
| 6 | Rotate the key, renew the token | |

## 1. Tap repository

1. On GitHub create the empty **public** repository `valsar6/homebrew-vivarcdi` (the name must start
   with `homebrew-`). Add a README on creation, so that the default branch exists.
2. Check: `https://github.com/valsar6/homebrew-vivarcdi` opens and has a `main` branch.

## 2. Token for the tap

1. Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token.
2. Resource owner `valsar6`, repository access **Only select repositories** > `homebrew-vivarcdi`,
   permission **Contents: Read and write**, an expiry of your choice.
3. In `valsar6/vivarcdi`, Settings > Secrets and variables > Actions > New repository secret, name
   `HOMEBREW_TAP_TOKEN`, value the token.
4. Check: the `publish-tap` job of the next release creates `Casks/vivarcdi.rb` in the tap.

## 3. Signing key and keyring

Do this before merging the pull request of spec 017: the Debian package is built with the public
keyring, and `main` refuses to build the package without it.

1. On your own computer, in a terminal, run `scripts/make-apt-key.sh`. It creates an Ed25519 key in a
   temporary folder, writes the public keyring to `packaging/apt/vivarcdi-archive-keyring.gpg`, prints
   the private key on the terminal and deletes the temporary folder. It refuses to print the key
   anywhere but a terminal, and it commits nothing.
2. Copy the private key block, including the `BEGIN` and `END` lines, into the repository secret
   `APT_SIGNING_KEY` (Settings > Secrets and variables > Actions). Keep an offline copy, for example in
   your password manager: if the key is lost, users have to install a `.deb` with a new key by hand.
3. Commit `packaging/apt/vivarcdi-archive-keyring.gpg`. It is the public key and is safe to publish.
4. Check: `gpg --show-keys packaging/apt/vivarcdi-archive-keyring.gpg` shows one Ed25519 key.

The package build looks for that file. A pull request build without it uses a throwaway test key, and
`python3 packaging/debian/build_deb.py --keyring <file>` or the variable `VIVARCDI_KEYRING` point the
build to another keyring.

## 4. GitHub Pages

1. Merge the pull request and let the first release run: `publish-apt` creates the `gh-pages` branch.
2. Settings > Pages > Build and deployment > Source **Deploy from a branch**, branch `gh-pages`,
   folder `/ (root)`.
3. Check: `https://valsar6.github.io/vivarcdi/apt/dists/stable/InRelease` shows a signed message
   (Pages may need a minute).

## 5. Check with a release

After the release that carries the setup:

- `brew info --cask valsar6/vivarcdi/vivarcdi` shows the new version.
- On Debian 13, install the `.deb`, then `sudo apt update` reads the VivArcDi repository without a
  warning and `apt-cache policy vivarcdi` lists the new version.

A failed publish job is repaired by running that job again; publishing twice changes nothing.

## 6. Rotation and renewal

- **Token:** before the token expires, create a new one as in step 2 and replace the secret. When
  `publish-tap` fails with an authentication error, the token has expired.
- **Signing key:** run `scripts/make-apt-key.sh` again but do not replace the secret yet. Commit the new
  keyring and release once: that release is still signed by the old key and carries the new keyring in
  the package, so installed copies receive it. Then replace `APT_SIGNING_KEY` with the new private key.
- **Revoke** an old token under Settings > Developer settings, and delete the old private key from every
  place that held it.
