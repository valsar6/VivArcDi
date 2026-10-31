from __future__ import annotations

import os
import plistlib
import shlex
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Callable

from .system import CommandRunner


class UpdateHook(ABC):
    """Something that runs `reapply` after Vivaldi updates itself."""

    @abstractmethod
    def install(self, command: list[str]) -> None:
        """Register the hook so that it runs `command` after each Vivaldi update."""

    @abstractmethod
    def remove(self) -> None:
        """Unregister the hook. Does nothing when it is not installed."""

    @abstractmethod
    def is_installed(self) -> bool:
        """Return True when the hook is registered."""

    @abstractmethod
    def describe(self) -> str:
        """One line telling the user what the hook is and where it lives."""

    def refresh(self, command: list[str]) -> bool:
        """Register the hook again when it runs something other than `command`. True when it did. Nothing by default."""
        return False


class AptHook(UpdateHook):
    """A DPkg::Post-Invoke rule: apt runs it after every package operation.

    `reapply` is cheap when nothing changed, so running it after unrelated
    upgrades is harmless.
    """

    def __init__(self, path: Path):
        self._path = path

    def install(self, command: list[str]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        shell_command = shlex.join(command).replace('"', '\\"')
        self._path.write_text(f'DPkg::Post-Invoke {{ "{shell_command} || true"; }};\n')

    def remove(self) -> None:
        self._path.unlink(missing_ok=True)

    def is_installed(self) -> bool:
        return self._path.exists()

    def describe(self) -> str:
        return f"apt hook {self._path}"


class PackageTriggerHook(UpdateHook):
    """The dpkg trigger declared by the vivarcdi package: dpkg owns it, so there is nothing to manage."""

    def install(self, command: list[str]) -> None:
        pass

    def remove(self) -> None:
        pass

    def is_installed(self) -> bool:
        return True

    def describe(self) -> str:
        return "dpkg trigger of the vivarcdi package"


class LaunchAgentHook(UpdateHook):
    """A per-user launchd agent that watches the Vivaldi app bundles.

    launchd starts `reapply` when a watched folder changes, which happens when
    Vivaldi installs an update, and also every few hours as a safety net.
    With a `bundle_id`, macOS lists the agent under that app in Login Items.
    """

    LABEL = "io.github.valsar6.vivarcdi.reapply"
    SAFETY_INTERVAL_SECONDS = 6 * 60 * 60

    def __init__(
        self,
        agents_dir: Path,
        watch_paths: list[Path],
        runner: CommandRunner,
        uid_provider: Callable[[], int] = os.getuid,
        bundle_id: str | None = None,
    ):
        self._bundle_id = bundle_id
        self._path = agents_dir / f"{self.LABEL}.plist"
        self._watch_paths = watch_paths
        self._runner = runner
        self._uid_provider = uid_provider

    def install(self, command: list[str]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        agent = {
            "Label": self.LABEL,
            "ProgramArguments": command,
            "WatchPaths": [str(path) for path in self._watch_paths],
            "StartInterval": self.SAFETY_INTERVAL_SECONDS,
            "RunAtLoad": False,
        }
        if self._bundle_id:
            agent["AssociatedBundleIdentifiers"] = [self._bundle_id]
        self._unload()
        with self._path.open("wb") as file:
            plistlib.dump(agent, file)
        self._runner.run(["launchctl", "bootstrap", self._domain, str(self._path)])

    def remove(self) -> None:
        if self._path.exists():
            self._unload()
            self._path.unlink()

    def is_installed(self) -> bool:
        return self._path.exists()

    def describe(self) -> str:
        return f"launchd agent {self._path}"

    def refresh(self, command: list[str]) -> bool:
        if not self._path.exists() or self._registered_command() == command:
            return False
        self.install(command)
        return True

    def _registered_command(self) -> list[str] | None:
        try:
            return plistlib.loads(self._path.read_bytes()).get("ProgramArguments")
        except (plistlib.InvalidFileException, ValueError, OSError):
            return None

    @property
    def _domain(self) -> str:
        return f"gui/{self._uid_provider()}"

    def _unload(self) -> None:
        if self._path.exists():
            self._runner.run(["launchctl", "bootout", self._domain, str(self._path)])
