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


def app_bundle_of(path: Path) -> Path:
    """Return the `.app` bundle that contains a path, or the path itself when it is in none."""
    for candidate in (path, *path.parents):
        if candidate.suffix == ".app":
            return candidate
    return path


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
    """For macOS, where two protections can block the installer.

    App Management stops any program, even with sudo, from changing a signed
    app unless the user allowed it, so it always comes first. If the bundle
    also belongs to another user (often root), it must be given back to the
    user who runs Vivaldi, which only works once App Management allows it.
    """

    def __init__(self, current_user: str | None = None):
        self._current_user = current_user or getpass.getuser()

    def explain(self, path: Path) -> str:
        bundle = app_bundle_of(path)
        owner = owner_of(path) if path.exists() else self._current_user
        steps = [
            "Open System Settings > Privacy & Security > App Management and allow your terminal app.",
            "Quit the terminal completely (Cmd+Q) and open it again.",
        ]
        if owner != self._current_user:
            steps.append(f'Give Vivaldi back to your user: sudo chown -R {self._current_user} "{bundle}"')
        steps.append("Run the installer again, without sudo.")
        numbered = "\n".join(f"  {index}. {step}" for index, step in enumerate(steps, start=1))
        return f"macOS did not let the installer change {path} (owner: {owner}).\n{numbered}"


class AppManagementAdvisor(PermissionAdvisor):
    """For the macOS app: the permission belongs to VivArcDi itself, so the advice is a setting, not a tool."""

    def explain(self, path: Path) -> str:
        bundle = app_bundle_of(path)
        return (
            f"macOS did not let VivArcDi change {bundle.name}. "
            "Open System Settings > Privacy & Security > App Management, turn VivArcDi on, "
            "then come back here and press Try again."
        )
