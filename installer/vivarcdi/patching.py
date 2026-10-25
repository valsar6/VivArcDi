from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

from .backup import BackupStore
from .errors import PermissionDeniedError
from .installation import VivaldiInstallation
from .payload import PayloadDeployer
from .permissions import PermissionAdvisor, first_unwritable
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
    commands never deal with them one by one. Permission problems become a
    PermissionDeniedError whose message says how to fix them.
    """

    def __init__(
        self,
        patcher: WindowHtmlPatcher,
        deployer: PayloadDeployer,
        backups: BackupStore,
        advisor: PermissionAdvisor,
    ):
        self._patcher = patcher
        self._deployer = deployer
        self._backups = backups
        self._advisor = advisor

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
        with self._explaining_permission_errors(installation):
            self._deployer.deploy(installation)
            installation.window_html.write_text(self._patcher.apply(html))

    def revert(self, installation: VivaldiInstallation) -> None:
        """Remove the patch and the payload, leaving Vivaldi as it was."""
        self._ensure_writable(installation)
        html = installation.window_html.read_text()
        with self._explaining_permission_errors(installation):
            if self._patcher.is_patched(html):
                installation.window_html.write_text(self._patcher.revert(html))
            self._deployer.remove(installation)

    def backup_path(self, installation: VivaldiInstallation) -> Path:
        """Where the original window.html of an installation is kept."""
        return self._backups.path_for(installation)

    def _ensure_writable(self, installation: VivaldiInstallation) -> None:
        targets = [installation.resources_dir, installation.window_html, installation.payload_dir]
        blocked = first_unwritable(targets)
        if blocked is not None:
            raise PermissionDeniedError(self._advisor.explain(blocked))

    @contextmanager
    def _explaining_permission_errors(self, installation: VivaldiInstallation):
        try:
            yield
        except PermissionError as error:
            blocked = Path(error.filename) if error.filename else installation.resources_dir
            raise PermissionDeniedError(self._advisor.explain(blocked)) from error
