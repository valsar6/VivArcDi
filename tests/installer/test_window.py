import json
import shutil
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from support import WINDOW_HTML, FakeRunner, make_debian_vivaldi, make_macos_vivaldi, make_payload_source
from test_shortcuts import default_actions, preferences_with
from vivarcdi.backup import BackupStore
from vivarcdi.cli import build_context
from vivarcdi.commands import InstallCommand
from vivarcdi.modes import CommandLineMode, DebPackageMode, MacAppMode, WindowAction
from vivarcdi.platforms import DebianPlatform, MacOSPlatform
from vivarcdi.patching import InstallationPatcher
from vivarcdi.quitter import VivaldiQuitter
from vivarcdi.reporter import CollectingReporter
from vivarcdi.running import ProcessGuard
from vivarcdi.system import CommandResult
from vivarcdi.window.assembly import assemble_presenter, build_presenter
from vivarcdi.window.model import BuildState
from vivarcdi.window.presenter import MessageButtonKind, WindowView
from vivarcdi.window_patch import WindowHtmlPatcher

NOT_RUNNING = CommandResult(1, "", "")
RUNNING = CommandResult(0, "1234", "")
VERSION = CommandResult(0, "8.1.3740.12-1", "")


class FakeView(WindowView):
    def __init__(self, answer=True):
        self.answer = answer
        self.states = []
        self.questions = []
        self.urls = []
        self.paths = []

    @property
    def state(self):
        return self.states[-1]

    def show_state(self, state):
        self.states.append(state)

    def ask_confirmation(self, question, details=""):
        self.questions.append((question, details))
        return self.answer

    def open_url(self, url):
        self.urls.append(url)

    def open_path(self, path):
        self.paths.append(path)


