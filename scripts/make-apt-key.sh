#!/bin/sh
set -eu

root="$(cd "$(dirname "$0")/.." && pwd)"
keyring_name="vivarcdi-archive-keyring.gpg"
mode="maintainer"
output="${root}/packaging/apt"

case "${1:-}" in
"")
    ;;
--throwaway)
    mode="throwaway"
    output="${2:?usage: make-apt-key.sh --throwaway <folder>}"
    ;;
*)
    echo "usage: make-apt-key.sh [--throwaway <folder>]" >&2
    exit 2
    ;;
esac

if [ "${mode}" = "maintainer" ] && [ ! -t 1 ]; then
    echo "error: the private key is printed only to a terminal. Run this script directly in your shell." >&2
    exit 1
fi

umask 077
home="$(mktemp -d)"
cleanup() {
    gpgconf --homedir "${home}" --kill all > /dev/null 2>&1 || true
    rm -rf "${home}"
}
trap cleanup EXIT

gpg --homedir "${home}" --batch --no-tty --pinentry-mode loopback --passphrase "" \
    --quick-generate-key "VivArcDi archive signing key <25297596+valsar6@users.noreply.github.com>" ed25519 sign never
fingerprint="$(gpg --homedir "${home}" --with-colons --list-keys | awk -F: '/^fpr:/ { print $10; exit }')"

mkdir -p "${output}"
gpg --homedir "${home}" --export "${fingerprint}" > "${output}/${keyring_name}"
chmod 644 "${output}/${keyring_name}"

if [ "${mode}" = "throwaway" ]; then
    gpg --homedir "${home}" --armor --export-secret-keys "${fingerprint}" > "${output}/private.asc"
    exit 0
fi

echo
echo "Public keyring written to ${output}/${keyring_name}. Commit it."
echo "Key fingerprint: ${fingerprint}"
echo
echo "Copy everything between the lines into the repository secret APT_SIGNING_KEY,"
echo "and keep an offline copy. It is shown only once and is not saved anywhere."
echo "----------------------------------------------------------------"
gpg --homedir "${home}" --armor --export-secret-keys "${fingerprint}"
echo "----------------------------------------------------------------"
