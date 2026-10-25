import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from vivarcdi.cli import main

sys.exit(main(sys.argv[1:]))
