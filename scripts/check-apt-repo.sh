#!/bin/sh
set -eu

root="$(cd "$(dirname "$0")/.." && pwd)"
deb="${1:?usage: check-apt-repo.sh <vivarcdi_x.y.z_all.deb>}"
version="$(basename "${deb}" | sed 's/^vivarcdi_\(.*\)_all\.deb$/\1/')"

work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

"${root}/scripts/make-apt-key.sh" --throwaway "${work}/key" > /dev/null 2>&1
APT_SIGNING_KEY="$(cat "${work}/key/private.asc")" python3 "${root}/packaging/apt/apt_repo.py" \
    --root "${work}/apt" --deb "${deb}" --date "2026-01-01T00:00:00Z"

mkdir -p "${work}/state/lists/partial" "${work}/cache/archives/partial" "${work}/sources"
cat > "${work}/sources/vivarcdi.sources" <<SOURCES
Types: deb
URIs: file://${work}/apt
Suites: stable
Components: main
Signed-By: ${work}/apt/vivarcdi-archive-keyring.gpg
SOURCES

apt_options="-o Dir::Etc::sourcelist=/dev/null -o Dir::Etc::sourceparts=${work}/sources -o Dir::State=${work}/state -o Dir::State::status=/var/lib/dpkg/status -o Dir::Cache=${work}/cache -o Debug::NoLocking=1 -o APT::Sandbox::User="

apt-get ${apt_options} update
apt-cache ${apt_options} policy vivarcdi | grep -q "Candidate: ${version}"
echo "apt reads the test repository and offers vivarcdi ${version}"
