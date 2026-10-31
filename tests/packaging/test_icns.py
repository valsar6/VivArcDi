import struct
import sys
import unittest
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[2] / "packaging" / "assets"
sys.path.insert(0, str(ASSETS))

from build_icns import IcnsWriter


class IcnsTest(unittest.TestCase):
    def test_the_committed_icon_is_the_png_in_an_icns_container(self):
        png = (ASSETS / "icon.png").read_bytes()
        icns = (ASSETS / "icon.icns").read_bytes()
        self.assertEqual(icns, IcnsWriter().convert(png))

    def test_the_container_declares_its_sizes(self):
        icns = (ASSETS / "icon.icns").read_bytes()
        png = (ASSETS / "icon.png").read_bytes()
        self.assertEqual(icns[:4], b"icns")
        self.assertEqual(struct.unpack(">I", icns[4:8])[0], len(icns))
        self.assertEqual(icns[8:12], b"ic08")
        self.assertEqual(struct.unpack(">I", icns[12:16])[0], len(png) + 8)
        self.assertEqual(icns[16:], png)

    def test_the_source_icon_is_256_pixels_square(self):
        png = (ASSETS / "icon.png").read_bytes()
        self.assertEqual(struct.unpack(">II", png[16:24]), (256, 256))

    def test_something_that_is_not_a_png_is_refused(self):
        with self.assertRaises(ValueError):
            IcnsWriter().convert(b"GIF89a")


if __name__ == "__main__":
    unittest.main()
