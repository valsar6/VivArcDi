import re

from .errors import PatchError


class WindowHtmlPatcher:
    """Adds and removes the VivArcDi loader script in Vivaldi's window.html.

    The script tag sits between two HTML comment markers, so the patch can be
    found, replaced and removed without touching the rest of the file.
    """

    START_MARKER = "<!-- vivarcdi:start -->"
    END_MARKER = "<!-- vivarcdi:end -->"

    def __init__(self, script_src: str = "vivarcdi/loader.js"):
        self._script_src = script_src
        self._block_pattern = re.compile(
            r"\n?[ \t]*" + re.escape(self.START_MARKER) + r".*?" + re.escape(self.END_MARKER),
            re.DOTALL,
        )

    def is_patched(self, html: str) -> bool:
        """Return True when the html already contains the VivArcDi block."""
        return self.START_MARKER in html

    def apply(self, html: str) -> str:
        """Return the html with exactly one VivArcDi block before </body>.

        Raises PatchError when the html has no closing body tag.
        """
        clean = self.revert(html)
        closing_body = clean.rfind("</body>")
        if closing_body == -1:
            raise PatchError("window.html has no </body> tag")
        return clean[:closing_body] + self._block() + "\n" + clean[closing_body:]

    def revert(self, html: str) -> str:
        """Return the html without the VivArcDi block."""
        return self._block_pattern.sub("", html)

    def _block(self) -> str:
        script = f'<script type="module" src="{self._script_src}"></script>'
        return f"  {self.START_MARKER}\n  {script}\n  {self.END_MARKER}"
