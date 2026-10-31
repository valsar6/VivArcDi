from __future__ import annotations

import argparse
import gzip
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Callable

REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
ICON_PATH = REPO_ROOT / "packaging" / "assets" / "icon.png"
APP_ID = "io.github.valsar6.vivarcdi"
EXECUTABLES = ("DEBIAN/postinst", "DEBIAN/prerm", "DEBIAN/postrm", "usr/bin/vivarcdi")
DEBIAN_FILES = ("control", "triggers", "postinst", "prerm", "postrm")
IGNORED = shutil.ignore_patterns("__pycache__", "*.pyc")
EXECUTABLE_MODE = 0o755
FILE_MODE = 0o644


class DebBuildError(Exception):
    """The package cannot be built, with a message that says what to do."""


def read_version(repo_root: Path) -> str:
    """The version in `package.json`, which is the single source of the package version."""
    return json.loads((repo_root / "package.json").read_text())["version"]


class TemplateStore:
    """Reads the files under `templates/` and fills in the few placeholders they use."""

    def __init__(self, folder: Path, values: dict[str, str]):
        self._folder = folder
        self._values = values

    def render(self, name: str) -> str:
        """The template `name` with every `@KEY@` replaced."""
        text = (self._folder / name).read_text()
        for key, value in self._values.items():
            text = text.replace(f"@{key}@", value)
        return text


class DebTreeBuilder:
    """Assembles the file tree of the package, ready for `dpkg-deb`, without building the package.

    The tree holds the installer and the built payload under `usr/share/vivarcdi`, the launcher, the
    desktop entry, the icon, the documentation and the `DEBIAN` control files.
    """

    def __init__(
        self,
        version: str,
        installer_dir: Path = REPO_ROOT / "installer",
        dist_dir: Path = REPO_ROOT / "dist",
        license_file: Path = REPO_ROOT / "LICENSE",
        icon: Path = ICON_PATH,
        templates_dir: Path = TEMPLATES_DIR,
    ):
        self._installer_dir = installer_dir
        self._dist_dir = dist_dir
        self._icon = icon
        self._templates = TemplateStore(
            templates_dir, {"VERSION": version, "LICENSE_TEXT": self._indented(license_file.read_text())}
        )

    def build(self, tree: Path) -> Path:
        """Fill `tree` (a new or empty folder) and return it. Raises DebBuildError if dist/ is missing."""
        if not (self._dist_dir / "loader.js").is_file():
            raise DebBuildError(f"{self._dist_dir} has no build. Run: npm ci && npm run build")
        self._copy_program(tree / "usr" / "share" / "vivarcdi")
        self._write("usr/bin/vivarcdi", tree, "vivarcdi")
        self._write(f"usr/share/applications/{APP_ID}.desktop", tree, f"{APP_ID}.desktop")
        self._copy_icon(tree / "usr" / "share" / "icons" / "hicolor" / "256x256" / "apps" / f"{APP_ID}.png")
        self._write_documentation(tree / "usr" / "share" / "doc" / "vivarcdi")
        for name in DEBIAN_FILES:
            self._write(f"DEBIAN/{name}", tree, name)
        self._set_modes(tree)
        return tree

    @staticmethod
    def _indented(text: str) -> str:
        lines = [f" {line}" if line.strip() else " ." for line in text.strip().splitlines()]
        return "\n".join(lines)

    def _write(self, target: str, tree: Path, template: str) -> None:
        path = tree / target
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(self._templates.render(template))

    def _copy_program(self, share: Path) -> None:
        shutil.copytree(self._installer_dir, share / "installer", ignore=IGNORED)
        shutil.copytree(self._dist_dir, share / "dist", ignore=IGNORED)

    def _copy_icon(self, target: Path) -> None:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(self._icon, target)

    def _write_documentation(self, folder: Path) -> None:
        folder.mkdir(parents=True)
        (folder / "copyright").write_text(self._templates.render("copyright"))
        changelog = self._templates.render("changelog").encode("utf-8")
        with (folder / "changelog.gz").open("wb") as raw, gzip.GzipFile("", "wb", 9, raw, mtime=0) as packed:
            packed.write(changelog)

    @staticmethod
    def _set_modes(tree: Path) -> None:
        executables = {tree / name for name in EXECUTABLES}
        for path in [tree, *tree.rglob("*")]:
            if path.is_dir():
                path.chmod(EXECUTABLE_MODE)
            else:
                path.chmod(EXECUTABLE_MODE if path in executables else FILE_MODE)


class DebPackager:
    """Builds the tree in a temporary folder and turns it into `vivarcdi_<version>_all.deb` with dpkg-deb."""

    def __init__(
        self,
        tree_builder: DebTreeBuilder,
        version: str,
        run: Callable[..., subprocess.CompletedProcess] = subprocess.run,
    ):
        self._tree_builder = tree_builder
        self._version = version
        self._run = run

    def package(self, out_dir: Path) -> Path:
        """Write the .deb in `out_dir` and return its path. Raises DebBuildError when dpkg-deb fails."""
        out_dir.mkdir(parents=True, exist_ok=True)
        target = out_dir / f"vivarcdi_{self._version}_all.deb"
        with tempfile.TemporaryDirectory() as workspace:
            tree = self._tree_builder.build(Path(workspace) / "tree")
            self._dpkg_deb(tree, target)
        return target

    def _dpkg_deb(self, tree: Path, target: Path) -> None:
        try:
            result = self._run(
                ["dpkg-deb", "--build", "--root-owner-group", str(tree), str(target)],
                capture_output=True,
                text=True,
            )
        except FileNotFoundError as error:
            raise DebBuildError("dpkg-deb is not installed. Install the dpkg package") from error
        if result.returncode != 0:
            raise DebBuildError(f"dpkg-deb failed: {result.stderr.strip()}")


def main(argv: list[str]) -> int:
    """Command line: `build_deb.py --out <folder>` builds the package and prints its path."""
    parser = argparse.ArgumentParser(description="Build the VivArcDi Debian package.")
    parser.add_argument("--out", type=Path, default=REPO_ROOT / "build", help="folder for the .deb")
    arguments = parser.parse_args(argv)
    version = read_version(REPO_ROOT)
    try:
        print(DebPackager(DebTreeBuilder(version), version).package(arguments.out))
    except DebBuildError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
