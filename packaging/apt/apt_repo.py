from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import os
import re
import shutil
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from typing import Callable, Iterator

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "installer"))

from vivarcdi.releases import parse_version

SUITE = "stable"
COMPONENT = "main"
ARCHITECTURE = "all"
POOL_FOLDER = Path("pool") / COMPONENT / "v" / "vivarcdi"
PACKAGES_FOLDER = Path("dists") / SUITE / COMPONENT / f"binary-{ARCHITECTURE}"
DEB_NAME = re.compile(r"^vivarcdi_(\d+\.\d+\.\d+)_all\.deb$")
KEYRING_NAME = "vivarcdi-archive-keyring.gpg"
ARMORED_KEYRING_NAME = "vivarcdi-archive-keyring.asc"
KEY_VARIABLE = "APT_SIGNING_KEY"
VERSIONS_KEPT = 3
CHUNK_BYTES = 1024 * 1024
GPG_AGENT_FOLDER_MODE = 0o700

Runner = Callable[..., subprocess.CompletedProcess]


class AptRepositoryError(Exception):
    """The repository cannot be built or signed, with a message that says what to do."""


def pool_version(deb: Path) -> tuple[int, int, int]:
    """The version in the name of a pool file, as numbers to compare."""
    match = DEB_NAME.match(deb.name)
    version = parse_version(match.group(1)) if match else None
    if version is None:
        raise AptRepositoryError(f"{deb.name} is not named vivarcdi_<version>_all.deb")
    return version


def digest(path: Path, algorithm: str) -> str:
    """The lowercase hexadecimal digest of a file."""
    hasher = hashlib.new(algorithm)
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(CHUNK_BYTES), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


class PackageIndex:
    """Writes the `Packages` index: the control fields of each `.deb` plus where it is and its digests."""

    def __init__(self, run: Runner = subprocess.run):
        self._run = run

    def render(self, root: Path, debs: list[Path]) -> str:
        """The `Packages` text for `debs`, which live under the repository `root`, newest version first."""
        ordered = sorted(debs, key=pool_version, reverse=True)
        return "".join(self._entry(root, deb) + "\n\n" for deb in ordered)

    def _entry(self, root: Path, deb: Path) -> str:
        fields = [
            self._control(deb),
            f"Filename: {deb.relative_to(root).as_posix()}",
            f"Size: {deb.stat().st_size}",
            f"MD5sum: {digest(deb, 'md5')}",
            f"SHA1: {digest(deb, 'sha1')}",
            f"SHA256: {digest(deb, 'sha256')}",
        ]
        return "\n".join(fields)

    def _control(self, deb: Path) -> str:
        try:
            result = self._run(["dpkg-deb", "-f", str(deb)], capture_output=True, text=True)
        except FileNotFoundError as error:
            raise AptRepositoryError("dpkg-deb is not installed. Install the dpkg package") from error
        if result.returncode != 0:
            raise AptRepositoryError(f"dpkg-deb cannot read {deb.name}: {result.stderr.strip()}")
        return result.stdout.strip()


class RetentionPolicy:
    """Keeps the highest versions in the pool and deletes the rest."""

    def __init__(self, keep: int = VERSIONS_KEPT):
        self._keep = keep

    def prune(self, pool: Path) -> list[Path]:
        """Delete all but the newest versions of `vivarcdi_*.deb` in `pool`. Returns the files it deleted."""
        debs = sorted((path for path in pool.glob("vivarcdi_*.deb") if DEB_NAME.match(path.name)), key=pool_version)
        stale = debs[: max(len(debs) - self._keep, 0)]
        for path in stale:
            path.unlink()
        return stale


class ReleaseSigner:
    """Signs the `Release` file with a private key that it imports into a temporary GnuPG home.

    The key is passed to gpg on its standard input and the home is deleted after every operation,
    so the key reaches neither a command line, a log nor the disk outside that folder.
    """

    def __init__(self, private_key: str, run: Runner = subprocess.run):
        self._private_key = private_key
        self._run = run

    def sign(self, release: Path, in_release: Path, detached: Path) -> None:
        """Write the clear-signed `InRelease` and the armored detached `Release.gpg` of `release`."""
        with self._session() as (home, fingerprint):
            base = self._base(home) + ["--digest-algo", "SHA256", "--local-user", fingerprint]
            self._gpg(base + ["--yes", "--clearsign", "--output", str(in_release), str(release)])
            self._gpg(base + ["--yes", "--armor", "--detach-sign", "--output", str(detached), str(release)])

    def export_public_key(self, keyring: Path, armored: Path) -> None:
        """Write the public key as a binary keyring and as armored text."""
        with self._session() as (home, fingerprint):
            base = self._base(home) + ["--yes"]
            self._gpg(base + ["--output", str(keyring), "--export", fingerprint])
            self._gpg(base + ["--armor", "--output", str(armored), "--export", fingerprint])

    @contextmanager
    def _session(self) -> Iterator[tuple[Path, str]]:
        home = Path(tempfile.mkdtemp(prefix="vivarcdi-gnupg-"))
        home.chmod(GPG_AGENT_FOLDER_MODE)
        try:
            self._gpg(self._base(home) + ["--import"], self._private_key)
            yield home, self._fingerprint(home)
        finally:
            self._run(["gpgconf", "--homedir", str(home), "--kill", "all"], capture_output=True, check=False)
            shutil.rmtree(home, ignore_errors=True)

    def _fingerprint(self, home: Path) -> str:
        listing = self._gpg(self._base(home) + ["--with-colons", "--list-secret-keys"])
        for line in listing.splitlines():
            if line.startswith("fpr:"):
                return line.split(":")[9]
        raise AptRepositoryError(f"{KEY_VARIABLE} holds no private key")

    @staticmethod
    def _base(home: Path) -> list[str]:
        return ["gpg", "--homedir", str(home), "--batch", "--no-tty", "--pinentry-mode", "loopback", "--passphrase", ""]

    def _gpg(self, command: list[str], stdin: str | None = None) -> str:
        try:
            result = self._run(command, input=stdin, capture_output=True, text=True)
        except FileNotFoundError as error:
            raise AptRepositoryError("gpg is not installed. Install the gnupg package") from error
        if result.returncode != 0:
            raise AptRepositoryError(f"gpg failed: {result.stderr.strip()}")
        return result.stdout


