import { ShortcutKeys } from '../core/dom/ShortcutKeys.js';
import { ARCHIVE_CONSOLE_PREFIX, ARCHIVE_MESSAGE_TYPE } from '../modules/today/ArchiveMessage.js';
import { sendToInterface } from './lib/PageChannel.js';
import { PageInstall, PageListener } from './lib/PageInstall.js';

const INSTALL = new PageInstall('vivarcdi.archive.keys');

/**
 * Forwards Cmd/Ctrl+Shift+A from a tab's page to Vivaldi's interface, which opens the archive
 * panel. Replaces a previous installation.
 *
 * @param token Secret that proves a message comes from this script.
 */
export function install(token: string): void {
  INSTALL.replace(
    new PageListener('keydown', (event) => {
      if (!event.defaultPrevented && ShortcutKeys.isCommandShift(event, 'a')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sendToInterface({ type: ARCHIVE_MESSAGE_TYPE, token, action: 'open' }, ARCHIVE_CONSOLE_PREFIX);
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
