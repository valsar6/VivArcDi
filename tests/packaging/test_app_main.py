import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "installer"))
sys.path.insert(0, str(REPO_ROOT / "packaging" / "macos"))

from app_main import AppArguments
from vivarcdi.cli import parse_arguments


class AppArgumentsTest(unittest.TestCase):
    def command_line(self, *argv):
        return AppArguments(list(argv)).command_line()

    def test_no_arguments_open_the_window_in_app_mode(self):
        self.assertEqual(self.command_line(), ["--mode", "app", "window"])

    def test_the_launch_serial_number_of_older_macos_is_ignored(self):
        self.assertEqual(self.command_line("-psn_0_123456"), ["--mode", "app", "window"])

    def test_the_needs_reapply_option_opens_the_window_with_it(self):
        self.assertEqual(self.command_line("--needs-reapply"), ["--mode", "app", "window", "--needs-reapply"])

    def test_a_command_runs_in_app_mode(self):
        self.assertEqual(
            self.command_line("reapply", "--background", "--quiet"),
            ["--mode", "app", "reapply", "--background", "--quiet"],
        )

    def test_a_given_mode_is_kept(self):
        self.assertEqual(self.command_line("reapply", "--mode", "app"), ["reapply", "--mode", "app"])
        self.assertEqual(self.command_line("--mode=app", "status"), ["--mode=app", "status"])

    def test_every_result_is_a_valid_installer_command_line(self):
        cases = [(), ("--needs-reapply",), ("reapply", "--mode", "app", "--background", "--quiet"), ("status",)]
        for case in cases:
            with self.subTest(case=case):
                arguments = parse_arguments(self.command_line(*case))
                self.assertEqual(arguments.mode, "app")

    def test_the_window_request_keeps_the_option(self):
        arguments = parse_arguments(self.command_line("--needs-reapply"))
        self.assertEqual(arguments.command, "window")
        self.assertTrue(arguments.needs_reapply)


if __name__ == "__main__":
    unittest.main()
