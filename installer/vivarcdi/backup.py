import shutil
from pathlib import Path

from .installation import VivaldiInstallation


class BackupStore:
    """Keeps the original window.html of each Vivaldi version before the first patch."""

    def __init__(self, root: Path):
        self._root = root

    def path_for(self, installation: VivaldiInstallation) -> Path:
        """Where the backup of an installation's window.html lives."""
        return self._root / f"{installation.channel}-{installation.version}" / "window.html"

    def save(self, installation: VivaldiInstallation, original_html: str) -> Path:
        """Store the unpatched html once per version; later calls keep the first copy."""
        target = self.path_for(installation)
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(original_html)
        return target

    def clear(self) -> None:
        """Delete every stored backup."""
        if self._root.exists():
            shutil.rmtree(self._root)
