from __future__ import annotations

import shlex
import stat
from abc import ABC, abstractmethod
from pathlib import Path

from .system import CommandRunner


class ReapplyHandoff(ABC):
    """Passes `reapply` to a process that has the rights the background hook lacks."""

    @property
    @abstractmethod
    def available(self) -> bool:
        """True when the background hook should hand off instead of writing itself."""

    @abstractmethod
    def request(self) -> None:
        """Ask the other process to run `reapply` now."""

    @abstractmethod
    def clear(self) -> None:
        """Delete anything `request` left behind."""


class NoHandoff(ReapplyHandoff):
    """For systems whose hook can write to Vivaldi itself, such as Debian."""

    @property
    def available(self) -> bool:
        return False

    def request(self) -> None:
        pass

    def clear(self) -> None:
        pass


class TerminalHandoff(ReapplyHandoff):
    """Opens Terminal to run `reapply` on macOS.

    App Management lets only the apps the user allowed change Vivaldi.app, and
    the launchd agent is not one of them, while the terminal used for
    `install` is. The agent therefore writes a `.command` script and opens it
    with Terminal, which runs it in a new window.
    """

    SCRIPT_NAME = "reapply.command"

    def __init__(self, data_dir: Path, reapply_command: list[str], runner: CommandRunner):
        self._script = data_dir / self.SCRIPT_NAME
        self._reapply_command = reapply_command
        self._runner = runner

    @property
    def available(self) -> bool:
        return True

    @property
    def script(self) -> Path:
        """Path of the script Terminal runs."""
        return self._script

    def request(self) -> None:
        self._script.parent.mkdir(parents=True, exist_ok=True)
        self._script.write_text(self._script_text())
        self._script.chmod(self._script.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        self._runner.run(["open", "-a", "Terminal", str(self._script)])

    def clear(self) -> None:
        self._script.unlink(missing_ok=True)

    def _script_text(self) -> str:
        return "\n".join(
            [
                "#!/bin/sh",
                "echo 'Vivaldi was updated: VivArcDi is being applied again.'",
                shlex.join(self._reapply_command),
                "echo",
                "echo 'Restart Vivaldi to load VivArcDi. You can close this window.'",
                "",
            ]
        )
