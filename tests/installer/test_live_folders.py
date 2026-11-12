import io
import os
import shutil
import stat
import tempfile
import unittest
from pathlib import Path

from support import FakeRunner, make_debian_vivaldi, make_payload_source
from vivarcdi.cli import build_context, parse_arguments
from vivarcdi.commands import InstallCommand, LiveFoldersCommand, UninstallCommand
from vivarcdi.live_token import TOKEN_FILE, TokenVault
from vivarcdi.platforms import DebianPlatform
from vivarcdi.prompt import ConsoleSecretPrompt, NeverSecretPrompt
from vivarcdi.reporter import Reporter
from vivarcdi.system import CommandResult

TOKEN = "ghp_example_token_value"


class FakeSecretPrompt:
    def __init__(self, answer):
        self.answer = answer
        self.questions = []

    def ask(self, question):
        self.questions.append(question)
        return self.answer


def mode_of(path):
    return stat.S_IMODE(path.stat().st_mode)


class TokenVaultTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        self.vault = TokenVault(self.root / "data")

    def test_a_vault_without_a_token_reads_none(self):
        self.assertIsNone(self.vault.read())

    def test_the_token_is_kept_in_a_private_file(self):
        self.vault.save(f"  {TOKEN}  ")
        self.assertEqual(self.vault.read(), TOKEN)
        self.assertEqual(mode_of(self.vault.path), 0o600)
        self.assertEqual(mode_of(self.vault.path.parent), 0o700)

    def test_a_new_token_replaces_the_old_one_and_keeps_the_mode(self):
        self.vault.save("first")
        os.chmod(self.vault.path, 0o644)
        self.vault.save("second")
        self.assertEqual(self.vault.read(), "second")
        self.assertEqual(mode_of(self.vault.path), 0o600)

    def test_the_copy_next_to_a_payload_is_private_too(self):
        payload = self.root / "payload"
        payload.mkdir()
        self.vault.save(TOKEN)
        self.assertTrue(self.vault.copy_to(payload))
        copy = TokenVault.payload_file(payload)
        self.assertEqual(copy.read_text().strip(), TOKEN)
        self.assertEqual(mode_of(copy), 0o600)
        self.vault.remove_from(payload)
        self.assertFalse(copy.exists())

    def test_nothing_is_copied_without_a_token(self):
        payload = self.root / "payload"
        payload.mkdir()
        self.assertFalse(self.vault.copy_to(payload))
        self.assertFalse((payload / "secrets").exists())

    def test_the_owner_given_owns_the_files(self):
        vault = TokenVault(self.root / "owned", (os.getuid(), os.getgid()))
        vault.save(TOKEN)
        self.assertEqual(vault.path.stat().st_uid, os.getuid())


class LiveFoldersCommandTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        source = make_payload_source(self.root)
        self.repo = source.parent
        self.resources = make_debian_vivaldi(self.root)
        runner = FakeRunner({"dpkg-query": CommandResult(0, "8.1.3740.12-1", "")})
        self.platform = DebianPlatform(self.root, runner)
        self.output = io.StringIO()
        self.context = build_context(self.platform, Reporter(out=self.output, err=self.output), repo_root=self.repo)
        self.copy = self.resources / "vivarcdi" / "secrets" / TOKEN_FILE

    def run_command(self, command, token=TOKEN, remove=False):
        self.context.secret_prompt = FakeSecretPrompt(token)
        self.context.remove_token = remove
        return command.execute(self.context)

    def test_the_token_is_stored_and_copied_into_the_payload(self):
        InstallCommand().execute(self.context)
        self.assertEqual(self.run_command(LiveFoldersCommand()), 0)
        self.assertEqual(self.context.vault.read(), TOKEN)
        self.assertEqual(self.copy.read_text().strip(), TOKEN)
        self.assertEqual(mode_of(self.copy), 0o600)

    def test_the_token_never_shows_in_the_output(self):
        InstallCommand().execute(self.context)
        self.run_command(LiveFoldersCommand())
        self.assertNotIn(TOKEN, self.output.getvalue())

    def test_the_token_is_stored_even_before_vivarcdi_is_installed(self):
        self.assertEqual(self.run_command(LiveFoldersCommand()), 0)
        self.assertEqual(self.context.vault.read(), TOKEN)
        self.assertFalse(self.copy.exists())

    def test_an_empty_answer_stores_nothing_and_fails(self):
        self.assertEqual(self.run_command(LiveFoldersCommand(), token=""), 1)
        self.assertIsNone(self.context.vault.read())
        self.assertIn("No token given", self.output.getvalue())

    def test_remove_deletes_the_stored_token_and_the_copy(self):
        InstallCommand().execute(self.context)
        self.run_command(LiveFoldersCommand())
        self.assertEqual(self.run_command(LiveFoldersCommand(), remove=True), 0)
        self.assertIsNone(self.context.vault.read())
        self.assertFalse(self.copy.exists())

    def test_every_install_copies_the_stored_token_again(self):
        self.context.vault.save(TOKEN)
        InstallCommand().execute(self.context)
        self.assertEqual(self.copy.read_text().strip(), TOKEN)
        shutil.rmtree(self.resources / "vivarcdi")
        InstallCommand().execute(self.context)
        self.assertEqual(self.copy.read_text().strip(), TOKEN)

    def test_an_install_without_a_token_leaves_no_secrets_folder(self):
        InstallCommand().execute(self.context)
        self.assertFalse((self.resources / "vivarcdi" / "secrets").exists())

    def test_uninstall_removes_the_stored_token_and_the_copy(self):
        self.context.vault.save(TOKEN)
        InstallCommand().execute(self.context)
        UninstallCommand().execute(self.context)
        self.assertIsNone(self.context.vault.read())
        self.assertFalse(self.copy.exists())


class ArgumentsTest(unittest.TestCase):
    def test_live_folders_token_is_a_command(self):
        arguments = parse_arguments(["live-folders", "token"])
        self.assertEqual((arguments.command, arguments.action, arguments.remove), ("live-folders", "token", False))

    def test_remove_is_a_flag(self):
        self.assertTrue(parse_arguments(["live-folders", "token", "--remove"]).remove)


class SecretPromptTest(unittest.TestCase):
    def test_the_answer_is_trimmed(self):
        prompt = ConsoleSecretPrompt(read=lambda question: f"  {TOKEN} \n", interactive=lambda: True)
        self.assertEqual(prompt.ask("token?"), TOKEN)

    def test_no_terminal_means_no_answer(self):
        prompt = ConsoleSecretPrompt(read=lambda question: TOKEN, interactive=lambda: False)
        self.assertEqual(prompt.ask("token?"), "")

    def test_the_end_of_input_means_no_answer(self):
        def read(question):
            raise EOFError

        self.assertEqual(ConsoleSecretPrompt(read=read, interactive=lambda: True).ask("token?"), "")

    def test_the_never_prompt_answers_nothing(self):
        self.assertEqual(NeverSecretPrompt().ask("token?"), "")


if __name__ == "__main__":
    unittest.main()
