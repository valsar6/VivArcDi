"""Prepares the lab Vivaldi of the live verification harness (spec 045).

The lab is a copy of an installed Vivaldi, patched with the dist folder of the working tree, so the
harness never touches the Vivaldi the user browses with.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

INSTALLER_DIR = Path(__file__).resolve().parents[2] / "installer"
if str(INSTALLER_DIR) not in sys.path:
    sys.path.insert(0, str(INSTALLER_DIR))

from vivarcdi import __version__
from vivarcdi.errors import VivArcDiError
from vivarcdi.installation import VivaldiInstallation
from vivarcdi.payload import PayloadDeployer
from vivarcdi.platforms import Platform, PlatformFactory
from vivarcdi.window_patch import WindowHtmlPatcher

DEFAULT_LAB_ROOT = Path.home() / ".cache" / "vivarcdi" / "lab"
REPO_DIST = Path(__file__).resolve().parents[2] / "dist"


class LabError(VivArcDiError):
    """The lab Vivaldi cannot be prepared."""


@dataclass(frozen=True)
class Layout:
    """Where a Vivaldi build sits below a platform root, and its executable inside it."""

    folder: str
    executable: str


LAYOUTS = {
    "macOS": {
        "stable": Layout("Applications/Vivaldi.app", "Contents/MacOS/Vivaldi"),
        "snapshot": Layout("Applications/Vivaldi Snapshot.app", "Contents/MacOS/Vivaldi Snapshot"),
    },
    "Debian": {
        "stable": Layout("opt/vivaldi", "vivaldi"),
        "snapshot": Layout("opt/vivaldi-snapshot", "vivaldi-snapshot"),
    },
}


def copy_tree(source: Path, target: Path) -> None:
    """Copy a Vivaldi build, as an APFS clone on macOS and keeping modes and links elsewhere."""
    target.parent.mkdir(parents=True, exist_ok=True)
    clone = ["cp", "-cR"] if sys.platform == "darwin" else ["cp", "-a"]
    subprocess.run([*clone, str(source), str(target)], check=True)


class LabBuilder:
    """Copies one Vivaldi build into the lab folder and patches the copy only."""

    def __init__(
        self,
        source: Platform,
        platform_at: Callable[[Path], Platform],
        lab_root: Path,
        copier: Callable[[Path, Path], None] = copy_tree,
    ):
        self._source = source
        self._platform_at = platform_at
        self._lab_root = lab_root
        self._copier = copier

    def prepare(self, channel: str, source_root: Path, dist: Path) -> dict:
        """Make sure the lab copy exists, deploy dist into it and patch its window.html.

        Returns the executable, the Vivaldi version and the resources folder of the copy.
        Raises LabError when no build of the channel is installed or the target is not in the lab.
        """
        installation = self._installed(channel)
        layout = LAYOUTS[self._source.name][channel]
        lab_dir = self._lab_root / f"{channel}-{installation.version}"
        copy = lab_dir / layout.folder
        if not copy.exists():
            self._copier(source_root / layout.folder, copy)
        target = self._lab_installation(lab_dir, channel)
        self._patch(target, dist)
        return {
            "executable": str(copy / layout.executable),
            "vivaldiVersion": target.version,
            "resourcesDir": str(target.resources_dir),
            "labDir": str(lab_dir),
        }

    def _installed(self, channel: str) -> VivaldiInstallation:
        found = [item for item in self._source.find_installations() if item.channel == channel]
        if not found:
            raise LabError(f"No Vivaldi {channel} installation was found")
        return found[-1]

    def _lab_installation(self, lab_dir: Path, channel: str) -> VivaldiInstallation:
        found = [item for item in self._platform_at(lab_dir).find_installations() if item.channel == channel]
        if not found:
            raise LabError(f"The lab copy in {lab_dir} holds no Vivaldi {channel}")
        installation = found[-1]
        if not installation.resources_dir.resolve().is_relative_to(self._lab_root.resolve()):
            raise LabError(f"{installation.resources_dir} is outside the lab, refusing to patch it")
        return installation

    def _patch(self, installation: VivaldiInstallation, dist: Path) -> None:
        PayloadDeployer(dist, __version__).deploy(installation)
        html = installation.window_html.read_text()
        installation.window_html.write_text(WindowHtmlPatcher().apply(html))


def platform_at(kind: type) -> Callable[[Path], Platform]:
    """Factory of platforms of the same kind rooted at another folder."""
    return lambda root: kind(root=root)


def main(argv: list[str]) -> int:
    """Command line: `prepare [--channel stable|snapshot] [--vivaldi <root>] [--lab <dir>] [--dist <dir>]`."""
    parser = argparse.ArgumentParser(prog="lab.py")
    parser.add_argument("command", choices=["prepare"])
    parser.add_argument("--channel", choices=["stable", "snapshot"], default="stable")
    parser.add_argument("--vivaldi", type=Path, default=Path("/"), help="root folder laid out like / with a Vivaldi build")
    parser.add_argument("--lab", type=Path, default=DEFAULT_LAB_ROOT)
    parser.add_argument("--dist", type=Path, default=REPO_DIST)
    args = parser.parse_args(argv)
    try:
        kind = type(PlatformFactory().create())
        builder = LabBuilder(kind(root=args.vivaldi), platform_at(kind), args.lab)
        print(json.dumps(builder.prepare(args.channel, args.vivaldi, args.dist)))
    except VivArcDiError as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