class AptRepository:
    """A flat-pool apt repository in a folder: add a `.deb`, then `publish` to refresh and sign the indexes.

    Publishing the same packages with the same date changes no file, so running a job again is harmless.
    """

    def __init__(self, root: Path, index: PackageIndex, retention: RetentionPolicy, signer: ReleaseSigner):
        self._root = root
        self._index = index
        self._retention = retention
        self._signer = signer

    @property
    def pool(self) -> Path:
        """The folder that holds the `.deb` files."""
        return self._root / POOL_FOLDER

    def add(self, deb: Path) -> Path:
        """Copy `deb` into the pool, replacing a file of the same version, and return the pooled path."""
        pool_version(deb)
        self.pool.mkdir(parents=True, exist_ok=True)
        target = self.pool / deb.name
        if not target.exists() or digest(target, "sha256") != digest(deb, "sha256"):
            shutil.copyfile(deb, target)
        return target

    def publish(self, date: datetime) -> None:
        """Drop old versions, rewrite `Packages` and `Release` and sign them, only where something changed."""
        self._retention.prune(self.pool)
        packages = self._index.render(self._root, sorted(self.pool.glob("vivarcdi_*.deb")))
        folder = self._root / PACKAGES_FOLDER
        folder.mkdir(parents=True, exist_ok=True)
        self._write(folder / "Packages", packages.encode("utf-8"))
        self._write(folder / "Packages.gz", self._compressed(packages))
        self._write_release(date)
        self._export_keys()

    def _write_release(self, date: datetime) -> None:
        release = self._root / "dists" / SUITE / "Release"
        in_release = release.with_name("InRelease")
        detached = release.with_name("Release.gpg")
        changed = self._write(release, self._release_text(date).encode("utf-8"))
        if changed or not in_release.is_file() or not detached.is_file():
            self._signer.sign(release, in_release, detached)

    def _release_text(self, date: datetime) -> str:
        lines = [
            "Origin: VivArcDi",
            "Label: VivArcDi",
            f"Suite: {SUITE}",
            f"Codename: {SUITE}",
            f"Date: {format_datetime(date.astimezone(timezone.utc), usegmt=True)}",
            f"Architectures: {ARCHITECTURE}",
            f"Components: {COMPONENT}",
            "Description: VivArcDi apt repository",
            "SHA256:",
        ]
        for name in ("Packages", "Packages.gz"):
            path = self._root / PACKAGES_FOLDER / name
            relative = (PACKAGES_FOLDER / name).relative_to(Path("dists") / SUITE).as_posix()
            lines.append(f" {digest(path, 'sha256')} {path.stat().st_size:>16} {relative}")
        return "\n".join(lines) + "\n"

    def _export_keys(self) -> None:
        self._signer.export_public_key(self._root / KEYRING_NAME, self._root / ARMORED_KEYRING_NAME)

    @staticmethod
    def _compressed(text: str) -> bytes:
        buffer = io.BytesIO()
        with gzip.GzipFile("", "wb", 9, buffer, mtime=0) as packed:
            packed.write(text.encode("utf-8"))
        return buffer.getvalue()

    @staticmethod
    def _write(path: Path, content: bytes) -> bool:
        if path.is_file() and path.read_bytes() == content:
            return False
        path.write_bytes(content)
        return True


def parse_date(text: str) -> datetime:
    """An ISO 8601 date such as `2026-11-01T10:00:00Z`; a date without a zone is read as UTC."""
    moment = datetime.fromisoformat(text.replace("Z", "+00:00"))
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def main(argv: list[str]) -> int:
    """Command line: `apt_repo.py --root apt --date ISO [--deb FILE ...]`; the key is read from APT_SIGNING_KEY."""
    parser = argparse.ArgumentParser(description="Add packages to the VivArcDi apt repository and sign it.")
    parser.add_argument("--root", type=Path, required=True, help="the repository folder")
    parser.add_argument("--deb", type=Path, action="append", default=[], help="a package to add")
    parser.add_argument(
        "--date", required=True, help="the Date of the Release file: the time the GitHub release was published"
    )
    arguments = parser.parse_args(argv)
    key = os.environ.get(KEY_VARIABLE, "")
    if not key.strip():
        print(f"error: {KEY_VARIABLE} is not set", file=sys.stderr)
        return 1
    repository = AptRepository(arguments.root, PackageIndex(), RetentionPolicy(), ReleaseSigner(key))
    try:
        for deb in arguments.deb:
            repository.add(deb)
        repository.publish(parse_date(arguments.date))
    except AptRepositoryError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
