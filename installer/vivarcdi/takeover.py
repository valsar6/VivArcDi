from __future__ import annotations

import os
import plistlib
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Callable

from .handoff import TerminalHandoff
from .hooks import LaunchAgentHook
from .staging import remove_staged_copy
from .system import CommandRunner

KEPT_FOLDERS = ("backups", "preferences-backups")


class LegacyTakeover(ABC):
    """Removes what a command line installation left behind, so a package can register its own hook."""

    @abstractmethod
    def run(self) -> bool:
        """Clean up the command line installation. Returns True when there was something to take over."""


class NoTakeover(LegacyTakeover):
    """For the command line mode, which has no earlier installation to replace."""

    def run(self) -> bool:
        return False


class MacOSTakeover(LegacyTakeover):
    """Removes the launchd agent that runs the staged Python, the Terminal script and the staged copy.

    An agent whose first program argument is the app executable belongs to
    the app and stays. The backups stay in the data folder, which is the
    same for the command line and the app.
    """

    def __init__(
        self,
        agent_plist: Path,
        data_dir: Path,
        app_executable: Path,
        runner: CommandRunner,
        uid_provider: Callable[[], int] = os.getuid,
    ):
        self._agent_plist = agent_plist
        self._data_dir = data_dir
        self._app_executable = app_executable
        self._runner = runner
        self._uid_provider = uid_provider

    def run(self) -> bool:
        removed_agent = self._remove_foreign_agent()
        removed_script = self._remove_terminal_script()
        removed_copy = remove_staged_copy(self._data_dir)
        return removed_agent or removed_script or removed_copy

    def _remove_foreign_agent(self) -> bool:
        if not self._agent_plist.exists() or self._agent_runs_the_app():
            return False
        self._runner.run(["launchctl", "bootout", f"gui/{self._uid_provider()}", str(self._agent_plist)])
        self._agent_plist.unlink()
        return True

    def _agent_runs_the_app(self) -> bool:
        try:
            agent = plistlib.loads(self._agent_plist.read_bytes())
        except (plistlib.InvalidFileException, ValueError, OSError):
            return False
        arguments = agent.get("ProgramArguments") or [""]
        return arguments[0] == str(self._app_executable)

    def _remove_terminal_script(self) -> bool:
        script = self._data_dir / TerminalHandoff.SCRIPT_NAME
        if not script.exists():
            return False
        script.unlink()
        return True


class DebianTakeover(LegacyTakeover):
    """Deletes the apt hook, moves the backups to the package's data folder and removes the old one."""

    def __init__(self, apt_hook: Path, legacy_dir: Path, data_dir: Path):
        self._apt_hook = apt_hook
        self._legacy_dir = legacy_dir
        self._data_dir = data_dir

    def run(self) -> bool:
        removed_hook = self._remove_apt_hook()
        moved = self._move_legacy_folder()
        return removed_hook or moved

    def _remove_apt_hook(self) -> bool:
        if not self._apt_hook.exists():
            return False
        self._apt_hook.unlink()
        return True

    def _move_legacy_folder(self) -> bool:
        if not self._legacy_dir.is_dir():
            return False
        for name in KEPT_FOLDERS:
            self._move_kept_folder(name)
        shutil.rmtree(self._legacy_dir)
        return True

    def _move_kept_folder(self, name: str) -> None:
        source = self._legacy_dir / name
        if source.is_dir():
            shutil.copytree(source, self._data_dir / name, dirs_exist_ok=True)
