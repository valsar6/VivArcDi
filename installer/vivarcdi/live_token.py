from __future__ import annotations

import os
from pathlib import Path

SECRETS_FOLDER = "secrets"
TOKEN_FILE = "github-token"
FOLDER_MODE = 0o700
FILE_MODE = 0o600


class TokenVault:
    """The GitHub token of the live folders, kept outside the browser.

    The installer keeps it in its data folder and copies it next to the payload, where the mod
    reads it for each refresh. Both files and their folders are private to the person who stored it.
    """

    def __init__(self, data_dir: Path, owner: tuple[int, int] | None = None):
        self._file = data_dir / SECRETS_FOLDER / TOKEN_FILE
        self._owner = owner

    @property
    def path(self) -> Path:
        """Where the installer keeps the token."""
        return self._file

    def read(self) -> str | None:
        """The stored token, or None when there is none."""
        if not self._file.is_file():
            return None
        return self._file.read_text().strip() or None

    def save(self, token: str) -> None:
        """Store the token, replacing the one stored before."""
        self._write(self._file, token.strip(), self._owner)

    def remove(self) -> None:
        """Delete the stored token, if any."""
        self._file.unlink(missing_ok=True)

    def copy_to(self, payload_dir: Path) -> bool:
        """Copy the token next to a deployed payload. Return False when no token is stored."""
        token = self.read()
        if token is None:
            return False
        stat = self._file.stat()
        self._write(self.payload_file(payload_dir), token, (stat.st_uid, stat.st_gid))
        return True

    def remove_from(self, payload_dir: Path) -> None:
        """Delete the copy next to a deployed payload, if any."""
        self.payload_file(payload_dir).unlink(missing_ok=True)

    @staticmethod
    def payload_file(payload_dir: Path) -> Path:
        """Where the copy lives inside a deployed payload."""
        return payload_dir / SECRETS_FOLDER / TOKEN_FILE

    @staticmethod
    def _write(path: Path, token: str, owner: tuple[int, int] | None) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        os.chmod(path.parent, FOLDER_MODE)
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, FILE_MODE)
        with os.fdopen(descriptor, "w") as handle:
            handle.write(f"{token}\n")
        os.chmod(path, FILE_MODE)
        if owner is not None:
            os.chown(path.parent, *owner)
            os.chown(path, *owner)
