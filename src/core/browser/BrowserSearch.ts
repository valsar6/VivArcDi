import type { ChromeApi } from './BrowserTabs.js';

const FALLBACK_ADDRESS = 'https://duckduckgo.com/?q=';

export class BrowserSearch {
  #chrome: ChromeApi | undefined;

  /**
   * Runs a web search with the default search engine of Vivaldi, through `chrome.search`.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi: ChromeApi | undefined) {
    this.#chrome = chromeApi;
  }

  /**
   * @returns Whether `chrome.search` exists in this document.
   */
  public get available(): boolean {
    return this.#chrome?.search !== undefined;
  }

  /**
   * Searches for a text and shows the results in a tab.
   *
   * @param text What to search for.
   * @param tabId The tab that shows the results.
   * @returns Resolves once the search was requested.
   */
  public run(text: string, tabId: number): Promise<void> {
    const search = this.#chrome?.search;
    if (search === undefined) {
      return Promise.reject(new Error('chrome.search is not available'));
    }
    return new Promise((resolve, reject) => {
      search.query({ text, tabId }, () => {
        const error = this.#chrome?.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * @param text What to search for.
   * @returns The address of a plain web search, for when `chrome.search` is missing.
   */
  public static fallbackAddress(text: string): string {
    return `${FALLBACK_ADDRESS}${encodeURIComponent(text)}`;
  }
}
