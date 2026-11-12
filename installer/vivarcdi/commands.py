from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Protocol

from .handoff import ReapplyHandoff
from .errors import PermissionDeniedError
from .hooks import UpdateHook
from .live_token import TokenVault
from .notifier import ReapplyOutcome, SilentOutcome
from .patching import InstallationPatcher
from .platforms import Platform
from .prompt import NeverPrompt, NeverSecretPrompt, Prompt, SecretPrompt
from .reporter import Reporter
from .shortcuts import ShortcutService
from .modes import InstallMode
from .ownership import Ownership
from .staging import Stager
from .theme import ThemeService
from .takeover import LegacyTakeover


THEME_ASK = "ask"
THEME_APPLY = "apply"
THEME_NEVER = "never"
THEME_QUESTION = "Apply the VivArcDi Light theme?"
TOKEN_QUESTION = "GitHub token with read access to pull requests (nothing shows while you type):"


@dataclass
class InstallerContext:
    """Everything a command needs, built once by the CLI."""

    platform: Platform
    installations: InstallationPatcher
    stager: Stager
    hook: UpdateHook
    reapply_command: list[str]
    reporter: Reporter
    handoff: ReapplyHandoff
    shortcuts: ShortcutService
    theme: ThemeService
    mode: InstallMode
    data_dir: Path
    ownership: Ownership
    takeover: LegacyTakeover
    vault: TokenVault
    outcome: ReapplyOutcome = field(default_factory=SilentOutcome)
    background: bool = False
    shortcut_action: str = "status"
    dry_run: bool = False
    restore_shortcuts: bool = False
    theme_action: str = "status"
    show_keys: bool = False
    theme_choice: str = THEME_NEVER
    profile_is_yours: bool = True
    prompt: Prompt = field(default_factory=NeverPrompt)
    needs_reapply: bool = False
    secret_prompt: SecretPrompt = field(default_factory=NeverSecretPrompt)
    remove_token: bool = False


class Command(ABC):
    """One installer action, selected from the command line."""

    name: str
    help: str
    needs_root: bool = True
    refuses_root: bool = False

    @abstractmethod
    def execute(self, context: InstallerContext) -> int:
        """Run the action and return the process exit code."""


class InstallCommand(Command):
    """Applies VivArcDi to every Vivaldi build and registers the update hook."""

    name = "install"
    help = "patch Vivaldi and keep it patched after updates"

    def execute(self, context: InstallerContext) -> int:
        report = context.reporter
        conflict = context.ownership.conflict()
        if conflict:
            report.error(conflict)
            return 1
        found = context.platform.find_installations()
        if not found:
            report.error(f"No Vivaldi installation found on {context.platform.name}")
            return 1
        if context.takeover.run():
            report.info("Took over the command line installation")
        context.stager.stage()
        for installation in found:
            context.installations.apply(installation)
            report.info(f"Patched {installation.label}")
        context.hook.install(context.reapply_command)
        context.ownership.claim()
        report.info(f"Registered {context.hook.describe()}")
        self._offer_theme(context)
        report.info("Restart Vivaldi to load VivArcDi.")
        return 0

    @staticmethod
    def _offer_theme(context: InstallerContext) -> None:
        if context.background or context.theme_choice == THEME_NEVER:
            return
        if not context.profile_is_yours:
            context.reporter.info("To use the VivArcDi Light theme, run without sudo: python3 installer theme apply")
            return
        if context.theme_choice == THEME_APPLY or context.prompt.confirm(THEME_QUESTION):
            if context.theme.apply() != 0:
                context.reporter.warn("The theme was not applied: run python3 installer theme apply when Vivaldi is closed")


class ReapplyCommand(Command):
    """Patches again any Vivaldi build that lost VivArcDi, e.g. after an update.

    Run by the update hook in the background, it hands the work to the
    platform's handoff when there is one, because on macOS only the apps the
    user allowed in App Management may change Vivaldi. Without a handoff it
    writes itself and tells the mode's outcome how it went.
    """

    name = "reapply"
    help = "patch again the Vivaldi builds that an update reset"

    def execute(self, context: InstallerContext) -> int:
        outdated = [
            installation
            for installation in context.platform.find_installations()
            if context.installations.state(installation).needs_reapply
        ]
        if not outdated:
            return 0
        if context.background and context.handoff.available:
            context.handoff.request()
            context.reporter.info("Asked the terminal to apply VivArcDi again")
            return 0
        try:
            self._apply_all(context, outdated)
        except PermissionDeniedError as error:
            if context.background and context.outcome.denied(error):
                context.reporter.warn(str(error))
                return 0
            raise
        context.handoff.clear()
        if context.background:
            context.outcome.applied()
        return 0

    @staticmethod
    def _apply_all(context: InstallerContext, outdated: list) -> None:
        for installation in outdated:
            context.installations.apply(installation)
            context.reporter.info(f"Reapplied VivArcDi to {installation.label}")


