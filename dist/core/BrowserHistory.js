class BrowserHistory {
  #chrome;
  /**
   * Read-only access to `chrome.history.search` of Vivaldi's interface. It has no method that
   * changes or deletes the history.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi) {
    this.#chrome = chromeApi;
  }
  /**
   * @returns Whether `chrome.history` exists in this document.
   */
  get available() {
    return this.#chrome?.history !== void 0;
  }
  /**
   * Looks for visited pages.
   *
   * @param text What the title or the address contains; empty for the most recent pages.
   * @param maxResults The most pages to return.
   * @returns The pages, newest first.
   */
  search(text, maxResults) {
    const history = this.#chrome?.history;
    if (history === void 0) {
      return Promise.reject(new Error("chrome.history is not available"));
    }
    return new Promise((resolve, reject) => {
      history.search({ text, maxResults, startTime: 0 }, (items) => {
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
export {
  BrowserHistory
};
