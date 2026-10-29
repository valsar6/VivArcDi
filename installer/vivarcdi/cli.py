from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import __version__
from .backup import BackupStore
from .commands import COMMANDS, Command, InstallerContext, ReapplyCommand, ShortcutsCommand, UninstallCommand
from .distribution import DIST_FOLDER
from .errors import VivArcDiError
from .patching import InstallationPatcher
from .preferences import ShortcutTable
from .preferences_backup import PreferencesBackupStore
from .payload import PayloadDeployer
from .platforms import Platform, PlatformFactory, is_root
from .profiles import ProfileLocator
from .reporter import Reporter
from .running import ProcessGuard
from .shortcuts import ShortcutService
from .staging import SelfStager
from .system import CommandRunner
from .window_patch import WindowHtmlPatcher

REPO_ROOT = Path(__file__).resolve().parents[2]


def build_context(
    platform: Platform,
    reporter: Reporter,
    repo_root: Path = REPO_ROOT,
    background: bool = False,
    runner: CommandRunner | None = None,
) -> InstallerContext:
    """Wire the installer services for a platform.

    `background` is True when the update hook runs the command, not the user.
    """
    stager = SelfStager(repo_root, platform.data_dir)
    staged_reapply = [sys.executable, str(stager.staged_installer), "reapply"]
    installations = InstallationPatcher(
        WindowHtmlPatcher(),
        PayloadDeployer(repo_root / DIST_FOLDER, __version__),
        BackupStore(platform.data_dir / "backups"),
        platform.permission_advisor(),
    )
    shortcuts = ShortcutService(
        ProfileLocator(platform.profile_roots()),
        ShortcutTable.load(platform.modifier),
        PreferencesBackupStore(platform.data_dir / "preferences-backups"),
        ProcessGuard(platform.process_names(), runner or CommandRunner()),
        reporter,
    )
    return InstallerContext(
        platform=platform,
        installations=installations,
        stager=stager,
        hook=platform.update_hook(),
        reapply_command=[*staged_reapply, "--quiet", "--background"],
        reporter=reporter,
        handoff=platform.reapply_handoff(staged_reapply),
        shortcuts=shortcuts,
        background=background,
    )


def parse_arguments(argv: list[str]) -> argparse.Namespace:
    """Parse the command line: one subcommand plus an optional --quiet flag."""
    parser = argparse.ArgumentParser(prog="vivarcdi", description="Make Vivaldi behave like Arc.")
    parser.add_argument("--version", action="version", version=f"VivArcDi {__version__}")
    subcommands = parser.add_subparsers(dest="command", required=True)
    for command in COMMANDS:
        subparser = subcommands.add_parser(command.name, help=command.help)
        subparser.add_argument("--quiet", action="store_true", help="print only warnings and errors")
        if command.name == ReapplyCommand.name:
            subparser.add_argument("--background", action="store_true", help="run as the update hook")
        if command.name == UninstallCommand.name:
            subparser.add_argument(
                "--restore-shortcuts", action="store_true", help="also put back the saved keyboard shortcuts"
            )
        if isinstance(command, ShortcutsCommand):
            subparser.add_argument("action", choices=command.actions, help="what to do with the shortcuts")
            subparser.add_argument("--dry-run", action="store_true", help="print the differences and change nothing")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    """Entry point. Returns the process exit code."""
    arguments = parse_arguments(argv)
    reporter = Reporter(quiet=arguments.quiet)
    command: Command = next(command for command in COMMANDS if command.name == arguments.command)
    try:
        platform = PlatformFactory().create()
        if command.needs_root and platform.requires_root and not is_root():
            reporter.error(f"On {platform.name} run it with sudo: sudo python3 installer {command.name}")
            return 1
        if not platform.allows_root and is_root():
            reporter.error(f"On {platform.name} run it without sudo: python3 installer {command.name}")
            return 1
        if command.refuses_root and is_root():
            reporter.error(f"Run it without sudo, the profile belongs to you: python3 installer {command.name}")
            return 1
        context = build_context(platform, reporter, background=getattr(arguments, "background", False))
        context.shortcut_action = getattr(arguments, "action", "status")
        context.dry_run = getattr(arguments, "dry_run", False)
        context.restore_shortcuts = getattr(arguments, "restore_shortcuts", False)
        return command.execute(context)
    except VivArcDiError as error:
        reporter.error(str(error))
        return 1
