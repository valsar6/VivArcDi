from __future__ import annotations

from pathlib import Path

from ..cli import REPO_ROOT, build_context
from ..commands import InstallerContext
from ..modes import InstallMode
from ..platforms import MacOSPlatform, Platform
from ..quitter import VivaldiQuitter
from ..releases import ReleaseChecker
from ..reporter import CollectingReporter
from ..running import ProcessGuard
from ..system import CommandRunner
from .errorlog import ErrorLog
from .model import StatusModel
from .presenter import WindowPresenter, WindowView


def assemble_presenter(
    context: InstallerContext,
    reporter: CollectingReporter,
    view: WindowView,
    runner: CommandRunner,
    quitter: VivaldiQuitter | None = None,
    state_dir: Path | None = None,
    release_checker: ReleaseChecker | None = None,
) -> WindowPresenter:
    """Wire a presenter around an installer context built with `reporter`.

    The error log goes to `state_dir`, the data folder when omitted.

    A macOS context gets a VivaldiQuitter unless `quitter` is given; other systems get none.
    """
    guard = ProcessGuard(context.platform.process_names(), runner)
    if quitter is None and isinstance(context.platform, MacOSPlatform):
        quitter = VivaldiQuitter(runner, guard)
    model = StatusModel(context.platform, context.installations, context.ownership.is_registered)
    error_log = ErrorLog(state_dir or context.data_dir)
    return WindowPresenter(context, reporter, model, view, guard, quitter, error_log, release_checker)


def build_presenter(
    platform: Platform,
    mode: InstallMode,
    view: WindowView,
    repo_root: Path = REPO_ROOT,
    runner: CommandRunner | None = None,
    state_dir: Path | None = None,
    release_checker: ReleaseChecker | None = None,
) -> WindowPresenter:
    """Build the installer context for `mode` and a presenter that drives `view`."""
    runner = runner or CommandRunner()
    reporter = CollectingReporter()
    context = build_context(platform, reporter, repo_root=repo_root, runner=runner, mode=mode)
    return assemble_presenter(context, reporter, view, runner, None, state_dir, release_checker)
