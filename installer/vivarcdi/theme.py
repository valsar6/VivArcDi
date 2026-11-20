from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

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
class ThemeCatalog:
    """The user themes VivArcDi adds to Vivaldi, in the order the user is offered them."""

    themes: list[dict[str, Any]]

    @classmethod
    def load(cls, source: Path = THEME_FILE) -> "ThemeCatalog":
        """Read the data file."""
        return cls(json.loads(source.read_text(encoding="utf-8"))["themes"])

    @property
    def ids(self) -> list[str]:
        """The theme ids, the default first."""
        return [theme["id"] for theme in self.themes]

    @property
    def default_id(self) -> str:
        """The theme selected when none is named."""
        return self.themes[0]["id"]

    def get(self, theme_id: str) -> dict[str, Any]:
        """The theme with that id; raises KeyError when there is none."""
        return next(theme for theme in self.themes if theme["id"] == theme_id)

    def settings(self, theme_id: str) -> dict[str, Any]:
        """What Vivaldi stores for a theme: its fields without the credit."""
        return {key: value for key, value in self.get(theme_id).items() if key != "credit"}


class ThemeService:
    """Adds the VivArcDi themes, selects one and removes them again in every Vivaldi profile."""

    def __init__(
        self,
        locator: ProfileLocator,
        catalog: ThemeCatalog,
        backups: PreferencesBackupStore,
        guard: ProcessGuard,
        reporter: Reporter,
    ):
        self._locator = locator
        self._catalog = catalog
        self._backups = backups
        self._guard = guard
        self._reporter = reporter

    def options(self) -> list[tuple[str, str]]:
        """The id and name of every theme, in the order of the catalog."""
        return [(theme["id"], theme["name"]) for theme in self._catalog.themes]

    @property
    def default_id(self) -> str:
        """The theme `apply` selects when none is named."""
        return self._catalog.default_id

    def apply(self, theme_id: Optional[str] = None, dry_run: bool = False) -> int:
        """Add every theme to every profile and select `theme_id` (the default when None).

        With dry_run, only print the changes. Returns the exit code; nothing is written when the id is
        unknown or any profile is invalid.
        """
        chosen = theme_id or self._catalog.default_id
        if chosen not in self._catalog.ids:
            self._reporter.error(f"Unknown theme {chosen}. Themes: {', '.join(self._catalog.ids)}")
            return 1
        return self._change(lambda document: self._apply_to(document, chosen), dry_run, announce_sync=True)

    def restore(self) -> int:
        """Select the theme that was current before `apply` and remove the VivArcDi themes."""
        return self._change(self._restore_to, dry_run=False)

    def list(self) -> int:
        """Print the id, name and credit of every theme."""
        for theme in self._catalog.themes:
            self._reporter.info(f"{theme['id']}: {theme['name']} ({theme['credit']})")
        return 0

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

    def _apply_to(self, document: PreferencesDocument, theme_id: str) -> list[tuple[str, Any, Any]]:
        ours = self._catalog.ids
        others = [entry for entry in self._user_themes(document) if entry.get("id") not in ours]
        themes = [*others, *(self._catalog.settings(identifier) for identifier in ours)]
        current = document.value(CURRENT_THEME_KEY)
        wanted = [(USER_THEMES_KEY, document.value(USER_THEMES_KEY), themes)]
        if current not in ours and current is not None and document.value(PREVIOUS_THEME_KEY) is None:
            wanted.append((PREVIOUS_THEME_KEY, None, current))
        wanted.append((CURRENT_THEME_KEY, current, theme_id))
        return [change for change in wanted if change[1] != change[2]]

    def _restore_to(self, document: PreferencesDocument) -> list[tuple[str, Any, Any]]:
        ours = self._catalog.ids
        themes = [entry for entry in self._user_themes(document) if entry.get("id") not in ours]
        changes = []
        if len(themes) != len(self._user_themes(document)):
            changes.append((USER_THEMES_KEY, document.value(USER_THEMES_KEY), themes))
        previous = document.value(PREVIOUS_THEME_KEY)
        current = document.value(CURRENT_THEME_KEY)
        if current in ours:
            changes.append((CURRENT_THEME_KEY, current, previous))
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
