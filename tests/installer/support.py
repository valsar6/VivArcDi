import sys
from pathlib import Path

INSTALLER_DIR = Path(__file__).resolve().parents[2] / "installer"
if str(INSTALLER_DIR) not in sys.path:
    sys.path.insert(0, str(INSTALLER_DIR))

from vivarcdi.system import CommandResult

WINDOW_HTML = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <script src="bundle.js"></script>
</body>
</html>
"""


class FakeRunner:
    def __init__(self, responses=None):
        self.responses = responses or {}
        self.calls = []

    def run(self, args):
        self.calls.append(args)
        return self.responses.get(args[0], CommandResult(0, "", ""))


def make_payload_source(root: Path) -> Path:
    source = root / "repo" / "src"
    (source / "core").mkdir(parents=True)
    (source / "loader.js").write_text("import './core/VivArcDi.js';\n")
    (source / "core" / "VivArcDi.js").write_text("export class VivArcDi {}\n")
    (root / "repo" / "installer").mkdir()
    (root / "repo" / "installer" / "__main__.py").write_text("")
    return source


def make_debian_vivaldi(root: Path, folder: str = "opt/vivaldi") -> Path:
    resources = root / folder / "resources" / "vivaldi"
    resources.mkdir(parents=True)
    (resources / "window.html").write_text(WINDOW_HTML)
    return resources


def make_macos_vivaldi(root: Path, version: str = "8.1.3740.12") -> Path:
    versions = root / "Applications/Vivaldi.app/Contents/Frameworks/Vivaldi Framework.framework/Versions"
    resources = versions / version / "Resources" / "vivaldi"
    resources.mkdir(parents=True)
    (resources / "window.html").write_text(WINDOW_HTML)
    (versions / "Current").symlink_to(version)
    return resources
