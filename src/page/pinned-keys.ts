import { CloseShortcut } from '../modules/pinned/CloseShortcut.js';
import { PINNED_CONSOLE_PREFIX, PINNED_MESSAGE_TYPE } from '../modules/pinned/PinnedMessage.js';
import { sendToInterface } from './lib/PageChannel.js';
import { PageInstall, PageListener } from './lib/PageInstall.js';

const INSTALL = new PageInstall('vivarcdi.pinned.keys');

export interface PinnedPagePolicy {
  /** Secret that proves a message comes from this script. */
  token: string;
  /** The tab of this page. */
  tabId: number;
}

/**
 * Forwards Cmd/Ctrl+W from the page of a pinned tab to Vivaldi's interface, which unloads the tab
 * instead of closing it. Replaces a previous installation.
 *
 * @param policy The token and the tab.
 */
export function install({ token, tabId }: PinnedPagePolicy): void {
  INSTALL.replace(
    new PageListener('keydown', (event) => {
      if (!event.defaultPrevented && CloseShortcut.isCloseKey(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sendToInterface({ type: PINNED_MESSAGE_TYPE, token, tabId, action: 'close' }, PINNED_CONSOLE_PREFIX);
      }
    }),
  );
}

/**
 * Stops forwarding and leaves the page as it was.
 */
export function uninstall(): void {
  INSTALL.remove();
}
