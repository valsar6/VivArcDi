import type { PeekCommand } from './PeekMessage.js';

/**
 * Maps a key press to a Peek command: Esc and Cmd/Ctrl+W close, Cmd/Ctrl+O expands.
 *
 * @param event The key press.
 * @returns The command, or null for any other key.
 */
export function commandFor(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey'>): PeekCommand | null {
  const key = event.key.toLowerCase();
  if (key === 'escape') {
    return 'close';
  }
  if (!event.metaKey && !event.ctrlKey) {
    return null;
  }
  if (key === 'w') {
    return 'close';
  }
  return key === 'o' ? 'expand' : null;
}
