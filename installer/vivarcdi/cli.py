import argparse
import sys
from pathlib import Path

from . import __version__
from .backup import BackupStore
from .commands import COMMANDS, Command, InstallerContext
from .distribution import DIST_FOLDER
from .errors import VivArcDiError
from .patching import InstallationPatcher
from .payload import PayloadDeployer
from .platforms import Platform, PlatformFactory, is_root
from .reporter import Reporter
from .staging import SelfStager
from .window_patch import WindowHtmlPatcher

REPO_ROOT = Path(__file__).resolve().parents[2]


def build_context(platform: Platform, reporter: Reporter, repo_root: Path = REPO_ROOT) -> InstallerContext:
    """Wire the installer services for a platform."""
    stager = SelfStager(repo_root, platform.data_dir)
    installations = InstallationPatcher(
        WindowHtmlPatcher(),
        PayloadDeployer(repo_root / DIST_FOLDER, __version__),
        BackupStore(platform.data_dir / "backups"),
        platform.permission_advisor(),
    )
    return InstallerContext(
        platform=platform,
        installations=installations,
        stager=stager,
        hook=platform.update_hook(),
        reapply_command=[sys.executable, str(stager.staged_installer), "reapply", "--quiet"],
        reporter=reporter,
    )


def parse_arguments(argv: list[str]) -> argparse.Namespace:
    """Parse the command line: one subcommand plus an optional --quiet flag."""
    parser = argparse.ArgumentParser(prog="vivarcdi", description="Make Vivaldi behave like Arc.")
    parser.add_argument("--version", action="version", version=f"VivArcDi {__version__}")
    subcommands = parser.add_subparsers(dest="command", required=True)
    for command in COMMANDS:
        subparser = subcommands.add_parser(command.name, help=command.help)
        subparser.add_argument("--quiet", action="store_true", help="print only warnings and errors")
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
        return command.execute(build_context(platform, reporter))
    except VivArcDiError as error:
        reporter.error(str(error))
        return 1
