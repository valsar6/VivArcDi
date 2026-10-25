from abc import ABC, abstractmethod
from dataclasses import dataclass

from .hooks import UpdateHook
from .patching import InstallationPatcher
from .platforms import Platform
from .reporter import Reporter
from .staging import SelfStager


@dataclass
class InstallerContext:
    """Everything a command needs, built once by the CLI."""

    platform: Platform
    installations: InstallationPatcher
    stager: SelfStager
    hook: UpdateHook
    reapply_command: list[str]
    reporter: Reporter


class Command(ABC):
    """One installer action, selected from the command line."""

    name: str
    help: str
    needs_root: bool = True

    @abstractmethod
    def execute(self, context: InstallerContext) -> int:
        """Run the action and return the process exit code."""


class InstallCommand(Command):
    """Applies VivArcDi to every Vivaldi build and registers the update hook."""

    name = "install"
    help = "patch Vivaldi and keep it patched after updates"

    def execute(self, context: InstallerContext) -> int:
        report = context.reporter
        found = context.platform.find_installations()
        if not found:
            report.error(f"No Vivaldi installation found on {context.platform.name}")
            return 1
        context.stager.stage()
        for installation in found:
            context.installations.apply(installation)
            report.info(f"Patched {installation.label}")
        context.hook.install(context.reapply_command)
        report.info(f"Registered {context.hook.describe()}")
        report.info("Restart Vivaldi to load VivArcDi.")
        return 0


class ReapplyCommand(Command):
    """Patches again any Vivaldi build that lost VivArcDi, e.g. after an update."""

    name = "reapply"
    help = "patch again the Vivaldi builds that an update reset"

    def execute(self, context: InstallerContext) -> int:
        for installation in context.platform.find_installations():
            if context.installations.state(installation).needs_reapply:
                context.installations.apply(installation)
                context.reporter.info(f"Reapplied VivArcDi to {installation.label}")
        return 0


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
        context.stager.unstage()
        report.info(f"Backups of the original window.html stay in {context.platform.data_dir}")
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


COMMANDS: tuple[Command, ...] = (InstallCommand(), ReapplyCommand(), UninstallCommand(), StatusCommand())
