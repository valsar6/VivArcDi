import { ShortcutKeys } from '../core/dom/ShortcutKeys.js';
import { COPY_CONSOLE_PREFIX, COPY_MESSAGE_TYPE } from '../modules/copyurl/CopyMessage.js';
import { sendToInterface } from './lib/PageChannel.js';
import { PageInstall, PageListener } from './lib/PageInstall.js';

const INSTALL = new PageInstall('vivarcdi.copy.keys');
const SHORTCUT_LETTER = 'c';

export interface CopyPagePolicy {
  /** Secret that proves a message comes from this script. */
  token: string;
  /** The tab of this page. */
  tabId: number;
}

/**
 * Forwards Cmd/Ctrl+Shift+C from a tab's page to Vivaldi's interface, which copies the address of
 * the tab. Replaces a previous installation.
 *
 * @param policy The token and the tab.
 */
export function install({ token, tabId }: CopyPagePolicy): void {
  INSTALL.replace(
    new PageListener('keydown', (event) => {
      if (!event.defaultPrevented && ShortcutKeys.isCommandShift(event, SHORTCUT_LETTER)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sendToInterface({ type: COPY_MESSAGE_TYPE, token, tabId, action: 'copy' }, COPY_CONSOLE_PREFIX);
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
