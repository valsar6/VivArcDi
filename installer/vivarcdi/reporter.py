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
