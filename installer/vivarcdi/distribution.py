from pathlib import Path

from .errors import InstallerError

DIST_FOLDER = "dist"


def require_dist(dist_dir: Path) -> Path:
    """Return the built payload folder, or fail with advice when it was not built.

    Users get the folder from a release build (the `dist` branch of the repository);
    contributors create it with `make build`.
    """
    if not dist_dir.is_dir():
        raise InstallerError(
            f"The built payload is missing: {dist_dir} does not exist. "
            "Download a release build (git clone -b dist https://github.com/valsar6/VivArcDi.git) "
            "or, from a source checkout, run `make build`."
        )
    return dist_dir
