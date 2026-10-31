from __future__ import annotations

import os
from pathlib import Path
from typing import Callable

from .. import __version__
from ..cli import REPO_ROOT
from ..errors import WindowUnavailableError
from ..modes import InstallMode
from ..platforms import Platform, invoking_user_home
from ..releases import ReleaseChecker
from ..system import CommandRunner
from .assembly import build_presenter

TK_MISSING = (
    "The VivArcDi window needs Tkinter, which is not installed. "
    "On Debian and Ubuntu install it with: sudo apt install python3-tk"
)


class TkinterWindowLoader:
    """Imports the Tkinter window only when it is called, so a missing Tkinter fails here."""

    def __call__(self) -> type:
        from .tk_view import TkWindow

        return TkWindow


class TkWindowLauncher:
    """Builds the presenter for a mode, gives it a Tkinter window and runs that window."""

    def __init__(
        self,
        load_window: Callable[[], type] = TkinterWindowLoader(),
        runner: CommandRunner | None = None,
        repo_root: Path = REPO_ROOT,
        home: Path | None = None,
    ):
        self._load_window = load_window
        self._runner = runner
        self._repo_root = repo_root
        self._home = home

    def run(self, platform: Platform, mode: InstallMode) -> int:
        """Open the window and return 0 when it is closed. Raises WindowUnavailableError without Tkinter."""
        try:
            view = self._load_window()()
        except ImportError as error:
            raise WindowUnavailableError(TK_MISSING) from error
        state_dir = self.state_dir(platform, mode)
        checker = ReleaseChecker(state_dir, __version__)
        presenter = build_presenter(
            platform, mode, view, self._repo_root, self._runner, state_dir=state_dir, release_checker=checker
        )
        view.run(presenter)
        return 0

    def state_dir(self, platform: Platform, mode: InstallMode) -> Path:
        """A folder the user can write: the data folder, except on Debian where it belongs to root."""
        if platform.name != "Debian":
            return mode.data_dir(platform)
        home = self._home or invoking_user_home()
        base = Path(os.environ.get("XDG_STATE_HOME") or home / ".local" / "state")
        return base / "vivarcdi"
