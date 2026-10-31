from __future__ import annotations

from abc import ABC, abstractmethod

from .errors import VivArcDiError
from .system import CommandRunner

APP_BUNDLE_ID = "io.github.valsar6.vivarcdi"
NEEDS_REAPPLY_ARGUMENT = "--needs-reapply"
APPLIED_MESSAGE = "VivArcDi was applied again. Restart Vivaldi."


class Notifier(ABC):
    """Tells the user something without opening a window."""

    @abstractmethod
    def notify(self, message: str) -> None:
        """Show `message` as a system notification."""


class MacNotifier(Notifier):
    """A macOS notification through `osascript`."""

    TITLE = "VivArcDi"

    def __init__(self, runner: CommandRunner):
        self._runner = runner

    def notify(self, message: str) -> None:
        script = f'display notification "{self._quoted(message)}" with title "{self.TITLE}"'
        self._runner.run(["osascript", "-e", script])

    @staticmethod
    def _quoted(text: str) -> str:
        return text.replace("\\", "\\\\").replace('"', '\\"')


class AppOpener:
    """Opens the VivArcDi app by its bundle id, so macOS attributes what follows to the app."""

    def __init__(self, runner: CommandRunner, bundle_id: str = APP_BUNDLE_ID):
        self._runner = runner
        self._bundle_id = bundle_id

    def open(self, *arguments: str) -> None:
        """Open the app, passing `arguments` to it."""
        command = ["open", "-b", self._bundle_id]
        if arguments:
            command += ["--args", *arguments]
        self._runner.run(command)


class ReapplyOutcome(ABC):
    """What a background `reapply` tells the user once it has finished or has been denied."""

    @abstractmethod
    def applied(self) -> None:
        """VivArcDi was applied again."""

    @abstractmethod
    def denied(self, error: VivArcDiError) -> bool:
        """The write was refused. True when the outcome dealt with it, False to let the error surface."""


class SilentOutcome(ReapplyOutcome):
    """Says nothing and leaves errors to the caller: the command line behavior."""

    def applied(self) -> None:
        pass

    def denied(self, error: VivArcDiError) -> bool:
        return False


class AppOutcome(ReapplyOutcome):
    """Notifies on success and, when denied, opens the app so the user can fix the permission there.

    It never opens Terminal.
    """

    def __init__(self, notifier: Notifier, opener: AppOpener):
        self._notifier = notifier
        self._opener = opener

    def applied(self) -> None:
        self._notifier.notify(APPLIED_MESSAGE)

    def denied(self, error: VivArcDiError) -> bool:
        self._opener.open(NEEDS_REAPPLY_ARGUMENT)
        return True
