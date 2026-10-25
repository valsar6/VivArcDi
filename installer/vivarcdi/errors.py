class VivArcDiError(Exception):
    """Base class for errors the installer reports to the user."""


class UnsupportedPlatformError(VivArcDiError):
    """The operating system is neither macOS nor a Debian-based Linux."""


class PatchError(VivArcDiError):
    """window.html does not have the structure the patcher expects."""


class PermissionDeniedError(VivArcDiError):
    """The installer cannot write where it needs to."""
