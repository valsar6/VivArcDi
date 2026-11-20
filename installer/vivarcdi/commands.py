from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional, Protocol

from .handoff import ReapplyHandoff
from .errors import PermissionDeniedError
from .hooks import UpdateHook
from .legacy_token import LegacyTokenFiles
from .notifier import ReapplyOutcome, SilentOutcome
from .patching import InstallationPatcher
from .platforms import Platform
from .prompt import NeverPrompt, Prompt
from .reporter import Reporter
from .shortcuts import ShortcutService
from .modes import InstallMode
from .ownership import Ownership
from .staging import Stager
from .theme import ThemeService
from .versions import VersionGuard, read_staged_version
from .takeover import LegacyTakeover


THEME_ASK = "ask"
THEME_APPLY = "apply"
THEME_NEVER = "never"
THEME_QUESTION = "Which theme should Vivaldi start with?"


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
    legacy_token: LegacyTokenFiles
    outcome: ReapplyOutcome = field(default_factory=SilentOutcome)
    background: bool = False
    shortcut_action: str = "status"
    dry_run: bool = False
    restore_shortcuts: bool = False
    theme_action: str = "status"
    show_keys: bool = False
    theme_choice: str = THEME_NEVER
    theme_id: Optional[str] = None
    profile_is_yours: bool = True
    prompt: Prompt = field(default_factory=NeverPrompt)
    needs_reapply: bool = False
    allow_downgrade: bool = False


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
        refusal = self._downgrade(context, found)
        if refusal:
            report.error(refusal)
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
    def _downgrade(context: InstallerContext, found: list) -> str:
        if context.allow_downgrade:
            return ""
        versions = context.installations.versions
        installed = installed_version(context, found)
        if not versions.is_newer(installed):
            return ""
        refusal = f"VivArcDi {installed} is already installed, newer than this VivArcDi ({versions.own}): nothing changed."
        if not context.mode.offers_downgrade:
            return refusal
        return f"{refusal} To install {versions.own} anyway, run: python3 installer install --allow-downgrade"

    @staticmethod
    def _offer_theme(context: InstallerContext) -> None:
        if context.background or context.theme_choice == THEME_NEVER:
            return
        if not context.profile_is_yours:
            context.reporter.info("To use the VivArcDi themes, run without sudo: python3 installer theme apply")
            return
        service = context.theme
        chosen = context.theme_id
        if context.theme_choice == THEME_ASK:
            chosen = context.prompt.choose(THEME_QUESTION, service.options(), service.default_id)
        if context.theme_choice == THEME_APPLY or chosen is not None:
            if service.apply(chosen) != 0:
                context.reporter.warn("The themes were not applied: run python3 installer theme apply when Vivaldi is closed")


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
        found = context.platform.find_installations()
        outdated = [installation for installation in found if context.installations.state(installation).needs_reapply]
        if not outdated:
            return 0
        if context.background and context.handoff.available:
            context.handoff.request()
            context.reporter.info("Asked the terminal to apply VivArcDi again")
            return 0
        try:
            self._apply_all(context, outdated, installed_version(context, found))
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
    def _apply_all(context: InstallerContext, outdated: list, installed: str | None) -> None:
        installations = context.installations
        for installation in outdated:
            deployed = installations.deployed_version(installation)
            installations.apply(installation, keep_payload=installations.versions.is_newer(deployed))
            context.reporter.info(f"Reapplied VivArcDi to {installation.label}")
            if deployed is None and installations.versions.is_newer(installed):
                context.reporter.warn(
                    f"Applied the staged VivArcDi {installations.versions.own} to {installation.label}, "
                    f"but {installed} is installed elsewhere: run install from VivArcDi {installed} again"
                )


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
        context.legacy_token.remove_stored()
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
            report.info(f"{installation.label}: {self._describe(context, installation)}")
        self._report_stage(context, installed_version(context, found))
        hook_status = "active" if context.hook.is_installed() else "not installed"
        report.info(f"Update hook: {hook_status}")
        return 0


    @staticmethod
    def _describe(context: InstallerContext, installation) -> str:
        state = context.installations.state(installation)
        if not state.patched:
            status = "not patched"
        elif state.current:
            status = "patched, up to date"
        elif state.newer:
            status = "patched, newer than this installer"
        else:
            status = "patched, outdated payload"
        deployed = context.installations.deployed_version(installation)
        return status if deployed is None else f"{status} ({deployed})"

    @staticmethod
    def _report_stage(context: InstallerContext, installed: str | None) -> None:
        staged = read_staged_version(context.data_dir)
        context.reporter.info(f"Staged copy: {staged or 'none'}")
        if staged is not None and VersionGuard(staged).is_newer(installed):
            context.reporter.info(
                f"The staged copy ({staged}) is older than the installed VivArcDi ({installed}): run install from {installed} again"
            )


def installed_version(context: InstallerContext, found: list) -> str | None:
    """The highest VivArcDi version deployed in the given Vivaldi builds, or None when none can be read."""
    return VersionGuard.highest(context.installations.deployed_version(installation) for installation in found)


class ShortcutsCommand(Command):
    """Sets Vivaldi's shortcuts and Quick Commands option the Arc way, on request only."""

    name = "shortcuts"
    help = "apply, restore or check the Arc-style keyboard shortcuts"
    needs_root = False
    refuses_root = True
    actions = ("apply", "list", "restore", "status")

    def execute(self, context: InstallerContext) -> int:
        service = context.shortcuts
        if context.shortcut_action == "apply":
            return service.apply(dry_run=context.dry_run)
        if context.shortcut_action == "restore":
            return service.restore()
        return service.status()


class ThemeCommand(Command):
    """Adds the VivArcDi themes to Vivaldi and selects one, lists them, or puts the previous theme back."""

    name = "theme"
    help = "apply, list, restore or check the VivArcDi themes"
    needs_root = False
    refuses_root = True
    actions = ("apply", "restore", "status")

    def execute(self, context: InstallerContext) -> int:
        service = context.theme
        if context.theme_action == "apply":
            return service.apply(context.theme_id, dry_run=context.dry_run)
        if context.theme_action == "list":
            return service.list()
        if context.theme_action == "restore":
            return service.restore()
        return service.status(show_keys=context.show_keys)


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
    WindowCommand(),
)
