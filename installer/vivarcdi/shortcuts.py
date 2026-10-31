from __future__ import annotations

from .preferences import InvalidPreferencesError, PreferencesDocument, ShortcutTable
from .preferences_backup import PreferencesBackupStore
from .profiles import ProfileLocator
from .reporter import Reporter
from .running import ProcessGuard

ALREADY_SET = "already set"
SYNC_NOTE = "If Vivaldi Sync carries keyboard settings, another device may overwrite them."


class ShortcutService:
    """Applies, restores and reports the Arc-style shortcuts of every Vivaldi profile."""

    def __init__(
        self,
        locator: ProfileLocator,
        table: ShortcutTable,
        backups: PreferencesBackupStore,
        guard: ProcessGuard,
        reporter: Reporter,
    ):
        self._locator = locator
        self._table = table
        self._backups = backups
        self._guard = guard
        self._reporter = reporter

    def apply(self, dry_run: bool = False) -> int:
        """Write the table into every profile. With dry_run, only print the differences.

        Returns the exit code; nothing is written when any profile is invalid.
        """
        if not dry_run and self._vivaldi_is_running():
            return 1
        profiles = self._locator.find()
        if not profiles:
            self._reporter.error("No Vivaldi profile found")
            return 1
        try:
            documents = [(profile, PreferencesDocument.load(profile.preferences)) for profile in profiles]
        except InvalidPreferencesError as error:
            self._reporter.error(f"{error}. Nothing was changed.")
            return 1
        for profile, document in documents:
            self._apply_to(profile, document, dry_run)
        if not dry_run:
            self._reporter.info(SYNC_NOTE)
        return 0

    def restore(self) -> int:
        """Put the newest backup back into every profile that has one."""
        if self._vivaldi_is_running():
            return 1
        for profile in self._locator.find():
            if self._backups.restore(profile):
                self._reporter.info(f"Restored the shortcuts of {profile.label}")
            else:
                self._reporter.info(f"No backup for {profile.label}, left unchanged")
        return 0

    def has_backup(self) -> bool:
        """True when at least one profile has saved shortcuts that `restore` could put back."""
        return any(self._backups.latest(profile) is not None for profile in self._locator.find())

    def status(self) -> int:
        """Say, for each profile, whether the table matches."""
        for profile in self._locator.find():
            try:
                changes = PreferencesDocument.load(profile.preferences).plan(self._table)
            except InvalidPreferencesError as error:
                self._reporter.error(str(error))
                return 1
            state = "matches" if not changes else f"differs in {len(changes)} settings"
            self._reporter.info(f"{profile.label}: {state}")
        return 0

    def _apply_to(self, profile, document: PreferencesDocument, dry_run: bool) -> None:
        changes = document.plan(self._table)
        if not changes:
            self._reporter.info(f"{profile.label}: {ALREADY_SET}")
            return
        for change in changes:
            self._reporter.info(f"{profile.label}: {change.label}: {change.current} -> {change.new}")
        if dry_run:
            return
        self._backups.save(profile)
        document.apply(self._table)
        document.save()
        self._reporter.info(f"{profile.label}: shortcuts written")

    def _vivaldi_is_running(self) -> bool:
        if self._guard.is_running():
            self._reporter.error("Vivaldi is running: quit it completely and run the command again")
            return True
        return False
