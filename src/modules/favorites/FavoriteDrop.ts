import { AddressKey } from '../../core/AddressKey.js';
import type { BookmarkWriter } from '../../core/bookmarks/BookmarkWriter.js';
import { BookmarkFolderFinder } from '../../core/bookmarks/BookmarkFolderFinder.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import type { Logger } from '../../core/Logger.js';
import { TabData } from '../../core/TabData.js';
import type { LinkedTabs } from './LinkedTabs.js';

export type FavoriteDropWriter = Pick<BookmarkWriter, 'ensurePath' | 'children' | 'create' | 'remove'>;

export interface FavoriteDropDependencies {
  tabs: Pick<BrowserTabs, 'get' | 'update'>;
  writer: FavoriteDropWriter;
  links: Pick<LinkedTabs, 'link'>;
  /** Path of the Favorites folder, titles separated by `/`. */
  folder: string;
  logger: Logger;
}

/** What `add` did: `added`, `ignored` for a page that is no new Favorite, `failed` after a logged error. */
export type FavoriteDropResult = 'added' | 'ignored' | 'failed';

export class FavoriteDrop {
  #deps: FavoriteDropDependencies;
  #path: string[];

  /**
   * Makes a tab of the list a Favorite: a bookmark in the Favorites folder with the tab's title and
   * address, and the tab becomes the pinned tab of that Favorite. The folder is created when it
   * is missing. A page that is already in the folder is left as it is.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: FavoriteDropDependencies) {
    this.#deps = dependencies;
    this.#path = BookmarkFolderFinder.parsePath(dependencies.folder);
  }

  /**
   * @param tabId The tab that was released over the grid.
   * @param beforeId The Favorite whose tile is under the pointer, so the new one goes before it; null for the end.
   * @returns What happened.
   */
  public async add(tabId: number, beforeId: string | null): Promise<FavoriteDropResult> {
    try {
      const tab = await this.#deps.tabs.get(tabId);
      const url = FavoriteDrop.#newPage(tab);
      if (url === null) {
        return 'ignored';
      }
      const folderId = await this.#deps.writer.ensurePath(this.#path);
      const children = await this.#deps.writer.children(folderId);
      if (children.some((child) => child.url === url)) {
        return 'ignored';
      }
      const index = beforeId === null ? -1 : children.findIndex((child) => child.id === beforeId);
      const title = FavoriteDrop.#titleOf(tab, url);
      const bookmark = await this.#deps.writer.create({ parentId: folderId, index: index < 0 ? undefined : index, title, url });
      await this.#pin(tabId, { id: bookmark.id, title, url });
      return 'added';
    } catch (error) {
      this.#deps.logger.warn('could not add the tab to the Favorites', error);
      return 'failed';
    }
  }

  static #newPage(tab: chrome.tabs.Tab): string | null {
    const { url } = tab;
    return url !== undefined && AddressKey.from(url) !== null && TabData.ownOf(tab).favoriteId === undefined ? url : null;
  }

  static #titleOf(tab: chrome.tabs.Tab, url: string): string {
    return tab.title !== undefined && tab.title !== '' ? tab.title : url;
  }

  async #pin(tabId: number, favorite: { id: string; title: string; url: string }): Promise<void> {
    try {
      await this.#deps.links.link(tabId, favorite, undefined);
      await this.#deps.tabs.update(tabId, { pinned: true });
    } catch (error) {
      await this.#deps.writer.remove(favorite.id).catch(() => undefined);
      throw error;
    }
  }
}
