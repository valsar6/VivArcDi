import tempfile
import unittest
from pathlib import Path

from support import make_debian_vivaldi, make_payload_source
from vivarcdi.errors import InstallerError
from vivarcdi.installation import VivaldiInstallation
from vivarcdi.payload import PayloadDeployer
from vivarcdi.staging import SelfStager


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


if __name__ == "__main__":
    unittest.main()
