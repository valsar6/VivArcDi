import hashlib
import shutil
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from repo_support import HAVE_TOOLS, MISSING_TOOLS, TestKey, build_test_deb

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "packaging" / "apt"))

from apt_repo import AptRepository, AptRepositoryError, PackageIndex, ReleaseSigner, RetentionPolicy, parse_date

DATE = datetime(2026, 11, 1, 10, 0, tzinfo=timezone.utc)


@unittest.skipUnless(HAVE_TOOLS, MISSING_TOOLS)
class AptCase(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, True)
        self.key = TestKey(self.root)
        self.addCleanup(self.key.close)
        self.site = self.root / "apt"
        self.repository = AptRepository(self.site, PackageIndex(), RetentionPolicy(), ReleaseSigner(self.key.private_key))

    def release(self, version: str) -> None:
        self.repository.add(build_test_deb(self.root, version))
        self.repository.publish(DATE)

    def snapshot(self) -> dict:
        return {path.relative_to(self.site).as_posix(): path.read_bytes() for path in self.site.rglob("*") if path.is_file()}


class AptRepositoryTest(AptCase):
    def test_apt_repository_indexes_the_new_package(self):
        deb = build_test_deb(self.root, "0.17.0")
        self.repository.add(deb)
        self.repository.publish(DATE)
        dists = self.site / "dists/stable"
        with self.subTest("the signed files exist"):
            for name in ("InRelease", "Release", "Release.gpg"):
                self.assertTrue((dists / name).is_file(), name)
        with self.subTest("the signatures verify"):
            self.assertTrue(self.key.verify_clearsigned(dists / "InRelease"))
            self.assertTrue(self.key.verify_detached(dists / "Release.gpg", dists / "Release"))
        with self.subTest("Packages lists the package with its checksum"):
            packages = (dists / "main/binary-all/Packages").read_text()
            self.assertIn("Package: vivarcdi\nVersion: 0.17.0\n", packages)
            self.assertIn("Filename: pool/main/v/vivarcdi/vivarcdi_0.17.0_all.deb", packages)
            self.assertIn(f"SHA256: {hashlib.sha256(deb.read_bytes()).hexdigest()}", packages)
            self.assertIn(f"Size: {deb.stat().st_size}", packages)
        with self.subTest("Release describes the suite and the index digest"):
            release = (dists / "Release").read_text()
            self.assertIn("Suite: stable", release)
            self.assertIn("Components: main", release)
            self.assertIn("Architectures: all", release)
            self.assertIn("Date: Sun, 01 Nov 2026 10:00:00 GMT", release)
            packages_digest = hashlib.sha256((dists / "main/binary-all/Packages").read_bytes()).hexdigest()
            self.assertIn(f"{packages_digest} ", release)
        with self.subTest("the public key is published"):
            self.assertTrue((self.site / "vivarcdi-archive-keyring.gpg").stat().st_size > 0)
            self.assertIn("BEGIN PGP PUBLIC KEY BLOCK", (self.site / "vivarcdi-archive-keyring.asc").read_text())

    def test_apt_repository_keeps_the_last_three_versions(self):
        for version in ("0.15.0", "0.16.0", "0.17.0", "0.18.0"):
            self.release(version)
        names = sorted(path.name for path in self.repository.pool.glob("*.deb"))
        with self.subTest("the oldest is dropped"):
            self.assertEqual(names, ["vivarcdi_0.16.0_all.deb", "vivarcdi_0.17.0_all.deb", "vivarcdi_0.18.0_all.deb"])
        with self.subTest("the index lists the same three"):
            packages = (self.site / "dists/stable/main/binary-all/Packages").read_text()
            self.assertNotIn("Version: 0.15.0", packages)
            self.assertEqual(packages.count("Package: vivarcdi"), 3)
        with self.subTest("versions compare as numbers"):
            self.release("0.100.0")
            self.assertNotIn("vivarcdi_0.16.0_all.deb", [path.name for path in self.repository.pool.glob("*.deb")])

    def test_publication_is_idempotent(self):
        deb = build_test_deb(self.root, "0.17.0")
        self.repository.add(deb)
        self.repository.publish(DATE)
        first = self.snapshot()
        again = AptRepository(self.site, PackageIndex(), RetentionPolicy(), ReleaseSigner(self.key.private_key))
        again.add(deb)
        again.publish(DATE)
        self.assertEqual(self.snapshot(), first)

    def test_a_file_that_is_not_a_vivarcdi_package_is_refused(self):
        stray = self.root / "other_1.0.0_all.deb"
        stray.write_bytes(b"x")
        with self.assertRaisesRegex(AptRepositoryError, "is not named"):
            self.repository.add(stray)


class AptSignerTest(unittest.TestCase):
    @unittest.skipUnless(HAVE_TOOLS, MISSING_TOOLS)
    def test_a_text_that_is_not_a_key_is_refused(self):
        signer = ReleaseSigner("not a key")
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(AptRepositoryError):
                signer.sign(Path(folder) / "Release", Path(folder) / "InRelease", Path(folder) / "Release.gpg")

    def test_the_date_reads_the_github_timestamp(self):
        self.assertEqual(parse_date("2026-11-01T10:00:00Z"), DATE)


if __name__ == "__main__":
    unittest.main()
