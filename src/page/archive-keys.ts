import { ShortcutKeys } from '../core/ShortcutKeys.js';
import { ARCHIVE_CONSOLE_PREFIX, ARCHIVE_MESSAGE_TYPE } from '../modules/today/ArchiveMessage.js';
import { sendToInterface } from './lib/PageChannel.js';

const INSTANCE_KEY = Symbol.for('vivarcdi.archive.keys');

type Registry = Record<symbol, ((event: KeyboardEvent) => void) | undefined>;

/**
 * Forwards Cmd/Ctrl+Shift+A from a tab's page to Vivaldi's interface, which opens the archive
 * panel. Replaces a previous installation.
 *
 * @param token Secret that proves a message comes from this script.
 */
export function install(token: string): void {
  uninstall();
  const listener = (event: KeyboardEvent): void => {
    if (!event.defaultPrevented && ShortcutKeys.isCommandShift(event, 'a')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      sendToInterface({ type: ARCHIVE_MESSAGE_TYPE, token, action: 'open' }, ARCHIVE_CONSOLE_PREFIX);
    }
  };
  globalThis.addEventListener('keydown', listener, true);
  (globalThis as unknown as Registry)[INSTANCE_KEY] = listener;
}

/**
 * Stops forwarding and leaves the page as it was.
 */
export function uninstall(): void {
  const registry = globalThis as unknown as Registry;
  const listener = registry[INSTANCE_KEY];
  if (listener !== undefined) {
    globalThis.removeEventListener('keydown', listener, true);
  }
  registry[INSTANCE_KEY] = undefined;
}
