from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

OWNER_LABELS = {"app": "the VivArcDi app", "deb": "the vivarcdi package"}


class PackageMarker:
    """The `managed-by` file in a data folder: it holds `app` or `deb` while a package manages VivArcDi."""

    FILE_NAME = "managed-by"

    def __init__(self, data_dir: Path):
        self._path = data_dir / self.FILE_NAME

    def write(self, owner: str) -> None:
        """Record which package manages VivArcDi."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(f"{owner}\n")

    def clear(self) -> None:
        """Delete the marker. Does nothing when there is none."""
        self._path.unlink(missing_ok=True)

    def owner(self) -> str | None:
        """The recorded owner, or None when no package manages VivArcDi."""
        if not self._path.is_file():
            return None
        return self._path.read_text().strip() or None


class Ownership(ABC):
    """Who may install: the package that wrote the marker, or the command line when there is none."""

    @abstractmethod
    def conflict(self) -> str | None:
        """An error message when this mode must not install, or None when it may."""

    @abstractmethod
    def claim(self) -> None:
        """Record that this mode manages VivArcDi."""

    @abstractmethod
    def release(self) -> None:
        """Forget that anything manages VivArcDi."""

    @abstractmethod
    def is_registered(self) -> bool:
        """True when VivArcDi is installed and managed by this mode."""


class CommandLineOwnership(Ownership):
    """Defers to a package: the command line leaves an installation that a package manages alone."""

    def __init__(self, package_marker: PackageMarker):
        self._marker = package_marker

    def conflict(self) -> str | None:
        owner = self._marker.owner()
        if owner is None:
            return None
        manager = OWNER_LABELS.get(owner, "a package")
        return f"VivArcDi is managed by {manager}. Use it to install, update or remove VivArcDi."

    def claim(self) -> None:
        pass

    def release(self) -> None:
        self._marker.clear()

    def is_registered(self) -> bool:
        return False


class PackageOwnership(Ownership):
    """A package mode writes the marker on install and deletes it on uninstall."""

    def __init__(self, marker: PackageMarker, owner: str):
        self._marker = marker
        self._owner = owner

    def conflict(self) -> str | None:
        return None

    def claim(self) -> None:
        self._marker.write(self._owner)

    def release(self) -> None:
        self._marker.clear()

    def is_registered(self) -> bool:
        return self._marker.owner() == self._owner
