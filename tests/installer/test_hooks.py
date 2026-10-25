import plistlib
import tempfile
import unittest
from pathlib import Path

from support import FakeRunner
from vivarcdi.hooks import AptHook, LaunchAgentHook

COMMAND = ["/usr/bin/python3", "/usr/local/share/vivarcdi/installer", "reapply", "--quiet"]


class AptHookTest(unittest.TestCase):
    def setUp(self):
        self.path = Path(tempfile.mkdtemp()) / "apt.conf.d" / "99vivarcdi"
        self.hook = AptHook(self.path)

    def test_install_writes_a_post_invoke_rule(self):
        self.hook.install(COMMAND)
        content = self.path.read_text()
        self.assertTrue(content.startswith("DPkg::Post-Invoke {"))
        self.assertIn("/usr/local/share/vivarcdi/installer reapply --quiet || true", content)
        self.assertTrue(self.hook.is_installed())

    def test_remove_deletes_the_rule(self):
        self.hook.install(COMMAND)
        self.hook.remove()
        self.assertFalse(self.hook.is_installed())
        self.hook.remove()


class LaunchAgentHookTest(unittest.TestCase):
    def setUp(self):
        self.agents = Path(tempfile.mkdtemp())
        self.runner = FakeRunner()
        self.watch = Path("/Applications/Vivaldi.app/Contents/Frameworks/Vivaldi Framework.framework/Versions")
        self.hook = LaunchAgentHook(self.agents, [self.watch], self.runner, uid_provider=lambda: 501)

    def test_install_writes_plist_and_bootstraps(self):
        self.hook.install(COMMAND)
        plist_path = self.agents / f"{LaunchAgentHook.LABEL}.plist"
        agent = plistlib.loads(plist_path.read_bytes())
        self.assertEqual(agent["ProgramArguments"], COMMAND)
        self.assertEqual(agent["WatchPaths"], [str(self.watch)])
        self.assertEqual(self.runner.calls[-1], ["launchctl", "bootstrap", "gui/501", str(plist_path)])

    def test_reinstall_unloads_the_previous_agent_first(self):
        self.hook.install(COMMAND)
        self.hook.install(COMMAND)
        verbs = [call[1] for call in self.runner.calls]
        self.assertEqual(verbs, ["bootstrap", "bootout", "bootstrap"])

    def test_remove_unloads_and_deletes(self):
        self.hook.install(COMMAND)
        self.hook.remove()
        self.assertFalse(self.hook.is_installed())
        self.assertEqual(self.runner.calls[-1][1], "bootout")


if __name__ == "__main__":
    unittest.main()
