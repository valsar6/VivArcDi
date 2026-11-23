import type { BookmarkWriter } from '../../core/browser/bookmarks/BookmarkWriter.js';
import type { PinnedPageStore } from './PinnedAddress.js';
import type { LinkedTab } from './LinkedTab.js';

export interface BookmarkPinnedStoreDependencies {
  writer: Pick<BookmarkWriter, 'get' | 'setUrl'>;
  linkedTab: Pick<LinkedTab, 'of'>;
}

export class BookmarkPinnedStore implements PinnedPageStore {
  #deps: BookmarkPinnedStoreDependencies;

  /**
   * The `Edit Pinned Page` store of 056 and 057: the page a saved link opens first is the address
   * of its bookmark, and the open tab is the one linked to that bookmark.
   *
   * @param dependencies The bookmark writer and the link that finds the open tab.
   */
  constructor(dependencies: BookmarkPinnedStoreDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param id The bookmark id of the link.
   * @returns The address of the bookmark, if it has one.
   */
  public async read(id: string): Promise<string | undefined> {
    return (await this.#deps.writer.get(id)).url;
  }

  /**
   * @param id The bookmark id of the link.
   * @param url The address the link opens first.
   */
  public async write(id: string, url: string): Promise<void> {
    await this.#deps.writer.setUrl(id, url);
  }

  /**
   * @param id The bookmark id of the link.
   * @returns Its open tab, if it has one.
   */
  public async tab(id: string): Promise<chrome.tabs.Tab | undefined> {
    return this.#deps.linkedTab.of(id);
  }
}
