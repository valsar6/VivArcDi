import { ShortcutKeys } from '../core/ShortcutKeys.js';
import { COPY_CONSOLE_PREFIX, COPY_MESSAGE_TYPE } from '../modules/copyurl/CopyMessage.js';
import { sendToInterface } from './lib/PageChannel.js';

const INSTANCE_KEY = Symbol.for('vivarcdi.copy.keys');
const SHORTCUT_LETTER = 'c';

export interface CopyPagePolicy {
  /** Secret that proves a message comes from this script. */
  token: string;
  /** The tab of this page. */
  tabId: number;
}

type Registry = Record<symbol, ((event: KeyboardEvent) => void) | undefined>;

/**
 * Forwards Cmd/Ctrl+Shift+C from a tab's page to Vivaldi's interface, which copies the address of
 * the tab. Replaces a previous installation.
 *
 * @param policy The token and the tab.
 */
export function install({ token, tabId }: CopyPagePolicy): void {
  uninstall();
  const listener = (event: KeyboardEvent): void => {
    if (!event.defaultPrevented && ShortcutKeys.isCommandShift(event, SHORTCUT_LETTER)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      sendToInterface({ type: COPY_MESSAGE_TYPE, token, tabId, action: 'copy' }, COPY_CONSOLE_PREFIX);
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
