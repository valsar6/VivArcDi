from __future__ import annotations

import subprocess
import sys
import tkinter
from pathlib import Path
from tkinter import messagebox, ttk

from ..errors import WindowUnavailableError
from ..modes import WindowAction
from .model import BuildState
from .presenter import MessageButtonKind, WindowPresenter, WindowState, WindowView

STATE_TEXT = {
    BuildState.NOT_INSTALLED: "Not installed",
    BuildState.CURRENT: "Installed",
    BuildState.OUTDATED: "Needs an update",
    BuildState.NEEDS_REAPPLY: "Needs to be applied again",
}
ACTION_TEXT = {
    WindowAction.INSTALL: "Install",
    WindowAction.UPDATE: "Update",
    WindowAction.REAPPLY: "Reapply",
    WindowAction.UNINSTALL: "Uninstall",
    WindowAction.APPLY_SHORTCUTS: "Use Arc's shortcuts",
    WindowAction.RESTORE_SHORTCUTS: "Restore my shortcuts",
}
ACTION_ORDER = tuple(ACTION_TEXT)
SHORTCUTS_CHECKBOX = "Also use Arc's keyboard shortcuts"
NO_BUILDS = "No Vivaldi found."
PADDING = 12
MESSAGE_WIDTH = 420


class TkWindow(WindowView):
    """Draws a WindowState with Tkinter and forwards every click to the presenter. It decides nothing."""

    def __init__(self):
        try:
            self._root = tkinter.Tk()
        except tkinter.TclError as error:
            raise WindowUnavailableError(f"The VivArcDi window cannot open: {error}") from error
        self._root.title("VivArcDi")
        self._root.minsize(MESSAGE_WIDTH + 2 * PADDING, 0)
        self._presenter: WindowPresenter | None = None
        self._shortcuts_choice = tkinter.BooleanVar(value=False)
        self._frame = ttk.Frame(self._root, padding=PADDING)
        self._frame.pack(fill="both", expand=True)

    def run(self, presenter: WindowPresenter) -> None:
        """Connect the presenter, draw the first state and run the Tk main loop until the window closes."""
        self._presenter = presenter
        presenter.refresh()
        self._root.mainloop()

    def show_state(self, state: WindowState) -> None:
        self._clear()
        self._draw_rows(state)
        self._draw_actions(state)
        self._draw_message(state)
        self._draw_shortcuts_choice(state)
        self._draw_update_link(state)

    def ask_confirmation(self, question: str, details: str = "") -> bool:
        return messagebox.askyesno("VivArcDi", question + (f"\n\n{details}" if details else ""), parent=self._root)

    def open_url(self, url: str) -> None:
        self._launch(url)

    def open_path(self, path: Path) -> None:
        self._launch(str(path))

    def _launch(self, target: str) -> None:
        opener = "open" if sys.platform == "darwin" else "xdg-open"
        subprocess.Popen([opener, target])

    def _clear(self) -> None:
        for child in self._frame.winfo_children():
            child.destroy()

    def _draw_rows(self, state: WindowState) -> None:
        if not state.rows:
            ttk.Label(self._frame, text=NO_BUILDS).pack(anchor="w")
        for row in state.rows:
            line = ttk.Frame(self._frame)
            line.pack(fill="x", pady=2)
            ttk.Label(line, text=row.label).pack(side="left")
            ttk.Label(line, text=STATE_TEXT[row.state]).pack(side="right")

    def _draw_actions(self, state: WindowState) -> None:
        bar = ttk.Frame(self._frame)
        bar.pack(fill="x", pady=(PADDING, 0))
        for action in ACTION_ORDER:
            if action in state.visible_actions:
                self._button(bar, ACTION_TEXT[action], lambda a=action: self._perform(a), action in state.enabled_actions)
        self._button(bar, "Show log", self._show_log, True)

    def _draw_message(self, state: WindowState) -> None:
        if not state.message:
            return
        ttk.Label(self._frame, text=state.message, wraplength=MESSAGE_WIDTH).pack(anchor="w", pady=(PADDING, 0))
        bar = ttk.Frame(self._frame)
        bar.pack(fill="x")
        for button in state.message_buttons:
            self._button(bar, button.label, lambda kind=button.kind: self._press(kind), True)

    def _draw_shortcuts_choice(self, state: WindowState) -> None:
        if not state.offer_shortcuts:
            return
        self._shortcuts_choice.set(False)
        ttk.Checkbutton(
            self._frame, text=SHORTCUTS_CHECKBOX, variable=self._shortcuts_choice, command=self._choose_shortcuts
        ).pack(anchor="w", pady=(PADDING, 0))

    def _draw_update_link(self, state: WindowState) -> None:
        if not state.update_version:
            return
        link = ttk.Label(self._frame, text=f"VivArcDi {state.update_version} is available", foreground="#1a5fb4", cursor="hand2")
        link.pack(anchor="w", pady=(PADDING, 0))
        link.bind("<Button-1>", lambda event: self.open_url(state.update_url))

    def _button(self, parent, text: str, command, enabled: bool) -> None:
        button = ttk.Button(parent, text=text, command=command, state="normal" if enabled else "disabled")
        button.pack(side="left", padx=(0, 6), pady=2)

    def _perform(self, action: WindowAction) -> None:
        self._presenter.perform(action)

    def _press(self, kind: MessageButtonKind) -> None:
        self._presenter.press(kind)

    def _show_log(self) -> None:
        self._presenter.show_log()

    def _choose_shortcuts(self) -> None:
        if self._shortcuts_choice.get():
            self._presenter.perform(WindowAction.APPLY_SHORTCUTS)
