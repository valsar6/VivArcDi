import io
import plistlib
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from support import WINDOW_HTML, FakeRunner, make_macos_vivaldi, make_payload_source
from test_window import FakeView, NOT_RUNNING
from vivarcdi import cli
from vivarcdi.backup import BackupStore
from vivarcdi.cli import build_context
from vivarcdi.commands import InstallCommand, ReapplyCommand
from vivarcdi.hooks import LaunchAgentHook
from vivarcdi.modes import CommandLineMode, MacAppMode
from vivarcdi.notifier import APP_BUNDLE_ID, AppOpener, MacNotifier
from vivarcdi.patching import InstallationPatcher
from vivarcdi.platforms import MacOSPlatform
from vivarcdi.reporter import CollectingReporter, Reporter
from vivarcdi.window.assembly import assemble_presenter
from vivarcdi.window.presenter import MessageButtonKind
from vivarcdi.window_patch import WindowHtmlPatcher

APP = Path("/Applications/VivArcDi.app/Contents/MacOS/VivArcDi")
MOVED_APP = Path("/Users/tore/Applications/VivArcDi.app/Contents/MacOS/VivArcDi")


class AppBackgroundCase(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.repo = make_payload_source(self.root).parent
        self.resources = make_macos_vivaldi(self.root)
        self.window_html = self.resources / "window.html"
        self.runner = FakeRunner({"pgrep": NOT_RUNNING})
        self.platform = MacOSPlatform(self.root, self.root / "Users" / "tore", self.runner)
        self.output = io.StringIO()

    def context(self, background=False, executable=APP):
        reporter = Reporter(out=self.output, err=self.output)
        return build_context(
            self.platform, reporter, repo_root=self.repo, background=background, runner=self.runner, mode=MacAppMode(executable)
        )

    def agent(self):
        path = self.platform.launch_agents_dir / f"{LaunchAgentHook.LABEL}.plist"
        return plistlib.loads(path.read_bytes())

    def install_then_lose_the_patch(self):
        InstallCommand().execute(self.context())
        self.window_html.write_text(WINDOW_HTML)
        self.runner.calls.clear()


class LaunchAgentTest(AppBackgroundCase):
    def test_launch_agent_runs_the_app_executable(self):
        InstallCommand().execute(self.context())
        agent = self.agent()
        self.assertEqual(
            sorted(agent["ProgramArguments"][1:]),
            sorted(["reapply", "--mode", "app", "--background", "--quiet"]),
        )
        self.assertEqual(agent["ProgramArguments"][0], str(APP))
        self.assertEqual(agent["AssociatedBundleIdentifiers"], [APP_BUNDLE_ID])

    def test_command_line_agent_has_no_associated_bundle(self):
        context = build_context(self.platform, Reporter(out=self.output), repo_root=self.repo, runner=self.runner)
        InstallCommand().execute(context)
        self.assertNotIn("AssociatedBundleIdentifiers", self.agent())


class BackgroundReapplyTest(AppBackgroundCase):
    class Denying:
        def __init__(self, deployer, filename):
            self.deployer = deployer
            self.filename = filename

        def deploy(self, installation):
            raise PermissionError(1, "Operation not permitted", self.filename)

        def remove(self, installation):
            self.deployer.remove(installation)

        def is_current(self, installation):
            return self.deployer.is_current(installation)

    def denied_context(self):
        context = self.context(background=True)
        deployer = self.Denying(context.installations._deployer, str(self.resources))
        patcher = InstallationPatcher(
            WindowHtmlPatcher(), deployer, BackupStore(context.data_dir / "backups"), context.mode.permission_advisor(self.platform)
        )
        return replace(context, installations=patcher)

    def test_successful_background_reapply_notifies(self):
        self.install_then_lose_the_patch()
        self.assertEqual(ReapplyCommand().execute(self.context(background=True)), 0)
        self.assertIn("vivarcdi/loader.js", self.window_html.read_text())
        script = 'display notification "VivArcDi was applied again. Restart Vivaldi." with title "VivArcDi"'
        self.assertEqual(self.runner.calls, [["osascript", "-e", script]])

    def test_denied_background_reapply_notifies_instead_of_terminal(self):
        self.install_then_lose_the_patch()
        self.assertEqual(ReapplyCommand().execute(self.denied_context()), 0)
        self.assertEqual(self.runner.calls, [["open", "-b", APP_BUNDLE_ID, "--args", "--needs-reapply"]])
        for call in self.runner.calls:
            self.assertNotIn("Terminal", call)
            self.assertNotIn("-a", call)
        self.assertEqual(self.window_html.read_text(), WINDOW_HTML)

    def test_background_reapply_with_nothing_to_do_stays_silent(self):
        InstallCommand().execute(self.context())
        self.runner.calls.clear()
        ReapplyCommand().execute(self.context(background=True))
        self.assertEqual(self.runner.calls, [])

    def test_interactive_reapply_does_not_notify(self):
        self.install_then_lose_the_patch()
        ReapplyCommand().execute(self.context(background=False))
        self.assertEqual(self.runner.calls, [])

    def test_command_line_mode_still_raises_when_denied(self):
        context = replace(self.denied_context(), outcome=CommandLineMode().reapply_outcome(self.runner))
        with self.assertRaises(Exception):
            ReapplyCommand().execute(context)


class NotifierTest(unittest.TestCase):
    def test_quotes_and_backslashes_in_the_message_are_escaped(self):
        runner = FakeRunner()
        MacNotifier(runner).notify('say "hi" \\ now')
        script = runner.calls[0][2]
        self.assertEqual(script, 'display notification "say \\"hi\\" \\\\ now" with title "VivArcDi"')

    def test_opener_passes_arguments_after_args(self):
        runner = FakeRunner()
        AppOpener(runner).open()
        AppOpener(runner).open("--needs-reapply")
        self.assertEqual(
            runner.calls,
            [["open", "-b", APP_BUNDLE_ID], ["open", "-b", APP_BUNDLE_ID, "--args", "--needs-reapply"]],
        )


class WindowStartTest(AppBackgroundCase):
    def presenter(self, executable=APP):
        reporter = CollectingReporter()
        context = build_context(
            self.platform, reporter, repo_root=self.repo, runner=self.runner, mode=MacAppMode(executable)
        )
        self.view = FakeView()
        return assemble_presenter(context, reporter, self.view, self.runner)

    def test_needs_reapply_starts_with_the_app_management_message(self):
        self.install_then_lose_the_patch()
        presenter = self.presenter()
        presenter.prepare(needs_reapply=True)
        presenter.refresh()
        state = self.view.state
        self.assertIn("App Management", state.message)
        self.assertEqual([button.label for button in state.message_buttons], ["Open Settings", "Try again"])
        presenter.press(MessageButtonKind.OPEN_SETTINGS)
        self.assertEqual(len(self.view.urls), 1)
        presenter.press(MessageButtonKind.TRY_AGAIN)
        self.assertIn("vivarcdi/loader.js", self.window_html.read_text())
        self.assertEqual(self.view.state.message_buttons, ())

    def test_needs_reapply_shows_nothing_when_vivaldi_is_already_patched(self):
        InstallCommand().execute(self.context())
        presenter = self.presenter()
        presenter.prepare(needs_reapply=True)
        presenter.refresh()
        self.assertEqual(self.view.state.message, "")

    def test_opening_the_window_registers_the_agent_again_when_the_app_moved(self):
        InstallCommand().execute(self.context())
        presenter = self.presenter(MOVED_APP)
        self.runner.calls.clear()
        presenter.prepare()
        self.assertEqual(self.agent()["ProgramArguments"][0], str(MOVED_APP))
        self.assertEqual(self.agent()["AssociatedBundleIdentifiers"], [APP_BUNDLE_ID])
        self.assertEqual([call[1] for call in self.runner.calls], ["bootout", "bootstrap"])

    def test_opening_the_window_leaves_the_agent_alone_when_the_app_did_not_move(self):
        InstallCommand().execute(self.context())
        presenter = self.presenter()
        self.runner.calls.clear()
        presenter.prepare()
        self.assertEqual(self.runner.calls, [])

    def test_opening_the_window_registers_nothing_before_install(self):
        presenter = self.presenter()
        presenter.prepare()
        self.assertFalse((self.platform.launch_agents_dir / f"{LaunchAgentHook.LABEL}.plist").exists())

    def test_window_command_accepts_the_needs_reapply_option(self):
        arguments = cli.parse_arguments(["window", "--mode", "app", "--needs-reapply"])
        self.assertTrue(arguments.needs_reapply)
        self.assertFalse(cli.parse_arguments(["window"]).needs_reapply)


if __name__ == "__main__":
    unittest.main()
