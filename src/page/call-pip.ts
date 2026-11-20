import { CALL_CONSOLE_PREFIX, CALL_MESSAGE_TYPE } from '../modules/callpip/CallMessage.js';
import type { CallPagePolicy, CallWarning } from '../modules/callpip/CallMessage.js';
import { CallPipHook } from './lib/CallPipHook.js';
import { sendToInterface } from './lib/PageChannel.js';
import { PageInstall } from './lib/PageInstall.js';

const INSTALL = new PageInstall('vivarcdi.call.pip');
let installed: CallPipHook | null = null;

/**
 * Floats the call of a page in Picture in Picture on Cmd/Ctrl+Shift and a letter, which needs the
 * user's key press, and closes the window when the tab is shown again or the call ends. Replaces a
 * previous installation without closing its window. A page that cannot do Picture in Picture is left
 * as it is.
 *
 * @param policy The token, the tab, the letter and the selector of the in-call view.
 */
export function install(policy: CallPagePolicy): void {
  const warn = (reason: CallWarning): void =>
    sendToInterface({ type: CALL_MESSAGE_TYPE, token: policy.token, tabId: policy.tabId, reason }, CALL_CONSOLE_PREFIX);
  if (document.pictureInPictureEnabled !== true) {
    INSTALL.remove();
    installed = null;
    warn('unsupported-page');
    return;
  }
  installed = new CallPipHook(policy, document, warn);
  INSTALL.replace(installed);
}

/**
 * Stops listening, closes an open window and leaves the page as it was.
 */
export function uninstall(): void {
  installed?.closeWindow();
  installed = null;
  INSTALL.remove();
}

/**
 * Opens the Picture in Picture window after the user left the tab. The browser accepts it only if the
 * user clicked or typed in the page within the last few seconds; otherwise nothing happens.
 */
export function open(): void {
  installed?.openOnTabSwitch();
}

/**
 * Closes the Picture in Picture window of the page, if one is open. The interface calls it when the
 * tab becomes active again.
 */
export function close(): void {
  installed?.closeWindow();
}
