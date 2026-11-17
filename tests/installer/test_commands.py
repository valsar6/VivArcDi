import io
import json
import tempfile
import shutil
import unittest
from pathlib import Path

from support import WINDOW_HTML, FakeRunner, make_debian_vivaldi, make_payload_source
from vivarcdi import __version__
from vivarcdi.cli import build_context
from vivarcdi.errors import InstallerError
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

    def test_install_raises_installer_error_when_dist_is_missing(self):
        shutil.rmtree(self.repo / "dist")
        with self.assertRaisesRegex(InstallerError, "make build"):
            self.run_command(InstallCommand())
        self.assertNotIn("vivarcdi/loader.js", self.window_html.read_text())

    def test_install_removes_a_staged_copy_of_the_old_src_folder(self):
        legacy = self.platform.data_dir / "src"
        legacy.mkdir(parents=True)
        self.run_command(InstallCommand())
        self.assertFalse(legacy.exists())
        self.assertTrue((self.platform.data_dir / "dist" / "loader.js").exists())

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

    def build_json(self, resources=None):
        return (resources or self.resources) / "vivarcdi" / "build.json"

    def deploy_version(self, version, resources=None):
        build = json.loads(self.build_json(resources).read_text())
        self.build_json(resources).write_text(json.dumps({**build, "vivarcdiVersion": version}))

    def deployed_version(self, resources=None):
        return json.loads(self.build_json(resources).read_text())["vivarcdiVersion"]

    def stage(self):
        return self.platform.data_dir / "installer"

    def test_install_refuses_an_older_version(self):
        self.run_command(InstallCommand())
        self.deploy_version("99.0.0")
        self.window_html.write_text(WINDOW_HTML)
        shutil.rmtree(self.stage())
        self.assertEqual(self.run_command(InstallCommand()), 1)
        self.assertEqual(self.window_html.read_text(), WINDOW_HTML)
        self.assertFalse(self.stage().exists())
        self.assertEqual(self.deployed_version(), "99.0.0")
        output = self.output.getvalue()
        self.assertIn(f"VivArcDi 99.0.0 is already installed, newer than this VivArcDi ({__version__})", output)
        self.assertIn("--allow-downgrade", output)

    def test_install_allows_an_older_version_on_request(self):
        self.run_command(InstallCommand())
        self.deploy_version("99.0.0")
        shutil.rmtree(self.stage())
        self.context.allow_downgrade = True
        self.assertEqual(self.run_command(InstallCommand()), 0)
        self.assertEqual(self.deployed_version(), __version__)
        self.assertTrue(self.stage().exists())

    def test_install_redeploys_the_same_version(self):
        self.run_command(InstallCommand())
        (self.repo / "dist" / "extra.js").write_text("export {};\n")
        self.assertEqual(self.run_command(InstallCommand()), 0)
        self.assertTrue((self.resources / "vivarcdi" / "extra.js").exists())

    def test_reapply_keeps_a_newer_payload(self):
        self.run_command(InstallCommand())
        self.deploy_version("99.0.0")
        before = self.output.getvalue()
        self.run_command(ReapplyCommand())
        self.assertEqual(self.deployed_version(), "99.0.0")
        self.assertEqual(self.output.getvalue(), before)

    def test_reapply_restores_the_block_of_a_newer_payload(self):
        self.run_command(InstallCommand())
        self.deploy_version("99.0.0")
        (self.repo / "dist" / "extra.js").write_text("export {};\n")
        self.window_html.write_text(WINDOW_HTML)
        self.run_command(ReapplyCommand())
        self.assertIn("vivarcdi/loader.js", self.window_html.read_text())
        self.assertEqual(self.deployed_version(), "99.0.0")
        self.assertFalse((self.resources / "vivarcdi" / "extra.js").exists())

    def test_reapply_warns_when_the_stage_is_older(self):
        snapshot = make_debian_vivaldi(self.root, "opt/vivaldi-snapshot")
        self.run_command(InstallCommand())
        self.deploy_version("99.0.0")
        shutil.rmtree(snapshot / "vivarcdi")
        (snapshot / "window.html").write_text(WINDOW_HTML)
        self.run_command(ReapplyCommand())
        self.assertEqual(self.deployed_version(snapshot), __version__)
        self.assertEqual(self.deployed_version(), "99.0.0")
        warnings = [line for line in self.output.getvalue().splitlines() if "Applied the staged" in line]
        self.assertEqual(len(warnings), 1)
        self.assertIn(f"VivArcDi {__version__}", warnings[0])
        self.assertIn("99.0.0", warnings[0])

    def test_status_shows_installed_and_staged_versions(self):
        (self.repo / "installer" / "vivarcdi").mkdir()
        (self.repo / "installer" / "vivarcdi" / "__init__.py").write_text(f'__version__ = "{__version__}"\n')
        self.run_command(InstallCommand())
        self.run_command(StatusCommand())
        output = self.output.getvalue()
        self.assertIn(f"Vivaldi stable 8.1.3740.12: patched, up to date ({__version__})", output)
        self.assertIn(f"Staged copy: {__version__}", output)
        self.assertNotIn("older than the installed", output)
        init = self.stage() / "vivarcdi" / "__init__.py"
        init.write_text(init.read_text().replace(__version__, "0.1.0"))
        self.run_command(StatusCommand())
        self.assertIn(f"The staged copy (0.1.0) is older than the installed VivArcDi ({__version__}): run install from {__version__} again", self.output.getvalue())

    def test_unreadable_versions_block_nothing(self):
        self.run_command(InstallCommand())
        for content in ("{broken", json.dumps({"vivarcdiVersion": "dev"}), json.dumps({"vivarcdiVersion": 7})):
            with self.subTest(content=content):
                self.build_json().write_text(content)
                self.assertEqual(self.run_command(InstallCommand()), 0)
                self.assertEqual(self.deployed_version(), __version__)
                self.build_json().write_text(content)
                self.run_command(ReapplyCommand())
                self.assertEqual(self.deployed_version(), __version__)
        self.build_json().unlink()
        self.assertEqual(self.run_command(InstallCommand()), 0)

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
