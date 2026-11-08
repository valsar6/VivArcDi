import io
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from support import FakeRunner, make_macos_vivaldi, make_payload_source
from vivarcdi.cli import build_context, parse_arguments, theme_choice
from vivarcdi.commands import THEME_APPLY, THEME_ASK, THEME_NEVER, InstallCommand, ThemeCommand
from vivarcdi.platforms import MacOSPlatform
from vivarcdi.prompt import ConsolePrompt
from vivarcdi.reporter import Reporter
from vivarcdi.system import CommandResult
from vivarcdi.theme import ThemeDefinition

NOT_RUNNING = CommandResult(1, "", "")
RUNNING = CommandResult(0, "1234", "")
THEME_ID = "vivarcdi-light"


class FakePrompt:
    def __init__(self, answer):
        self.answer = answer
        self.questions = []

    def confirm(self, question):
        self.questions.append(question)
        return self.answer


def preferences_with(current="Vivaldi1", user=None):
    themes = {"current": current, "system": [], "user": user if user is not None else [{"id": "mine", "name": "Mine"}]}
    return {"vivaldi": {"actions": [{}], "themes": themes}, "profile": {"name": "Tore"}}


class ThemeTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        self.home = self.root / "Users" / "tore"
        self.runner = FakeRunner({"pgrep": NOT_RUNNING})
        self.platform = MacOSPlatform(self.root, self.home, self.runner)
        self.output = io.StringIO()
        self.reporter = Reporter(out=self.output, err=self.output)
        self.repo = make_payload_source(self.root).parent
        profile_dir = self.home / "Library" / "Application Support" / "Vivaldi" / "Default"
        profile_dir.mkdir(parents=True)
        self.preferences = profile_dir / "Preferences"

    def write_preferences(self, data):
        self.preferences.write_text(json.dumps(data))

    def read_themes(self):
        return json.loads(self.preferences.read_text())["vivaldi"]["themes"]

    def context(self, action, dry_run=False, show_keys=False):
        context = build_context(self.platform, self.reporter, repo_root=self.repo, runner=self.runner)
        context.theme_action = action
        context.dry_run = dry_run
        context.show_keys = show_keys
        return context

    def run_theme(self, action, dry_run=False, show_keys=False):
        return ThemeCommand().execute(self.context(action, dry_run, show_keys))

    def backups(self):
        return list((self.platform.data_dir / "preferences-backups").rglob("Preferences.*"))

    def test_applies_the_arc_light_theme_with_a_backup(self):
        original = preferences_with()
        self.write_preferences(original)
        self.assertEqual(self.run_theme("apply"), 0)
        themes = self.read_themes()
        self.assertEqual(themes["current"], THEME_ID)
        self.assertEqual([entry["id"] for entry in themes["user"]], ["mine", THEME_ID])
        theme = themes["user"][1]
        self.assertEqual(theme["name"], "VivArcDi Light")
        self.assertEqual((theme["colorBg"], theme["colorFg"], theme["radius"]), ("#ffffff", "#212121", 14))
        self.assertEqual(json.loads(self.preferences.read_text())["vivarcdi"]["theme"]["previous"], "Vivaldi1")
        self.assertEqual(len(self.backups()), 1)
        self.assertEqual(json.loads(self.backups()[0].read_text()), original)
        self.assertIn("Vivaldi Sync", self.output.getvalue())

    def test_apply_twice_keeps_one_theme_and_the_first_previous(self):
        self.write_preferences(preferences_with())
        self.run_theme("apply")
        once = self.preferences.read_text()
        self.assertEqual(self.run_theme("apply"), 0)
        self.assertEqual(self.preferences.read_text(), once)
        self.assertEqual(len(self.backups()), 1)
        self.assertIn("already set", self.output.getvalue())

    def test_dry_run_of_the_theme_writes_nothing(self):
        self.write_preferences(preferences_with())
        before = self.preferences.read_text()
        self.assertEqual(self.run_theme("apply", dry_run=True), 0)
        self.assertEqual(self.preferences.read_text(), before)
        self.assertEqual(self.backups(), [])
        self.assertIn("vivaldi.themes.current: Vivaldi1 -> vivarcdi-light", self.output.getvalue())

    def test_restores_the_previous_theme(self):
        self.write_preferences(preferences_with())
        self.run_theme("apply")
        self.assertEqual(self.run_theme("restore"), 0)
        data = json.loads(self.preferences.read_text())
        self.assertEqual(data["vivaldi"]["themes"]["current"], "Vivaldi1")
        self.assertEqual([entry["id"] for entry in data["vivaldi"]["themes"]["user"]], ["mine"])
        self.assertNotIn("previous", data["vivarcdi"]["theme"])

    def test_restore_without_an_applied_theme_changes_nothing(self):
        self.write_preferences(preferences_with())
        before = self.preferences.read_text()
        self.assertEqual(self.run_theme("restore"), 0)
        self.assertEqual(self.preferences.read_text(), before)
        self.assertEqual(self.backups(), [])

    def test_refuses_to_change_the_theme_while_vivaldi_runs(self):
        self.write_preferences(preferences_with())
        before = self.preferences.read_text()
        self.runner.responses["pgrep"] = RUNNING
        self.assertEqual(self.run_theme("apply"), 1)
        self.assertEqual(self.run_theme("restore"), 1)
        self.assertEqual(self.preferences.read_text(), before)
        self.assertEqual(self.backups(), [])
        self.assertIn("Vivaldi is running", self.output.getvalue())

    def test_status_lists_keys_and_ids_without_writing(self):
        self.write_preferences(preferences_with())
        before = self.preferences.read_text()
        self.assertEqual(self.run_theme("status", show_keys=True), 0)
        text = self.output.getvalue()
        self.assertIn("current theme Vivaldi1", text)
        self.assertIn("keys: current, system, user", text)
        self.assertIn("user theme ids: mine", text)
        self.assertEqual(self.preferences.read_text(), before)

    def test_invalid_preferences_are_left_alone(self):
        self.write_preferences(preferences_with())
        broken = self.preferences.parent.parent / "Profile 1"
        broken.mkdir()
        (broken / "Preferences").write_text("{not json")
        before = self.preferences.read_text()
        self.assertEqual(self.run_theme("apply"), 1)
        self.assertEqual(self.preferences.read_text(), before)
        self.assertEqual(self.backups(), [])

    def test_theme_file_matches_the_spec(self):
        theme = ThemeDefinition.load()
        self.assertEqual((theme.id, theme.name), (THEME_ID, "VivArcDi Light"))
        self.assertEqual(theme.fields["colorHighlightBg"], "#4c7fd9")
        self.assertEqual(theme.fields["colorWindowBg"], "#c9d8dc")
        self.assertTrue(theme.fields["transparencyTabBar"])
        self.assertFalse(theme.fields["accentFromPage"])


class InstallThemeTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        self.home = self.root / "Users" / "tore"
        self.runner = FakeRunner({"pgrep": NOT_RUNNING})
        self.platform = MacOSPlatform(self.root, self.home, self.runner)
        self.repo = make_payload_source(self.root).parent
        make_macos_vivaldi(self.root)
        profile_dir = self.home / "Library" / "Application Support" / "Vivaldi" / "Default"
        profile_dir.mkdir(parents=True)
        self.preferences = profile_dir / "Preferences"
        self.preferences.write_text(json.dumps(preferences_with()))
        self.output = io.StringIO()

    def install(self, choice, answer=True, background=False):
        reporter = Reporter(out=self.output, err=self.output)
        context = build_context(self.platform, reporter, repo_root=self.repo, runner=self.runner, background=background)
        context.theme_choice = choice
        context.prompt = FakePrompt(answer)
        self.assertEqual(InstallCommand().execute(context), 0)
        return context.prompt

    def current(self):
        return json.loads(self.preferences.read_text())["vivaldi"]["themes"]["current"]

    def test_install_offers_the_arc_light_theme(self):
        prompt = self.install(THEME_ASK, answer=True)
        self.assertEqual(prompt.questions, ["Apply the VivArcDi Light theme?"])
        self.assertEqual(self.current(), THEME_ID)

        self.preferences.write_text(json.dumps(preferences_with()))
        prompt = self.install(THEME_ASK, answer=False)
        self.assertEqual(len(prompt.questions), 1)
        self.assertEqual(self.current(), "Vivaldi1")

        prompt = self.install(THEME_NEVER)
        self.assertEqual(prompt.questions, [])
        self.assertEqual(self.current(), "Vivaldi1")

        prompt = self.install(THEME_APPLY, answer=False)
        self.assertEqual(prompt.questions, [])
        self.assertEqual(self.current(), THEME_ID)

    def test_install_never_asks_in_the_background(self):
        prompt = self.install(THEME_ASK, background=True)
        self.assertEqual(prompt.questions, [])
        self.assertEqual(self.current(), "Vivaldi1")

    def test_install_keeps_going_when_vivaldi_runs(self):
        self.runner.responses["pgrep"] = RUNNING
        self.install(THEME_APPLY)
        self.assertEqual(self.current(), "Vivaldi1")
        self.assertIn("theme was not applied", self.output.getvalue())

    def test_flags_choose_what_install_does(self):
        self.assertEqual(theme_choice(parse_arguments(["install"])), THEME_ASK)
        self.assertEqual(theme_choice(parse_arguments(["install", "--yes"])), THEME_APPLY)
        self.assertEqual(theme_choice(parse_arguments(["install", "--no-theme"])), THEME_NEVER)

    def test_console_prompt_defaults_to_yes_and_never_asks_without_a_terminal(self):
        self.assertTrue(ConsolePrompt(lambda text: "", lambda: True).confirm("Q?"))
        self.assertTrue(ConsolePrompt(lambda text: "Yes", lambda: True).confirm("Q?"))
        self.assertFalse(ConsolePrompt(lambda text: "n", lambda: True).confirm("Q?"))
        self.assertFalse(ConsolePrompt(lambda text: "", lambda: False).confirm("Q?"))


if __name__ == "__main__":
    unittest.main()
