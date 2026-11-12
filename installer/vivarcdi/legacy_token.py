from __future__ import annotations

from pathlib import Path

SECRETS_FOLDER = "secrets"
TOKEN_FILE = "github-token"


class LegacyTokenFiles:
    """The GitHub token files that versions 0.49 to 0.51 kept outside the browser.

    The live folders now connect to GitHub from the browser, so these files are never read. Every
    install and reapply deletes them, and the `secrets` folders they leave empty.
    """

    def __init__(self, data_dir: Path):
        self._data_dir = data_dir

    def remove_stored(self) -> None:
        """Delete the token the installer kept in its data folder, if any."""
        self._remove_in(self._data_dir)

    def remove_from(self, payload_dir: Path) -> None:
        """Delete the copy next to a deployed payload, if any."""
        self._remove_in(payload_dir)

    def remove_everywhere(self, payload_dir: Path) -> None:
        """Delete the stored token and the copy next to a deployed payload."""
        self.remove_stored()
        self.remove_from(payload_dir)

    @staticmethod
    def _remove_in(parent: Path) -> None:
        folder = parent / SECRETS_FOLDER
        (folder / TOKEN_FILE).unlink(missing_ok=True)
        try:
            folder.rmdir()
        except OSError:
            pass
