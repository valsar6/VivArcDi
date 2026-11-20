from __future__ import annotations

import sys
from typing import Callable, Optional, Protocol

Option = tuple[str, str]


class Prompt(Protocol):
    """Asks the user to pick one of several options."""

    def choose(self, question: str, options: list[Option], default: str) -> Optional[str]:
        """Return the key of the chosen option, or None when nothing was chosen."""


class ConsolePrompt:
    """Asks on the terminal. An empty answer picks the default; no terminal picks nothing."""

    def __init__(
        self,
        read: Callable[[str], str] = input,
        interactive: Callable[[], bool] = sys.stdin.isatty,
        write: Callable[[str], None] = print,
    ):
        self._read = read
        self._write = write
        self._interactive = interactive

    def choose(self, question: str, options: list[Option], default: str) -> Optional[str]:
        """List the options by number and return the key of the one answered by number, key or label."""
        if not self._interactive():
            return None
        for number, (_, label) in enumerate(options, start=1):
            self._write(f"  {number}. {label}")
        try:
            answer = self._read(f"{question} [1-{len(options)}, Enter for {default}] ").strip().lower()
        except EOFError:
            return None
        if answer == "":
            return default
        return self._match(answer, options)

    @staticmethod
    def _match(answer: str, options: list[Option]) -> Optional[str]:
        for number, (key, label) in enumerate(options, start=1):
            if answer in (str(number), key.lower(), label.lower()):
                return key
        return None


class NeverPrompt:
    """Never asks and picks nothing, for windows and background runs."""

    def choose(self, question: str, options: list[Option], default: str) -> Optional[str]:
        """Pick nothing."""
        return None
