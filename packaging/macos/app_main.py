from __future__ import annotations

import sys

from vivarcdi.cli import main

LAUNCH_SERIAL_PREFIX = "-psn_"
MODE_OPTION = "--mode"
APP_MODE = "app"
WINDOW_COMMAND = "window"
WINDOW_OPTIONS = frozenset({"--needs-reapply"})


class AppArguments:
    """Turns what macOS passes to the app into a command line for the installer.

    Opened by the user, the app has no arguments and shows the window. Opened
    again by the launchd agent after a denied reapply, it only gets window
    options. Anything else is a command for the installer, run in app mode.
    """

    def __init__(self, argv: list[str]):
        self._argv = [argument for argument in argv if not argument.startswith(LAUNCH_SERIAL_PREFIX)]

    def command_line(self) -> list[str]:
        """The arguments for `vivarcdi.cli.main`, always with a mode."""
        if self._is_window_request():
            return [MODE_OPTION, APP_MODE, WINDOW_COMMAND, *self._argv]
        if self._names_a_mode():
            return list(self._argv)
        return [MODE_OPTION, APP_MODE, *self._argv]

    def _is_window_request(self) -> bool:
        return set(self._argv) <= WINDOW_OPTIONS

    def _names_a_mode(self) -> bool:
        return any(argument == MODE_OPTION or argument.startswith(f"{MODE_OPTION}=") for argument in self._argv)


if __name__ == "__main__":
    sys.exit(main(AppArguments(sys.argv[1:]).command_line()))
