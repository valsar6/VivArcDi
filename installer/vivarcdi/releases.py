from __future__ import annotations

import json
import re
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

LATEST_RELEASE_URL = "https://api.github.com/repos/valsar6/VivArcDi/releases/latest"
CHECK_INTERVAL_SECONDS = 24 * 60 * 60
FETCH_TIMEOUT_SECONDS = 3
CACHE_FILE_NAME = "release-check.json"
VERSION_PATTERN = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)$")


@dataclass(frozen=True)
class Release:
    """A published VivArcDi release: its version without the leading `v` and its web page."""

    version: str
    url: str


class GitHubReleaseFetcher:
    """Asks GitHub for the latest release. Raises on any network or format problem."""

    def __init__(self, url: str = LATEST_RELEASE_URL, timeout: float = FETCH_TIMEOUT_SECONDS):
        self._url = url
        self._timeout = timeout

    def fetch(self) -> dict:
        """The decoded JSON of the latest release."""
        request = urllib.request.Request(self._url, headers={"Accept": "application/vnd.github+json"})
        with urllib.request.urlopen(request, timeout=self._timeout) as response:
            return json.loads(response.read().decode("utf-8"))


class ReleaseChecker:
    """Finds out whether a newer VivArcDi exists, asking GitHub at most once a day.

    The time of the last check and the tag it saw live in `<state_dir>/release-check.json`.
    Every failure is swallowed: no network, bad data or an unwritable folder just mean no news.
    """

    def __init__(
        self,
        state_dir: Path,
        current_version: str,
        fetcher=None,
        clock: Callable[[], float] = time.time,
    ):
        self._cache = state_dir / CACHE_FILE_NAME
        self._current = current_version
        self._fetcher = fetcher or GitHubReleaseFetcher()
        self._clock = clock
        self._checked = False
        self._newer: Release | None = None

    def newer_release(self) -> Release | None:
        """The latest release when it is newer than the running version, otherwise None.

        The answer is worked out once per checker.
        """
        if not self._checked:
            self._checked = True
            self._newer = self._find()
        return self._newer

    def _find(self) -> Release | None:
        seen = self._read_cache()
        if self._clock() - seen.get("checked_at", 0) >= CHECK_INTERVAL_SECONDS:
            seen = self._ask_github(seen)
        return self._newer_than_running(seen.get("tag", ""), seen.get("url", ""))

    def _ask_github(self, previous: dict) -> dict:
        seen = {**previous, "checked_at": self._clock()}
        try:
            payload = self._fetcher.fetch()
            seen.update(tag=str(payload["tag_name"]), url=str(payload["html_url"]))
        except Exception:
            pass
        self._write_cache(seen)
        return seen

    def _newer_than_running(self, tag: str, url: str) -> Release | None:
        latest = parse_version(tag)
        running = parse_version(self._current)
        if latest is None or running is None or latest <= running:
            return None
        return Release(tag.lstrip("v"), url)

    def _read_cache(self) -> dict:
        try:
            data = json.loads(self._cache.read_text())
        except (OSError, ValueError):
            return {}
        return data if isinstance(data, dict) else {}

    def _write_cache(self, seen: dict) -> None:
        try:
            self._cache.parent.mkdir(parents=True, exist_ok=True)
            self._cache.write_text(json.dumps(seen))
        except OSError:
            pass


def parse_version(text: str) -> tuple[int, int, int] | None:
    """`1.2.3` or `v1.2.3` as numbers to compare, or None for anything else."""
    match = VERSION_PATTERN.match(text.strip())
    if match is None:
        return None
    major, minor, patch = match.groups()
    return int(major), int(minor), int(patch)
