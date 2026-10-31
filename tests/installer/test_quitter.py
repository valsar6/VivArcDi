import unittest

from support import FakeRunner
from vivarcdi.quitter import VivaldiQuitter


class SequenceGuard:
    def __init__(self, answers):
        self.answers = list(answers)

    def is_running(self):
        return self.answers.pop(0) if len(self.answers) > 1 else self.answers[0]


class FakeClock:
    def __init__(self):
        self.now = 0.0
        self.sleeps = []

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.now += seconds


class VivaldiQuitterTest(unittest.TestCase):
    def setUp(self):
        self.runner = FakeRunner()
        self.clock = FakeClock()

    def quitter(self, answers):
        return VivaldiQuitter(self.runner, SequenceGuard(answers), self.clock, self.clock.sleep)

    def test_asks_both_channels_to_quit_through_osascript(self):
        self.assertTrue(self.quitter([False]).quit_and_wait())
        self.assertEqual(
            self.runner.calls,
            [
                ["osascript", "-e", 'tell application id "com.vivaldi.Vivaldi" to quit'],
                ["osascript", "-e", 'tell application id "com.vivaldi.Vivaldi.snapshot" to quit'],
            ],
        )

    def test_waits_until_the_processes_are_gone(self):
        self.assertTrue(self.quitter([True, True, False]).quit_and_wait())
        self.assertEqual(len(self.clock.sleeps), 2)

    def test_gives_up_after_fifteen_seconds(self):
        self.assertFalse(self.quitter([True]).quit_and_wait())
        self.assertEqual(self.clock.now, 15.0)


if __name__ == "__main__":
    unittest.main()
