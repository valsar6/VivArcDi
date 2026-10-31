from __future__ import annotations

import traceback
from datetime import datetime
from pathlib import Path
from typing import Callable


class ErrorLog:
    """Appends tracebacks to `<data folder>/logs/vivarcdi.log`, so the window can hide them."""

    FILE_NAME = "vivarcdi.log"

    def __init__(self, data_dir: Path, clock: Callable[[], datetime] = datetime.now):
        self._path = data_dir / "logs" / self.FILE_NAME
        self._clock = clock

    @property
    def path(self) -> Path:
        """The log file, which the Show log button opens."""
        return self._path

    def record(self, error: BaseException) -> None:
        """Append the error with its traceback. A log that cannot be written is skipped, never raised."""
        entry = "".join(traceback.format_exception(type(error), error, error.__traceback__))
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with self._path.open("a") as file:
                file.write(f"[{self._clock():%Y-%m-%d %H:%M:%S}]\n{entry}\n")
        except OSError:
            pass
