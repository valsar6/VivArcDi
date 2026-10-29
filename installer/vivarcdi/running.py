from __future__ import annotations

from .system import CommandRunner


class ProcessGuard:
    """Tells whether Vivaldi is running, because it rewrites Preferences when it quits."""

    def __init__(self, process_names: list[str], runner: CommandRunner):
        self._process_names = process_names
        self._runner = runner

    def is_running(self) -> bool:
        """True when a process with one of the Vivaldi names exists."""
        return any(self._runner.run(["pgrep", "-x", name]).ok for name in self._process_names)
