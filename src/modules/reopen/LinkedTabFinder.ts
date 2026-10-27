import { AddressKey } from '../../core/AddressKey.js';
import type { LinkKeyIndex } from '../../core/bookmarks/LinkKeyIndex.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { TabData } from '../../core/TabData.js';
import type { TabFinder } from './TabTargets.js';

export class LinkedTabFinder implements TabFinder {
  #tabs: Pick<BrowserTabs, 'query'>;
  #links: Pick<LinkKeyIndex, 'has'>;

  /**
   * Finds the open tab of a bookmark link that a new tab duplicates.
   *
   * @param tabs Tabs API.
   * @param links The address keys of the bookmark links.
   */
  constructor(tabs: Pick<BrowserTabs, 'query'>, links: Pick<LinkKeyIndex, 'has'>) {
    this.#tabs = tabs;
    this.#links = links;
  }

  /**
   * @param newTab The tab the user just opened.
   * @param url The address it navigates to.
   * @returns The tab of the same window and workspace with the same address key, the most recently
   *   opened one when several match, or null when the address is not a bookmark link.
   */
  public async find(newTab: chrome.tabs.Tab, url: string): Promise<chrome.tabs.Tab | null> {
    const key = AddressKey.from(url);
    if (key === null || !this.#links.has(key)) {
      return null;
    }
    const tabs = await this.#tabs.query({ windowId: newTab.windowId });
    const matches = tabs.filter(
      (tab) => tab.id !== newTab.id && TabData.shares(tab, newTab) && AddressKey.from(tab.url ?? tab.pendingUrl) === key,
    );
    return matches.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0] ?? null;
  }
}
