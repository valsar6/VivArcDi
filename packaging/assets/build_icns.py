from __future__ import annotations

import struct
from pathlib import Path

ASSETS_DIR = Path(__file__).resolve().parent
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
ICON_TYPE = b"ic08"
HEADER_TYPE = b"icns"
CHUNK_HEADER_SIZE = 8


class IcnsWriter:
    """Wraps a 256x256 PNG in an ICNS container with a single `ic08` entry, byte for byte the same every time."""

    def convert(self, png: bytes) -> bytes:
        """The ICNS file that holds `png`. Raises ValueError when `png` is not a PNG."""
        if not png.startswith(PNG_SIGNATURE):
            raise ValueError("The icon is not a PNG file")
        entry = ICON_TYPE + struct.pack(">I", CHUNK_HEADER_SIZE + len(png)) + png
        return HEADER_TYPE + struct.pack(">I", CHUNK_HEADER_SIZE + len(entry)) + entry

    def write(self, source: Path, target: Path) -> None:
        """Convert the PNG file `source` and save the result as `target`."""
        target.write_bytes(self.convert(source.read_bytes()))


if __name__ == "__main__":
    IcnsWriter().write(ASSETS_DIR / "icon.png", ASSETS_DIR / "icon.icns")
