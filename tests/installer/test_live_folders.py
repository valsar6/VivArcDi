import io
import shutil
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path

from support import FakeRunner, make_debian_vivaldi, make_payload_source
from vivarcdi.cli import build_context, parse_arguments
from vivarcdi.commands import COMMANDS, InstallCommand, UninstallCommand
from vivarcdi.legacy_token import LegacyTokenFiles
from vivarcdi.platforms import DebianPlatform
from vivarcdi.reporter import Reporter
from vivarcdi.system import CommandResult

TOKEN = "ghp_example_token_value"


class LegacyTokenFilesTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        self.data = self.root / "data"
        self.payload = self.root / "payload"
        self.files = LegacyTokenFiles(self.data)

    def store(self, parent):
        folder = parent / "secrets"
        folder.mkdir(parents=True)
        (folder / "github-token").write_text(f"{TOKEN}\n")
        return folder

    def test_the_stored_token_and_its_empty_folder_go(self):
        folder = self.store(self.data)
        self.files.remove_stored()
        self.assertFalse(folder.exists())
        self.assertTrue(self.data.is_dir())

    def test_the_copy_in_a_payload_and_its_empty_folder_go(self):
        folder = self.store(self.payload)
        self.files.remove_from(self.payload)
        self.assertFalse(folder.exists())
        self.assertTrue(self.payload.is_dir())

    def test_a_secrets_folder_with_other_files_stays(self):
        folder = self.store(self.data)
        (folder / "other").write_text("keep")
        self.files.remove_stored()
        self.assertFalse((folder / "github-token").exists())
        self.assertTrue((folder / "other").exists())

    def test_nothing_to_remove_is_not_an_error(self):
        self.files.remove_everywhere(self.payload)


class OldTokenInstallTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        source = make_payload_source(self.root)
        self.resources = make_debian_vivaldi(self.root)
        runner = FakeRunner({"dpkg-query": CommandResult(0, "8.1.3740.12-1", "")})
        platform = DebianPlatform(self.root, runner)
        output = io.StringIO()
        self.context = build_context(platform, Reporter(out=output, err=output), repo_root=source.parent)
        self.stored = self.context.data_dir / "secrets" / "github-token"
        self.copy = self.resources / "vivarcdi" / "secrets" / "github-token"

    def plant_old_files(self):
        for path in (self.stored, self.copy):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(f"{TOKEN}\n")

    def test_removes_the_old_token_file(self):
        InstallCommand().execute(self.context)
        self.plant_old_files()
        shutil.rmtree(self.resources / "vivarcdi")
        InstallCommand().execute(self.context)
        self.assertFalse(self.stored.exists())
        self.assertFalse(self.stored.parent.exists())
        self.assertFalse(self.copy.exists())
        self.assertFalse(self.copy.parent.exists())

    def test_an_install_over_a_payload_that_holds_the_token_removes_it(self):
        self.plant_old_files()
        InstallCommand().execute(self.context)
        self.assertFalse(self.stored.exists())
        self.assertFalse(self.copy.exists())

    def test_uninstall_removes_the_stored_token(self):
        InstallCommand().execute(self.context)
        self.plant_old_files()
        UninstallCommand().execute(self.context)
        self.assertFalse(self.stored.exists())


class RemovedCommandTest(unittest.TestCase):
    def test_live_folders_is_no_longer_a_command(self):
        self.assertNotIn("live-folders", [command.name for command in COMMANDS])
        with redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            parse_arguments(["live-folders", "token"])


if __name__ == "__main__":
    unittest.main()
