import { BookmarkFolderFinder } from '../../core/bookmarks/BookmarkFolderFinder.js';
import type { BookmarkNode } from '../../core/bookmarks/BookmarkNode.js';
import type { BrowserBookmarks } from '../../core/bookmarks/BrowserBookmarks.js';

export interface Favorite {
  /** Id of the bookmark. */
  id: string;
  /** Title of the bookmark. */
  title: string;
  /** Address of the bookmark. */
  url: string;
}

export type FavoritesListener = (favorites: Favorite[] | null) => void;

const WEB_URL = /^https?:\/\//i;

export class FavoritesFolder {
  #bookmarks: Pick<BrowserBookmarks, 'getTree' | 'onChange'>;
  #path: string;
  #listener: FavoritesListener;
  #unsubscribe: (() => void) | null = null;

  /**
   * Follows the bookmark folder that holds the Favorites and reports its links
   * every time the bookmarks change.
   *
   * @param bookmarks Read-only bookmarks API.
   * @param path Path of the folder, titles separated by `/`.
   * @param listener Called with the Favorites, or with null while the folder is missing.
   */
  constructor(bookmarks: Pick<BrowserBookmarks, 'getTree' | 'onChange'>, path: string, listener: FavoritesListener) {
    this.#bookmarks = bookmarks;
    this.#path = path;
    this.#listener = listener;
  }

  /**
   * Keeps the web links of a folder, in order. Subfolders, separators and links that are
   * not web pages are skipped.
   *
   * @param folder A bookmark folder.
   * @returns Its Favorites.
   */
  public static linksOf(folder: BookmarkNode): Favorite[] {
    return (folder.children ?? [])
      .filter((node): node is BookmarkNode & { url: string } => node.url !== undefined && WEB_URL.test(node.url))
      .map(({ id, title, url }) => ({ id, title, url }));
  }

  /**
   * Reads the folder once and starts following the bookmarks.
   */
  public async start(): Promise<void> {
    this.#unsubscribe = this.#bookmarks.onChange(() => void this.#read());
    await this.#read();
  }

  /**
   * Stops following the bookmarks.
   */
  public stop(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  async #read(): Promise<void> {
    const folder = BookmarkFolderFinder.find(await this.#bookmarks.getTree(), BookmarkFolderFinder.parsePath(this.#path));
    this.#listener(folder === null ? null : FavoritesFolder.linksOf(folder));
  }
}
