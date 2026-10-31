from __future__ import annotations

import sys
from typing import TextIO


class Reporter:
    """Prints installer progress. Quiet mode keeps only warnings and errors."""

    def __init__(self, quiet: bool = False, out: TextIO = sys.stdout, err: TextIO = sys.stderr):
        self._quiet = quiet
        self._out = out
        self._err = err

    def info(self, message: str) -> None:
        """Print a progress message unless quiet."""
        if not self._quiet:
            print(message, file=self._out)

    def warn(self, message: str) -> None:
        """Print a warning."""
        print(f"warning: {message}", file=self._err)

    def error(self, message: str) -> None:
        """Print an error."""
        print(f"error: {message}", file=self._err)


class CollectingReporter(Reporter):
    """Keeps every message instead of printing it, so a window can show them."""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"

    def __init__(self):
        super().__init__()
        self._lines: list[tuple[str, str]] = []

    def info(self, message: str) -> None:
        """Keep a progress message."""
        self._lines.append((self.INFO, message))

    def warn(self, message: str) -> None:
        """Keep a warning."""
        self._lines.append((self.WARNING, message))

    def error(self, message: str) -> None:
        """Keep an error."""
        self._lines.append((self.ERROR, message))

    def lines(self, level: str | None = None) -> list[str]:
        """The kept messages in order, only those of `level` when given."""
        return [text for kept, text in self._lines if level is None or kept == level]

    def clear(self) -> None:
        """Forget every kept message."""
        self._lines.clear()
