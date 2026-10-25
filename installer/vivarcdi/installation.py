from dataclasses import dataclass
from pathlib import Path

PAYLOAD_DIR_NAME = "vivarcdi"


@dataclass(frozen=True)
class VivaldiInstallation:
    """A Vivaldi build found on disk.

    channel: "stable" or "snapshot".
    version: full Vivaldi version, e.g. "8.1.3740.12", or "unknown".
    resources_dir: the folder that holds Vivaldi's window.html.
    """

    channel: str
    version: str
    resources_dir: Path

    @property
    def window_html(self) -> Path:
        """Path of the window.html file VivArcDi patches."""
        return self.resources_dir / "window.html"

    @property
    def payload_dir(self) -> Path:
        """Folder, next to window.html, where the VivArcDi payload is copied."""
        return self.resources_dir / PAYLOAD_DIR_NAME

    @property
    def label(self) -> str:
        """Short human-readable name, e.g. "Vivaldi stable 8.1.3740.12"."""
        return f"Vivaldi {self.channel} {self.version}"
