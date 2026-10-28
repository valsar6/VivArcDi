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
}
