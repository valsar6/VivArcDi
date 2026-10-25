import unittest

from support import WINDOW_HTML
from vivarcdi.errors import PatchError
from vivarcdi.window_patch import WindowHtmlPatcher


class WindowHtmlPatcherTest(unittest.TestCase):
    def setUp(self):
        self.patcher = WindowHtmlPatcher()

    def test_apply_adds_the_loader_before_closing_body(self):
        patched = self.patcher.apply(WINDOW_HTML)
        self.assertTrue(self.patcher.is_patched(patched))
        loader_at = patched.index('src="vivarcdi/loader.js"')
        self.assertLess(patched.index("bundle.js"), loader_at)
        self.assertLess(loader_at, patched.index("</body>"))

    def test_apply_is_idempotent(self):
        once = self.patcher.apply(WINDOW_HTML)
        twice = self.patcher.apply(once)
        self.assertEqual(once, twice)
        self.assertEqual(twice.count(WindowHtmlPatcher.START_MARKER), 1)

    def test_revert_restores_the_original(self):
        self.assertEqual(self.patcher.revert(self.patcher.apply(WINDOW_HTML)), WINDOW_HTML)

    def test_revert_leaves_unpatched_html_alone(self):
        self.assertEqual(self.patcher.revert(WINDOW_HTML), WINDOW_HTML)

    def test_apply_requires_a_body(self):
        with self.assertRaises(PatchError):
            self.patcher.apply("<html></html>")


if __name__ == "__main__":
    unittest.main()
