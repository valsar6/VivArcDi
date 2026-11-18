import shutil
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "tests" / "installer"))
sys.path.insert(0, str(REPO / "scripts" / "live"))

from support import make_macos_vivaldi, make_payload_source
from vivarcdi.platforms import MacOSPlatform
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
        self.dist = make_payload_source(self.root)
        self.copies = []

    def tearDown(self):
        self._temp.cleanup()

    def builder(self):
        def counting_copy(source, target):
            self.copies.append(source)
            copy_with_links(source, target)

        return LabBuilder(MacOSPlatform(root=self.real), platform_at(MacOSPlatform), self.lab, counting_copy)

    def test_harness_patches_only_the_lab_copy(self):
        original = (self.real_resources / "window.html").read_text()

        result = self.builder().prepare("stable", self.real, self.dist)

        lab_resources = Path(result["resourcesDir"])
        self.assertEqual((self.real_resources / "window.html").read_text(), original)
        self.assertFalse((self.real_resources / "vivarcdi").exists())
        self.assertTrue(WindowHtmlPatcher().is_patched((lab_resources / "window.html").read_text()))
        self.assertTrue((lab_resources / "vivarcdi" / "loader.js").is_file())
        self.assertTrue(lab_resources.is_relative_to(self.lab))

    def test_reports_the_executable_and_version_of_the_copy(self):
        result = self.builder().prepare("stable", self.real, self.dist)

        self.assertEqual(result["vivaldiVersion"], VERSION)
        self.assertEqual(
            result["executable"],
            str(self.lab / f"stable-{VERSION}" / "Applications/Vivaldi.app/Contents/MacOS/Vivaldi"),
        )

    def test_copies_a_version_once_and_redeploys_the_payload(self):
        builder = self.builder()
        builder.prepare("stable", self.real, self.dist)
        (self.dist / "loader.js").write_text("export const second = true;\n")

        result = builder.prepare("stable", self.real, self.dist)

        self.assertEqual(len(self.copies), 1)
        loader = Path(result["resourcesDir"]) / "vivarcdi" / "loader.js"
        self.assertEqual(loader.read_text(), "export const second = true;\n")

    def test_refuses_a_channel_that_is_not_installed(self):
        with self.assertRaises(LabError):
            self.builder().prepare("snapshot", self.real, self.dist)


if __name__ == "__main__":
    unittest.main()
