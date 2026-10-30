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

/**
 * @param platform The value of `navigator.platform`.
 * @returns The shortcut texts shown in the tooltips: Cmd on macOS, Ctrl elsewhere.
 */
export function shortcutLabels(platform: string): Record<PeekCommand, string> {
  const modifier = platform.toLowerCase().startsWith('mac') ? 'Cmd' : 'Ctrl';
  return { close: `${modifier}+W`, expand: `${modifier}+O` };
}
