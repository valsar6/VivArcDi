export type ShortcutKey = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>;

export class ShortcutKeys {
  /**
   * Tells whether a key press is Cmd/Ctrl+Shift and a letter, with no other modifier. Like the
   * other shortcuts of VivArcDi, Cmd and Ctrl are both accepted on every platform.
   *
   * @param event The key press.
   * @param letter The letter, such as `c`.
   * @returns Whether the press is that shortcut.
   */
  public static isCommandShift(event: ShortcutKey, letter: string): boolean {
    return (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey && event.key.toLowerCase() === letter.toLowerCase();
  }

  /**
   * Tells whether a key press is Cmd+Option or Ctrl+Alt with a physical key, and no Shift. The
   * physical key is used because Option changes the character a letter produces on macOS.
   *
   * @param event The key press, with its `code`.
   * @param code The key code, such as `KeyN`.
   * @returns Whether the press is that shortcut.
   */
  public static isCommandOption(event: ShortcutKey & Pick<KeyboardEvent, 'code'>, code: string): boolean {
    return (event.metaKey || event.ctrlKey) && event.altKey && !event.shiftKey && event.code === code;
  }
}
