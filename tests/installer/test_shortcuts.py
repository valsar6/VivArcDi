import io
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from support import FakeRunner, make_payload_source
from vivarcdi.cli import build_context
from vivarcdi.commands import ShortcutsCommand, UninstallCommand
from vivarcdi.platforms import DebianPlatform, MacOSPlatform
from vivarcdi.preferences import ShortcutTable
from vivarcdi.profiles import ProfileLocator
from vivarcdi.reporter import Reporter
from vivarcdi.system import CommandResult

NOT_RUNNING = CommandResult(1, "", "")
RUNNING = CommandResult(0, "1234", "")


def preferences_with(actions, vivaldi_extra=None):
    vivaldi = {"actions": [actions], "untouched": {"theme": "dark"}}
    vivaldi.update(vivaldi_extra or {})
    return {"vivaldi": vivaldi, "profile": {"name": "Tore"}}


def default_actions():
    return {
        "COMMAND_NEW_TAB": {"gestures": ["2"], "shortcuts": ["meta+t"]},
        "COMMAND_SAVE_PAGE": {"shortcuts": ["meta+s"]},
        "COMMAND_ADD_BOOKMARK": {"shortcuts": ["meta+d"]},
        "COMMAND_PRINT_PAGE": {"shortcuts": ["meta+p"]},
        "COMMAND_MAIN_TOGGLE_PANEL_TOGGLE": {"shortcuts": ["meta+p", "f4"]},
        "COMMAND_SHOW_HISTORY_PANEL": {"shortcuts": ["alt+meta+y"]},
    }


class ShortcutsTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        self.home = self.root / "Users" / "tore"
        self.runner = FakeRunner({"pgrep": NOT_RUNNING})
        self.platform = MacOSPlatform(self.root, self.home, self.runner)
        self.output = io.StringIO()
        self.reporter = Reporter(out=self.output, err=self.output)
        self.repo = make_payload_source(self.root).parent
        self.profile_dir = self.home / "Library" / "Application Support" / "Vivaldi" / "Default"
        self.profile_dir.mkdir(parents=True)
        self.preferences = self.profile_dir / "Preferences"

    def write_preferences(self, data):
        self.preferences.write_text(json.dumps(data))

    def read_preferences(self):
        return json.loads(self.preferences.read_text())

    def context(self, action, dry_run=False, restore_shortcuts=False):
        context = build_context(self.platform, self.reporter, repo_root=self.repo, runner=self.runner)
        context.shortcut_action = action
        context.dry_run = dry_run
        context.restore_shortcuts = restore_shortcuts
        return context

    def run_shortcuts(self, action, dry_run=False):
        return ShortcutsCommand().execute(self.context(action, dry_run))

    def backups(self):
        return list((self.platform.data_dir / "preferences-backups").rglob("Preferences.*"))

    def test_apply_backs_up_and_writes_every_setting(self):
        original = preferences_with(default_actions())
        self.write_preferences(original)
        self.assertEqual(self.run_shortcuts("apply"), 0)
        result = self.read_preferences()
        actions = result["vivaldi"]["actions"][0]
        self.assertEqual(actions["COMMAND_SHOW_QUICK_COMMANDS"]["shortcuts"], ["meta+t"])
        self.assertEqual(actions["COMMAND_MAIN_TOGGLE_TAB_BAR"]["shortcuts"], ["meta+s"])
        self.assertEqual(actions["COMMAND_PIN_TAB"]["shortcuts"], [])
        self.assertEqual(actions["COMMAND_PRINT_PAGE"]["shortcuts"], ["meta+p"])
        for removed in ("COMMAND_NEW_TAB", "COMMAND_SAVE_PAGE", "COMMAND_ADD_BOOKMARK"):
            self.assertEqual(actions[removed]["shortcuts"], [])
        self.assertTrue(result["vivaldi"]["quick_commands"]["open_url_in_new_tab"])
        self.assertEqual(len(self.backups()), 1)
        self.assertEqual(json.loads(self.backups()[0].read_text()), original)

    def test_dry_run_changes_nothing(self):
        self.write_preferences(preferences_with(default_actions()))
        before = self.preferences.read_text()
        self.assertEqual(self.run_shortcuts("apply", dry_run=True), 0)
        self.assertEqual(self.preferences.read_text(), before)
        self.assertEqual(self.backups(), [])
        self.assertIn("COMMAND_SHOW_QUICK_COMMANDS", self.output.getvalue())

    def test_restore_puts_back_the_backup(self):
        self.write_preferences(preferences_with(default_actions()))
        before = self.preferences.read_text()
        self.run_shortcuts("apply")
        self.assertNotEqual(self.preferences.read_text(), before)
        self.assertEqual(self.run_shortcuts("restore"), 0)
        self.assertEqual(json.loads(self.preferences.read_text()), json.loads(before))

    def test_restore_without_backup_changes_nothing(self):
        self.write_preferences(preferences_with(default_actions()))
        before = self.preferences.read_text()
        self.assertEqual(self.run_shortcuts("restore"), 0)
        self.assertEqual(self.preferences.read_text(), before)
        self.assertIn("No backup", self.output.getvalue())

    def test_refuses_while_vivaldi_runs(self):
        self.write_preferences(preferences_with(default_actions()))
        before = self.preferences.read_text()
        self.runner.responses["pgrep"] = RUNNING
        self.assertEqual(self.run_shortcuts("apply"), 1)
        self.assertEqual(self.run_shortcuts("restore"), 1)
        self.assertEqual(self.preferences.read_text(), before)
        self.assertEqual(self.backups(), [])
        self.assertIn("Vivaldi is running", self.output.getvalue())

    def test_apply_is_idempotent(self):
        self.write_preferences(preferences_with(default_actions()))
        self.run_shortcuts("apply")
        once = self.preferences.read_text()
        self.run_shortcuts("apply")
        self.assertEqual(self.preferences.read_text(), once)

    def test_unrelated_settings_are_untouched(self):
        self.write_preferences(preferences_with(default_actions()))
        self.run_shortcuts("apply")
        result = self.read_preferences()
        self.assertEqual(result["profile"], {"name": "Tore"})
        self.assertEqual(result["vivaldi"]["untouched"], {"theme": "dark"})
        actions = result["vivaldi"]["actions"][0]
        self.assertEqual(actions["COMMAND_SHOW_HISTORY_PANEL"], {"shortcuts": ["alt+meta+y"]})
        self.assertEqual(actions["COMMAND_NEW_TAB"]["gestures"], ["2"])

    def test_conflicting_shortcut_is_removed_from_other_command(self):
        self.write_preferences(preferences_with(default_actions()))
        self.run_shortcuts("apply")
        panel = self.read_preferences()["vivaldi"]["actions"][0]["COMMAND_MAIN_TOGGLE_PANEL_TOGGLE"]
        self.assertEqual(panel["shortcuts"], ["f4"])

    def test_command_d_is_left_to_vivarcdi(self):
        actions = default_actions()
        actions["COMMAND_PIN_TAB"] = {"shortcuts": ["meta+d"]}
        self.write_preferences(preferences_with(actions))
        self.assertEqual(self.run_shortcuts("apply"), 0)
        result = self.read_preferences()["vivaldi"]["actions"][0]
        holders = [name for name, entry in result.items() if "meta+d" in entry.get("shortcuts", [])]
        self.assertEqual(holders, [])
        self.assertEqual(result["COMMAND_PIN_TAB"]["shortcuts"], [])

    def test_modifier_follows_the_platform(self):
        self.assertEqual(ShortcutTable.load("meta").commands["COMMAND_SHOW_QUICK_COMMANDS"], ["meta+t"])
        self.assertEqual(ShortcutTable.load("ctrl").commands["COMMAND_SHOW_QUICK_COMMANDS"], ["ctrl+t"])
        self.assertEqual(self.platform.modifier, "meta")
        self.assertEqual(DebianPlatform(self.root, self.runner, self.home).modifier, "ctrl")

    def test_invalid_preferences_are_left_alone(self):
        self.write_preferences(preferences_with(default_actions()))
        broken = self.profile_dir.parent / "Profile 1"
        broken.mkdir()
        (broken / "Preferences").write_text("{not json")
        before = self.preferences.read_text()
        self.assertEqual(self.run_shortcuts("apply"), 1)
        self.assertEqual(self.preferences.read_text(), before)
        self.assertEqual(self.backups(), [])
        self.assertIn("Profile 1", self.output.getvalue())

    def test_profiles_are_found_on_both_systems(self):
        self.write_preferences(preferences_with(default_actions()))
        snapshot = self.home / "Library" / "Application Support" / "Vivaldi Snapshot" / "Default"
        snapshot.mkdir(parents=True)
        (snapshot / "Preferences").write_text("{}")
        found = ProfileLocator(self.platform.profile_roots()).find()
        self.assertEqual([(profile.channel, profile.name) for profile in found], [("stable", "Default"), ("snapshot", "Default")])
        debian_home = self.root / "home" / "tore"
        linux = debian_home / ".config" / "vivaldi" / "Profile 1"
        linux.mkdir(parents=True)
        (linux / "Preferences").write_text("{}")
        debian = DebianPlatform(self.root, self.runner, debian_home)
        found = ProfileLocator(debian.profile_roots()).find()
        self.assertEqual([(profile.channel, profile.name) for profile in found], [("stable", "Profile 1")])

    def test_status_reports_match_per_profile(self):
        self.write_preferences(preferences_with(default_actions()))
        second = self.profile_dir.parent / "Profile 1"
        second.mkdir()
        (second / "Preferences").write_text(json.dumps(preferences_with(default_actions())))
        self.run_shortcuts("apply")
        (second / "Preferences").write_text(json.dumps(preferences_with(default_actions())))
        self.output.truncate(0)
        self.output.seek(0)
        self.assertEqual(self.run_shortcuts("status"), 0)
        text = self.output.getvalue()
        self.assertIn("stable / Default: matches", text)
        self.assertIn("stable / Profile 1: differs", text)

    def test_uninstall_restores_shortcuts_only_when_asked(self):
        self.write_preferences(preferences_with(default_actions()))
        before = self.preferences.read_text()
        self.run_shortcuts("apply")
        applied = self.preferences.read_text()
        UninstallCommand().execute(self.context("status", restore_shortcuts=False))
        self.assertEqual(self.preferences.read_text(), applied)
        UninstallCommand().execute(self.context("status", restore_shortcuts=True))
        self.assertEqual(json.loads(self.preferences.read_text()), json.loads(before))


if __name__ == "__main__":
    unittest.main()
