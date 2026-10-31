from __future__ import annotations

import time
from typing import Callable

from .running import ProcessGuard
from .system import CommandRunner


class VivaldiQuitter:
    """Asks Vivaldi to quit through macOS and waits until its processes are gone."""

    BUNDLE_IDS = ("com.vivaldi.Vivaldi", "com.vivaldi.Vivaldi.snapshot")

    def __init__(
        self,
        runner: CommandRunner,
        guard: ProcessGuard,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
        timeout_seconds: float = 15.0,
        poll_seconds: float = 0.5,
    ):
        self._runner = runner
        self._guard = guard
        self._clock = clock
        self._sleep = sleep
        self._timeout_seconds = timeout_seconds
        self._poll_seconds = poll_seconds

    def quit_and_wait(self) -> bool:
        """Ask every Vivaldi build to quit and wait up to the timeout.

        Returns True when no Vivaldi process is left, False when it is still running.
        """
        for bundle_id in self.BUNDLE_IDS:
            self._runner.run(["osascript", "-e", f'tell application id "{bundle_id}" to quit'])
        deadline = self._clock() + self._timeout_seconds
        while self._guard.is_running():
            if self._clock() >= deadline:
                return False
            self._sleep(self._poll_seconds)
        return True
