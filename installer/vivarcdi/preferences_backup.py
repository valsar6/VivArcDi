from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Callable

from .preferences import AtomicFile
from .profiles import Profile


class PreferencesBackupStore:
    """Keeps timestamped copies of each profile's Preferences before it is changed."""

    def __init__(self, root: Path, clock: Callable[[], datetime] = datetime.now):
        self._root = root
        self._clock = clock

    def save(self, profile: Profile) -> Path:
        """Copy the current Preferences into the store and return the copy."""
        target = self._folder(profile) / f"Preferences.{self._clock():%Y%m%dT%H%M%S%f}"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(profile.preferences.read_bytes())
        return target

    def latest(self, profile: Profile) -> Path | None:
        """The newest backup of a profile, or None when there is none."""
        folder = self._folder(profile)
        if not folder.is_dir():
            return None
        backups = sorted(folder.glob("Preferences.*"))
        return backups[-1] if backups else None

    def restore(self, profile: Profile) -> bool:
        """Put the newest backup back; False when there is none."""
        backup = self.latest(profile)
        if backup is None:
            return False
        AtomicFile(profile.preferences).copy_from(backup)
        return True

    def _folder(self, profile: Profile) -> Path:
        return self._root / f"{profile.channel}-{profile.name}"
