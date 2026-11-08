from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .preferences import InvalidPreferencesError, PreferencesDocument
from .preferences_backup import PreferencesBackupStore
from .profiles import Profile, ProfileLocator
from .reporter import Reporter
from .running import ProcessGuard

THEME_FILE = Path(__file__).with_name("theme.json")
THEMES_KEY = "vivaldi.themes"
USER_THEMES_KEY = "vivaldi.themes.user"
CURRENT_THEME_KEY = "vivaldi.themes.current"
PREVIOUS_THEME_KEY = "vivarcdi.theme.previous"
ALREADY_SET = "already set"
SYNC_NOTE = "If Vivaldi Sync carries themes, another device may overwrite them."


@dataclass(frozen=True)
class ThemeDefinition:
    """The user theme VivArcDi adds to Vivaldi: its id, its name and its settings."""

    fields: dict[str, Any]

    @classmethod
    def load(cls, source: Path = THEME_FILE) -> "ThemeDefinition":
        """Read the data file."""
        return cls(json.loads(source.read_text(encoding="utf-8")))

    @property
    def id(self) -> str:
        """The id under which the theme is stored and selected."""
        return self.fields["id"]

    @property
    def name(self) -> str:
        """The name Vivaldi shows."""
        return self.fields["name"]


class ThemeService:
    """Adds, selects and removes the VivArcDi Light theme in every Vivaldi profile."""

    def __init__(
        self,
        locator: ProfileLocator,
        theme: ThemeDefinition,
        backups: PreferencesBackupStore,
        guard: ProcessGuard,
        reporter: Reporter,
    ):
        self._locator = locator
        self._theme = theme
        self._backups = backups
        self._guard = guard
        self._reporter = reporter

    def apply(self, dry_run: bool = False) -> int:
        """Add the theme to every profile and select it. With dry_run, only print the changes.

        Returns the exit code; nothing is written when any profile is invalid.
        """
        return self._change(self._apply_to, dry_run, announce_sync=True)

    def restore(self) -> int:
        """Select the theme that was current before `apply` and remove the VivArcDi theme."""
        return self._change(self._restore_to, dry_run=False)

    def status(self, show_keys: bool = False) -> int:
        """Say, for each profile, which theme is selected; with show_keys, also the theme keys and ids."""
        for profile in self._locator.find():
            try:
                document = PreferencesDocument.load(profile.preferences)
            except InvalidPreferencesError as error:
                self._reporter.error(str(error))
                return 1
            self._reporter.info(f"{profile.label}: current theme {document.value(CURRENT_THEME_KEY)}")
            if show_keys:
                self._report_keys(profile, document)
        return 0

    def _change(self, action, dry_run: bool, announce_sync: bool = False) -> int:
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
            self._write(profile, document, action(document), dry_run)
        if announce_sync and not dry_run:
            self._reporter.info(SYNC_NOTE)
        return 0

    def _apply_to(self, document: PreferencesDocument) -> list[tuple[str, Any, Any]]:
        others = [entry for entry in self._user_themes(document) if entry.get("id") != self._theme.id]
        themes = [*others, dict(self._theme.fields)]
        current = document.value(CURRENT_THEME_KEY)
        wanted = [(USER_THEMES_KEY, document.value(USER_THEMES_KEY), themes)]
        if current != self._theme.id and current is not None and document.value(PREVIOUS_THEME_KEY) is None:
            wanted.append((PREVIOUS_THEME_KEY, None, current))
        wanted.append((CURRENT_THEME_KEY, current, self._theme.id))
        return [change for change in wanted if change[1] != change[2]]

    def _restore_to(self, document: PreferencesDocument) -> list[tuple[str, Any, Any]]:
        themes = [entry for entry in self._user_themes(document) if entry.get("id") != self._theme.id]
        changes = []
        if len(themes) != len(self._user_themes(document)):
            changes.append((USER_THEMES_KEY, document.value(USER_THEMES_KEY), themes))
        previous = document.value(PREVIOUS_THEME_KEY)
        if document.value(CURRENT_THEME_KEY) == self._theme.id:
            changes.append((CURRENT_THEME_KEY, self._theme.id, previous))
        if previous is not None:
            changes.append((PREVIOUS_THEME_KEY, previous, None))
        return [change for change in changes if change[1] != change[2]]

    def _write(self, profile: Profile, document: PreferencesDocument, changes: list, dry_run: bool) -> None:
        if not changes:
            self._reporter.info(f"{profile.label}: {ALREADY_SET}")
            return
        for key, current, new in changes:
            self._reporter.info(f"{profile.label}: {key}: {self._describe(current)} -> {self._describe(new)}")
        if dry_run:
            return
        self._backups.save(profile)
        for key, _, new in changes:
            self._store(document, key, new)
        document.save()
        self._reporter.info(f"{profile.label}: theme written")

    @staticmethod
    def _store(document: PreferencesDocument, key: str, value: Any) -> None:
        if value is None:
            document.remove_value(key)
        else:
            document.set_value(key, value)

    def _report_keys(self, profile: Profile, document: PreferencesDocument) -> None:
        keys = document.value(THEMES_KEY)
        names = sorted(keys) if isinstance(keys, dict) else []
        ids = [entry.get("id") for entry in self._user_themes(document)]
        self._reporter.info(f"{profile.label}: {THEMES_KEY} keys: {', '.join(names) or 'none'}")
        self._reporter.info(f"{profile.label}: user theme ids: {', '.join(map(str, ids)) or 'none'}")

    @staticmethod
    def _user_themes(document: PreferencesDocument) -> list[dict[str, Any]]:
        themes = document.value(USER_THEMES_KEY)
        return [entry for entry in themes if isinstance(entry, dict)] if isinstance(themes, list) else []

    def _describe(self, value: Any) -> str:
        if isinstance(value, list):
            return f"{len(value)} themes"
        return "none" if value is None else str(value)

    def _vivaldi_is_running(self) -> bool:
        if self._guard.is_running():
            self._reporter.error("Vivaldi is running: quit it completely and run the command again")
            return True
        return False
