export type CommandBarKey = 'up' | 'down' | 'submit' | 'dismiss';

type Press = Pick<KeyboardEvent, 'key' | 'isComposing'>;

const KEYS = new Map<string, CommandBarKey>([
  ['ArrowUp', 'up'],
  ['ArrowDown', 'down'],
  ['Enter', 'submit'],
  ['Escape', 'dismiss'],
]);

/**
 * Maps a key press inside the command bar to what it does: Up and Down move the selection, Enter
 * opens the selected row and Esc closes the bar. A press that composes text (an input method) is left
 * alone.
 *
 * @param event The key press.
 * @returns The command, or null for any other key.
 */
export function keyCommand(event: Press): CommandBarKey | null {
  return event.isComposing ? null : (KEYS.get(event.key) ?? null);
}