class UninstallCommand(Command):
    """Removes VivArcDi from every Vivaldi build, the hook and the staged copy."""

    name = "uninstall"
    help = "remove VivArcDi from Vivaldi"

    def execute(self, context: InstallerContext) -> int:
        report = context.reporter
        for installation in context.platform.find_installations():
            context.installations.revert(installation)
            report.info(f"Removed VivArcDi from {installation.label}")
        context.hook.remove()
        context.handoff.clear()
        context.stager.unstage()
        context.vault.remove()
        context.ownership.release()
        report.info(f"Backups of the original window.html stay in {context.data_dir}")
        if context.restore_shortcuts:
            return context.shortcuts.restore()
        report.info("Restart Vivaldi to finish.")
        return 0


class StatusCommand(Command):
    """Shows which Vivaldi builds carry VivArcDi and whether the hook is active."""

    name = "status"
    help = "show what is installed"
    needs_root = False

    def execute(self, context: InstallerContext) -> int:
        report = context.reporter
        found = context.platform.find_installations()
        if not found:
            report.info(f"No Vivaldi installation found on {context.platform.name}")
        for installation in found:
            state = context.installations.state(installation)
            if not state.patched:
                status = "not patched"
            elif state.current:
                status = "patched, up to date"
            else:
                status = "patched, outdated payload"
            report.info(f"{installation.label}: {status}")
        hook_status = "active" if context.hook.is_installed() else "not installed"
        report.info(f"Update hook: {hook_status}")
        return 0


class ShortcutsCommand(Command):
    """Sets Vivaldi's shortcuts and Quick Commands option the Arc way, on request only."""

    name = "shortcuts"
    help = "apply, restore or check the Arc-style keyboard shortcuts"
    needs_root = False
    refuses_root = True
    actions = ("apply", "restore", "status")

    def execute(self, context: InstallerContext) -> int:
        service = context.shortcuts
        if context.shortcut_action == "apply":
            return service.apply(dry_run=context.dry_run)
        if context.shortcut_action == "restore":
            return service.restore()
        return service.status()


class ThemeCommand(Command):
    """Adds and selects the VivArcDi Light theme in Vivaldi, or puts the previous theme back."""

    name = "theme"
    help = "apply, restore or check the VivArcDi Light theme"
    needs_root = False
    refuses_root = True
    actions = ("apply", "restore", "status")

    def execute(self, context: InstallerContext) -> int:
        service = context.theme
        if context.theme_action == "apply":
            return service.apply(dry_run=context.dry_run)
        if context.theme_action == "restore":
            return service.restore()
        return service.status(show_keys=context.show_keys)


class LiveFoldersCommand(Command):
    """Stores the GitHub token of the live folders outside the browser, or removes it."""

    name = "live-folders"
    help = "store or remove the GitHub token of the live folders"
    actions = ("token",)

    def execute(self, context: InstallerContext) -> int:
        if context.remove_token:
            return self._remove(context)
        token = context.secret_prompt.ask(TOKEN_QUESTION)
        if not token:
            context.reporter.error("No token given: run it in a terminal and paste the token")
            return 1
        context.vault.save(token)
        context.reporter.info(f"Stored the GitHub token in {context.vault.path}")
        for installation in context.platform.find_installations():
            self._copy(context, installation)
        context.reporter.info("The live folders use it at their next refresh.")
        return 0

    @staticmethod
    def _copy(context: InstallerContext, installation) -> None:
        if not installation.payload_dir.is_dir():
            return
        try:
            context.vault.copy_to(installation.payload_dir)
        except OSError:
            context.reporter.warn(f"Could not copy the token into {installation.label}: run the install command again")

    @staticmethod
    def _remove(context: InstallerContext) -> int:
        context.vault.remove()
        for installation in context.platform.find_installations():
            try:
                context.vault.remove_from(installation.payload_dir)
            except OSError:
                context.reporter.warn(f"Could not remove the token from {installation.label}: run the install command again")
        context.reporter.info("Removed the GitHub token of the live folders")
        return 0


class WindowLauncher(Protocol):
    """Opens the window and returns when it is closed."""

    def run(self, platform: Platform, mode: InstallMode, needs_reapply: bool = False) -> int:
        """Show the window for `mode` and return the process exit code.

        `needs_reapply` is True when a background reapply was denied and the window must say so.
        """


def load_window_launcher() -> WindowLauncher:
    from .window.launcher import TkWindowLauncher

    return TkWindowLauncher()


class WindowCommand(Command):
    """Opens the VivArcDi window, which acts on the profile and the Vivaldi builds of the user."""

    name = "window"
    help = "open the VivArcDi window"
    needs_root = False
    refuses_root = True

    def __init__(self, launcher_factory: Callable[[], WindowLauncher] = load_window_launcher):
        self._launcher_factory = launcher_factory

    def execute(self, context: InstallerContext) -> int:
        return self._launcher_factory().run(context.platform, context.mode, context.needs_reapply)


COMMANDS: tuple[Command, ...] = (
    InstallCommand(),
    ReapplyCommand(),
    UninstallCommand(),
    StatusCommand(),
    ShortcutsCommand(),
    ThemeCommand(),
    LiveFoldersCommand(),
    WindowCommand(),
)
