from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "installer"))

from vivarcdi.hooks import LaunchAgentHook

TEMPLATE_PATH = Path(__file__).resolve().parent / "templates" / "vivarcdi.rb"
CHUNK_BYTES = 1024 * 1024
PLACEHOLDER_SHA256 = "0" * 64


class ChecksumReader:
    """Computes the SHA-256 of a file, which the cask uses to verify the download."""

    def read(self, path: Path) -> str:
        """The lowercase hexadecimal SHA-256 of the file at `path`."""
        digest = hashlib.sha256()
        with path.open("rb") as file:
            for chunk in iter(lambda: file.read(CHUNK_BYTES), b""):
                digest.update(chunk)
        return digest.hexdigest()


class CaskRenderer:
    """Fills the cask template with a version, a checksum and the launchd label of the installer."""

    def __init__(self, template: Path = TEMPLATE_PATH, launchd_label: str = LaunchAgentHook.LABEL):
        self._template = template
        self._launchd_label = launchd_label

    def render(self, version: str, sha256: str) -> str:
        """The text of `Casks/vivarcdi.rb` for the release `v<version>` whose `.dmg` has this checksum."""
        values = {"VERSION": version, "SHA256": sha256, "LAUNCHD_LABEL": self._launchd_label}
        text = self._template.read_text()
        for key, value in values.items():
            text = text.replace(f"@{key}@", value)
        return text


def main(argv: list[str]) -> int:
    """Command line: `cask.py --version X (--dmg FILE | --sha256 HEX) --out Casks/vivarcdi.rb`."""
    parser = argparse.ArgumentParser(description="Render the VivArcDi Homebrew cask.")
    parser.add_argument("--version", required=True)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--dmg", type=Path, help="the .dmg downloaded from the release")
    source.add_argument("--sha256", help="the checksum, e.g. a placeholder for validation")
    parser.add_argument("--out", type=Path, required=True)
    arguments = parser.parse_args(argv)
    checksum = arguments.sha256 or ChecksumReader().read(arguments.dmg)
    arguments.out.parent.mkdir(parents=True, exist_ok=True)
    arguments.out.write_text(CaskRenderer().render(arguments.version, checksum))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
