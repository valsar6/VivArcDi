from __future__ import annotations

import json
import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .errors import VivArcDiError

TABLE_FILE = Path(__file__).with_name("shortcuts.json")


class InvalidPreferencesError(VivArcDiError):
    """A Preferences file is not valid JSON or lacks the expected structure."""


@dataclass(frozen=True)
class Change:
    """One setting that differs from the table."""

    label: str
    current: Any
    new: Any


@dataclass(frozen=True)
class ShortcutTable:
    """The Arc-style settings: options to turn on and the shortcuts of each command."""

    options: dict[str, Any]
    commands: dict[str, list[str]]

    @classmethod
    def load(cls, modifier: str, source: Path = TABLE_FILE) -> "ShortcutTable":
        """Read the data file and replace `{mod}` with the platform's modifier key."""
        raw = json.loads(source.read_text(encoding="utf-8"))
        commands = {
            name: [key.replace("{mod}", modifier) for key in keys]
            for name, keys in raw["commands"].items()
        }
        return cls(raw["options"], commands)

    @property
    def claimed_keys(self) -> set[str]:
        """Every key the table assigns, which no other command may keep."""
        return {key for keys in self.commands.values() for key in keys}


class PreferencesDocument:
    """A Vivaldi Preferences file that can be compared with a table and rewritten."""

    def __init__(self, path: Path, data: dict[str, Any]):
        self._path = path
        self._data = data

    @classmethod
    def load(cls, path: Path) -> "PreferencesDocument":
        """Parse a Preferences file.

        Raises InvalidPreferencesError when it is not JSON or has no `vivaldi.actions` block.
        """
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise InvalidPreferencesError(f"{path} is not valid JSON: {error}") from error
        actions = data.get("vivaldi", {}).get("actions") if isinstance(data, dict) else None
        if not isinstance(actions, list) or not actions or not isinstance(actions[0], dict):
            raise InvalidPreferencesError(f"{path} has no vivaldi.actions block")
        return cls(path, data)

    def plan(self, table: ShortcutTable) -> list[Change]:
        """Return what applying the table would change; empty when it already matches."""
        changes = []
        for dotted, wanted in table.options.items():
            current = self._option(dotted)
            if current != wanted:
                changes.append(Change(dotted, current, wanted))
        commands = self._commands()
        for name, wanted_keys in table.commands.items():
            current_keys = commands.get(name, {}).get("shortcuts", [])
            if current_keys != wanted_keys:
                changes.append(Change(name, current_keys, wanted_keys))
        claimed = table.claimed_keys
        for name, entry in commands.items():
            held = [key for key in entry.get("shortcuts", []) if key in claimed]
            if name not in table.commands and held:
                kept = [key for key in entry["shortcuts"] if key not in claimed]
                changes.append(Change(name, entry["shortcuts"], kept))
        return changes

    def apply(self, table: ShortcutTable) -> None:
        """Write the table into the document, leaving every other setting as it is."""
        for dotted, wanted in table.options.items():
            self._set_option(dotted, wanted)
        commands = self._commands()
        claimed = table.claimed_keys
        for name, entry in commands.items():
            if name not in table.commands and "shortcuts" in entry:
                entry["shortcuts"] = [key for key in entry["shortcuts"] if key not in claimed]
        for name, wanted_keys in table.commands.items():
            commands.setdefault(name, {})["shortcuts"] = list(wanted_keys)

    def save(self) -> None:
        """Write the document atomically: a temporary file next to it, then a rename."""
        text = json.dumps(self._data, ensure_ascii=False, separators=(",", ":"))
        AtomicFile(self._path).write_text(text)

    def _commands(self) -> dict[str, Any]:
        return self._data["vivaldi"]["actions"][0]

    def _option(self, dotted: str) -> Any:
        node: Any = self._data
        for part in dotted.split("."):
            if not isinstance(node, dict) or part not in node:
                return None
            node = node[part]
        return node

    def _set_option(self, dotted: str, value: Any) -> None:
        parts = dotted.split(".")
        node = self._data
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value


class AtomicFile:
    """Replaces a file in one step so a crash never leaves it half written."""

    def __init__(self, path: Path):
        self._path = path

    def write_text(self, text: str) -> None:
        """Write the text through a temporary file, keeping mode and owner of the original."""
        temporary = self._path.with_name(self._path.name + ".vivarcdi.tmp")
        temporary.write_text(text, encoding="utf-8")
        self._inherit_attributes(temporary)
        os.replace(temporary, self._path)

    def copy_from(self, source: Path) -> None:
        """Replace the file with a copy of another one."""
        self.write_text(source.read_text(encoding="utf-8"))

    def _inherit_attributes(self, temporary: Path) -> None:
        if not self._path.exists():
            return
        shutil.copymode(self._path, temporary)
        status = self._path.stat()
        try:
            os.chown(temporary, status.st_uid, status.st_gid)
        except (AttributeError, PermissionError):
            pass
