import { LITTLE_ARC_CONSOLE_PREFIX, LITTLE_ARC_MESSAGE_TYPE } from '../modules/littlearc/LittleArcMessage.js';
import type { PageLinkPolicy } from '../modules/littlearc/LittleArcMessage.js';
import { PageInstall } from './lib/PageInstall.js';
import type { PageHook } from './lib/PageInstall.js';
import { sendToInterface } from './lib/PageChannel.js';

const INSTALL = new PageInstall('vivarcdi.little-arc.links');
const MAIN_BUTTON = 0;
const WEB_URL = /^https?:\/\//i;

class LittleArcLinkListener implements PageHook {
  #policy: PageLinkPolicy;
  #listener = (event: MouseEvent): void => this.#handle(event);

  constructor(policy: PageLinkPolicy) {
    this.#policy = policy;
  }

  public attach(): void {
    globalThis.addEventListener('click', this.#listener, true);
  }

  public detach(): void {
    globalThis.removeEventListener('click', this.#listener, true);
  }

  #handle(event: MouseEvent): void {
    if (!this.#isPlainLeftClick(event) || event.defaultPrevented) {
      return;
    }
    const anchor = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    if (anchor === undefined || anchor.target.toLowerCase() !== '_blank' || !WEB_URL.test(anchor.href)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const { tabId, token } = this.#policy;
    sendToInterface({ type: LITTLE_ARC_MESSAGE_TYPE, action: 'page-link', token, tabId, url: anchor.href }, LITTLE_ARC_CONSOLE_PREFIX);
  }

  #isPlainLeftClick(event: MouseEvent): boolean {
    return event.button === MAIN_BUTTON && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
  }
}

/**
 * Starts sending new-window links of this page to Little Arc, replacing a previous installation.
 *
 * @param policy The token and the tab the page belongs to.
 */
export function install(policy: PageLinkPolicy): void {
  INSTALL.replace(new LittleArcLinkListener(policy));
}

/**
 * Stops catching new-window links and leaves the page as it was.
 */
export function uninstall(): void {
  INSTALL.remove();
}
