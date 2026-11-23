import type { BrowserTabs } from '../../core/browser/BrowserTabs.js';
import { TabData } from '../../core/tabs/TabData.js';
import { TabDataWriter } from '../../core/tabs/TabDataWriter.js';
import type { PinnedPageStore } from '../../shared/linkmenu/PinnedAddress.js';

type PinnedTabsApi = Pick<BrowserTabs, 'get' | 'update'>;

export class TabPinnedStore implements PinnedPageStore {
  #tabs: PinnedTabsApi;
  #writer: TabDataWriter;

  /**
   * The `Edit Pinned Page` store of a pinned row: the page a pinned tab opens first is kept in its
   * `vivExtData`, under VivArcDi's key, so it follows the tab across restarts.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs: PinnedTabsApi) {
    this.#tabs = tabs;
    this.#writer = TabDataWriter.of(tabs);
  }

  /**
   * @param id The tab id, as text.
   * @returns The page the tab opens first, if it has one.
   */
  public async read(id: string): Promise<string | undefined> {
    return TabData.ownOf(await this.#tabs.get(Number(id))).pinnedUrl;
  }

  /**
   * @param id The tab id, as text.
   * @param url The page the tab opens first.
   */
  public async write(id: string, url: string): Promise<void> {
    const tabId = Number(id);
    await this.#writer.write(tabId, (tab) => TabData.withOwn(tab, { pinnedUrl: url }));
  }

  /**
   * @param id The tab id, as text.
   * @returns The open tab, if it is still there.
   */
  public async tab(id: string): Promise<chrome.tabs.Tab | undefined> {
    return this.#tabs.get(Number(id));
  }
}
