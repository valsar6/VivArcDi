from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Callable

from ..installation import VivaldiInstallation
from ..patching import InstallationPatcher
from ..platforms import Platform


class BuildState(Enum):
    """The four states a Vivaldi build can be in, as the window shows them."""

    NOT_INSTALLED = "not_installed"
    CURRENT = "current"
    OUTDATED = "outdated"
    NEEDS_REAPPLY = "needs_reapply"


@dataclass(frozen=True)
class BuildStatus:
    """One row of the window: a Vivaldi build and its state."""

    label: str
    state: BuildState


class StatusModel:
    """Reads the state of every Vivaldi build without changing anything.

    A build is:
    - `current` when window.html is patched and the payload matches this VivArcDi and this Vivaldi;
    - `outdated` when window.html is patched but the payload is another VivArcDi's or another
      Vivaldi's, which the Update action refreshes;
    - `needs_reapply` when window.html is not patched but VivArcDi was installed: its payload
      folder is still there, or `is_registered` says the mode manages VivArcDi (a Vivaldi update
      replaced window.html and left no payload);
    - `not_installed` otherwise.
    """

    def __init__(self, platform: Platform, installations: InstallationPatcher, is_registered: Callable[[], bool]):
        self._platform = platform
        self._installations = installations
        self._is_registered = is_registered

    def statuses(self) -> list[BuildStatus]:
        """One status per Vivaldi build found, in the platform's order."""
        return [
            BuildStatus(installation.label, self._state_of(installation))
            for installation in self._platform.find_installations()
        ]

    def _state_of(self, installation: VivaldiInstallation) -> BuildState:
        state = self._installations.state(installation)
        if state.patched:
            return BuildState.CURRENT if state.current else BuildState.OUTDATED
        if installation.payload_dir.exists() or self._is_registered():
            return BuildState.NEEDS_REAPPLY
        return BuildState.NOT_INSTALLED
