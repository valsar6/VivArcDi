import subprocess
from dataclasses import dataclass


@dataclass(frozen=True)
class CommandResult:
    """Outcome of an external command."""

    returncode: int
    stdout: str
    stderr: str

    @property
    def ok(self) -> bool:
        """True when the command exited with status 0."""
        return self.returncode == 0


class CommandRunner:
    """Runs external commands. Tests replace it with a fake."""

    def run(self, args: list[str]) -> CommandResult:
        """Run a command without a shell and capture its output.

        A missing executable is reported as return code 127, like a shell does.
        """
        try:
            completed = subprocess.run(args, capture_output=True, text=True, check=False)
        except FileNotFoundError as error:
            return CommandResult(127, "", str(error))
        return CommandResult(completed.returncode, completed.stdout, completed.stderr)
