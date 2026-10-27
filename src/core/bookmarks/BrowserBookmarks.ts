import type { BookmarkNode } from './BookmarkNode.js';

interface BookmarkEvent {
  addListener(listener: () => void): void;
  removeListener(listener: () => void): void;
}

export interface BookmarksApi {
  getTree: (callback: (tree: BookmarkNode[]) => void) => void;
  onCreated?: BookmarkEvent | undefined;
  onRemoved?: BookmarkEvent | undefined;
  onChanged?: BookmarkEvent | undefined;
  onMoved?: BookmarkEvent | undefined;
}

export interface BookmarksHost {
  bookmarks?: BookmarksApi | undefined;
  runtime?: { lastError?: { message?: string } | undefined } | undefined;
}

const CHANGE_EVENTS = ['onCreated', 'onRemoved', 'onChanged', 'onMoved'] as const;

export class BrowserBookmarks {
  #chrome: BookmarksHost | null;

  /**
   * Read-only access to the `chrome.bookmarks` API of Vivaldi's interface. It has no method that
   * creates, changes or deletes a bookmark, so no module can do it through here.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi: BookmarksHost | undefined) {
    this.#chrome = chromeApi?.bookmarks ? chromeApi : null;
  }

  /**
   * @returns Whether `chrome.bookmarks` exists in this document.
   */
  public get available(): boolean {
    return this.#chrome !== null;
  }

  /**
   * @returns The whole bookmark tree.
   */
  public getTree(): Promise<BookmarkNode[]> {
    const { api, host } = this.#require();
    return new Promise((resolve, reject) => {
      api.getTree((tree) => {
        const error = host.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(tree);
        }
      });
    });
  }

  /**
   * Listens to the four events that change the tree: created, removed, changed and moved.
   *
   * @param listener Called after each of them.
   * @returns A function that removes the listeners.
   * @throws {Error} When an event is missing.
   */
  public onChange(listener: () => void): () => void {
    const { api } = this.#require();
    const events = CHANGE_EVENTS.map((name) => {
      const event = api[name];
      if (event === undefined) {
        throw new Error(`chrome.bookmarks.${name} is not available`);
      }
      return event;
    });
    events.forEach((event) => event.addListener(listener));
    return () => events.forEach((event) => event.removeListener(listener));
  }

  #require(): { api: BookmarksApi; host: BookmarksHost } {
    const api = this.#chrome?.bookmarks;
    if (this.#chrome === null || api === undefined) {
      throw new Error('chrome.bookmarks is not available');
    }
    return { api, host: this.#chrome };
  }
}
