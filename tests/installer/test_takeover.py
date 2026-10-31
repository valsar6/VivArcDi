import io
import os
import plistlib
import tempfile
import unittest
from pathlib import Path

from support import FakeRunner, make_debian_vivaldi, make_macos_vivaldi, make_payload_source
from vivarcdi.cli import build_context
from vivarcdi.commands import InstallCommand
from vivarcdi.handoff import TerminalHandoff
from vivarcdi.hooks import LaunchAgentHook
from vivarcdi.modes import DebPackageMode, MacAppMode
from vivarcdi.platforms import DebianPlatform, MacOSPlatform
from vivarcdi.reporter import Reporter

APP_EXECUTABLE = Path("/Applications/VivArcDi.app/Contents/MacOS/VivArcDi")


class TakeoverTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.repo = make_payload_source(self.root).parent
        self.runner = FakeRunner()
        self.output = io.StringIO()

    def install(self, platform, mode):
        reporter = Reporter(out=self.output, err=self.output)
        context = build_context(platform, reporter, repo_root=self.repo, runner=self.runner, mode=mode)
        self.assertEqual(InstallCommand().execute(context), 0)
        return context

    def test_package_takes_over_a_command_line_installation(self):
        with self.subTest(system="macOS"):
            self.takes_over_on_macos()
        with self.subTest(system="Debian"):
            self.takes_over_on_debian()

    def takes_over_on_macos(self):
        make_macos_vivaldi(self.root)
        home = self.root / "Users" / "tore"
        platform = MacOSPlatform(self.root, home, self.runner)
        agent = platform.launch_agents_dir / f"{LaunchAgentHook.LABEL}.plist"
        agent.parent.mkdir(parents=True)
        agent.write_bytes(plistlib.dumps({"ProgramArguments": ["/usr/bin/python3", "installer", "reapply"]}))
        data = platform.data_dir
        for folder in ("installer", "dist"):
            (data / folder).mkdir(parents=True)
        (data / "backups" / "stable-8.1.3740.12").mkdir(parents=True)
        (data / "backups" / "stable-8.1.3740.12" / "window.html").write_text("original")
        (data / TerminalHandoff.SCRIPT_NAME).write_text("#!/bin/sh\n")
        self.install(platform, MacAppMode(APP_EXECUTABLE))
        self.assertFalse((data / "installer").exists())
        self.assertFalse((data / "dist").exists())
        self.assertFalse((data / TerminalHandoff.SCRIPT_NAME).exists())
        self.assertEqual((data / "backups" / "stable-8.1.3740.12" / "window.html").read_text(), "original")
        self.assertIn(["launchctl", "bootout", f"gui/{os.getuid()}", str(agent)], self.runner.calls)
        program = plistlib.loads(agent.read_bytes())["ProgramArguments"]
        self.assertEqual(program[0], str(APP_EXECUTABLE))

    def takes_over_on_debian(self):
        root = Path(tempfile.mkdtemp())
        make_debian_vivaldi(root)
        platform = DebianPlatform(root, self.runner)
        apt_hook = root / "etc/apt/apt.conf.d/99vivarcdi"
        apt_hook.parent.mkdir(parents=True)
        apt_hook.write_text("DPkg::Post-Invoke {};\n")
        legacy = root / "usr/local/share/vivarcdi"
        (legacy / "backups" / "stable-8.1.3740.12").mkdir(parents=True)
        (legacy / "backups" / "stable-8.1.3740.12" / "window.html").write_text("original")
        (legacy / "installer").mkdir()
        self.install(platform, DebPackageMode())
        self.assertFalse(apt_hook.exists())
        self.assertFalse(legacy.exists())
        moved = root / "var/lib/vivarcdi/backups/stable-8.1.3740.12/window.html"
        self.assertEqual(moved.read_text(), "original")

    def test_an_agent_that_runs_the_app_is_left_alone(self):
        make_macos_vivaldi(self.root)
        platform = MacOSPlatform(self.root, self.root / "Users" / "tore", self.runner)
        mode = MacAppMode(APP_EXECUTABLE)
        self.install(platform, mode)
        self.assertNotIn("Took over", self.output.getvalue())
        self.install(platform, mode)
        self.assertNotIn("Took over", self.output.getvalue())


if __name__ == "__main__":
    unittest.main()
