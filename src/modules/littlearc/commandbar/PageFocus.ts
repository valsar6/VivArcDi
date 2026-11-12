import type { BrowserTabs } from '../../../core/browser/BrowserTabs.js';
import { tabIdOf } from '../../../core/browser/Webview.js';

export interface PageFocusOptions {
  document: Document;
  tabs: Pick<BrowserTabs, 'query'>;
  windowId: number;
  webviewSelector: string;
}

export class PageFocus {
  #options: PageFocusOptions;
  #previous: HTMLElement | null = null;

  /**
   * Remembers what had the keyboard focus when the command bar opened and gives it back when the bar
   * closes. When that element is gone, the page of the active tab takes the focus.
   *
   * @param options The document, the tabs API, this window's id and the selector of the page webviews.
   */
  constructor(options: PageFocusOptions) {
    this.#options = options;
  }

  /**
   * Remembers the element that has the focus now.
   */
  public remember(): void {
    this.#previous = this.#options.document.activeElement as HTMLElement | null;
  }

  /**
   * Gives the focus back.
   */
  public restore(): void {
    const previous = this.#previous;
    this.#previous = null;
    if (previous?.isConnected === true) {
      previous.focus();
    } else {
      void this.#focusActivePage().catch(() => undefined);
    }
  }

  async #focusActivePage(): Promise<void> {
    const { document, tabs, windowId, webviewSelector } = this.#options;
    const [tab] = await tabs.query({ windowId, active: true });
    const webview = [...document.querySelectorAll<HTMLElement>(webviewSelector)].find((candidate) => tabIdOf(candidate) === tab?.id);
    webview?.focus();
  }
}
