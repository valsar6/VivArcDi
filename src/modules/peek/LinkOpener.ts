import type { BrowserRuntime } from '../../core/BrowserRuntime.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Disposition } from './LinkClassifier.js';

export interface LinkRequest {
  /** Address of the link. */
  url: string;
  /** Tab whose page holds the link. */
  tabId: number;
  /** What Vivaldi would have done with the click. */
  disposition: Disposition;
}

export class LinkOpener {
  #tabs: Pick<BrowserTabs, 'get' | 'create' | 'update'>;
  #runtime: Pick<BrowserRuntime, 'openWindow'>;

  /**
   * Opens links as real tabs or windows.
   *
   * @param tabs The tabs API.
   * @param runtime Opens windows.
   */
  constructor(tabs: Pick<BrowserTabs, 'get' | 'create' | 'update'>, runtime: Pick<BrowserRuntime, 'openWindow'>) {
    this.#tabs = tabs;
    this.#runtime = runtime;
  }

  /**
   * Opens a URL in a new active tab right after another tab.
   *
   * @param tabId The tab to follow.
   * @param url Address to open.
   * @returns The id of the new tab.
   */
  public async openAfter(tabId: number, url: string): Promise<number> {
    const source = await this.#tabs.get(tabId);
    const created = await this.#tabs.create({
      url,
      index: source.index + 1,
      windowId: source.windowId,
      openerTabId: tabId,
      active: true,
    });
    if (created.id === undefined) {
      throw new Error('The new tab has no id');
    }
    return created.id;
  }

  /**
   * Opens a link the way Vivaldi would have opened it without VivArcDi.
   *
   * @param request The link and what Vivaldi would have done.
   * @returns Resolves once the link was opened.
   */
  public async openAsVivaldi({ url, tabId, disposition }: LinkRequest): Promise<void> {
    if (disposition === 'new-window') {
      await this.#runtime.openWindow(url);
    } else if (disposition === 'new-tab') {
      await this.openAfter(tabId, url);
    } else {
      await this.#tabs.update(tabId, { url });
    }
  }
}
