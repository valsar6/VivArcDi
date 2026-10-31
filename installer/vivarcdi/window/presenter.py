from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from ..commands import Command, InstallCommand, InstallerContext, ReapplyCommand, UninstallCommand
from ..errors import PermissionDeniedError, VivArcDiError
from ..modes import WindowAction
from ..quitter import VivaldiQuitter
from ..reporter import CollectingReporter
from ..running import ProcessGuard
from ..shortcuts import ALREADY_SET
from .errorlog import ErrorLog
from .model import BuildState, BuildStatus, StatusModel

NOT_APPLICABLE = "That action does not apply to the Vivaldi builds as they are now."
NOTHING_CHANGED = "Nothing was changed. Quit Vivaldi when you are ready and try again."
QUIT_YOURSELF = "Vivaldi is running. Quit it completely, then try again."
QUIT_TIMED_OUT = "Vivaldi did not quit in time, so nothing was changed. Quit it yourself and try again."
QUIT_QUESTION = "Vivaldi is running. Quit it now?"
UNEXPECTED_ERROR = "Something went wrong. Press Show log for the details."
SHORTCUTS_MATCH = "Vivaldi already uses Arc's shortcuts. Nothing to change."
SHORTCUTS_QUESTION = "Change Vivaldi's keyboard shortcuts as listed below?"
RESTORE_QUESTION = "Put back the keyboard shortcuts that were saved before VivArcDi changed them?"
DECLINED = "Nothing was changed."
SUCCESS_MESSAGES = {
    WindowAction.INSTALL: "VivArcDi is installed. Restart Vivaldi to load it.",
    WindowAction.UPDATE: "VivArcDi is up to date. Restart Vivaldi to load it.",
    WindowAction.REAPPLY: "VivArcDi is applied again. Restart Vivaldi to load it.",
    WindowAction.UNINSTALL: "VivArcDi is removed. Restart Vivaldi to finish.",
    WindowAction.APPLY_SHORTCUTS: "Arc's shortcuts are set. Restart Vivaldi to see them.",
    WindowAction.RESTORE_SHORTCUTS: "Your shortcuts are back. Restart Vivaldi to see them.",
}


class MessageButtonKind(Enum):
    """What a button under the message does."""

    OPEN_SETTINGS = "open_settings"
    TRY_AGAIN = "try_again"


@dataclass(frozen=True)
class MessageButton:
    """A button the view draws under the message."""

    label: str
    kind: MessageButtonKind


@dataclass(frozen=True)
class WindowState:
    """Everything the view draws: the builds, the actions and the message.

    `enabled_actions` is always a subset of `visible_actions`.
    """

    rows: tuple[BuildStatus, ...]
    visible_actions: frozenset
    enabled_actions: frozenset
    message: str = ""
    message_buttons: tuple[MessageButton, ...] = ()


class WindowView(ABC):
    """What the presenter needs from a window. The Tkinter window implements it; tests use a fake."""

    @abstractmethod
    def show_state(self, state: WindowState) -> None:
        """Draw the state."""

    @abstractmethod
    def ask_confirmation(self, question: str, details: str = "") -> bool:
        """Ask a yes or no question, with optional details below it. True means yes."""

    @abstractmethod
    def open_url(self, url: str) -> None:
        """Open a web address or a System Settings link."""

    @abstractmethod
    def open_path(self, path: Path) -> None:
        """Open a file, such as the log, with the system's default program."""


@dataclass(frozen=True)
class Notice:
    """A message with the buttons that go with it."""

    text: str
    buttons: tuple[MessageButton, ...] = ()


