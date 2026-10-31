from __future__ import annotations

import sys
from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path

from .handoff import NoHandoff, ReapplyHandoff
from .hooks import PackageTriggerHook, UpdateHook
from .permissions import PermissionAdvisor
from .platforms import MacOSPlatform, Platform
from .staging import NoStager, SelfStager, Stager, staged_installer_path


class WindowAction(Enum):
    """What the window can do, and what a mode may show."""

    INSTALL = "install"
    UPDATE = "update"
    REAPPLY = "reapply"
    UNINSTALL = "uninstall"
    APPLY_SHORTCUTS = "apply_shortcuts"
    RESTORE_SHORTCUTS = "restore_shortcuts"


ALL_ACTIONS = frozenset(WindowAction)
SHORTCUT_ACTIONS = frozenset({WindowAction.APPLY_SHORTCUTS, WindowAction.RESTORE_SHORTCUTS})


class InstallMode(ABC):
    """Who manages VivArcDi on this machine, and what that changes.

    A mode decides the data folder, the update hook, whether the installer
    stages a copy of itself, how permission problems are explained and which
    window actions are shown. Subclasses only answer these questions.
    """

    name: str
    marker_name: str | None = None
    visible_actions: frozenset = ALL_ACTIONS
    settings_url: str | None = None

    @abstractmethod
    def supports(self, platform: Platform) -> bool:
        """True when the mode makes sense on the platform."""

    @abstractmethod
    def data_dir(self, platform: Platform) -> Path:
        """Folder for the backups and, in command line mode, the staged copy."""

    @abstractmethod
    def update_hook(self, platform: Platform) -> UpdateHook:
        """The hook that reapplies VivArcDi after Vivaldi updates."""

    @abstractmethod
    def permission_advisor(self, platform: Platform) -> PermissionAdvisor:
        """Explains how to fix a path the installer cannot write to."""

    @abstractmethod
    def reapply_command(self, repo_root: Path, data_dir: Path) -> list[str]:
        """The command, without options, that the update hook runs to reapply."""

    @abstractmethod
    def reapply_handoff(self, platform: Platform, reapply_command: list[str]) -> ReapplyHandoff:
        """Who runs `reapply` when the background hook cannot write to Vivaldi itself."""

    @abstractmethod
    def stager(self, repo_root: Path, data_dir: Path) -> Stager:
        """Stages a copy of the installer, or does nothing in package modes."""


class CommandLineMode(InstallMode):
    """Today's behavior: `python3 installer install`, a staged copy and the platform's own hook."""

    name = "cli"

    def supports(self, platform: Platform) -> bool:
        return True

    def data_dir(self, platform: Platform) -> Path:
        return platform.data_dir

    def update_hook(self, platform: Platform) -> UpdateHook:
        return platform.update_hook()

    def permission_advisor(self, platform: Platform) -> PermissionAdvisor:
        return platform.permission_advisor()

    def reapply_command(self, repo_root: Path, data_dir: Path) -> list[str]:
        return [sys.executable, str(staged_installer_path(data_dir)), "reapply"]

    def reapply_handoff(self, platform: Platform, reapply_command: list[str]) -> ReapplyHandoff:
        return platform.reapply_handoff(reapply_command)

    def stager(self, repo_root: Path, data_dir: Path) -> Stager:
        return SelfStager(repo_root, data_dir)


class MacAppMode(InstallMode):
    """The macOS app: its code lives in the bundle, so nothing is staged and no Terminal is used.

    `app_executable` is the file the launchd agent runs; the packaged app
    passes the executable inside `VivArcDi.app/Contents/MacOS`.
    """

    name = "app"
    marker_name = "app"
    settings_url = "x-apple.systempreferences:com.apple.preference.security?Privacy_AppBundles"

    def __init__(self, app_executable: Path | None = None):
        self._app_executable = app_executable or Path(sys.executable)

    def supports(self, platform: Platform) -> bool:
        return isinstance(platform, MacOSPlatform)

    def data_dir(self, platform: Platform) -> Path:
        return platform.package_data_dir

    def update_hook(self, platform: Platform) -> UpdateHook:
        return platform.update_hook()

    def permission_advisor(self, platform: Platform) -> PermissionAdvisor:
        return platform.permission_advisor()

    def reapply_command(self, repo_root: Path, data_dir: Path) -> list[str]:
        return [str(self._app_executable), "reapply", "--mode", self.name]

    def reapply_handoff(self, platform: Platform, reapply_command: list[str]) -> ReapplyHandoff:
        return NoHandoff()

    def stager(self, repo_root: Path, data_dir: Path) -> Stager:
        return NoStager()


class DebPackageMode(InstallMode):
    """The Debian package: dpkg owns the files and the trigger, so the window only offers shortcuts."""

    name = "deb"
    marker_name = "deb"
    visible_actions = SHORTCUT_ACTIONS

    def supports(self, platform: Platform) -> bool:
        return platform.name == "Debian"

    def data_dir(self, platform: Platform) -> Path:
        return platform.package_data_dir

    def update_hook(self, platform: Platform) -> UpdateHook:
        return PackageTriggerHook()

    def permission_advisor(self, platform: Platform) -> PermissionAdvisor:
        return platform.permission_advisor()

    def reapply_command(self, repo_root: Path, data_dir: Path) -> list[str]:
        return ["vivarcdi", "reapply", "--mode", self.name]

    def reapply_handoff(self, platform: Platform, reapply_command: list[str]) -> ReapplyHandoff:
        return NoHandoff()

    def stager(self, repo_root: Path, data_dir: Path) -> Stager:
        return NoStager()


MODES: tuple[InstallMode, ...] = (CommandLineMode(), MacAppMode(), DebPackageMode())


def mode_named(name: str) -> InstallMode:
    """The mode with this name: `cli`, `app` or `deb`. Raises KeyError for any other."""
    return {mode.name: mode for mode in MODES}[name]
