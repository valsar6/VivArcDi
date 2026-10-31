from __future__ import annotations

import os
import platform
import pwd
from abc import ABC, abstractmethod
from pathlib import Path

from .errors import UnsupportedPlatformError
from .handoff import NoHandoff, ReapplyHandoff, TerminalHandoff
from .hooks import AptHook, LaunchAgentHook, UpdateHook
from .installation import VivaldiInstallation
from .permissions import MacOSAdvisor, PermissionAdvisor, SudoAdvisor
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
    def package_data_dir(self) -> Path:
        """Data folder of the packaged app or package, which holds the `managed-by` marker."""
        return self.data_dir

    @property
    @abstractmethod
    def requires_root(self) -> bool:
        """True when installing needs administrator rights."""

    @property
    def allows_root(self) -> bool:
        """False when running as root would leave files the user's hook cannot change."""
        return True

    @abstractmethod
    def update_hook(self) -> UpdateHook:
        """The hook that reapplies VivArcDi after Vivaldi updates."""

    @abstractmethod
    def permission_advisor(self) -> PermissionAdvisor:
        """Explains how to fix a path the installer cannot write to."""

    def reapply_handoff(self, reapply_command: list[str]) -> ReapplyHandoff:
        """Who runs `reapply` when the background hook cannot write to Vivaldi itself."""
        return NoHandoff()

    @property
    @abstractmethod
    def modifier(self) -> str:
        """The key Vivaldi calls the command modifier: `meta` or `ctrl`."""

    @abstractmethod
    def profile_roots(self) -> list[tuple[str, Path]]:
        """The user-data folder of each Vivaldi channel."""

    @abstractmethod
    def process_names(self) -> list[str]:
        """Names of the running Vivaldi processes."""


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
    def launch_agents_dir(self) -> Path:
        """Folder of the user's launchd agents."""
        return self._home / "Library" / "LaunchAgents"

    @property
    def requires_root(self) -> bool:
        return False

    @property
    def allows_root(self) -> bool:
        return False

    def update_hook(self) -> UpdateHook:
        watch_paths = [versions_dir for _, versions_dir in self._versions_dirs()]
        return LaunchAgentHook(self.launch_agents_dir, watch_paths, self._runner)

    def permission_advisor(self) -> PermissionAdvisor:
        return MacOSAdvisor()

    def reapply_handoff(self, reapply_command: list[str]) -> ReapplyHandoff:
        return TerminalHandoff(self.data_dir, reapply_command, self._runner)

    @property
    def modifier(self) -> str:
        return "meta"

    def profile_roots(self) -> list[tuple[str, Path]]:
        support = self._home / "Library" / "Application Support"
        return [("stable", support / "Vivaldi"), ("snapshot", support / "Vivaldi Snapshot")]

    def process_names(self) -> list[str]:
        return ["Vivaldi", "Vivaldi Snapshot"]

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

    def __init__(
        self,
        root: Path = Path("/"),
        runner: CommandRunner | None = None,
        home: Path | None = None,
    ):
        self._root = root
        self._runner = runner or CommandRunner()
        self._home = home or invoking_user_home()

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
    def package_data_dir(self) -> Path:
        return self._root / "var" / "lib" / "vivarcdi"

    @property
    def root(self) -> Path:
        """The filesystem root the platform looks under, `/` outside tests."""
        return self._root

    @property
    def requires_root(self) -> bool:
        return True

    def update_hook(self) -> UpdateHook:
        return AptHook(self._root / "etc" / "apt" / "apt.conf.d" / "99vivarcdi")

    def permission_advisor(self) -> PermissionAdvisor:
        return SudoAdvisor()

    @property
    def modifier(self) -> str:
        return "ctrl"

    def profile_roots(self) -> list[tuple[str, Path]]:
        config = self._home / ".config"
        return [("stable", config / "vivaldi"), ("snapshot", config / "vivaldi-snapshot")]

    def process_names(self) -> list[str]:
        return ["vivaldi-bin"]

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


def invoking_user_home() -> Path:
    """The home of the person at the keyboard, also when the installer runs under sudo."""
    sudo_user = os.environ.get("SUDO_USER")
    if sudo_user:
        try:
            return Path(pwd.getpwnam(sudo_user).pw_dir)
        except KeyError:
            pass
    return Path.home()


def is_root() -> bool:
    """True when the installer runs with administrator rights."""
    return os.geteuid() == 0
