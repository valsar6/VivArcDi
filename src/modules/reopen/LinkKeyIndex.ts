import { AddressKey } from '../AddressKey.js';
import type { Logger } from '../Logger.js';
import { BookmarkFolderFinder } from './BookmarkFolderFinder.js';
import type { BookmarkNode } from './BookmarkNode.js';
import type { BrowserBookmarks } from './BrowserBookmarks.js';

type IndexBookmarks = Pick<BrowserBookmarks, 'getTree' | 'onChange'>;

export class LinkKeyIndex {
  static #instances = new WeakMap<object, Map<string, LinkKeyIndex>>();

  #bookmarks: IndexBookmarks;
  #path: string[];
  #logger: Logger;
  #keys = new Set<string>();
  #users = 0;
  #unsubscribe: (() => void) | null = null;
  #generation = 0;

  /**
   * The address keys of the links under one bookmark folder. Use `acquire`, so that the modules
   * which ask for the same folder share one index.
   *
   * @param bookmarks Bookmarks API.
   * @param path Titles of the root folder.
   * @param logger Logger for failures.
   */
  private constructor(bookmarks: IndexBookmarks, path: string[], logger: Logger) {
    this.#bookmarks = bookmarks;
    this.#path = path;
    this.#logger = logger;
  }

  /**
   * Gets the index of a root folder, creating and starting it for the first user.
   * Every call must be paired with `release`.
   *
   * @param bookmarks Bookmarks API.
   * @param path Titles of the root folder.
   * @param logger Logger for failures.
   * @returns The shared index.
   */
  public static acquire(bookmarks: IndexBookmarks, path: string[], logger: Logger): LinkKeyIndex {
    const byPath = LinkKeyIndex.#instances.get(bookmarks) ?? new Map<string, LinkKeyIndex>();
    LinkKeyIndex.#instances.set(bookmarks, byPath);
    const name = path.join('/');
    const index = byPath.get(name) ?? new LinkKeyIndex(bookmarks, path, logger);
    byPath.set(name, index);
    index.#users += 1;
    if (index.#users === 1) {
      index.#start();
    }
    return index;
  }

  /**
   * Gives the index back; the last user stops it.
   */
  public release(): void {
    this.#users -= 1;
    if (this.#users === 0) {
      this.#unsubscribe?.();
      this.#unsubscribe = null;
      this.#generation += 1;
      LinkKeyIndex.#instances.get(this.#bookmarks)?.delete(this.#path.join('/'));
    }
  }

  /**
   * @param key An address key.
   * @returns Whether a link under the root has that key.
   */
  public has(key: string): boolean {
    return this.#keys.has(key);
  }

  #start(): void {
    try {
      this.#unsubscribe = this.#bookmarks.onChange(() => void this.#load());
    } catch (error) {
      this.#logger.warn('bookmark events are missing: links are read once', error);
    }
    void this.#load();
  }

  async #load(): Promise<void> {
    const generation = ++this.#generation;
    try {
      const tree = await this.#bookmarks.getTree();
      if (generation === this.#generation) {
        const root = BookmarkFolderFinder.find(tree, this.#path);
        this.#keys = new Set(root === null ? [] : LinkKeyIndex.#keysOf(root));
      }
    } catch (error) {
      this.#logger.warn('could not read the bookmarks', error);
    }
  }

  static #keysOf(node: BookmarkNode): string[] {
    const own = node.url === undefined ? null : AddressKey.from(node.url);
    return [...(own === null ? [] : [own]), ...(node.children ?? []).flatMap((child) => LinkKeyIndex.#keysOf(child))];
  }
}
