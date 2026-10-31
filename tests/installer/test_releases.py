import json
import tempfile
import unittest
from pathlib import Path

from vivarcdi.releases import CACHE_FILE_NAME, ReleaseChecker, parse_version

RELEASE_URL = "https://github.com/valsar6/VivArcDi/releases/tag/v0.16.0"
DAY = 24 * 60 * 60


class FakeFetcher:
    def __init__(self, payload=None, error=None):
        self.payload = payload or {"tag_name": "v0.16.0", "html_url": RELEASE_URL}
        self.error = error
        self.calls = 0

    def fetch(self):
        self.calls += 1
        if self.error:
            raise self.error
        return self.payload


class Clock:
    def __init__(self, now=1_000_000.0):
        self.now = now

    def __call__(self):
        return self.now


class ReleaseCheckerTest(unittest.TestCase):
    def setUp(self):
        self.state = Path(tempfile.mkdtemp())
        self.clock = Clock()

    def checker(self, fetcher, current="0.15.0"):
        return ReleaseChecker(self.state, current, fetcher, self.clock)

    def test_newer_release_is_reported_with_its_page(self):
        release = self.checker(FakeFetcher()).newer_release()
        self.assertEqual((release.version, release.url), ("0.16.0", RELEASE_URL))

    def test_same_or_older_release_is_not_reported(self):
        for current in ("0.16.0", "0.17.1"):
            with self.subTest(current=current):
                self.assertIsNone(self.checker(FakeFetcher(), current).newer_release())

    def test_versions_compare_as_numbers(self):
        self.assertGreater(parse_version("0.10.0"), parse_version("0.9.9"))
        self.assertEqual(parse_version("v1.2.3"), (1, 2, 3))
        self.assertIsNone(parse_version("nightly"))

    def test_github_is_asked_once_a_day(self):
        fetcher = FakeFetcher()
        self.checker(fetcher).newer_release()
        self.clock.now += DAY - 1
        cached = self.checker(fetcher).newer_release()
        self.assertEqual((fetcher.calls, cached.version), (1, "0.16.0"))
        self.clock.now += 2
        self.checker(fetcher).newer_release()
        self.assertEqual(fetcher.calls, 2)

    def test_one_checker_asks_only_once(self):
        fetcher = FakeFetcher()
        checker = self.checker(fetcher)
        checker.newer_release()
        checker.newer_release()
        self.assertEqual(fetcher.calls, 1)

    def test_any_failure_is_silent_and_not_retried_the_same_day(self):
        fetcher = FakeFetcher(error=OSError("offline"))
        self.assertIsNone(self.checker(fetcher).newer_release())
        self.assertIsNone(self.checker(fetcher).newer_release())
        self.assertEqual(fetcher.calls, 1)

    def test_a_failed_check_keeps_the_tag_seen_before(self):
        self.checker(FakeFetcher()).newer_release()
        self.clock.now += DAY + 1
        release = self.checker(FakeFetcher(error=OSError("offline"))).newer_release()
        self.assertEqual(release.version, "0.16.0")

    def test_malformed_answers_and_cache_are_ignored(self):
        self.assertIsNone(self.checker(FakeFetcher(payload={"unexpected": 1})).newer_release())
        (self.state / CACHE_FILE_NAME).write_text("not json")
        self.assertIsNone(self.checker(FakeFetcher(payload={"tag_name": "beta", "html_url": "x"})).newer_release())

    def test_an_unwritable_state_folder_is_ignored(self):
        blocker = self.state / "file"
        blocker.write_text("")
        checker = ReleaseChecker(blocker / "inside", "0.15.0", FakeFetcher(), self.clock)
        self.assertEqual(checker.newer_release().version, "0.16.0")

    def test_the_cache_records_the_time_and_the_tag(self):
        self.checker(FakeFetcher()).newer_release()
        saved = json.loads((self.state / CACHE_FILE_NAME).read_text())
        self.assertEqual((saved["checked_at"], saved["tag"]), (self.clock.now, "v0.16.0"))


if __name__ == "__main__":
    unittest.main()
