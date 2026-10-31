import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from support import FakeRunner, make_debian_vivaldi
from test_window import MacWindowCase, NOT_RUNNING, VERSION, FakeView
from vivarcdi import cli
from vivarcdi.commands import WindowCommand
from vivarcdi.modes import CommandLineMode, DebPackageMode, MacAppMode, WindowAction
from vivarcdi.platforms import DebianPlatform
from vivarcdi.releases import Release
from vivarcdi.reporter import Reporter
from vivarcdi.window.assembly import build_presenter
from vivarcdi.window.launcher import TK_MISSING, TkWindowLauncher

TK_MODULES = ("tkinter", "tkinter.ttk", "tkinter.messagebox", "vivarcdi.window.tk_view")


class FakeChecker:
    def newer_release(self):
        return Release("9.9.9", "https://example.test/release")


class WindowExtrasTest(MacWindowCase):
    def test_install_in_the_app_offers_the_shortcuts_once(self):
        presenter = self.presenter()
        presenter.perform(WindowAction.INSTALL)
        self.assertTrue(self.view.state.offer_shortcuts)
        presenter.refresh()
        self.assertTrue(self.view.state.offer_shortcuts)
        presenter.perform(WindowAction.UNINSTALL)
        self.assertFalse(self.view.state.offer_shortcuts)

    def test_install_outside_the_app_does_not_offer_the_shortcuts(self):
        presenter = build_presenter(self.platform, CommandLineMode(), self.view, repo_root=self.repo, runner=self.runner)
        presenter.perform(WindowAction.INSTALL)
        self.assertFalse(self.view.state.offer_shortcuts)

    def test_a_newer_release_is_part_of_the_state(self):
        presenter = build_presenter(
            self.platform, MacAppMode(), self.view, repo_root=self.repo, runner=self.runner, release_checker=FakeChecker()
        )
        presenter.refresh()
        self.assertEqual((self.view.state.update_version, self.view.state.update_url), ("9.9.9", "https://example.test/release"))

    def test_no_release_checker_means_no_update_line(self):
        self.presenter().refresh()
        self.assertEqual(self.view.state.update_version, "")


class StateFolderTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        make_debian_vivaldi(self.root)
        self.platform = DebianPlatform(self.root, FakeRunner({"dpkg-query": VERSION}), home=self.root / "home")

    def test_the_debian_window_keeps_its_files_in_the_user_state_folder(self):
        launcher = TkWindowLauncher(home=self.root / "home")
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("XDG_STATE_HOME", None)
            self.assertEqual(launcher.state_dir(self.platform, DebPackageMode()), self.root / "home/.local/state/vivarcdi")
            os.environ["XDG_STATE_HOME"] = str(self.root / "state")
            self.assertEqual(launcher.state_dir(self.platform, DebPackageMode()), self.root / "state/vivarcdi")

    def test_the_window_runs_the_view_with_a_presenter(self):
        class RecordingView(FakeView):
            def run(self, presenter):
                presenter.refresh()

        repo = self.root / "repo"
        (repo / "dist").mkdir(parents=True)
        view = RecordingView()
        launcher = TkWindowLauncher(lambda: lambda: view, FakeRunner({"dpkg-query": VERSION, "pgrep": NOT_RUNNING}), repo, self.root / "home")
        with mock.patch.dict(os.environ, {"XDG_STATE_HOME": str(self.root / "state")}):
            self.assertEqual(launcher.run(self.platform, DebPackageMode()), 0)
        self.assertEqual(len(view.state.rows), 1)


class MissingTkinterTest(unittest.TestCase):
    def test_window_command_fails_cleanly_when_tkinter_cannot_be_imported(self):
        root = Path(tempfile.mkdtemp())
        make_debian_vivaldi(root)
        platform = DebianPlatform(root, FakeRunner({"dpkg-query": VERSION}), home=root / "home")
        errors = io.StringIO()
        blocked = {name: None for name in TK_MODULES}
        with mock.patch.dict("sys.modules", blocked), mock.patch.object(
            cli.PlatformFactory, "create", return_value=platform
        ), mock.patch.object(cli, "is_root", return_value=False), mock.patch.object(
            cli, "Reporter", lambda quiet: Reporter(quiet, err=errors)
        ):
            code = cli.main(["window"])
        self.assertEqual(code, 1)
        self.assertIn("python3-tk", errors.getvalue())
        self.assertIn(TK_MISSING, errors.getvalue())

    def test_window_command_asks_its_launcher_to_run(self):
        calls = []

        class Launcher:
            def run(self, platform, mode):
                calls.append((platform.name, mode.name))
                return 0

        root = Path(tempfile.mkdtemp())
        platform = DebianPlatform(root, FakeRunner(), home=root)
        context = cli.build_context(platform, mock.Mock(), repo_root=root)
        self.assertEqual(WindowCommand(Launcher).execute(context), 0)
        self.assertEqual(calls, [("Debian", "cli")])

    def test_window_command_does_not_run_as_root(self):
        self.assertTrue(WindowCommand.refuses_root)
        self.assertFalse(WindowCommand.needs_root)


if __name__ == "__main__":
    unittest.main()
