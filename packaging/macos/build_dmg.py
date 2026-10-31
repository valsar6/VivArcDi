from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Callable

REPO_ROOT = Path(__file__).resolve().parents[2]
SPEC_FILE = Path(__file__).resolve().parent / "VivArcDi.spec"
APP_NAME = "VivArcDi.app"
VOLUME_NAME = "VivArcDi"
README_NAME = "Read me first.txt"
MAX_DMG_BYTES = 40 * 1024 * 1024
README_TEXT = """VivArcDi

1. Drag VivArcDi onto the Applications folder, then open it from Applications.

2. The first time, macOS says it cannot check VivArcDi for malware, because the app is free
   and not notarized by Apple. To open it anyway:
   - Open System Settings > Privacy & Security.
   - Scroll down to the message about VivArcDi and click Open Anyway.
   - Confirm with your password or Touch ID, then open VivArcDi again.

3. To change Vivaldi, VivArcDi needs the App Management permission. If VivArcDi says macOS did
   not let it change Vivaldi:
   - Open System Settings > Privacy & Security > App Management.
   - Turn VivArcDi on.
   - Go back to VivArcDi and press Try again.
   macOS may ask for this again after you update VivArcDi.

4. Press Install, then restart Vivaldi.
"""

Runner = Callable[..., subprocess.CompletedProcess]


class DmgBuildError(Exception):
    """The disk image cannot be built, with a message that says what to do."""


def read_version(repo_root: Path) -> str:
    """The version in `package.json`, which is the single source of the app and file versions."""
    return json.loads((repo_root / "package.json").read_text())["version"]


class AppBuilder:
    """Freezes the installer, the payload and Python into `VivArcDi.app` with PyInstaller."""

    def __init__(self, work_dir: Path, repo_root: Path = REPO_ROOT, spec: Path = SPEC_FILE, run: Runner = subprocess.run):
        self._work_dir = work_dir
        self._repo_root = repo_root
        self._spec = spec
        self._run = run

    @property
    def app_path(self) -> Path:
        """Where PyInstaller leaves the app. Not `dist/`, which holds the payload."""
        return self._work_dir / "dist" / APP_NAME

    def command(self) -> list[str]:
        """The PyInstaller command line."""
        return [
            sys.executable,
            "-m",
            "PyInstaller",
            "--noconfirm",
            "--clean",
            "--distpath",
            str(self._work_dir / "dist"),
            "--workpath",
            str(self._work_dir / "work"),
            str(self._spec),
        ]

    def build(self) -> Path:
        """Run PyInstaller and return the app. Raises DmgBuildError when the build fails."""
        if not (self._repo_root / "dist" / "loader.js").is_file():
            raise DmgBuildError(f"{self._repo_root / 'dist'} has no build. Run: npm ci && npm run build")
        try:
            self._run(self.command(), check=True, cwd=self._repo_root)
        except (subprocess.CalledProcessError, FileNotFoundError) as error:
            raise DmgBuildError(f"PyInstaller failed: {error}") from error
        if not self.app_path.is_dir():
            raise DmgBuildError(f"PyInstaller did not create {self.app_path}")
        return self.app_path


class DmgStaging:
    """Lays out the folder that becomes the disk image: the app, a link to /Applications and a text file."""

    def stage(self, app: Path, folder: Path) -> Path:
        """Fill `folder` (a new or empty folder) and return it."""
        folder.mkdir(parents=True, exist_ok=True)
        shutil.copytree(app, folder / APP_NAME, symlinks=True)
        (folder / "Applications").symlink_to("/Applications")
        (folder / README_NAME).write_text(README_TEXT)
        return folder


class DmgPackager:
    """Builds the app, stages it and turns it into `VivArcDi-<version>.dmg` with hdiutil."""

    def __init__(
        self,
        app_builder: AppBuilder,
        staging: DmgStaging,
        version: str,
        run: Runner = subprocess.run,
        max_bytes: int = MAX_DMG_BYTES,
    ):
        self._app_builder = app_builder
        self._staging = staging
        self._version = version
        self._run = run
        self._max_bytes = max_bytes

    def hdiutil_command(self, folder: Path, target: Path) -> list[str]:
        """The hdiutil command line that compresses `folder` into `target`."""
        return [
            "hdiutil",
            "create",
            "-volname",
            VOLUME_NAME,
            "-srcfolder",
            str(folder),
            "-ov",
            "-format",
            "UDZO",
            str(target),
        ]

    def package(self, out_dir: Path) -> Path:
        """Write the .dmg in `out_dir` and return its path.

        Raises DmgBuildError when a tool fails or the image is over the size limit.
        """
        out_dir.mkdir(parents=True, exist_ok=True)
        target = out_dir / f"VivArcDi-{self._version}.dmg"
        app = self._app_builder.build()
        with tempfile.TemporaryDirectory() as workspace:
            folder = self._staging.stage(app, Path(workspace) / VOLUME_NAME)
            self._create_image(folder, target)
        self._check_size(target)
        return target

    def _create_image(self, folder: Path, target: Path) -> None:
        try:
            self._run(self.hdiutil_command(folder, target), check=True)
        except (subprocess.CalledProcessError, FileNotFoundError) as error:
            raise DmgBuildError(f"hdiutil failed: {error}") from error

    def _check_size(self, target: Path) -> None:
        size = target.stat().st_size
        print(f"{target.name}: {size / (1024 * 1024):.1f} MB")
        if size > self._max_bytes:
            raise DmgBuildError(f"{target.name} is {size} bytes, over the limit of {self._max_bytes}")


def main(argv: list[str]) -> int:
    """Command line: `build_dmg.py --out <folder>` builds the app and the .dmg and prints the path and size."""
    parser = argparse.ArgumentParser(description="Build the VivArcDi disk image for macOS.")
    parser.add_argument("--out", type=Path, default=REPO_ROOT / "build", help="folder for the .dmg")
    arguments = parser.parse_args(argv)
    version = read_version(REPO_ROOT)
    packager = DmgPackager(AppBuilder(arguments.out / "pyinstaller"), DmgStaging(), version)
    try:
        print(packager.package(arguments.out))
    except DmgBuildError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
