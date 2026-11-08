from __future__ import annotations

import sys
from typing import Callable, Protocol


class Prompt(Protocol):
    """Asks the user a yes or no question."""

    def confirm(self, question: str) -> bool:
        """Return the answer to `question`."""


class ConsolePrompt:
    """Asks on the terminal. An empty answer means yes; no terminal means no."""

    def __init__(self, read: Callable[[str], str] = input, interactive: Callable[[], bool] = sys.stdin.isatty):
        self._read = read
        self._interactive = interactive

    def confirm(self, question: str) -> bool:
        """Ask `question [Y/n]`; True for an empty answer, `y` or `yes`."""
        if not self._interactive():
            return False
        try:
            answer = self._read(f"{question} [Y/n] ").strip().lower()
        except EOFError:
            return False
        return answer in ("", "y", "yes")


class NeverPrompt:
    """Never asks and always answers no, for windows and background runs."""

    def confirm(self, question: str) -> bool:
        """Answer no."""
        return False
