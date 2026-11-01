import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "packaging" / "debian"))

from build_deb import DebBuildError, DebPackager, DebTreeBuilder, read_version

VERSION = "9.8.7"
KEYRING_BYTES = b"\x99public keyring"
RECORDER = '#!/bin/sh\necho "$(basename "$0") $*" >> "$RECORD_FILE"\n'


def make_fake_dist(root: Path) -> Path:
    dist = root / "dist"
    (dist / "core").mkdir(parents=True)
    (dist / "loader.js").write_text("import './core/VivArcDi.js';\n")
    (dist / "core" / "VivArcDi.js").write_text("export class VivArcDi {}\n")
    return dist


def make_fake_installer(root: Path) -> Path:
    installer = root / "installer"
    (installer / "vivarcdi" / "__pycache__").mkdir(parents=True)
    (installer / "__main__.py").write_text("")
    (installer / "vivarcdi" / "cli.py").write_text("")
    (installer / "vivarcdi" / "__pycache__" / "cli.cpython-313.pyc").write_bytes(b"x")
    return installer


class DebCase(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        self.keyring = self.root / "keyring.gpg"
        self.keyring.write_bytes(KEYRING_BYTES)
        self.builder = DebTreeBuilder(
            VERSION, make_fake_installer(self.root), make_fake_dist(self.root), REPO_ROOT / "LICENSE", keyring=self.keyring
        )
        self.tree = self.builder.build(self.root / "tree")

    def read(self, relative: str) -> str:
        return (self.tree / relative).read_text()

    def fake_commands(self, *names: str) -> dict:
        bin_dir = self.root / "bin"
        bin_dir.mkdir(exist_ok=True)
        for name in names:
            script = bin_dir / name
            script.write_text(RECORDER)
            script.chmod(0o755)
        record = self.root / "calls.txt"
        record.write_text("")
        return {"PATH": f"{bin_dir}:/usr/bin:/bin", "RECORD_FILE": str(record)}

    def run_script(self, script: str, environment: dict, *arguments: str) -> list:
        subprocess.run(["sh", str(self.tree / "DEBIAN" / script), *arguments], env=environment, check=True)
        return Path(environment["RECORD_FILE"]).read_text().splitlines()


class DebTreeTest(DebCase):
    def test_deb_declares_vivaldi_triggers_and_python_dependency(self):
        control = dict(line.split(": ", 1) for line in self.read("DEBIAN/control").splitlines() if ": " in line)
        with self.subTest("control"):
            self.assertEqual(control["Package"], "vivarcdi")
            self.assertEqual(control["Version"], VERSION)
            self.assertEqual(control["Architecture"], "all")
            self.assertEqual(control["Depends"], "python3 (>= 3.9), python3-tk")
            self.assertEqual(control["Section"], "web")
            self.assertEqual(control["Priority"], "optional")
            self.assertEqual(control["Homepage"], "https://github.com/valsar6/VivArcDi")
            self.assertEqual(control["Maintainer"], "Salvatore <25297596+valsar6@users.noreply.github.com>")
        with self.subTest("triggers"):
            self.assertEqual(
                self.read("DEBIAN/triggers").splitlines(),
                ["interest-noawait /opt/vivaldi", "interest-noawait /opt/vivaldi-snapshot"],
            )

    def test_tree_holds_the_program_launcher_desktop_entry_and_icon(self):
        share = self.tree / "usr/share/vivarcdi"
        self.assertTrue((share / "installer/__main__.py").is_file())
        self.assertTrue((share / "dist/core/VivArcDi.js").is_file())
        self.assertEqual(self.read("usr/bin/vivarcdi").splitlines()[1], 'exec python3 /usr/share/vivarcdi/installer "$@"')
        desktop = self.read("usr/share/applications/io.github.valsar6.vivarcdi.desktop")
        self.assertIn("Name=VivArcDi", desktop)
        self.assertIn("Exec=vivarcdi window", desktop)
        self.assertIn("Icon=io.github.valsar6.vivarcdi", desktop)
        self.assertIn("Categories=Utility;", desktop)
        icon = self.tree / "usr/share/icons/hicolor/256x256/apps/io.github.valsar6.vivarcdi.png"
        self.assertEqual(icon.read_bytes()[:8], b"\x89PNG\r\n\x1a\n")

    def test_tree_skips_bytecode_caches(self):
        cached = [path for path in self.tree.rglob("*") if "__pycache__" in path.parts or path.suffix == ".pyc"]
        self.assertEqual(cached, [])

    def test_scripts_are_executable_and_files_are_not(self):
        for path in self.tree.rglob("*"):
            relative = path.relative_to(self.tree).as_posix()
            mode = stat.S_IMODE(path.stat().st_mode)
            expected = 0o755 if path.is_dir() or relative in ("DEBIAN/postinst", "DEBIAN/prerm", "DEBIAN/postrm", "usr/bin/vivarcdi") else 0o644
            with self.subTest(relative):
                self.assertEqual(mode, expected)

    def test_shell_scripts_have_no_comments(self):
        for name in ("DEBIAN/postinst", "DEBIAN/prerm", "DEBIAN/postrm", "usr/bin/vivarcdi"):
            lines = self.read(name).splitlines()
            with self.subTest(name):
                self.assertEqual(lines[0], "#!/bin/sh")
                self.assertEqual([line for line in lines[1:] if line.lstrip().startswith("#")], [])

    def test_missing_payload_is_reported(self):
        shutil.rmtree(self.root / "dist")
        with self.assertRaisesRegex(DebBuildError, "npm run build"):
            self.builder.build(self.root / "again")

    def test_deb_enrolls_the_vivarcdi_repository(self):
        sources = self.read("etc/apt/sources.list.d/vivarcdi.sources")
        with self.subTest("the sources file names the repository and its key"):
            self.assertEqual(
                sources.splitlines(),
                [
                    "Types: deb",
                    "URIs: https://valsar6.github.io/vivarcdi/apt",
                    "Suites: stable",
                    "Components: main",
                    "Signed-By: /usr/share/keyrings/vivarcdi-archive-keyring.gpg",
                ],
            )
        with self.subTest("the keyring is shipped and installed where Signed-By points"):
            self.assertEqual((self.tree / "usr/share/vivarcdi/vivarcdi-archive-keyring.gpg").read_bytes(), KEYRING_BYTES)
            calls = self.run_script("postinst", self.fake_commands("vivarcdi", "install"), "configure")
            self.assertEqual(
                calls[0],
                "install -D -m 0644 /usr/share/vivarcdi/vivarcdi-archive-keyring.gpg"
                " /usr/share/keyrings/vivarcdi-archive-keyring.gpg",
            )
        with self.subTest("the sources file is a conffile, so edits and deletion are kept"):
            self.assertEqual(self.read("DEBIAN/conffiles").splitlines(), ["/etc/apt/sources.list.d/vivarcdi.sources"])

    def test_deb_purge_removes_the_repository(self):
        environment = self.fake_commands("vivarcdi", "rm")
        with self.subTest("remove keeps the sources file and the keyring"):
            self.assertEqual(self.run_script("postrm", environment, "remove"), [])
        with self.subTest("purge deletes both"):
            calls = self.run_script("postrm", environment, "purge")
            self.assertIn(
                "rm -f /etc/apt/sources.list.d/vivarcdi.sources /usr/share/keyrings/vivarcdi-archive-keyring.gpg", calls
            )

    def test_missing_keyring_is_reported(self):
        self.keyring.unlink()
        with self.assertRaisesRegex(DebBuildError, "make-apt-key.sh"):
            self.builder.build(self.root / "again")

    def test_package_version_comes_from_package_json(self):
        self.assertRegex(read_version(REPO_ROOT), r"^\d+\.\d+\.\d+$")


class DebScriptsTest(DebCase):
    def test_deb_postinst_installs_and_reapplies_on_trigger(self):
        environment = self.fake_commands("vivarcdi", "install")
        with self.subTest("configure installs"):
            self.assertEqual(self.run_script("postinst", environment, "configure", "0.1")[-1], "vivarcdi install --mode deb --quiet")
        with self.subTest("trigger reapplies"):
            calls = self.run_script("postinst", environment, "triggered", "/opt/vivaldi")
            self.assertEqual(calls[-1], "vivarcdi reapply --mode deb --quiet")
        with self.subTest("a failing installer never blocks dpkg"):
            Path(environment["PATH"].split(":")[0], "vivarcdi").write_text("#!/bin/sh\nexit 3\n")
            self.run_script("postinst", environment, "configure")
        with self.subTest("other actions do nothing"):
            self.assertEqual(len(self.run_script("postinst", environment, "abort-upgrade")), 4)

    def test_deb_prerm_uninstalls_and_keeps_backups(self):
        environment = self.fake_commands("vivarcdi", "rm")
        with self.subTest("remove uninstalls"):
            self.assertEqual(self.run_script("prerm", environment, "remove"), ["vivarcdi uninstall --mode deb --quiet"])
        with self.subTest("upgrade leaves Vivaldi patched"):
            self.assertEqual(len(self.run_script("prerm", environment, "upgrade", "0.2")), 1)
        with self.subTest("removing the package keeps the backups"):
            self.assertEqual(len(self.run_script("postrm", environment, "remove")), 1)
        with self.subTest("purge deletes them"):
            self.assertEqual(self.run_script("postrm", environment, "purge")[-1], "rm -rf /var/lib/vivarcdi")


class DebPackageTest(DebCase):
    @unittest.skipUnless(shutil.which("dpkg-deb"), "dpkg-deb is not installed")
    def test_dpkg_deb_builds_a_package_that_reports_its_fields(self):
        package = DebPackager(self.builder, VERSION).package(self.root / "out")
        self.assertEqual(package.name, f"vivarcdi_{VERSION}_all.deb")
        info = subprocess.run(["dpkg-deb", "--info", str(package)], capture_output=True, text=True, check=True).stdout
        self.assertIn("Package: vivarcdi", info)
        self.assertIn(f"Version: {VERSION}", info)
        contents = subprocess.run(["dpkg-deb", "--contents", str(package)], capture_output=True, text=True, check=True).stdout
        self.assertIn("./usr/bin/vivarcdi", contents)
        self.assertIn("./etc/apt/sources.list.d/vivarcdi.sources", contents)
        self.assertIn("root/root", contents)

    def test_packager_reports_a_failing_dpkg_deb(self):
        failed = subprocess.CompletedProcess([], 2, "", "boom")
        packager = DebPackager(self.builder, VERSION, run=lambda *args, **kwargs: failed)
        with self.assertRaisesRegex(DebBuildError, "boom"):
            packager.package(self.root / "out")


if __name__ == "__main__":
    unittest.main()
