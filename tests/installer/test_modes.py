import io
import tempfile
import unittest
from pathlib import Path

from support import FakeRunner, make_debian_vivaldi, make_macos_vivaldi, make_payload_source
from vivarcdi.cli import build_context
from vivarcdi.commands import InstallCommand, UninstallCommand
from vivarcdi.hooks import AptHook, LaunchAgentHook, PackageTriggerHook
from vivarcdi.modes import CommandLineMode, DebPackageMode, MacAppMode, WindowAction, mode_named
from vivarcdi.ownership import PackageMarker
from vivarcdi.platforms import DebianPlatform, MacOSPlatform
from vivarcdi.reporter import Reporter
from vivarcdi.staging import NoStager, SelfStager


class ModeCase(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.repo = make_payload_source(self.root).parent
        self.runner = FakeRunner()
        self.output = io.StringIO()

    def context(self, platform, mode):
        reporter = Reporter(out=self.output, err=self.output)
        return build_context(platform, reporter, repo_root=self.repo, runner=self.runner, mode=mode)


class DebianModesTest(ModeCase):
    def setUp(self):
        super().setUp()
        make_debian_vivaldi(self.root)
        self.platform = DebianPlatform(self.root, self.runner)

    def test_command_line_mode_keeps_the_platform_parts(self):
        context = self.context(self.platform, CommandLineMode())
        self.assertEqual(context.data_dir, self.platform.data_dir)
        self.assertIsInstance(context.hook, AptHook)
        self.assertIsInstance(context.stager, SelfStager)

    def test_package_mode_uses_the_var_lib_folder_and_does_not_stage(self):
        context = self.context(self.platform, DebPackageMode())
        self.assertEqual(context.data_dir, self.root / "var/lib/vivarcdi")
        self.assertIsInstance(context.hook, PackageTriggerHook)
        self.assertIsInstance(context.stager, NoStager)
        InstallCommand().execute(context)
        self.assertFalse((context.data_dir / "installer").exists())
        self.assertTrue((context.data_dir / "backups").exists())

    def test_package_hook_is_always_active_and_has_nothing_to_install(self):
        hook = PackageTriggerHook()
        hook.install(["vivarcdi"])
        hook.remove()
        self.assertTrue(hook.is_installed())
        self.assertEqual(hook.describe(), "dpkg trigger of the vivarcdi package")

    def test_modes_are_found_by_name(self):
        self.assertIsInstance(mode_named("deb"), DebPackageMode)
        self.assertEqual(DebPackageMode.visible_actions, {WindowAction.APPLY_SHORTCUTS, WindowAction.RESTORE_SHORTCUTS})

    def test_modes_know_their_platform(self):
        self.assertTrue(DebPackageMode().supports(self.platform))
        self.assertFalse(MacAppMode().supports(self.platform))


class MacAppModeTest(ModeCase):
    def setUp(self):
        super().setUp()
        make_macos_vivaldi(self.root)
        self.platform = MacOSPlatform(self.root, self.root / "Users" / "tore", self.runner)

    def test_app_mode_runs_the_app_executable_without_staging_or_handoff(self):
        mode = MacAppMode(Path("/Applications/VivArcDi.app/Contents/MacOS/VivArcDi"))
        context = self.context(self.platform, mode)
        self.assertEqual(
            context.reapply_command,
            ["/Applications/VivArcDi.app/Contents/MacOS/VivArcDi", "reapply", "--mode", "app", "--quiet", "--background"],
        )
        self.assertIsInstance(context.hook, LaunchAgentHook)
        self.assertIsInstance(context.stager, NoStager)
        self.assertFalse(context.handoff.available)
        self.assertEqual(context.data_dir, self.platform.data_dir)


class ManagedByMarkerTest(ModeCase):
    def setUp(self):
        super().setUp()
        make_debian_vivaldi(self.root)
        self.platform = DebianPlatform(self.root, self.runner)
        self.marker = PackageMarker(self.platform.package_data_dir)

    def test_package_install_writes_the_marker_and_uninstall_deletes_it(self):
        context = self.context(self.platform, DebPackageMode())
        InstallCommand().execute(context)
        self.assertEqual(self.marker.owner(), "deb")
        UninstallCommand().execute(context)
        self.assertIsNone(self.marker.owner())
        self.assertTrue((context.data_dir / "backups").exists())

    def test_command_line_install_defers_to_the_package(self):
        cases = {
            "deb": ("the vivarcdi package", self.platform, self.root / "var/lib/vivarcdi"),
            "app": (
                "the VivArcDi app",
                MacOSPlatform(self.root, self.root / "home", self.runner),
                self.root / "home/Library/Application Support/VivArcDi",
            ),
        }
        make_macos_vivaldi(self.root)
        for owner, (name, platform, data_dir) in cases.items():
            with self.subTest(owner=owner):
                PackageMarker(data_dir).write(owner)
                self.output.truncate(0)
                self.output.seek(0)
                context = self.context(platform, CommandLineMode())
                self.assertEqual(InstallCommand().execute(context), 1)
                self.assertIn(name, self.output.getvalue())
                self.assertNotIn("vivarcdi/loader.js", platform.find_installations()[0].window_html.read_text())

    def test_command_line_install_still_works_without_a_marker(self):
        context = self.context(self.platform, CommandLineMode())
        self.assertEqual(InstallCommand().execute(context), 0)
        self.assertIsNone(self.marker.owner())


if __name__ == "__main__":
    unittest.main()
