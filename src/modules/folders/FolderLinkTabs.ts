import type { BookmarkNode } from '../../core/bookmarks/BookmarkNode.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { TabData } from '../../core/TabData.js';

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
   * @returns The ids of the tabs linked to them.
   */
  public async tabsOf(linkIds: string[]): Promise<number[]> {
    const wanted = new Set(linkIds);
    return (await this.#tabs.query({})).flatMap((tab) => {
      const { bookmarkId } = TabData.ownOf(tab);
      return tab.id !== undefined && bookmarkId !== undefined && wanted.has(bookmarkId) ? [tab.id] : [];
    });
  }
}
