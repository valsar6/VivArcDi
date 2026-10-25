from __future__ import annotations

import os
import platform
from abc import ABC, abstractmethod
from pathlib import Path

from .errors import UnsupportedPlatformError
from .hooks import AptHook, LaunchAgentHook, UpdateHook
from .installation import VivaldiInstallation
from .system import CommandRunner


class Platform(ABC):
    """Operating-system specific knowledge: where Vivaldi lives and how to hook updates."""

    name: str

    @abstractmethod
    def find_installations(self) -> list[VivaldiInstallation]:
        """Return every Vivaldi build found on this machine."""

    @property
    @abstractmethod
    def data_dir(self) -> Path:
        """Stable folder for the installer's own copy and the backups."""

    @property
    @abstractmethod
    def requires_root(self) -> bool:
        """True when installing needs administrator rights."""

    @abstractmethod
    def update_hook(self) -> UpdateHook:
        """The hook that reapplies VivArcDi after Vivaldi updates."""


class MacOSPlatform(Platform):
    """Vivaldi on macOS, installed as an app bundle in /Applications.

    Each bundle keeps window.html inside a versioned framework folder:
    Contents/Frameworks/<name> Framework.framework/Versions/<version>/Resources/vivaldi.
    """

    name = "macOS"
    APP_BUNDLES = {
        "stable": "Applications/Vivaldi.app",
        "snapshot": "Applications/Vivaldi Snapshot.app",
    }

    def __init__(self, root: Path = Path("/"), home: Path = Path.home(), runner: CommandRunner | None = None):
        self._root = root
        self._home = home
        self._runner = runner or CommandRunner()

    def find_installations(self) -> list[VivaldiInstallation]:
        installations = []
        for channel, versions_dir in self._versions_dirs():
            for version_dir in sorted(versions_dir.iterdir()):
                resources = version_dir / "Resources" / "vivaldi"
                if version_dir.name != "Current" and (resources / "window.html").is_file():
                    installations.append(VivaldiInstallation(channel, version_dir.name, resources))
        return installations

    @property
    def data_dir(self) -> Path:
        return self._home / "Library" / "Application Support" / "VivArcDi"

    @property
    def requires_root(self) -> bool:
        return False

    def update_hook(self) -> UpdateHook:
        watch_paths = [versions_dir for _, versions_dir in self._versions_dirs()]
        return LaunchAgentHook(self._home / "Library" / "LaunchAgents", watch_paths, self._runner)

    def _versions_dirs(self) -> list[tuple[str, Path]]:
        found = []
        for channel, bundle in self.APP_BUNDLES.items():
            frameworks = self._root / bundle / "Contents" / "Frameworks"
            if not frameworks.is_dir():
                continue
            for framework in sorted(frameworks.glob("*Framework.framework")):
                versions_dir = framework / "Versions"
                if versions_dir.is_dir():
                    found.append((channel, versions_dir))
        return found


class DebianPlatform(Platform):
    """Vivaldi on Debian and derivatives, installed from the official .deb package."""

    name = "Debian"
    PACKAGES = {
        "stable": ("opt/vivaldi", "vivaldi-stable"),
        "snapshot": ("opt/vivaldi-snapshot", "vivaldi-snapshot"),
    }

    def __init__(self, root: Path = Path("/"), runner: CommandRunner | None = None):
        self._root = root
        self._runner = runner or CommandRunner()

    def find_installations(self) -> list[VivaldiInstallation]:
        installations = []
        for channel, (install_dir, package) in self.PACKAGES.items():
            resources = self._root / install_dir / "resources" / "vivaldi"
            if (resources / "window.html").is_file():
                installations.append(VivaldiInstallation(channel, self._package_version(package), resources))
        return installations

    @property
    def data_dir(self) -> Path:
        return self._root / "usr" / "local" / "share" / "vivarcdi"

    @property
    def requires_root(self) -> bool:
        return True

    def update_hook(self) -> UpdateHook:
        return AptHook(self._root / "etc" / "apt" / "apt.conf.d" / "99vivarcdi")

    def _package_version(self, package: str) -> str:
        result = self._runner.run(["dpkg-query", "--showformat=${Version}", "--show", package])
        if not result.ok or not result.stdout.strip():
            return "unknown"
        return result.stdout.strip().split("-")[0]


class PlatformFactory:
    """Chooses the Platform for the machine the installer runs on."""

    def __init__(self, system: str | None = None, os_release: Path = Path("/etc/os-release")):
        self._system = system or platform.system()
        self._os_release = os_release

    def create(self) -> Platform:
        """Return the matching Platform.

        Raises UnsupportedPlatformError on anything but macOS and Debian-based Linux.
        """
        if self._system == "Darwin":
            return MacOSPlatform()
        if self._system == "Linux" and self._is_debian_based():
            return DebianPlatform()
        raise UnsupportedPlatformError(
            f"VivArcDi supports macOS and Debian-based Linux, not {self._system}"
        )

    def _is_debian_based(self) -> bool:
        if not self._os_release.exists():
            return False
        fields = {}
        for line in self._os_release.read_text().splitlines():
            key, _, value = line.partition("=")
            fields[key] = value.strip('"')
        family = {fields.get("ID", "")} | set(fields.get("ID_LIKE", "").split())
        return "debian" in family


def is_root() -> bool:
    """True when the installer runs with administrator rights."""
    return os.geteuid() == 0
