import io
import os
import tempfile
import unittest
from pathlib import Path

from support import WINDOW_HTML, FakeRunner, make_debian_vivaldi, make_macos_vivaldi, make_payload_source
from vivarcdi.cli import build_context
from vivarcdi.commands import InstallCommand, ReapplyCommand, UninstallCommand
from vivarcdi.handoff import TerminalHandoff
from vivarcdi.platforms import DebianPlatform, MacOSPlatform
from vivarcdi.reporter import Reporter
from vivarcdi.system import CommandResult


class MacOSReapplyHandoffTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.repo = make_payload_source(self.root).parent
        self.window_html = make_macos_vivaldi(self.root) / "window.html"
        self.runner = FakeRunner()
        self.platform = MacOSPlatform(self.root, self.root / "Users" / "tore", self.runner)
        self.output = io.StringIO()
        InstallCommand().execute(self.context(background=False))
        self.window_html.write_text(WINDOW_HTML)
        self.runner.calls.clear()

    def context(self, background):
        reporter = Reporter(out=self.output, err=self.output)
        return build_context(self.platform, reporter, repo_root=self.repo, background=background)

    def script(self):
        return self.platform.data_dir / TerminalHandoff.SCRIPT_NAME

    def test_the_hook_runs_reapply_in_background_mode(self):
        self.assertEqual(self.context(background=False).reapply_command[-2:], ["--quiet", "--background"])

    def test_background_reapply_on_macos_hands_off_to_terminal(self):
        ReapplyCommand().execute(self.context(background=True))
        self.assertEqual(self.window_html.read_text(), WINDOW_HTML)
        self.assertEqual(self.runner.calls, [["open", "-a", "Terminal", str(self.script())]])

    def test_terminal_script_runs_an_interactive_reapply(self):
        ReapplyCommand().execute(self.context(background=True))
        text = self.script().read_text()
        self.assertTrue(text.startswith("#!/bin/sh\n"))
        self.assertIn("/VivArcDi/installer' reapply\n", text)
        self.assertNotIn("--background", text)
        self.assertTrue(os.access(self.script(), os.X_OK))

    def test_background_reapply_opens_nothing_when_up_to_date(self):
        ReapplyCommand().execute(self.context(background=False))
        self.runner.calls.clear()
        ReapplyCommand().execute(self.context(background=True))
        self.assertEqual(self.runner.calls, [])

    def test_interactive_reapply_on_macos_patches_and_clears_the_script(self):
        ReapplyCommand().execute(self.context(background=True))
        ReapplyCommand().execute(self.context(background=False))
        self.assertIn("vivarcdi/loader.js", self.window_html.read_text())
        self.assertFalse(self.script().exists())

    def test_uninstall_removes_the_terminal_script(self):
        ReapplyCommand().execute(self.context(background=True))
        UninstallCommand().execute(self.context(background=False))
        self.assertFalse(self.script().exists())


class DebianReapplyHandoffTest(unittest.TestCase):
    def test_background_reapply_without_handoff_patches_directly(self):
        root = Path(tempfile.mkdtemp())
        repo = make_payload_source(root).parent
        window_html = make_debian_vivaldi(root) / "window.html"
        runner = FakeRunner({"dpkg-query": CommandResult(0, "8.2.4133.94-1", "")})
        platform = DebianPlatform(root, runner)
        reporter = Reporter(out=io.StringIO(), err=io.StringIO())
        InstallCommand().execute(build_context(platform, reporter, repo_root=repo))
        window_html.write_text(WINDOW_HTML)
        ReapplyCommand().execute(build_context(platform, reporter, repo_root=repo, background=True))
        self.assertIn("vivarcdi/loader.js", window_html.read_text())


if __name__ == "__main__":
    unittest.main()
