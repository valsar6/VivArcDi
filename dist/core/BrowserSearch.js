const FALLBACK_ADDRESS = "https://duckduckgo.com/?q=";
class BrowserSearch {
  #chrome;
  /**
   * Runs a web search with the default search engine of Vivaldi, through `chrome.search`.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi) {
    this.#chrome = chromeApi;
  }
  /**
   * @returns Whether `chrome.search` exists in this document.
   */
  get available() {
    return this.#chrome?.search !== void 0;
  }
  /**
   * Searches for a text and shows the results in a tab.
   *
   * @param text What to search for.
   * @param tabId The tab that shows the results.
   * @returns Resolves once the search was requested.
   */
  run(text, tabId) {
    const search = this.#chrome?.search;
    if (search === void 0) {
      return Promise.reject(new Error("chrome.search is not available"));
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
  static fallbackAddress(text) {
    return `${FALLBACK_ADDRESS}${encodeURIComponent(text)}`;
  }
}
export {
  BrowserSearch
};
