import { LinkClassifier } from '../modules/peek/LinkClassifier.js';
import type { PagePolicy } from '../modules/peek/PageScripts.js';
import { PEEK_MESSAGE_TYPE } from '../modules/peek/PeekMessage.js';
import { sendToInterface } from './lib/PageChannel.js';

const INSTANCE_KEY = Symbol.for('vivarcdi.peek.links');

class PeekLinkListener {
  #policy: PagePolicy;
  #classifier: LinkClassifier;
  #listener = (event: MouseEvent): void => this.#handle(event);

  constructor(policy: PagePolicy) {
    this.#policy = policy;
    this.#classifier = new LinkClassifier(policy.triggers);
  }

  public attach(): void {
    globalThis.addEventListener('click', this.#listener, true);
  }

  public detach(): void {
    globalThis.removeEventListener('click', this.#listener, true);
  }

  #handle(event: MouseEvent): void {
    const anchor = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    if (anchor === undefined || anchor.href === '' || event.defaultPrevented) {
      return;
    }
    const { peek, disposition } = this.#classifier.classify({
      button: event.button,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      href: anchor.href,
      target: anchor.target,
      pageUrl: globalThis.location.href,
      pinned: this.#policy.pinned,
    });
    if (!peek) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const { tabId, token } = this.#policy;
    sendToInterface({ type: PEEK_MESSAGE_TYPE, token, action: 'open', url: anchor.href, tabId, disposition });
  }
}

type Registry = Record<symbol, PeekLinkListener | undefined>;

/**
 * Starts catching Peek clicks in this page, replacing a previous installation.
 *
 * @param policy Triggers and the state of the tab.
 */
export function install(policy: PagePolicy): void {
  uninstall();
  const listener = new PeekLinkListener(policy);
  listener.attach();
  (globalThis as unknown as Registry)[INSTANCE_KEY] = listener;
}

/**
 * Stops catching clicks and leaves the page as it was.
 */
export function uninstall(): void {
  const registry = globalThis as unknown as Registry;
  registry[INSTANCE_KEY]?.detach();
  registry[INSTANCE_KEY] = undefined;
}
