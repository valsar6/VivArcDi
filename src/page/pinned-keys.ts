import { CloseShortcut } from '../modules/pinned/CloseShortcut.js';
import { PINNED_CONSOLE_PREFIX, PINNED_MESSAGE_TYPE } from '../modules/pinned/PinnedMessage.js';
import { sendToInterface } from './lib/PageChannel.js';

const INSTANCE_KEY = Symbol.for('vivarcdi.pinned.keys');

export interface PinnedPagePolicy {
  /** Secret that proves a message comes from this script. */
  token: string;
  /** The tab of this page. */
  tabId: number;
}

type Registry = Record<symbol, ((event: KeyboardEvent) => void) | undefined>;

/**
 * Forwards Cmd/Ctrl+W from the page of a pinned tab to Vivaldi's interface, which unloads the tab
 * instead of closing it. Replaces a previous installation.
 *
 * @param policy The token and the tab.
 */
export function install({ token, tabId }: PinnedPagePolicy): void {
  uninstall();
  const listener = (event: KeyboardEvent): void => {
    if (!event.defaultPrevented && CloseShortcut.isCloseKey(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      sendToInterface({ type: PINNED_MESSAGE_TYPE, token, tabId, action: 'close' }, PINNED_CONSOLE_PREFIX);
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
