from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from .modes import DebPackageMode, InstallMode
from .releases import Release

HOMEBREW_ROOTS = (Path("/opt/homebrew"), Path("/usr/local"))
HOMEBREW_COMMAND = "brew upgrade --cask vivarcdi"
APT_ADVICE = "Install the update from the software updater or run: sudo apt update && sudo apt upgrade"
DIRECT_ADVICE = "Download the new version from the release page."


class InstallSource(ABC):
    """One way VivArcDi can have been installed, and the advice that goes with it."""

    @abstractmethod
    def advice(self, release: Release) -> str | None:
        """How to install `release` for this source, or None when this is not how VivArcDi was installed."""


class HomebrewSource(InstallSource):
    """A cask installed by Homebrew, which leaves a `Caskroom/vivarcdi` folder under its prefix."""

    def __init__(self, roots: tuple[Path, ...] = HOMEBREW_ROOTS):
        self._roots = roots

    def advice(self, release: Release) -> str | None:
        if any((root / "Caskroom" / "vivarcdi").is_dir() for root in self._roots):
            return f"Update with: {HOMEBREW_COMMAND}"
        return None


class AptSource(InstallSource):
    """The Debian package, which the software updater and apt keep current."""

    def __init__(self, mode: InstallMode):
        self._mode = mode

    def advice(self, release: Release) -> str | None:
        return APT_ADVICE if isinstance(self._mode, DebPackageMode) else None


class DirectSource(InstallSource):
    """Everything else: a `.dmg` dragged to Applications or the command line installer."""

    def advice(self, release: Release) -> str | None:
        return DIRECT_ADVICE


class UpdateAdvisor:
    """Tells the user how to install a newer release, using the first source that recognizes the install."""

    def __init__(self, sources: tuple[InstallSource, ...]):
        self._sources = sources

    @classmethod
    def for_mode(cls, mode: InstallMode) -> UpdateAdvisor:
        """The advisor for a running mode: Homebrew first, then the Debian package, then the release page."""
        return cls((HomebrewSource(), AptSource(mode), DirectSource()))

    def advise(self, release: Release) -> str:
        """The advice for `release`, which is never empty because the last source always answers."""
        for source in self._sources:
            advice = source.advice(release)
            if advice is not None:
                return advice
        return ""
