import io
import json
import tempfile
import unittest
from pathlib import Path

from support import WINDOW_HTML, FakeRunner, make_debian_vivaldi, make_payload_source
from vivarcdi.cli import build_context
from vivarcdi.commands import InstallCommand, ReapplyCommand, StatusCommand, UninstallCommand
from vivarcdi.platforms import DebianPlatform
from vivarcdi.reporter import Reporter
from vivarcdi.system import CommandResult


class CommandsTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        source = make_payload_source(self.root)
        self.repo = source.parent
        self.resources = make_debian_vivaldi(self.root)
        self.window_html = self.resources / "window.html"
        self.runner = FakeRunner({"dpkg-query": CommandResult(0, "8.1.3740.12-1", "")})
        self.platform = DebianPlatform(self.root, self.runner)
        self.output = io.StringIO()
        reporter = Reporter(out=self.output, err=self.output)
        self.context = build_context(self.platform, reporter, repo_root=self.repo)

    def run_command(self, command):
        return command.execute(self.context)

    def test_install_patches_deploys_backs_up_and_hooks(self):
        self.assertEqual(self.run_command(InstallCommand()), 0)
        self.assertIn("vivarcdi/loader.js", self.window_html.read_text())
        build = json.loads((self.resources / "vivarcdi" / "build.json").read_text())
        self.assertEqual(build["vivaldiVersion"], "8.1.3740.12")
        self.assertTrue((self.resources / "vivarcdi" / "core" / "VivArcDi.js").exists())
        backup = self.platform.data_dir / "backups" / "stable-8.1.3740.12" / "window.html"
        self.assertEqual(backup.read_text(), WINDOW_HTML)
        self.assertTrue((self.platform.data_dir / "installer" / "__main__.py").exists())
        self.assertTrue(self.context.hook.is_installed())

    def test_install_fails_without_vivaldi(self):
        self.window_html.unlink()
        self.assertEqual(self.run_command(InstallCommand()), 1)
        self.assertIn("No Vivaldi installation", self.output.getvalue())

    def test_reapply_restores_a_patch_lost_in_an_update(self):
        self.run_command(InstallCommand())
        self.window_html.write_text(WINDOW_HTML)
        self.run_command(ReapplyCommand())
        self.assertIn("vivarcdi/loader.js", self.window_html.read_text())
        self.assertIn("Reapplied", self.output.getvalue())

    def test_reapply_redeploys_after_a_vivaldi_version_change(self):
        self.run_command(InstallCommand())
        self.runner.responses["dpkg-query"] = CommandResult(0, "8.2.1.1-1", "")
        self.run_command(ReapplyCommand())
        build = json.loads((self.resources / "vivarcdi" / "build.json").read_text())
        self.assertEqual(build["vivaldiVersion"], "8.2.1.1")

    def test_reapply_does_nothing_when_up_to_date(self):
        self.run_command(InstallCommand())
        before = self.output.getvalue()
        self.run_command(ReapplyCommand())
        self.assertEqual(self.output.getvalue(), before)

    def test_uninstall_restores_vivaldi_and_keeps_backups(self):
        self.run_command(InstallCommand())
        self.assertEqual(self.run_command(UninstallCommand()), 0)
        self.assertEqual(self.window_html.read_text(), WINDOW_HTML)
        self.assertFalse((self.resources / "vivarcdi").exists())
        self.assertFalse(self.context.hook.is_installed())
        self.assertFalse((self.platform.data_dir / "installer").exists())
        self.assertTrue((self.platform.data_dir / "backups").exists())

    def test_status_reports_each_state(self):
        self.run_command(StatusCommand())
        self.run_command(InstallCommand())
        self.run_command(StatusCommand())
        output = self.output.getvalue()
        self.assertIn("Vivaldi stable 8.1.3740.12: not patched", output)
        self.assertIn("Vivaldi stable 8.1.3740.12: patched, up to date", output)
        self.assertIn("Update hook: active", output)


if __name__ == "__main__":
    unittest.main()