class WindowPresenter:
    """Decides what the window shows and runs its actions through the installer commands.

    Shortcuts change nothing until the view confirms the differences. Errors become plain messages and
    their tracebacks go to the log. The reporter must be the one the context was built with.
    """

    def __init__(
        self,
        context: InstallerContext,
        reporter: CollectingReporter,
        model: StatusModel,
        view: WindowView,
        guard: ProcessGuard,
        quitter: VivaldiQuitter | None,
        error_log: ErrorLog,
    ):
        self._context = context
        self._reporter = reporter
        self._model = model
        self._view = view
        self._guard = guard
        self._quitter = quitter
        self._error_log = error_log
        self._notice = Notice("")
        self._last_action: WindowAction | None = None

    @property
    def context(self) -> InstallerContext:
        """The installer context the actions run in."""
        return self._context

    def refresh(self) -> None:
        """Read the builds again and redraw."""
        self._view.show_state(self._state())

    def perform(self, action: WindowAction) -> None:
        """Run an action chosen by the user, then show its outcome."""
        self._last_action = action
        self._reporter.clear()
        self._notice = self._attempt(action)
        self.refresh()

    def press(self, kind: MessageButtonKind) -> None:
        """React to a button under the message: open the settings page or repeat the last action."""
        if kind is MessageButtonKind.OPEN_SETTINGS and self._context.mode.settings_url:
            self._view.open_url(self._context.mode.settings_url)
        elif kind is MessageButtonKind.TRY_AGAIN and self._last_action is not None:
            self.perform(self._last_action)

    def show_log(self) -> None:
        """Open the log file, which holds the details the messages leave out."""
        self._view.open_path(self._error_log.path)

    def _state(self) -> WindowState:
        rows = tuple(self._model.statuses())
        return WindowState(
            rows=rows,
            visible_actions=self._context.mode.visible_actions,
            enabled_actions=self._enabled_actions(rows),
            message=self._notice.text,
            message_buttons=self._notice.buttons,
        )

    def _enabled_actions(self, rows: tuple[BuildStatus, ...]) -> frozenset:
        states = {row.state for row in rows}
        applicable = {
            WindowAction.INSTALL: BuildState.NOT_INSTALLED in states,
            WindowAction.UPDATE: BuildState.OUTDATED in states,
            WindowAction.REAPPLY: BuildState.NEEDS_REAPPLY in states,
            WindowAction.UNINSTALL: bool(states - {BuildState.NOT_INSTALLED}),
            WindowAction.APPLY_SHORTCUTS: True,
            WindowAction.RESTORE_SHORTCUTS: self._context.shortcuts.has_backup(),
        }
        visible = self._context.mode.visible_actions
        return frozenset(action for action, applies in applicable.items() if applies and action in visible)

    def _attempt(self, action: WindowAction) -> Notice:
        try:
            if action not in self._state().enabled_actions:
                return Notice(NOT_APPLICABLE)
            return self._run(action)
        except PermissionDeniedError as error:
            self._error_log.record(error)
            return Notice(str(error), self._permission_buttons())
        except VivArcDiError as error:
            self._error_log.record(error)
            return Notice(str(error))
        except Exception as error:
            self._error_log.record(error)
            return Notice(UNEXPECTED_ERROR)

    def _permission_buttons(self) -> tuple[MessageButton, ...]:
        if not self._context.mode.settings_url:
            return ()
        return (
            MessageButton("Open Settings", MessageButtonKind.OPEN_SETTINGS),
            MessageButton("Try again", MessageButtonKind.TRY_AGAIN),
        )

    def _run(self, action: WindowAction) -> Notice:
        if action is WindowAction.APPLY_SHORTCUTS:
            return self._apply_shortcuts()
        if action is WindowAction.RESTORE_SHORTCUTS:
            return self._restore_shortcuts()
        return self._change_vivaldi(action, self._command_for(action))

    @staticmethod
    def _command_for(action: WindowAction) -> Command:
        if action is WindowAction.INSTALL:
            return InstallCommand()
        if action is WindowAction.UNINSTALL:
            return UninstallCommand()
        return ReapplyCommand()

    def _change_vivaldi(self, action: WindowAction, command: Command) -> Notice:
        blocked = self._ensure_vivaldi_is_closed()
        if blocked is not None:
            return blocked
        if command.execute(self._context) != 0:
            return self._failure()
        return Notice(SUCCESS_MESSAGES[action])

    def _apply_shortcuts(self) -> Notice:
        shortcuts = self._context.shortcuts
        if shortcuts.apply(dry_run=True) != 0:
            return self._failure()
        differences = [line for line in self._reporter.lines(CollectingReporter.INFO) if not line.endswith(ALREADY_SET)]
        if not differences:
            return Notice(SHORTCUTS_MATCH)
        if not self._view.ask_confirmation(SHORTCUTS_QUESTION, "\n".join(differences)):
            return Notice(DECLINED)
        return self._write_shortcuts(WindowAction.APPLY_SHORTCUTS, shortcuts.apply)

    def _restore_shortcuts(self) -> Notice:
        if not self._view.ask_confirmation(RESTORE_QUESTION):
            return Notice(DECLINED)
        return self._write_shortcuts(WindowAction.RESTORE_SHORTCUTS, self._context.shortcuts.restore)

    def _write_shortcuts(self, action: WindowAction, write) -> Notice:
        blocked = self._ensure_vivaldi_is_closed()
        if blocked is not None:
            return blocked
        self._reporter.clear()
        if write() != 0:
            return self._failure()
        return Notice(SUCCESS_MESSAGES[action])

    def _ensure_vivaldi_is_closed(self) -> Notice | None:
        if not self._guard.is_running():
            return None
        if self._quitter is None:
            return Notice(QUIT_YOURSELF)
        if not self._view.ask_confirmation(QUIT_QUESTION):
            return Notice(NOTHING_CHANGED)
        if self._quitter.quit_and_wait():
            return None
        return Notice(QUIT_TIMED_OUT)

    def _failure(self) -> Notice:
        errors = self._reporter.lines(CollectingReporter.ERROR)
        return Notice(" ".join(errors) if errors else UNEXPECTED_ERROR)
