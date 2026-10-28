class ShortcutKeys {
  /**
   * Tells whether a key press is Cmd/Ctrl+Shift and a letter, with no other modifier. Like the
   * other shortcuts of VivArcDi, Cmd and Ctrl are both accepted on every platform.
   *
   * @param event The key press.
   * @param letter The letter, such as `c`.
   * @returns Whether the press is that shortcut.
   */
  static isCommandShift(event, letter) {
    return (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey && event.key.toLowerCase() === letter.toLowerCase();
  }
}
export {
  ShortcutKeys
};
