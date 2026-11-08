export type LittleArcCommand = 'close' | 'keep' | 'clear';

type Press = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>;

const SHORTCUTS = new Map<string, LittleArcCommand>([
  ['w', 'close'],
  ['o', 'keep'],
]);

const isCommandKey = (event: Press): boolean => (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;

/**
 * Maps a key press inside a Little Arc window to a command: Esc closes the window when the address
 * field is empty and clears it otherwise, Cmd/Ctrl+W closes and Cmd/Ctrl+O keeps the page.
 *
 * @param event The key press.
 * @param fieldEmpty Whether the address field is empty.
 * @returns The command, or null for any other key.
 */
export function commandFor(event: Press, fieldEmpty: boolean): LittleArcCommand | null {
  const key = event.key.toLowerCase();
  if (key === 'escape') {
    return fieldEmpty ? 'close' : 'clear';
  }
  return isCommandKey(event) ? (SHORTCUTS.get(key) ?? null) : null;
}
