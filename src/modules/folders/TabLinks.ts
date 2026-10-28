import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { TabDataWriter } from '../../core/TabDataWriter.js';
import { TabData } from '../../core/TabData.js';

export type TabLinksApi = Pick<BrowserTabs, 'query' | 'get' | 'update'>;

export class TabLinks {
  #tabs: TabLinksApi;
  #writer: TabDataWriter;

  /**
   * Writes the link between a tab and a bookmark into the tab's `vivExtData`, where it survives a
   * restart. Everything else Vivaldi stored there is kept.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs: TabLinksApi) {
    this.#tabs = tabs;
    this.#writer = TabDataWriter.of(tabs);
  }

  /**
   * Makes a tab the tab of a bookmark.
   *
   * @param tabId The tab.
   * @param bookmarkId The bookmark.
   */
  public async link(tabId: number, bookmarkId: string): Promise<void> {
    await this.#write(tabId, bookmarkId);
  }

  /**
   * Unlinks every tab whose bookmark is no longer among the given ones, so that it comes back to
   * the tab list.
   *
   * @param bookmarkIds The bookmarks that still exist as links.
   */
  public async unlinkExcept(bookmarkIds: ReadonlySet<string>): Promise<void> {
    for (const tab of await this.#tabs.query({})) {
      const { bookmarkId } = TabData.ownOf(tab);
      if (tab.id !== undefined && bookmarkId !== undefined && !bookmarkIds.has(bookmarkId)) {
        await this.#write(tab.id, undefined);
      }
    }
  }

  async #write(tabId: number, bookmarkId: string | undefined): Promise<void> {
    await this.#writer.write(tabId, (tab) => TabData.withOwn(tab, { bookmarkId }));
  }
}
