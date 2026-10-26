import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { AddressKey } from './AddressKey.js';
import { Workspace } from './Workspace.js';

export class PinnedTabFinder {
  #tabs: Pick<BrowserTabs, 'query'>;

  /**
   * Finds the Favorite or pinned tab that a new tab duplicates.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs: Pick<BrowserTabs, 'query'>) {
    this.#tabs = tabs;
  }

  /**
   * @param newTab The tab the user just opened.
   * @param url The address it navigates to.
   * @returns The pinned tab of the same window and workspace with the same address key,
   *   the most recently opened one when several match, or null.
   */
  public async find(newTab: chrome.tabs.Tab, url: string): Promise<chrome.tabs.Tab | null> {
    const key = AddressKey.from(url);
    if (key === null) {
      return null;
    }
    const pinned = await this.#tabs.query({ pinned: true, windowId: newTab.windowId });
    const matches = pinned.filter(
      (tab) => tab.id !== newTab.id && Workspace.shares(tab, newTab) && AddressKey.from(tab.url ?? tab.pendingUrl) === key,
    );
    return matches.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0] ?? null;
  }
}
