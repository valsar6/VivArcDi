import type { ChromeApi } from './BrowserTabs.js';

export interface HistoryItem {
  url?: string | undefined;
  title?: string | undefined;
  lastVisitTime?: number | undefined;
}

export class BrowserHistory {
  #chrome: ChromeApi | undefined;

  /**
   * Read-only access to `chrome.history.search` of Vivaldi's interface. It has no method that
   * changes or deletes the history.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi: ChromeApi | undefined) {
    this.#chrome = chromeApi;
  }

  /**
   * @returns Whether `chrome.history` exists in this document.
   */
  public get available(): boolean {
    return this.#chrome?.history !== undefined;
  }

  /**
   * Looks for visited pages.
   *
   * @param text What the title or the address contains; empty for the most recent pages.
   * @param maxResults The most pages to return.
   * @returns The pages, newest first.
   */
  public search(text: string, maxResults: number): Promise<HistoryItem[]> {
    const history = this.#chrome?.history;
    if (history === undefined) {
      return Promise.reject(new Error('chrome.history is not available'));
    }
    return new Promise((resolve, reject) => {
      history.search({ text, maxResults, startTime: 0 }, (items: HistoryItem[]) => {
        const error = this.#chrome?.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(items);
        }
      });
    });
  }
}
