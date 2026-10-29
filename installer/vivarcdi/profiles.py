from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Profile:
    """One Vivaldi profile folder that holds a Preferences file."""

    channel: str
    name: str
    preferences: Path

    @property
    def label(self) -> str:
        """Human-readable name used in messages."""
        return f"{self.channel} / {self.name}"


class ProfileLocator:
    """Finds the profiles under the user-data folders of Vivaldi builds."""

    def __init__(self, roots: list[tuple[str, Path]]):
        self._roots = roots

    def find(self) -> list[Profile]:
        """Return every profile with a Preferences file, stable before snapshot."""
        profiles = []
        for channel, root in self._roots:
            if not root.is_dir():
                continue
            for preferences in sorted(root.glob("*/Preferences")):
                profiles.append(Profile(channel, preferences.parent.name, preferences))
        return profiles
