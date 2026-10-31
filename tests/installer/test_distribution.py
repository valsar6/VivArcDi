import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from support import make_debian_vivaldi, make_payload_source
from vivarcdi.distribution import payload_root
from vivarcdi.errors import InstallerError
from vivarcdi.installation import VivaldiInstallation
from vivarcdi.payload import PayloadDeployer
from vivarcdi.staging import SelfStager


class PayloadRootTest(unittest.TestCase):
    def test_payload_root_is_the_repository_when_running_from_source(self):
        root = payload_root()
        self.assertTrue((root / "installer" / "vivarcdi").is_dir())

    def test_payload_root_is_the_bundle_data_folder_when_frozen(self):
        with mock.patch.object(sys, "_MEIPASS", "/Applications/VivArcDi.app/Contents/Frameworks", create=True):
            self.assertEqual(payload_root(), Path("/Applications/VivArcDi.app/Contents/Frameworks"))


class MissingDistTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.missing = self.root / "repo" / "dist"

    def test_deployer_asks_for_a_release_build_or_make_build(self):
        deployer = PayloadDeployer(self.missing, "0.0.0")
        installation = VivaldiInstallation(
            channel="stable", version="8.1.3740.12", resources_dir=make_debian_vivaldi(self.root)
        )
        with self.assertRaises(InstallerError) as raised:
            deployer.deploy(installation)
        self.assertIn("release build", str(raised.exception))
        self.assertIn("make build", str(raised.exception))

    def test_stager_fails_before_touching_the_data_folder(self):
        repo = self.root / "repo"
        repo.mkdir()
        data_dir = self.root / "data"
        with self.assertRaisesRegex(InstallerError, "make build"):
            SelfStager(repo, data_dir).stage()
        self.assertFalse(data_dir.exists())

    def test_stager_copies_dist_and_installer(self):
        repo = make_payload_source(self.root).parent
        data_dir = self.root / "data"
        SelfStager(repo, data_dir).stage()
        self.assertTrue((data_dir / "dist" / "loader.js").exists())
        self.assertTrue((data_dir / "installer" / "__main__.py").exists())
        self.assertFalse((data_dir / "src").exists())


class UserConfigTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.source = make_payload_source(self.root)
        self.installation = VivaldiInstallation(
            channel="stable", version="8.1.3740.12", resources_dir=make_debian_vivaldi(self.root)
        )
        self.config = {"modules": {"bookmark-folders": {"root": "My/Own Folder", "workspaces": {"Work": "My/Work"}}}}
        (self.source / "config.json").write_text(json.dumps(self.config))

    def deployed_config(self):
        return json.loads((self.installation.payload_dir / "config.json").read_text())

    def test_the_options_the_user_set_in_config_json_are_deployed_unchanged(self):
        PayloadDeployer(self.source, "0.10.0").deploy(self.installation)
        self.assertEqual(self.deployed_config(), self.config)

    def test_a_reinstall_keeps_the_options_of_the_config_json_it_copies(self):
        deployer = PayloadDeployer(self.source, "0.10.0")
        deployer.deploy(self.installation)
        deployer.deploy(self.installation)
        self.assertEqual(self.deployed_config(), self.config)


if __name__ == "__main__":
    unittest.main()
