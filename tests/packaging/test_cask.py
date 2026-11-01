import hashlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "packaging" / "homebrew"))

from cask import PLACEHOLDER_SHA256, CaskRenderer, ChecksumReader
from cask import main as cask_main
from vivarcdi.hooks import LaunchAgentHook

VERSION = "9.8.7"
DMG_BYTES = b"not really a disk image"


class CaskCase(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        self.dmg = self.root / f"VivArcDi-{VERSION}.dmg"
        self.dmg.write_bytes(DMG_BYTES)
        self.checksum = ChecksumReader().read(self.dmg)
        self.cask = CaskRenderer().render(VERSION, self.checksum)


class CaskTest(CaskCase):
    def test_cask_points_to_the_release_dmg_with_its_checksum(self):
        with self.subTest("checksum is the one of the file"):
            self.assertEqual(self.checksum, hashlib.sha256(DMG_BYTES).hexdigest())
        with self.subTest("version and checksum are in the cask"):
            self.assertIn(f'version "{VERSION}"', self.cask)
            self.assertIn(f'sha256 "{self.checksum}"', self.cask)
        with self.subTest("url is the dmg of the release tag"):
            self.assertIn(
                'url "https://github.com/valsar6/VivArcDi/releases/download/v#{version}/VivArcDi-#{version}.dmg"', self.cask
            )
        with self.subTest("the app is installed"):
            self.assertIn('app "VivArcDi.app"', self.cask)
        with self.subTest("no placeholder is left"):
            self.assertNotIn("@", self.cask)

    def test_cask_uninstall_removes_agent_and_keeps_backups(self):
        label = LaunchAgentHook.LABEL
        with self.subTest("the agent is unloaded and deleted"):
            self.assertIn(f'uninstall launchctl: "{label}"', self.cask)
            self.assertIn(f'"~/Library/LaunchAgents/{label}.plist"', self.cask)
        zap = self.cask.split("zap trash: [", 1)[1].split("]", 1)[0]
        with self.subTest("zap trashes the logs and the marker"):
            self.assertIn("VivArcDi/logs", zap)
            self.assertIn("VivArcDi/managed-by", zap)
        with self.subTest("zap never trashes the whole support folder or the backups"):
            entries = [line.strip().strip(",").strip('"') for line in zap.splitlines() if line.strip()]
            self.assertNotIn("~/Library/Application Support/VivArcDi", entries)
            self.assertNotIn("backup", zap.lower())

    def test_cask_caveats_explain_gatekeeper_and_app_management(self):
        caveats = self.cask.split("caveats <<~EOS", 1)[1].split("EOS", 1)[0]
        flattened = " ".join(caveats.split())
        self.assertIn("Open Anyway", flattened)
        self.assertIn("App Management", flattened)
        self.assertIn("after each update", flattened)
        self.assertIn("click Uninstall in the VivArcDi app", flattened)
        self.assertIn("Before you run brew uninstall", flattened)

    def test_publication_is_idempotent(self):
        target = self.root / "Casks" / "vivarcdi.rb"
        arguments = ["--version", VERSION, "--dmg", str(self.dmg), "--out", str(target)]
        self.assertEqual(cask_main(arguments), 0)
        first = target.read_bytes()
        self.assertEqual(cask_main(arguments), 0)
        self.assertEqual(target.read_bytes(), first)

    @unittest.skipUnless(shutil.which("ruby"), "ruby is not installed")
    def test_rendered_cask_is_valid_ruby(self):
        path = self.root / "vivarcdi.rb"
        path.write_text(CaskRenderer().render(VERSION, PLACEHOLDER_SHA256))
        result = subprocess.run(["ruby", "-c", str(path)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
