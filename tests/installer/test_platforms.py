import tempfile
import unittest
from pathlib import Path

from support import FakeRunner, make_debian_vivaldi, make_macos_vivaldi
from vivarcdi.errors import UnsupportedPlatformError
from vivarcdi.hooks import AptHook, LaunchAgentHook
from vivarcdi.platforms import DebianPlatform, MacOSPlatform, PlatformFactory
from vivarcdi.system import CommandResult


class DebianPlatformTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def test_finds_stable_with_package_version(self):
        resources = make_debian_vivaldi(self.root)
        runner = FakeRunner({"dpkg-query": CommandResult(0, "8.1.3740.12-1", "")})
        found = DebianPlatform(self.root, runner).find_installations()
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0].channel, "stable")
        self.assertEqual(found[0].version, "8.1.3740.12")
        self.assertEqual(found[0].resources_dir, resources)

    def test_unknown_version_when_dpkg_fails(self):
        make_debian_vivaldi(self.root, "opt/vivaldi-snapshot")
        runner = FakeRunner({"dpkg-query": CommandResult(1, "", "not installed")})
        found = DebianPlatform(self.root, runner).find_installations()
        self.assertEqual([(i.channel, i.version) for i in found], [("snapshot", "unknown")])

    def test_uses_an_apt_hook(self):
        self.assertIsInstance(DebianPlatform(self.root, FakeRunner()).update_hook(), AptHook)


class MacOSPlatformTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.home = self.root / "Users" / "tore"

    def test_finds_versioned_framework_and_skips_current(self):
        resources = make_macos_vivaldi(self.root)
        found = MacOSPlatform(self.root, self.home, FakeRunner()).find_installations()
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0].version, "8.1.3740.12")
        self.assertEqual(found[0].resources_dir, resources)

    def test_data_dir_is_in_application_support(self):
        platform = MacOSPlatform(self.root, self.home, FakeRunner())
        self.assertEqual(platform.data_dir, self.home / "Library/Application Support/VivArcDi")

    def test_uses_a_launch_agent(self):
        make_macos_vivaldi(self.root)
        self.assertIsInstance(MacOSPlatform(self.root, self.home, FakeRunner()).update_hook(), LaunchAgentHook)


class PlatformFactoryTest(unittest.TestCase):
    def setUp(self):
        self.os_release = Path(tempfile.mkdtemp()) / "os-release"

    def test_darwin_is_macos(self):
        self.assertIsInstance(PlatformFactory("Darwin", self.os_release).create(), MacOSPlatform)

    def test_debian_trixie_is_debian(self):
        self.os_release.write_text('ID=debian\nVERSION_CODENAME=trixie\n')
        self.assertIsInstance(PlatformFactory("Linux", self.os_release).create(), DebianPlatform)

    def test_ubuntu_counts_as_debian_based(self):
        self.os_release.write_text('ID=ubuntu\nID_LIKE=debian\n')
        self.assertIsInstance(PlatformFactory("Linux", self.os_release).create(), DebianPlatform)

    def test_fedora_is_unsupported(self):
        self.os_release.write_text('ID=fedora\n')
        with self.assertRaises(UnsupportedPlatformError):
            PlatformFactory("Linux", self.os_release).create()

    def test_windows_is_unsupported(self):
        with self.assertRaises(UnsupportedPlatformError):
            PlatformFactory("Windows", self.os_release).create()


if __name__ == "__main__":
    unittest.main()
