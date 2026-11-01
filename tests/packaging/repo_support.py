import shutil
import subprocess
import tempfile
from pathlib import Path

NO_PASSPHRASE = ["--batch", "--no-tty", "--pinentry-mode", "loopback", "--passphrase", ""]
HAVE_TOOLS = bool(shutil.which("gpg") and shutil.which("dpkg-deb"))
MISSING_TOOLS = "gpg and dpkg-deb are needed to build a test repository"


class TestKey:
    """A throwaway Ed25519 key created in a temporary GnuPG home, only for tests."""

    def __init__(self, root: Path):
        home = Path(tempfile.mkdtemp(dir=root, prefix="gnupg-"))
        home.chmod(0o700)
        self._home = home
        self._gpg("--quick-generate-key", "VivArcDi Test <test@example.invalid>", "ed25519", "sign", "never")
        self._fingerprint = self._gpg("--with-colons", "--list-keys").split("fpr:::::::::")[1].split(":")[0]

    @property
    def private_key(self) -> str:
        return self._gpg("--armor", "--export-secret-keys", self._fingerprint)

    def public_keyring(self, target: Path) -> Path:
        target.write_bytes(self._gpg("--export", self._fingerprint, text=False))
        return target

    def verify_clearsigned(self, signed: Path) -> bool:
        return self._run("--verify", str(signed)).returncode == 0

    def verify_detached(self, signature: Path, signed: Path) -> bool:
        return self._run("--verify", str(signature), str(signed)).returncode == 0

    def close(self) -> None:
        subprocess.run(["gpgconf", "--homedir", str(self._home), "--kill", "all"], capture_output=True)

    def _run(self, *arguments: str, text: bool = True) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["gpg", "--homedir", str(self._home), *NO_PASSPHRASE, *arguments], capture_output=True, text=text, check=False
        )

    def _gpg(self, *arguments: str, text: bool = True):
        result = self._run(*arguments, text=text)
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        return result.stdout


def build_test_deb(root: Path, version: str) -> Path:
    tree = root / f"tree-{version}"
    (tree / "DEBIAN").mkdir(parents=True)
    (tree / "DEBIAN" / "control").write_text(
        f"Package: vivarcdi\nVersion: {version}\nArchitecture: all\nMaintainer: Test <test@example.invalid>\n"
        "Section: web\nPriority: optional\nDescription: Test package\n"
    )
    target = root / f"vivarcdi_{version}_all.deb"
    subprocess.run(["dpkg-deb", "--build", "--root-owner-group", str(tree), str(target)], capture_output=True, check=True)
    return target
