import shutil
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "tests" / "installer"))
sys.path.insert(0, str(REPO / "scripts" / "live"))

from support import WINDOW_HTML, FakeRunner, make_debian_vivaldi, make_macos_vivaldi
from vivarcdi.platforms import DebianPlatform, MacOSPlatform
from vivarcdi.system import CommandResult
from vivarcdi.window_patch import WindowHtmlPatcher

from lab import LabBuilder, LabError, platform_at

VERSION = "8.3.4191.44"


def copy_with_links(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target, symlinks=True)


class LabBuilderTest(unittest.TestCase):
    def setUp(self):
        self._temp = tempfile.TemporaryDirectory()
        self.root = Path(self._temp.name)
        self.real = self.root / "real"
        self.lab = self.root / "lab"
        self.real_resources = make_macos_vivaldi(self.real, VERSION)
        self.copies = []
        self.verified = []

    def tearDown(self):
        self._temp.cleanup()

    def patch_installed_vivaldi(self):
        window = self.real_resources / "window.html"
        window.write_text(WindowHtmlPatcher().apply(window.read_text()))
        (self.real_resources / "vivarcdi").mkdir()
        (self.real_resources / "vivarcdi" / "loader.js").write_text("export {};\n")

    def builder(self, verifier=None):
        def counting_copy(source, target):
            self.copies.append(source)
            copy_with_links(source, target)

        return LabBuilder(
            MacOSPlatform(root=self.real),
            platform_at(MacOSPlatform),
            self.lab,
            counting_copy,
            verifier or self.verified.append,
        )

    def test_lab_copy_stays_as_vivaldi_shipped_it(self):
        self.patch_installed_vivaldi()
        installed = (self.real_resources / "window.html").read_text()

        result = self.builder().prepare("stable", self.real)

        lab_resources = Path(result["resourcesDir"])
        self.assertEqual((lab_resources / "window.html").read_text(), WINDOW_HTML)
        self.assertFalse((lab_resources / "vivarcdi").exists())
        self.assertEqual((self.real_resources / "window.html").read_text(), installed)
        self.assertTrue((self.real_resources / "vivarcdi" / "loader.js").is_file())
        self.assertTrue(lab_resources.is_relative_to(self.lab))

    def test_verifies_the_signature_of_the_copy(self):
        self.builder().prepare("stable", self.real)

        self.assertEqual(self.verified, [self.lab / f"stable-{VERSION}" / "Applications/Vivaldi.app"])

    def test_refuses_a_copy_whose_signature_fails(self):
        def failing(copy):
            raise LabError(f"The lab copy {copy} fails its code signature")

        with self.assertRaises(LabError):
            self.builder(failing).prepare("stable", self.real)

    def test_reports_the_executable_and_version_of_the_copy(self):
        result = self.builder().prepare("stable", self.real)

        self.assertEqual(result["vivaldiVersion"], VERSION)
        self.assertEqual(
            result["executable"],
            str(self.lab / f"stable-{VERSION}" / "Applications/Vivaldi.app/Contents/MacOS/Vivaldi"),
        )

    def test_copies_a_version_once(self):
        builder = self.builder()
        builder.prepare("stable", self.real)
        builder.prepare("stable", self.real)

        self.assertEqual(len(self.copies), 1)

    def test_lab_uses_the_given_version_for_an_unpacked_build(self):
        unpacked = self.root / "unpacked"
        make_debian_vivaldi(unpacked, "opt/vivaldi-snapshot")
        no_dpkg_record = FakeRunner({"dpkg-query": CommandResult(1, "", "not installed")})
        builder = LabBuilder(
            DebianPlatform(root=unpacked, runner=no_dpkg_record, home=self.root),
            lambda root: DebianPlatform(root=root, runner=no_dpkg_record, home=self.root),
            self.lab,
            copy_with_links,
            self.verified.append,
        )

        result = builder.prepare("snapshot", unpacked, "8.4.4226.3")

        self.assertEqual(result["vivaldiVersion"], "8.4.4226.3")
        self.assertEqual(result["labDir"], str(self.lab / "snapshot-8.4.4226.3"))
        self.assertEqual(result["executable"], str(self.lab / "snapshot-8.4.4226.3" / "opt/vivaldi-snapshot/vivaldi-snapshot"))

    def test_refuses_a_channel_that_is_not_installed(self):
        with self.assertRaises(LabError):
            self.builder().prepare("snapshot", self.real)


if __name__ == "__main__":
    unittest.main()
