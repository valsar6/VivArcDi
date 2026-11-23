import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import { OwnPage } from '../../shared/tabs/OwnPage.js';
import { TabDataWriter } from '../../core/tabs/TabDataWriter.js';
import { TabData } from '../../core/tabs/TabData.js';
import type { OwnTabChanges } from '../../core/tabs/TabData.js';

type SavedAddressTabs = Pick<BrowserTabs, 'get' | 'update'>;

const WEB_URL = /^https?:\/\//i;

export class SavedAddresses {
  #writer: TabDataWriter;

  /**
   * Keeps the own page of pinned tabs in their `vivExtData`, under VivArcDi's key, so it
   * follows the tab across restarts. Every write reads the tab again and leaves the other keys.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs: SavedAddressTabs) {
    this.#writer = TabDataWriter.of(tabs);
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
    await this.#writer.write(tabId, (tab) => {
      const { favoriteId, pinnedUrl } = TabData.ownOf(tab);
      const linked = favoriteId !== undefined || pinnedUrl !== undefined;
      return linked ? TabData.withOwn(tab, { favoriteId: undefined, pinnedUrl: undefined }) : null;
    });
  }

  async #rewrite(tabId: number, changes: OwnTabChanges): Promise<void> {
    await this.#writer.write(tabId, (tab) => TabData.withOwn(tab, changes));
  }
}