class DebianWindowCase(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.repo = make_payload_source(self.root).parent
        self.stable = make_debian_vivaldi(self.root)
        self.snapshot = make_debian_vivaldi(self.root, "opt/vivaldi-snapshot")
        self.runner = FakeRunner({"dpkg-query": VERSION, "pgrep": NOT_RUNNING})
        self.platform = DebianPlatform(self.root, self.runner, home=self.root / "home")
        self.view = FakeView()

    def presenter(self, mode=None):
        mode = mode or CommandLineMode()
        return build_presenter(self.platform, mode, self.view, repo_root=self.repo, runner=self.runner)

    def stable_installation(self):
        return self.platform.find_installations()[0]

    def states(self):
        return [row.state for row in self.view.state.rows]


class WindowStateTest(DebianWindowCase):
    def apply_to_stable(self, presenter):
        presenter.perform(WindowAction.INSTALL)
        self.view.states.clear()

    def test_window_state_lists_each_build(self):
        presenter = self.presenter()
        presenter.refresh()
        self.assertEqual([row.label for row in self.view.state.rows], ["Vivaldi stable 8.1.3740.12", "Vivaldi snapshot 8.1.3740.12"])
        with self.subTest(state="not installed"):
            self.assertEqual(self.states(), [BuildState.NOT_INSTALLED] * 2)
        presenter.perform(WindowAction.INSTALL)
        with self.subTest(state="current"):
            self.assertEqual(self.states(), [BuildState.CURRENT] * 2)
        with self.subTest(state="outdated"):
            (self.repo / "dist" / "extra.js").write_text("export {};\n")
            presenter.refresh()
            self.assertEqual(self.states(), [BuildState.OUTDATED] * 2)
        with self.subTest(state="needs reapply"):
            (self.snapshot / "window.html").write_text(WINDOW_HTML)
            presenter.refresh()
            self.assertEqual(self.states(), [BuildState.OUTDATED, BuildState.NEEDS_REAPPLY])

    def test_a_package_build_with_no_patch_and_no_payload_needs_reapplying(self):
        presenter = self.presenter(DebPackageMode())
        InstallCommand().execute(presenter.context)
        shutil.rmtree(self.stable / "vivarcdi")
        (self.stable / "window.html").write_text(WINDOW_HTML)
        presenter.refresh()
        self.assertEqual(self.states(), [BuildState.NEEDS_REAPPLY, BuildState.CURRENT])

    def test_window_enables_only_applicable_actions(self):
        presenter = self.presenter()
        shortcuts = {WindowAction.APPLY_SHORTCUTS}
        presenter.refresh()
        with self.subTest(state="nothing installed"):
            self.assertEqual(self.view.state.enabled_actions, shortcuts | {WindowAction.INSTALL})
        presenter.perform(WindowAction.INSTALL)
        with self.subTest(state="current"):
            self.assertEqual(self.view.state.enabled_actions, shortcuts | {WindowAction.UNINSTALL})
        with self.subTest(state="outdated"):
            (self.repo / "dist" / "extra.js").write_text("export {};\n")
            presenter.refresh()
            self.assertEqual(self.view.state.enabled_actions, shortcuts | {WindowAction.UPDATE, WindowAction.UNINSTALL})
        with self.subTest(state="needs reapply"):
            (self.stable / "window.html").write_text(WINDOW_HTML)
            (self.snapshot / "window.html").write_text(WINDOW_HTML)
            presenter.refresh()
            self.assertEqual(self.view.state.enabled_actions, shortcuts | {WindowAction.REAPPLY, WindowAction.UNINSTALL})
        with self.subTest(state="a disabled action does nothing"):
            presenter.perform(WindowAction.INSTALL)
            self.assertIn("does not apply", self.view.state.message)
        with self.subTest(mode="Debian package"):
            package = self.presenter(DebPackageMode())
            package.refresh()
            self.assertEqual(self.view.state.visible_actions, {WindowAction.APPLY_SHORTCUTS, WindowAction.RESTORE_SHORTCUTS})
            self.assertEqual(self.view.state.enabled_actions, shortcuts)

    def test_failures_become_plain_messages_and_the_traceback_goes_to_the_log(self):
        presenter = self.presenter()
        presenter.perform(WindowAction.APPLY_SHORTCUTS)
        self.assertIn("No Vivaldi profile found", self.view.state.message)
        self.assertNotIn("Traceback", self.view.state.message)
        presenter.show_log()
        self.assertEqual(self.view.paths, [self.platform.data_dir / "logs" / "vivarcdi.log"])

    def test_a_failure_is_logged_with_its_traceback_and_not_shown(self):
        self.stable_installation().window_html.write_text("not html at all")
        presenter = self.presenter()
        presenter.perform(WindowAction.INSTALL)
        self.assertNotIn("Traceback", self.view.state.message)
        log = self.platform.data_dir / "logs" / "vivarcdi.log"
        self.assertIn("Traceback", log.read_text())


class MacWindowCase(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.repo = make_payload_source(self.root).parent
        self.resources = make_macos_vivaldi(self.root)
        self.window_html = self.resources / "window.html"
        self.home = self.root / "Users" / "tore"
        self.runner = FakeRunner({"pgrep": NOT_RUNNING})
        self.platform = MacOSPlatform(self.root, self.home, self.runner)
        self.view = FakeView()

    def presenter(self):
        return build_presenter(self.platform, MacAppMode(), self.view, repo_root=self.repo, runner=self.runner)


class PackageShortcutsTest(MacWindowCase):
    def setUp(self):
        super().setUp()
        profile = self.home / "Library" / "Application Support" / "Vivaldi" / "Default"
        profile.mkdir(parents=True)
        self.preferences = profile / "Preferences"
        self.preferences.write_text(json.dumps(preferences_with(default_actions())))
        self.before = self.preferences.read_text()

    def test_packages_leave_shortcuts_alone_by_default(self):
        presenter = self.presenter()
        presenter.perform(WindowAction.INSTALL)
        self.assertEqual(self.preferences.read_text(), self.before)
        self.assertFalse((self.platform.data_dir / "preferences-backups").exists())
        self.view.answer = False
        presenter.perform(WindowAction.APPLY_SHORTCUTS)
        question, details = self.view.questions[-1]
        self.assertIn("COMMAND_SHOW_QUICK_COMMANDS", details)
        self.assertEqual(self.preferences.read_text(), self.before)
        self.view.answer = True
        presenter.perform(WindowAction.APPLY_SHORTCUTS)
        self.assertNotEqual(self.preferences.read_text(), self.before)
        self.assertEqual(self.view.state.enabled_actions & {WindowAction.RESTORE_SHORTCUTS}, {WindowAction.RESTORE_SHORTCUTS})
        presenter.perform(WindowAction.RESTORE_SHORTCUTS)
        self.assertEqual(json.loads(self.preferences.read_text()), json.loads(self.before))


class QuitConfirmationTest(MacWindowCase):
    def setUp(self):
        super().setUp()
        self.runner.responses["pgrep"] = RUNNING

    def quit_vivaldi_on_osascript(self):
        original = self.runner.run

        def run(args):
            if args[0] == "osascript":
                self.runner.responses["pgrep"] = NOT_RUNNING
            return original(args)

        self.runner.run = run

    def test_running_vivaldi_is_quit_only_after_confirmation(self):
        presenter = self.presenter()
        self.view.answer = False
        presenter.perform(WindowAction.INSTALL)
        self.assertEqual(self.window_html.read_text(), WINDOW_HTML)
        self.assertNotIn("osascript", [call[0] for call in self.runner.calls])
        self.assertIn("Nothing was changed", self.view.state.message)
        self.quit_vivaldi_on_osascript()
        self.view.answer = True
        presenter.perform(WindowAction.INSTALL)
        self.assertIn("osascript", [call[0] for call in self.runner.calls])
        self.assertIn("vivarcdi/loader.js", self.window_html.read_text())

    def test_nothing_changes_when_vivaldi_does_not_quit_in_time(self):
        reporter = CollectingReporter()
        context = build_context(self.platform, reporter, repo_root=self.repo, runner=self.runner, mode=MacAppMode())
        moments = iter(range(0, 100, 10))
        quitter = VivaldiQuitter(self.runner, ProcessGuard(["Vivaldi"], self.runner), lambda: next(moments), lambda seconds: None)
        presenter = assemble_presenter(context, reporter, self.view, self.runner, quitter)
        presenter.perform(WindowAction.INSTALL)
        self.assertEqual(self.window_html.read_text(), WINDOW_HTML)
        self.assertIn("did not quit", self.view.state.message)


class AppManagementDenialTest(MacWindowCase):
    class DeniedOnce:
        def __init__(self, deployer, filename):
            self.deployer = deployer
            self.filename = filename
            self.attempts = 0

        def deploy(self, installation):
            self.attempts += 1
            if self.attempts == 1:
                raise PermissionError(1, "Operation not permitted", self.filename)
            self.deployer.deploy(installation)

        def remove(self, installation):
            self.deployer.remove(installation)

        def is_current(self, installation):
            return self.deployer.is_current(installation)

    def denying_presenter(self):
        reporter = CollectingReporter()
        context = build_context(self.platform, reporter, repo_root=self.repo, runner=self.runner, mode=MacAppMode())
        deployer = self.DeniedOnce(context.installations._deployer, str(self.resources))
        patcher = InstallationPatcher(
            WindowHtmlPatcher(), deployer, BackupStore(context.data_dir / "backups"), context.mode.permission_advisor(self.platform)
        )
        return assemble_presenter(replace(context, installations=patcher), reporter, self.view, self.runner), deployer

    def test_app_management_denial_offers_the_settings_page(self):
        presenter, deployer = self.denying_presenter()
        presenter.perform(WindowAction.INSTALL)
        state = self.view.state
        self.assertIn("App Management", state.message)
        self.assertNotIn("sudo", state.message.lower())
        self.assertNotIn("terminal", state.message.lower())
        self.assertEqual([button.label for button in state.message_buttons], ["Open Settings", "Try again"])
        presenter.press(MessageButtonKind.OPEN_SETTINGS)
        self.assertEqual(self.view.urls, ["x-apple.systempreferences:com.apple.preference.security?Privacy_AppBundles"])
        presenter.press(MessageButtonKind.TRY_AGAIN)
        self.assertEqual(deployer.attempts, 2)
        self.assertIn("vivarcdi/loader.js", self.window_html.read_text())
        self.assertEqual(self.view.state.message_buttons, ())


if __name__ == "__main__":
    unittest.main()
