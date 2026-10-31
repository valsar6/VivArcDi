import tempfile
import unittest
from pathlib import Path

from support import WINDOW_HTML, make_macos_vivaldi
from vivarcdi.backup import BackupStore
from vivarcdi.errors import PermissionDeniedError
from vivarcdi.installation import VivaldiInstallation
from vivarcdi.patching import InstallationPatcher
from vivarcdi.permissions import AppManagementAdvisor, MacOSAdvisor, SudoAdvisor, owner_of
from vivarcdi.window_patch import WindowHtmlPatcher


class DeniedDeployer:
    def __init__(self, filename):
        self.filename = filename

    def deploy(self, installation):
        raise PermissionError(1, "Operation not permitted", self.filename)

    def remove(self, installation):
        pass

    def is_current(self, installation):
        return False


class RecordingAdvisor:
    def __init__(self):
        self.paths = []

    def explain(self, path):
        self.paths.append(path)
        return f"blocked: {path}"


class MacOSAdvisorTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.resources = make_macos_vivaldi(self.root)
        self.bundle = self.root / "Applications" / "Vivaldi.app"
        self.owner = owner_of(self.resources)

    def test_app_management_always_comes_first(self):
        for user in ("tore", self.owner):
            message = MacOSAdvisor(current_user=user).explain(self.resources)
            self.assertIn("1. Open System Settings > Privacy & Security > App Management", message)

    def test_foreign_owner_also_gets_a_chown_after_app_management(self):
        message = MacOSAdvisor(current_user="tore").explain(self.resources)
        self.assertIn(f"(owner: {self.owner})", message)
        self.assertIn(f'3. Give Vivaldi back to your user: sudo chown -R tore "{self.bundle}"', message)
        self.assertIn("4. Run the installer again, without sudo.", message)

    def test_own_bundle_needs_no_chown(self):
        message = MacOSAdvisor(current_user=self.owner).explain(self.resources)
        self.assertNotIn("chown", message)
        self.assertIn("3. Run the installer again", message)


class AppManagementAdvisorTest(unittest.TestCase):
    def test_names_app_management_and_vivarcdi_without_sudo_or_terminal(self):
        path = Path("/Applications/Vivaldi.app/Contents/Frameworks/Vivaldi Framework.framework")
        message = AppManagementAdvisor().explain(path)
        self.assertIn("App Management", message)
        self.assertIn("VivArcDi", message)
        self.assertIn("Vivaldi.app", message)
        self.assertNotIn("sudo", message.lower())
        self.assertNotIn("terminal", message.lower())


class SudoAdvisorTest(unittest.TestCase):
    def test_asks_for_sudo(self):
        self.assertIn("with sudo", SudoAdvisor().explain(Path("/opt/vivaldi")))


class InstallationPatcherPermissionTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        resources = make_macos_vivaldi(self.root)
        self.installation = VivaldiInstallation("stable", "8.2.4133.94", resources)
        self.advisor = RecordingAdvisor()

    def make_patcher(self, deployer):
        backups = BackupStore(self.root / "backups")
        return InstallationPatcher(WindowHtmlPatcher(), deployer, backups, self.advisor)

    def test_a_denied_write_becomes_an_explained_error(self):
        blocked = str(self.installation.payload_dir)
        patcher = self.make_patcher(DeniedDeployer(blocked))
        with self.assertRaises(PermissionDeniedError) as raised:
            patcher.apply(self.installation)
        self.assertEqual(str(raised.exception), f"blocked: {blocked}")
        self.assertEqual(self.installation.window_html.read_text(), WINDOW_HTML)

    def test_a_denied_write_without_filename_blames_the_resources_folder(self):
        patcher = self.make_patcher(DeniedDeployer(None))
        with self.assertRaises(PermissionDeniedError):
            patcher.apply(self.installation)
        self.assertEqual(self.advisor.paths, [self.installation.resources_dir])


if __name__ == "__main__":
    unittest.main()
