import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { OwnPage } from '../../core/OwnPage.js';
import { TabData } from '../../core/TabData.js';
import type { OwnTabChanges } from '../../core/TabData.js';

export type SavedAddressTabs = Pick<BrowserTabs, 'get' | 'update'>;

const WEB_URL = /^https?:\/\//i;

export class SavedAddresses {
  #tabs: SavedAddressTabs;

  /**
   * Keeps the own page of pinned tabs in their `vivExtData`, under VivArcDi's key, so it
   * follows the tab across restarts. Every write reads the tab again and leaves the other keys.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs: SavedAddressTabs) {
    this.#tabs = tabs;
  }

  /**
   * @param tab A tab.
   * @returns Whether the tab is pinned, shows a web page and has no own page yet.
   */
  public static needsAddress(tab: chrome.tabs.Tab): boolean {
    return tab.pinned && OwnPage.of(tab) === null && WEB_URL.test(tab.url ?? '');
  }

  /**
   * Saves the page a tab shows as its own page.
   *
   * @param tabId The tab.
   * @param url The address to save.
   */
  public async save(tabId: number, url: string): Promise<void> {
    await this.#rewrite(tabId, { pinnedUrl: url });
  }

  /**
   * Forgets the own page of a tab and its link to a Favorite, so it is an ordinary tab again.
   *
   * @param tabId The tab.
   */
  public async forget(tabId: number): Promise<void> {
    const tab = await this.#tabs.get(tabId);
    const { favoriteId, pinnedUrl } = TabData.ownOf(tab);
    if (favoriteId !== undefined || pinnedUrl !== undefined) {
      await this.#tabs.update(tabId, { vivExtData: TabData.withOwn(tab, { favoriteId: undefined, pinnedUrl: undefined }) });
    }
  }

  /**
   * Brings a tab back to its own page when it shows another one.
   *
   * @param tabId The tab.
   */
  public async load(tabId: number): Promise<void> {
    const target = OwnPage.resetTarget(await this.#tabs.get(tabId));
    if (target !== null) {
      await this.#tabs.update(tabId, { url: target });
    }
  }

  async #rewrite(tabId: number, changes: OwnTabChanges): Promise<void> {
    const tab = await this.#tabs.get(tabId);
    await this.#tabs.update(tabId, { vivExtData: TabData.withOwn(tab, changes) });
  }
}
