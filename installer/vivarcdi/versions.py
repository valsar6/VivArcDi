from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable

from .releases import parse_version
from .staging import staged_installer_path

VERSION_LINE = re.compile(r'^__version__\s*=\s*"([^"]+)"', re.MULTILINE)


def read_staged_version(data_dir: Path) -> str | None:
    """The version of the installer staged in a data folder, or None when there is none or it cannot be read."""
    try:
        text = (staged_installer_path(data_dir) / "vivarcdi" / "__init__.py").read_text()
    except OSError:
        return None
    match = VERSION_LINE.search(text)
    return match.group(1) if match else None


class VersionGuard:
    """Compares VivArcDi versions with one of its own, so the installer never replaces a newer one by mistake.

    A version that cannot be parsed as `X.Y.Z` is neither newer nor older than another one.
    """

    def __init__(self, own: str):
        self.own = own

    def is_newer(self, version: str | None) -> bool:
        """True when `version` is a higher VivArcDi version than the own one."""
        theirs, mine = self._pair(version)
        return theirs is not None and mine is not None and theirs > mine

    def is_older(self, version: str | None) -> bool:
        """True when `version` is a lower VivArcDi version than the own one."""
        theirs, mine = self._pair(version)
        return theirs is not None and mine is not None and theirs < mine

    @staticmethod
    def highest(versions: Iterable[str | None]) -> str | None:
        """The highest of the versions that can be parsed, or None when there is none."""
        readable = [version for version in versions if version is not None and parse_version(version) is not None]
        return max(readable, key=parse_version, default=None)

    def _pair(self, version: str | None) -> tuple:
        return (None if version is None else parse_version(version)), parse_version(self.own)
