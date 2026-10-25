import shutil
from pathlib import Path

from .distribution import DIST_FOLDER, require_dist

STAGED_FOLDERS = ("dist", "installer")
LEGACY_FOLDERS = ("src",)


class SelfStager:
    """Copies VivArcDi into the platform's data folder.

    The update hook runs that copy, so it keeps working even if the user
    moves or deletes the cloned repository.
    """

    def __init__(self, repo_root: Path, data_dir: Path):
        self._repo_root = repo_root
        self._data_dir = data_dir

    @property
    def is_running_from_stage(self) -> bool:
        """True when this installer is already the staged copy."""
        return self._repo_root.resolve() == self._data_dir.resolve()

    def stage(self) -> None:
        """Replace the staged copy with the files of the running installer.

        Raises InstallerError when the payload was not built.
        """
        if self.is_running_from_stage:
            return
        require_dist(self._repo_root / DIST_FOLDER)
        self._remove_folders(LEGACY_FOLDERS)
        self._data_dir.mkdir(parents=True, exist_ok=True)
        for folder in STAGED_FOLDERS:
            target = self._data_dir / folder
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(
                self._repo_root / folder,
                target,
                ignore=shutil.ignore_patterns("__pycache__"),
            )

    def unstage(self) -> None:
        """Delete the staged copy, keeping anything else in the data folder."""
        self._remove_folders(STAGED_FOLDERS + LEGACY_FOLDERS)

    def _remove_folders(self, folders: tuple) -> None:
        for folder in folders:
            target = self._data_dir / folder
            if target.exists():
                shutil.rmtree(target)

    @property
    def staged_installer(self) -> Path:
        """Path of the staged installer folder, runnable with `python3 <path>`."""
        return self._data_dir / "installer"
