import type { BookmarkNode } from '../../../core/browser/bookmarks/BookmarkNode.js';
import type { BrowserTabs } from '../../../core/browser/BrowserTabs.js';
import { TabData } from '../../../core/tabs/TabData.js';

export interface FolderLinkTabsDependencies {
  tabs: Pick<BrowserTabs, 'query'>;
}

export class FolderLinkTabs {
  #tabs: FolderLinkTabsDependencies['tabs'];

  /**
   * Finds the links of a folder and the tabs open on them, in every window.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ tabs }: FolderLinkTabsDependencies) {
    this.#tabs = tabs;
  }

  /**
   * @param folder A folder read with all its levels, or a link.
   * @returns The ids of its links, at any depth, in order.
   */
  public linkIds(folder: BookmarkNode): string[] {
    const own = folder.url !== undefined ? [folder.id] : [];
    return [...own, ...(folder.children ?? []).flatMap((child) => this.linkIds(child))];
  }

  /**
   * @param linkIds Bookmark ids of links.
   * @returns The ids of the tabs linked to them, in every window.
   */
  public async tabsOf(linkIds: string[]): Promise<number[]> {
    return this.#linked(linkIds, {});
  }

  /**
   * @param linkIds Bookmark ids of links.
   * @returns The ids of the tabs linked to them, in the window of this document only.
   */
  public async ownTabsOf(linkIds: string[]): Promise<number[]> {
    return this.#linked(linkIds, { currentWindow: true });
  }

  async #linked(linkIds: string[], info: chrome.tabs.QueryInfo): Promise<number[]> {
    const wanted = new Set(linkIds);
    return (await this.#tabs.query(info)).flatMap((tab) => {
      const { bookmarkId } = TabData.ownOf(tab);
      return tab.id !== undefined && bookmarkId !== undefined && wanted.has(bookmarkId) ? [tab.id] : [];
    });
  }
}
