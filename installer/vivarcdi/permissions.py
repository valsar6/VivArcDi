from __future__ import annotations

import getpass
import os
import pwd
from abc import ABC, abstractmethod
from pathlib import Path


def owner_of(path: Path) -> str:
    """Return the user name that owns a path, or its numeric id when unknown."""
    uid = path.stat().st_uid
    try:
        return pwd.getpwuid(uid).pw_name
    except KeyError:
        return str(uid)


def first_unwritable(paths: list[Path]) -> Path | None:
    """Return the first existing path the current user cannot write to, or None."""
    for path in paths:
        if path.exists() and not os.access(path, os.W_OK):
            return path
    return None


class PermissionAdvisor(ABC):
    """Explains to the user why a path is not writable and how to fix it."""

    @abstractmethod
    def explain(self, path: Path) -> str:
        """Return a message naming the blocked path and the command that unblocks it."""


class SudoAdvisor(PermissionAdvisor):
    """For systems where Vivaldi belongs to root by design, such as Debian."""

    def explain(self, path: Path) -> str:
        return f"Cannot write to {path}. Run the installer with sudo."


class MacOSAdvisor(PermissionAdvisor):
    """For macOS, where Vivaldi.app should belong to the user who runs it.

    Two causes are told apart: the bundle belongs to another user (often root,
    after an install or update made with an administrator password), or macOS
    App Management blocks the terminal from changing other apps.
    """

    def __init__(self, current_user: str | None = None):
        self._current_user = current_user or getpass.getuser()

    def explain(self, path: Path) -> str:
        bundle = self._app_bundle(path)
        owner = owner_of(path) if path.exists() else self._current_user
        if owner != self._current_user:
            return (
                f"Cannot write to {path}: it belongs to {owner}, not to {self._current_user}.\n"
                f"Give Vivaldi back to your user, then run the installer again:\n"
                f'  sudo chown -R {self._current_user} "{bundle}"'
            )
        return (
            f"macOS blocked the change to {path}.\n"
            "Open System Settings > Privacy & Security > App Management, allow your terminal app,\n"
            "then quit and reopen the terminal and run the installer again."
        )

    @staticmethod
    def _app_bundle(path: Path) -> Path:
        for candidate in (path, *path.parents):
            if candidate.suffix == ".app":
                return candidate
        return path
