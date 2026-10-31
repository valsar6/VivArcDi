import json
from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules

ROOT = Path(SPECPATH).resolve().parents[1]
INSTALLER = ROOT / "installer"
VERSION = json.loads((ROOT / "package.json").read_text())["version"]
BUNDLE_ID = "io.github.valsar6.vivarcdi"
EXCLUDED_MODULES = [
    "unittest",
    "pydoc",
    "doctest",
    "lib2to3",
    "xmlrpc",
    "sqlite3",
    "curses",
    "turtle",
    "idlelib",
    "test",
    "distutils",
    "setuptools",
    "pip",
]


def installer_files():
    sources = [path for path in INSTALLER.rglob("*") if path.is_file() and "__pycache__" not in path.parts]
    return [(str(path), str(path.parent.relative_to(ROOT))) for path in sorted(sources)]


DATAS = [
    (str(ROOT / "dist"), "dist"),
    (str(INSTALLER / "vivarcdi" / "shortcuts.json"), "vivarcdi"),
    *installer_files(),
]

analysis = Analysis(
    [str(ROOT / "packaging" / "macos" / "app_main.py")],
    pathex=[str(INSTALLER)],
    datas=DATAS,
    hiddenimports=collect_submodules("vivarcdi"),
    excludes=EXCLUDED_MODULES,
)
archive = PYZ(analysis.pure)
executable = EXE(
    archive,
    analysis.scripts,
    [],
    exclude_binaries=True,
    name="VivArcDi",
    console=False,
    argv_emulation=False,
    target_arch="universal2",
)
collected = COLLECT(executable, analysis.binaries, analysis.datas, name="VivArcDi")
app = BUNDLE(
    collected,
    name="VivArcDi.app",
    icon=str(ROOT / "packaging" / "assets" / "icon.icns"),
    bundle_identifier=BUNDLE_ID,
    version=VERSION,
    info_plist={
        "CFBundleName": "VivArcDi",
        "CFBundleDisplayName": "VivArcDi",
        "CFBundleShortVersionString": VERSION,
        "CFBundleVersion": VERSION,
        "LSMinimumSystemVersion": "12.0",
        "NSHumanReadableCopyright": "Copyright (c) 2026 VivArcDi contributors. MIT License.",
        "NSHighResolutionCapable": True,
    },
)
