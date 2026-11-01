import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RUNBOOK = REPO_ROOT / "docs" / "package-managers-setup.md"


class RunbookTest(unittest.TestCase):
    def test_runbook_lists_every_one_time_setup_step(self):
        text = RUNBOOK.read_text()
        for needle in (
            "valsar6/homebrew-vivarcdi",
            "HOMEBREW_TAP_TOKEN",
            "APT_SIGNING_KEY",
            "scripts/make-apt-key.sh",
            "packaging/apt/vivarcdi-archive-keyring.gpg",
            "GitHub Pages",
            "gh-pages",
            "Rotation",
        ):
            with self.subTest(needle):
                self.assertIn(needle, text)

    def test_the_key_script_refuses_to_print_the_key_outside_a_terminal(self):
        script = (REPO_ROOT / "scripts" / "make-apt-key.sh").read_text()
        self.assertIn("[ ! -t 1 ]", script)


if __name__ == "__main__":
    unittest.main()
