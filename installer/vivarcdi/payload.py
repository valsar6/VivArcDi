import hashlib
import json
import shutil
from pathlib import Path

from .installation import VivaldiInstallation

BUILD_FILE = "build.json"
IGNORED_NAMES = {"__pycache__", ".DS_Store"}


class PayloadDeployer:
    """Copies the VivArcDi payload (the src folder) next to window.html.

    It also writes build.json, which tells the loader which VivArcDi and
    Vivaldi versions it runs on, and which payload files were deployed.
    """

    def __init__(self, source_dir: Path, vivarcdi_version: str):
        self._source_dir = source_dir
        self._vivarcdi_version = vivarcdi_version

    def deploy(self, installation: VivaldiInstallation) -> None:
        """Replace the payload of an installation with a fresh copy."""
        self.remove(installation)
        shutil.copytree(
            self._source_dir,
            installation.payload_dir,
            ignore=shutil.ignore_patterns(*IGNORED_NAMES),
        )
        build = self._build_info(installation)
        (installation.payload_dir / BUILD_FILE).write_text(json.dumps(build, indent=2) + "\n")

    def remove(self, installation: VivaldiInstallation) -> None:
        """Delete the payload of an installation, if present."""
        if installation.payload_dir.exists():
            shutil.rmtree(installation.payload_dir)

    def is_current(self, installation: VivaldiInstallation) -> bool:
        """Return True when the deployed payload matches the source and the Vivaldi version."""
        build_file = installation.payload_dir / BUILD_FILE
        if not build_file.exists():
            return False
        try:
            deployed = json.loads(build_file.read_text())
        except json.JSONDecodeError:
            return False
        return deployed == self._build_info(installation)

    def _build_info(self, installation: VivaldiInstallation) -> dict:
        return {
            "vivarcdiVersion": self._vivarcdi_version,
            "vivaldiVersion": installation.version,
            "payloadFingerprint": self._fingerprint(),
        }

    def _fingerprint(self) -> str:
        digest = hashlib.sha256()
        for path in sorted(self._source_dir.rglob("*")):
            if path.is_file() and not IGNORED_NAMES.intersection(path.parts):
                digest.update(path.relative_to(self._source_dir).as_posix().encode())
                digest.update(path.read_bytes())
        return digest.hexdigest()
