import os
from dataclasses import dataclass

from .backup import BackupStore
from .errors import PermissionDeniedError
from .installation import VivaldiInstallation
from .payload import PayloadDeployer
from .window_patch import WindowHtmlPatcher


@dataclass(frozen=True)
class InstallationState:
    """Whether an installation carries VivArcDi, and whether that copy is up to date."""

    patched: bool
    current: bool

    @property
    def needs_reapply(self) -> bool:
        """True when window.html lost the patch or the payload is outdated."""
        return not (self.patched and self.current)


class InstallationPatcher:
    """Applies VivArcDi to one Vivaldi installation, or removes it.

    Combines the window.html patch, the payload copy and the backup so that
    commands never deal with them one by one.
    """

    def __init__(self, patcher: WindowHtmlPatcher, deployer: PayloadDeployer, backups: BackupStore):
        self._patcher = patcher
        self._deployer = deployer
        self._backups = backups

    def state(self, installation: VivaldiInstallation) -> InstallationState:
        """Inspect an installation without changing it."""
        html = installation.window_html.read_text()
        return InstallationState(
            patched=self._patcher.is_patched(html),
            current=self._deployer.is_current(installation),
        )

    def apply(self, installation: VivaldiInstallation) -> None:
        """Back up window.html, copy the payload and patch window.html.

        Raises PermissionDeniedError when the installation is not writable.
        """
        self._ensure_writable(installation)
        html = installation.window_html.read_text()
        self._backups.save(installation, self._patcher.revert(html))
        self._deployer.deploy(installation)
        installation.window_html.write_text(self._patcher.apply(html))

    def revert(self, installation: VivaldiInstallation) -> None:
        """Remove the patch and the payload, leaving Vivaldi as it was."""
        self._ensure_writable(installation)
        html = installation.window_html.read_text()
        if self._patcher.is_patched(html):
            installation.window_html.write_text(self._patcher.revert(html))
        self._deployer.remove(installation)

    def backup_path(self, installation: VivaldiInstallation):
        """Where the original window.html of an installation is kept."""
        return self._backups.path_for(installation)

    @staticmethod
    def _ensure_writable(installation: VivaldiInstallation) -> None:
        targets = (installation.resources_dir, installation.window_html)
        if not all(os.access(target, os.W_OK) for target in targets):
            raise PermissionDeniedError(f"Cannot write to {installation.resources_dir}")
