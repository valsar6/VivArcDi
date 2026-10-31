from __future__ import annotations

import argparse
from pathlib import Path

from . import __version__
from .backup import BackupStore
from .commands import COMMANDS, Command, InstallerContext, ReapplyCommand, ShortcutsCommand, UninstallCommand
from .distribution import DIST_FOLDER
from .errors import VivArcDiError
from .modes import MODES, CommandLineMode, InstallMode, mode_named
from .patching import InstallationPatcher
from .preferences import ShortcutTable
from .preferences_backup import PreferencesBackupStore
from .payload import PayloadDeployer
from .platforms import Platform, PlatformFactory, is_root
from .profiles import ProfileLocator
from .reporter import Reporter
from .running import ProcessGuard
from .shortcuts import ShortcutService
from .system import CommandRunner
from .window_patch import WindowHtmlPatcher

MODE_HELP = "who manages VivArcDi: the command line (cli), the macOS app (app) or the Debian package (deb)"
REPO_ROOT = Path(__file__).resolve().parents[2]


def build_context(
    platform: Platform,
    reporter: Reporter,
    repo_root: Path = REPO_ROOT,
    background: bool = False,
    runner: CommandRunner | None = None,
    mode: InstallMode | None = None,
) -> InstallerContext:
    """Wire the installer services for a platform and an install mode.

    `background` is True when the update hook runs the command, not the user.
    `mode` defaults to the command line mode.
    """
    mode = mode or CommandLineMode()
    data_dir = mode.data_dir(platform)
    reapply = mode.reapply_command(repo_root, data_dir)
    installations = InstallationPatcher(
        WindowHtmlPatcher(),
        PayloadDeployer(repo_root / DIST_FOLDER, __version__),
        BackupStore(data_dir / "backups"),
        mode.permission_advisor(platform),
    )
    shortcuts = ShortcutService(
        ProfileLocator(platform.profile_roots()),
        ShortcutTable.load(platform.modifier),
        PreferencesBackupStore(data_dir / "preferences-backups"),
        ProcessGuard(platform.process_names(), runner or CommandRunner()),
        reporter,
    )
    return InstallerContext(
        platform=platform,
        installations=installations,
        stager=mode.stager(repo_root, data_dir),
        hook=mode.update_hook(platform),
        reapply_command=[*reapply, "--quiet", "--background"],
        reporter=reporter,
        handoff=mode.reapply_handoff(platform, reapply),
        shortcuts=shortcuts,
        mode=mode,
        data_dir=data_dir,
        ownership=mode.ownership(platform, data_dir),
        background=background,
    )


def parse_arguments(argv: list[str]) -> argparse.Namespace:
    """Parse the command line: one subcommand plus an optional --quiet flag."""
    parser = argparse.ArgumentParser(prog="vivarcdi", description="Make Vivaldi behave like Arc.")
    parser.add_argument("--version", action="version", version=f"VivArcDi {__version__}")
    parser.add_argument("--mode", choices=[mode.name for mode in MODES], default="cli", help=MODE_HELP)
    subcommands = parser.add_subparsers(dest="command", required=True)
    for command in COMMANDS:
        subparser = subcommands.add_parser(command.name, help=command.help)
        subparser.add_argument("--quiet", action="store_true", help="print only warnings and errors")
        subparser.add_argument("--mode", choices=[mode.name for mode in MODES], default=argparse.SUPPRESS, help=MODE_HELP)
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
        mode = mode_named(arguments.mode)
        if not mode.supports(platform):
            reporter.error(f"--mode {mode.name} is not for {platform.name}")
            return 1
        if command.needs_root and platform.requires_root and not is_root():
            reporter.error(f"On {platform.name} run it with sudo: sudo python3 installer {command.name}")
            return 1
        if not platform.allows_root and is_root():
            reporter.error(f"On {platform.name} run it without sudo: python3 installer {command.name}")
            return 1
        if command.refuses_root and is_root():
            reporter.error(f"Run it without sudo, the profile belongs to you: python3 installer {command.name}")
            return 1
        context = build_context(
            platform, reporter, background=getattr(arguments, "background", False), mode=mode
        )
        context.shortcut_action = getattr(arguments, "action", "status")
        context.dry_run = getattr(arguments, "dry_run", False)
        context.restore_shortcuts = getattr(arguments, "restore_shortcuts", False)
        return command.execute(context)
    except VivArcDiError as error:
        reporter.error(str(error))
        return 1
