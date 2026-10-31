import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "packaging" / "macos"))

from build_dmg import APP_NAME, README_NAME, AppBuilder, DmgBuildError, DmgPackager, DmgStaging, read_version

VERSION = "9.8.7"


class FakeTools:
    def __init__(self, dmg_bytes=1024, pyinstaller_fails=False, creates_app=True):
        self.calls = []
        self.dmg_bytes = dmg_bytes
        self.pyinstaller_fails = pyinstaller_fails
        self.creates_app = creates_app
        self.staged = []

    def __call__(self, args, **options):
        self.calls.append((args, options))
        if "PyInstaller" in args:
            return self._pyinstaller(args)
        return self._hdiutil(args)

    def _pyinstaller(self, args):
        if self.pyinstaller_fails:
            raise subprocess.CalledProcessError(1, args)
        if self.creates_app:
            app = Path(args[args.index("--distpath") + 1]) / APP_NAME
            (app / "Contents" / "MacOS").mkdir(parents=True)
            (app / "Contents" / "MacOS" / "VivArcDi").write_text("binary")
            (app / "Contents" / "Frameworks").mkdir()
            (app / "Contents" / "Frameworks" / "Python").symlink_to("libpython3.13.dylib")
        return subprocess.CompletedProcess(args, 0)

    def _hdiutil(self, args):
        folder = Path(args[args.index("-srcfolder") + 1])
        self.staged = sorted(path.name for path in folder.iterdir())
        self.readme = (folder / README_NAME).read_text()
        self.link = (folder / "Applications").readlink()
        self.app_link = (folder / APP_NAME / "Contents" / "Frameworks" / "Python").is_symlink()
        Path(args[-1]).write_bytes(b"x" * self.dmg_bytes)
        return subprocess.CompletedProcess(args, 0)


class DmgCase(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        (self.root / "repo" / "dist").mkdir(parents=True)
        (self.root / "repo" / "dist" / "loader.js").write_text("")
        self.out = self.root / "out"

    def packager(self, tools, max_bytes=40 * 1024 * 1024):
        builder = AppBuilder(self.out / "pyinstaller", self.root / "repo", Path("VivArcDi.spec"), tools)
        return DmgPackager(builder, DmgStaging(), VERSION, tools, max_bytes)


class DmgCommandTest(DmgCase):
    def test_pyinstaller_builds_the_spec_away_from_the_payload_folder(self):
        tools = FakeTools()
        self.packager(tools).package(self.out)
        command, options = tools.calls[0]
        self.assertEqual(command[1:3], ["-m", "PyInstaller"])
        self.assertEqual(command[-1], "VivArcDi.spec")
        self.assertEqual(command[command.index("--distpath") + 1], str(self.out / "pyinstaller" / "dist"))
        self.assertEqual(options["cwd"], self.root / "repo")

    def test_hdiutil_compresses_the_staged_folder_into_a_versioned_dmg(self):
        tools = FakeTools()
        target = self.packager(tools).package(self.out)
        command = tools.calls[1][0]
        self.assertEqual(target, self.out / f"VivArcDi-{VERSION}.dmg")
        self.assertEqual(command[:4], ["hdiutil", "create", "-volname", "VivArcDi"])
        self.assertEqual(command[4], "-srcfolder")
        self.assertEqual(command[6:], ["-ov", "-format", "UDZO", str(target)])

    def test_the_version_comes_from_package_json(self):
        self.assertRegex(read_version(REPO_ROOT), r"^\d+\.\d+\.\d+$")


class DmgStagingTest(DmgCase):
    def test_the_image_holds_the_app_a_link_to_applications_and_the_instructions(self):
        tools = FakeTools()
        self.packager(tools).package(self.out)
        self.assertEqual(tools.staged, sorted([APP_NAME, "Applications", README_NAME]))
        self.assertEqual(tools.link, Path("/Applications"))
        self.assertTrue(tools.app_link)

    def test_the_instructions_explain_open_anyway_and_app_management(self):
        tools = FakeTools()
        self.packager(tools).package(self.out)
        for phrase in ("Open Anyway", "Privacy & Security", "App Management", "Try again"):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, tools.readme)


class DmgFailureTest(DmgCase):
    def test_an_image_over_the_limit_fails(self):
        with self.assertRaises(DmgBuildError) as raised:
            self.packager(FakeTools(dmg_bytes=2048), max_bytes=2047).package(self.out)
        self.assertIn("over the limit", str(raised.exception))

    def test_an_image_at_the_limit_passes(self):
        self.packager(FakeTools(dmg_bytes=2048), max_bytes=2048).package(self.out)

    def test_a_failing_pyinstaller_stops_before_hdiutil(self):
        tools = FakeTools(pyinstaller_fails=True)
        with self.assertRaises(DmgBuildError):
            self.packager(tools).package(self.out)
        self.assertEqual(len(tools.calls), 1)

    def test_a_missing_app_is_reported(self):
        with self.assertRaises(DmgBuildError):
            self.packager(FakeTools(creates_app=False)).package(self.out)

    def test_a_missing_payload_asks_for_a_build(self):
        (self.root / "repo" / "dist" / "loader.js").unlink()
        with self.assertRaises(DmgBuildError) as raised:
            self.packager(FakeTools()).package(self.out)
        self.assertIn("npm run build", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
