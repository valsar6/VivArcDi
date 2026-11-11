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
    return this.#attempt(async () => {
      const tab = await this.#deps.tabs.get(tabId);
      const url = FavoriteDrop.#newPage(tab);
      const bookmark = url === null ? null : await this.#create({ title: FavoriteDrop.#titleOf(tab.title, url), url }, beforeId);
      if (bookmark === null) {
        return 'ignored';
      }
      await this.#pin(tabId, bookmark);
      return 'added';
    });
  }

  /**
   * Adds a Favorite for a page that no tab stands for, so it is a tile that opens the page when
   * clicked.
   *
   * @param page The title and the address.
   * @param beforeId The Favorite whose tile is under the pointer, so the new one goes before it; null for the end.
   * @returns What happened; `ignored` for an address that is not `http` or `https` or is already a Favorite.
   */
  public async addPage({ title, url }: { title: string; url: string }, beforeId: string | null): Promise<FavoriteDropResult> {
    if (AddressKey.from(url) === null) {
      return 'ignored';
    }
    return this.#attempt(async () => ((await this.#create({ title: FavoriteDrop.#titleOf(title, url), url }, beforeId)) === null ? 'ignored' : 'added'));
  }

  static #newPage(tab: chrome.tabs.Tab): string | null {
    const { url } = tab;
    return url !== undefined && AddressKey.from(url) !== null && TabData.ownOf(tab).favoriteId === undefined ? url : null;
  }

  static #titleOf(title: string | undefined, url: string): string {
    return title !== undefined && title !== '' ? title : url;
  }

  async #attempt(run: () => Promise<FavoriteDropResult>): Promise<FavoriteDropResult> {
    try {
      return await run();
    } catch (error) {
      this.#deps.logger.warn('could not add the page to the Favorites', error);
      return 'failed';
    }
  }

  async #create(page: { title: string; url: string }, beforeId: string | null): Promise<{ id: string; title: string; url: string } | null> {
    const folderId = await this.#deps.writer.ensurePath(this.#path);
    const children = await this.#deps.writer.children(folderId);
    if (children.some((child) => child.url === page.url)) {
      return null;
    }
    const index = beforeId === null ? -1 : children.findIndex((child) => child.id === beforeId);
    const bookmark = await this.#deps.writer.create({ parentId: folderId, index: index < 0 ? undefined : index, ...page });
    return { id: bookmark.id, ...page };
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
