import shutil
import tempfile
import unittest
from pathlib import Path

from test_window import MacWindowCase
from test_window_launch import FakeChecker
from vivarcdi.modes import CommandLineMode, DebPackageMode, MacAppMode
from vivarcdi.releases import Release
from vivarcdi.update_advice import APT_ADVICE, DIRECT_ADVICE, AptSource, DirectSource, HomebrewSource, UpdateAdvisor
from vivarcdi.window.assembly import build_presenter

RELEASE = Release("9.9.9", "https://example.test/release")


class UpdateAdviceCase(unittest.TestCase):
    def setUp(self):
        self.prefix = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.prefix, True)

    def with_homebrew(self) -> None:
        (self.prefix / "Caskroom" / "vivarcdi" / "0.16.0").mkdir(parents=True)

    def advisor(self, mode) -> UpdateAdvisor:
        return UpdateAdvisor((HomebrewSource((self.prefix,)), AptSource(mode), DirectSource()))


class UpdateAdviceTest(UpdateAdviceCase):
    def test_update_notice_names_the_package_manager_command(self):
        self.with_homebrew()
        with self.subTest("a Homebrew install names the brew command"):
            self.assertIn("brew upgrade --cask vivarcdi", self.advisor(MacAppMode()).advise(RELEASE))
        with self.subTest("the Debian package names the software updater and apt"):
            advice = UpdateAdvisor.for_mode(DebPackageMode()).advise(RELEASE)
            self.assertEqual(advice, APT_ADVICE)
            self.assertIn("software updater", advice)
            self.assertIn("sudo apt update && sudo apt upgrade", advice)

    def test_a_direct_install_points_to_the_release_page(self):
        self.assertEqual(self.advisor(CommandLineMode()).advise(RELEASE), DIRECT_ADVICE)

    def test_homebrew_wins_over_the_debian_package_only_when_its_folder_exists(self):
        self.assertEqual(self.advisor(DebPackageMode()).advise(RELEASE), APT_ADVICE)
        self.with_homebrew()
        self.assertIn("brew upgrade", self.advisor(DebPackageMode()).advise(RELEASE))


class UpdateAdviceWindowTest(MacWindowCase, UpdateAdviceCase):
    def setUp(self):
        MacWindowCase.setUp(self)
        UpdateAdviceCase.setUp(self)

    def test_the_window_state_carries_the_advice(self):
        self.with_homebrew()
        presenter = build_presenter(
            self.platform,
            MacAppMode(),
            self.view,
            repo_root=self.repo,
            runner=self.runner,
            release_checker=FakeChecker(),
            update_advisor=self.advisor(MacAppMode()),
        )
        presenter.refresh()
        self.assertIn("brew upgrade --cask vivarcdi", self.view.state.update_advice)

    def test_no_newer_release_means_no_advice(self):
        self.presenter().refresh()
        self.assertEqual(self.view.state.update_advice, "")


if __name__ == "__main__":
    unittest.main()
