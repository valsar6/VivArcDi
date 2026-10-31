import json
import os
import plistlib
import shutil
import subprocess
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BUNDLE_VARIABLE = "VIVARCDI_APP_BUNDLE"
BUNDLE_ID = "io.github.valsar6.vivarcdi"
DATA_FOLDERS = ("Contents/Resources", "Contents/Frameworks", "Contents/MacOS")
SKIP_REASON = f"{BUNDLE_VARIABLE} does not point to a built VivArcDi.app; the package-macos CI job sets it"


def bundle_path():
    value = os.environ.get(BUNDLE_VARIABLE)
    return Path(value) if value else None


@unittest.skipUnless(bundle_path() is not None, SKIP_REASON)
class AppBundleTest(unittest.TestCase):
    def setUp(self):
        self.bundle = bundle_path()

    def find(self, relative):
        for folder in DATA_FOLDERS:
            candidate = self.bundle / folder / relative
            if candidate.exists():
                return candidate
        return None

    def names_in_runtime_folders(self):
        names = set()
        for folder in ("Contents/Frameworks", "Contents/Resources"):
            for _, directories, files in os.walk(self.bundle / folder):
                names.update(directories)
                names.update(files)
        return names

    def test_app_bundle_contains_runtime_installer_and_payload(self):
        executable = self.bundle / "Contents" / "MacOS" / "VivArcDi"
        with self.subTest("executable"):
            self.assertTrue(executable.is_file(), f"{executable} is missing")
            self.assertTrue(os.access(executable, os.X_OK), f"{executable} is not executable")
        with self.subTest("python runtime"):
            names = self.names_in_runtime_folders()
            self.assertTrue(
                any(name == "Python" or name.startswith("libpython") for name in names),
                "no Python runtime library in Contents/Frameworks or Contents/Resources",
            )
        for relative in ("installer/__main__.py", "installer/vivarcdi/cli.py", "vivarcdi/shortcuts.json", "dist/loader.js", "dist/config.json"):
            with self.subTest(relative):
                self.assertIsNotNone(self.find(relative), f"{relative} is not in the bundle")
        with self.subTest("info plist"):
            info = plistlib.loads((self.bundle / "Contents" / "Info.plist").read_bytes())
            version = json.loads((REPO_ROOT / "package.json").read_text())["version"]
            self.assertEqual(info["CFBundleIdentifier"], BUNDLE_ID)
            self.assertEqual(info["CFBundleShortVersionString"], version)
            self.assertEqual(info["LSMinimumSystemVersion"], "12.0")

    def test_app_executable_runs_on_apple_silicon_and_intel(self):
        executable = self.bundle / "Contents" / "MacOS" / "VivArcDi"
        if shutil.which("lipo") is None:
            self.skipTest("lipo is not available")
        result = subprocess.run(["lipo", "-archs", str(executable)], capture_output=True, text=True, check=True)
        self.assertEqual(set(result.stdout.split()), {"arm64", "x86_64"})


if __name__ == "__main__":
    unittest.main()
