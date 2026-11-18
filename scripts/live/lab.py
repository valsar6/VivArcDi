"""Prepares the lab Vivaldi of the live verification harness (spec 046).

The lab is a copy of an installed Vivaldi, kept exactly as Vivaldi shipped it: the harness injects the
payload at run time, so neither the copy nor the Vivaldi the user browses with is ever patched.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Callable

INSTALLER_DIR = Path(__file__).resolve().parents[2] / "installer"
if str(INSTALLER_DIR) not in sys.path:
    sys.path.insert(0, str(INSTALLER_DIR))

from vivarcdi.errors import VivArcDiError
from vivarcdi.installation import VivaldiInstallation
from vivarcdi.platforms import Platform, PlatformFactory
from vivarcdi.window_patch import WindowHtmlPatcher

DEFAULT_LAB_ROOT = Path.home() / ".cache" / "vivarcdi" / "lab"


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


def verify_signature(copy: Path) -> None:
    """Refuse a macOS app bundle whose code signature no longer matches what Vivaldi shipped.

    Raises LabError with the reason given by codesign.
    """
    if copy.suffix != ".app":
        return
    result = subprocess.run(["codesign", "--verify", "--deep", "--strict", str(copy)], capture_output=True, text=True)
    if result.returncode != 0:
        reason = result.stderr.strip().splitlines()[0] if result.stderr.strip() else "unknown reason"
        raise LabError(f"The lab copy {copy} fails its code signature ({reason}); delete it and run again")


class LabBuilder:
    """Copies one Vivaldi build into the lab folder and keeps the copy as Vivaldi shipped it."""

    def __init__(
        self,
        source: Platform,
        platform_at: Callable[[Path], Platform],
        lab_root: Path,
        copier: Callable[[Path, Path], None] = copy_tree,
        verifier: Callable[[Path], None] = verify_signature,
    ):
        self._source = source
        self._platform_at = platform_at
        self._lab_root = lab_root
        self._copier = copier
        self._verifier = verifier

    def prepare(self, channel: str, source_root: Path, version: str | None = None) -> dict:
        """Make sure the lab copy exists and carries no VivArcDi patch inherited from the installed build.

        `version` replaces the version the platform reads, for an unpacked package that dpkg does not know.
        Returns the executable, the Vivaldi version and the resources folder of the copy.
        Raises LabError when no build of the channel is installed, the target is not in the lab,
        or the copy fails its code signature.
        """
        installation = self._installed(channel, version)
        layout = LAYOUTS[self._source.name][channel]
        lab_dir = self._lab_root / f"{channel}-{installation.version}"
        copy = lab_dir / layout.folder
        if not copy.exists():
            self._copier(source_root / layout.folder, copy)
        target = self._lab_installation(lab_dir, channel, version)
        self._unpatch(target)
        self._verifier(copy)
        return {
            "executable": str(copy / layout.executable),
            "vivaldiVersion": target.version,
            "resourcesDir": str(target.resources_dir),
            "labDir": str(lab_dir),
        }

    def _installed(self, channel: str, version: str | None) -> VivaldiInstallation:
        found = [item for item in self._source.find_installations() if item.channel == channel]
        if not found:
            raise LabError(f"No Vivaldi {channel} installation was found")
        return with_version(found[-1], version)

    def _lab_installation(self, lab_dir: Path, channel: str, version: str | None) -> VivaldiInstallation:
        found = [item for item in self._platform_at(lab_dir).find_installations() if item.channel == channel]
        if not found:
            raise LabError(f"The lab copy in {lab_dir} holds no Vivaldi {channel}")
        installation = with_version(found[-1], version)
        if not installation.resources_dir.resolve().is_relative_to(self._lab_root.resolve()):
            raise LabError(f"{installation.resources_dir} is outside the lab, refusing to change it")
        return installation

    def _unpatch(self, installation: VivaldiInstallation) -> None:
        patcher = WindowHtmlPatcher()
        html = installation.window_html.read_text()
        if patcher.is_patched(html):
            installation.window_html.write_text(patcher.revert(html))
        if installation.payload_dir.exists():
            shutil.rmtree(installation.payload_dir)


def with_version(installation: VivaldiInstallation, version: str | None) -> VivaldiInstallation:
    """The installation with a known version instead of the one the platform read, when given."""
    return installation if version is None else replace(installation, version=version)


def platform_at(kind: type) -> Callable[[Path], Platform]:
    """Factory of platforms of the same kind rooted at another folder."""
    return lambda root: kind(root=root)


def main(argv: list[str]) -> int:
    """Command line: `prepare [--channel stable|snapshot] [--vivaldi <root>] [--version <v>] [--lab <dir>]`."""
    parser = argparse.ArgumentParser(prog="lab.py")
    parser.add_argument("command", choices=["prepare"])
    parser.add_argument("--channel", choices=["stable", "snapshot"], default="stable")
    parser.add_argument("--vivaldi", type=Path, default=Path("/"), help="root folder laid out like / with a Vivaldi build")
    parser.add_argument("--version", help="Vivaldi version of an unpacked build that dpkg does not know")
    parser.add_argument("--lab", type=Path, default=DEFAULT_LAB_ROOT)
    args = parser.parse_args(argv)
    try:
        kind = type(PlatformFactory().create())
        builder = LabBuilder(kind(root=args.vivaldi), platform_at(kind), args.lab)
        print(json.dumps(builder.prepare(args.channel, args.vivaldi, args.version)))
    except VivArcDiError as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
