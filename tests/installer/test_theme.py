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
from vivarcdi.theme import ThemeCatalog

NOT_RUNNING = CommandResult(1, "", "")
RUNNING = CommandResult(0, "1234", "")
THEME_ID = "vivarcdi-light"
THEME_IDS = ["vivarcdi-light", "vivarcdi-pink", "vivarcdi-green", "vivarcdi-dark", "vivarcdi-pure-dark"]


class FakePrompt:
    def __init__(self, choice):
        self.choice = choice
        self.questions = []
        self.options = []

    def choose(self, question, options, default):
        self.questions.append(question)
        self.options = options
        return self.choice


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

    def context(self, action, dry_run=False, show_keys=False, theme_id=None):
        context = build_context(self.platform, self.reporter, repo_root=self.repo, runner=self.runner)
        context.theme_action = action
        context.dry_run = dry_run
        context.show_keys = show_keys
        context.theme_id = theme_id
        return context

    def run_theme(self, action, dry_run=False, show_keys=False, theme_id=None):
        return ThemeCommand().execute(self.context(action, dry_run, show_keys, theme_id))

    def read_preferences(self):
        return json.loads(self.preferences.read_text())

    def backups(self):
        return list((self.platform.data_dir / "preferences-backups").rglob("Preferences.*"))

    def test_applies_the_chosen_theme_with_a_backup(self):
        original = preferences_with()
        self.write_preferences(original)
        self.assertEqual(self.run_theme("apply", theme_id="vivarcdi-pink"), 0)
        themes = self.read_themes()
        self.assertEqual(themes["current"], "vivarcdi-pink")
        self.assertEqual([entry["id"] for entry in themes["user"]], ["mine", *THEME_IDS])
        pink = themes["user"][2]
        self.assertEqual((pink["name"], pink["colorWindowBg"], pink["radius"]), ("VivArcDi Pink", "#d8b5dd", 14))
        self.assertTrue(all("credit" not in entry for entry in themes["user"]))
        self.assertEqual(self.read_preferences()["vivarcdi"]["theme"]["previous"], "Vivaldi1")
        self.assertEqual(len(self.backups()), 1)
        self.assertEqual(json.loads(self.backups()[0].read_text()), original)
        self.assertIn("Vivaldi Sync", self.output.getvalue())

    def test_applies_the_light_theme_by_default(self):
        self.write_preferences(preferences_with())
        self.assertEqual(self.run_theme("apply"), 0)
        self.assertEqual(self.read_themes()["current"], THEME_ID)

    def test_refuses_an_unknown_theme_id(self):
        self.write_preferences(preferences_with())
        before = self.preferences.read_text()
        self.assertEqual(self.run_theme("apply", theme_id="vivarcdi-neon"), 1)
        self.assertEqual(self.preferences.read_text(), before)
        self.assertEqual(self.backups(), [])
        for theme_id in THEME_IDS:
            self.assertIn(theme_id, self.output.getvalue())

    def test_readme_credits_the_vivalarc_themes(self):
        readme = (Path(__file__).resolve().parents[2] / "README.md").read_text(encoding="utf-8")
        self.assertIn("https://github.com/tovifun/VivalArc", readme)
        for theme in ThemeCatalog.load().themes:
            self.assertIn(theme["name"], readme)
            self.assertIn(theme["credit"].removeprefix("Inspired by ").split(" from ")[0], readme)

    def test_installs_all_themes_and_selects_the_chosen_one(self):
        self.write_preferences(preferences_with())
        self.run_theme("apply", theme_id="vivarcdi-pure-dark")
        themes = self.read_themes()
        self.assertEqual(themes["current"], "vivarcdi-pure-dark")
        self.assertEqual(sorted(entry["id"] for entry in themes["user"]), sorted(["mine", *THEME_IDS]))

    def test_upserts_a_theme_that_is_already_installed(self):
        stale = {"id": "vivarcdi-pink", "name": "Old", "colorBg": "#000000"}
        self.write_preferences(preferences_with(user=[stale, {"id": "mine", "name": "Mine"}]))
        self.run_theme("apply", theme_id="vivarcdi-pink")
        user = self.read_themes()["user"]
        self.assertEqual([entry["id"] for entry in user].count("vivarcdi-pink"), 1)
        self.assertEqual(next(entry for entry in user if entry["id"] == "vivarcdi-pink")["name"], "VivArcDi Pink")

    def test_lists_the_themes_with_their_credit(self):
        self.assertEqual(self.run_theme("list"), 0)
        text = self.output.getvalue()
        for theme in ThemeCatalog.load().themes:
            self.assertIn(theme["id"], text)
            self.assertIn(theme["name"], text)
            self.assertIn(theme["credit"], text)

    def test_every_theme_credits_vivalarc(self):
        themes = ThemeCatalog.load().themes
        self.assertEqual([theme["id"] for theme in themes], THEME_IDS)
        for theme in themes:
            self.assertIn("VivalArc", theme["credit"])
            self.assertIn("tovifun", theme["credit"])

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

    def test_restores_the_theme_from_before_the_first_apply(self):
        self.write_preferences(preferences_with())
        self.run_theme("apply")
        self.run_theme("apply", theme_id="vivarcdi-dark")
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
        light = ThemeCatalog.load().get(THEME_ID)
        self.assertEqual(light["name"], "VivArcDi Light")
        self.assertEqual(light["colorHighlightBg"], "#4c7fd9")
        self.assertEqual(light["colorWindowBg"], "#c9d8dc")
        self.assertTrue(light["transparencyTabBar"])
        self.assertFalse(light["accentFromPage"])
        dark = ThemeCatalog.load().get("vivarcdi-dark")
        self.assertEqual((dark["colorBg"], dark["colorFg"]), ("#1e1224", "#f2f2f2"))


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

    def install(self, choice, picked=THEME_ID, background=False, theme_id=None):
        reporter = Reporter(out=self.output, err=self.output)
        context = build_context(self.platform, reporter, repo_root=self.repo, runner=self.runner, background=background)
        context.theme_choice = choice
        context.theme_id = theme_id
        context.prompt = FakePrompt(picked)
        self.assertEqual(InstallCommand().execute(context), 0)
        return context.prompt

    def current(self):
        return json.loads(self.preferences.read_text())["vivaldi"]["themes"]["current"]

    def installed_ids(self):
        themes = json.loads(self.preferences.read_text())["vivaldi"]["themes"]["user"]
        return [entry["id"] for entry in themes]

    def test_install_asks_which_theme_starts_as_current(self):
        prompt = self.install(THEME_ASK, picked="vivarcdi-green")
        self.assertEqual(prompt.questions, ["Which theme should Vivaldi start with?"])
        self.assertEqual([theme_id for theme_id, _ in prompt.options], THEME_IDS)
        self.assertEqual(self.current(), "vivarcdi-green")
        self.assertEqual(self.installed_ids(), ["mine", *THEME_IDS])

        self.preferences.write_text(json.dumps(preferences_with()))
        prompt = self.install(THEME_ASK, picked=None)
        self.assertEqual(len(prompt.questions), 1)
        self.assertEqual(self.current(), "Vivaldi1")
        self.assertEqual(self.installed_ids(), ["mine"])

        prompt = self.install(THEME_NEVER)
        self.assertEqual(prompt.questions, [])
        self.assertEqual(self.current(), "Vivaldi1")
        self.assertEqual(self.installed_ids(), ["mine"])

        prompt = self.install(THEME_APPLY, picked=None)
        self.assertEqual(prompt.questions, [])
        self.assertEqual(self.current(), THEME_ID)

        prompt = self.install(THEME_APPLY, theme_id="vivarcdi-dark")
        self.assertEqual(prompt.questions, [])
        self.assertEqual(self.current(), "vivarcdi-dark")

    def test_install_never_asks_in_the_background(self):
        prompt = self.install(THEME_ASK, background=True)
        self.assertEqual(prompt.questions, [])
        self.assertEqual(self.current(), "Vivaldi1")

    def test_install_keeps_going_when_vivaldi_runs(self):
        self.runner.responses["pgrep"] = RUNNING
        self.install(THEME_APPLY)
        self.assertEqual(self.current(), "Vivaldi1")
        self.assertIn("themes were not applied", self.output.getvalue())

    def test_flags_choose_what_install_does(self):
        self.assertEqual(theme_choice(parse_arguments(["install"])), THEME_ASK)
        self.assertEqual(theme_choice(parse_arguments(["install", "--yes"])), THEME_APPLY)
        self.assertEqual(theme_choice(parse_arguments(["install", "--no-theme"])), THEME_NEVER)
        self.assertEqual(theme_choice(parse_arguments(["install", "--theme", "vivarcdi-pink"])), THEME_APPLY)
        self.assertEqual(parse_arguments(["install", "--theme", "vivarcdi-pink"]).theme, "vivarcdi-pink")

    def test_console_prompt_numbers_the_choices_and_defaults_to_the_first(self):
        options = [("a", "Alpha"), ("b", "Beta")]
        self.assertEqual(ConsolePrompt(lambda text: "", lambda: True, lambda text: None).choose("Q?", options, "a"), "a")
        self.assertEqual(ConsolePrompt(lambda text: "2", lambda: True, lambda text: None).choose("Q?", options, "a"), "b")
        self.assertEqual(ConsolePrompt(lambda text: "beta", lambda: True, lambda text: None).choose("Q?", options, "a"), "b")
        self.assertIsNone(ConsolePrompt(lambda text: "9", lambda: True, lambda text: None).choose("Q?", options, "a"))
        self.assertIsNone(ConsolePrompt(lambda text: "", lambda: False, lambda text: None).choose("Q?", options, "a"))


if __name__ == "__main__":
    unittest.main()
