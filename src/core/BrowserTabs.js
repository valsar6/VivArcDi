export class BrowserTabs {
  #chrome;

  /**
   * Promise-based access to the `chrome.tabs` API of Vivaldi's interface.
   * Uses callbacks underneath, so it works whether or not the API returns promises.
   *
   * @param {{ tabs?: object, runtime?: { lastError?: { message: string } } } | undefined} chromeApi
   *   The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi) {
    this.#chrome = chromeApi?.tabs ? chromeApi : null;
  }

  /**
   * @returns {boolean} Whether `chrome.tabs` exists in this document.
   */
  get available() {
    return this.#chrome !== null;
  }

  /**
   * @param {number} tabId Tab id.
   * @returns {Promise<chrome.tabs.Tab>} The tab.
   */
  get(tabId) {
    return this.#call('get', tabId);
  }

  /**
   * @param {object} queryInfo Filter, as accepted by `chrome.tabs.query`.
   * @returns {Promise<chrome.tabs.Tab[]>} The matching tabs.
   */
  query(queryInfo) {
    return this.#call('query', queryInfo);
  }

  /**
   * Makes a tab the active one of its window.
   *
   * @param {number} tabId Tab id.
   * @returns {Promise<chrome.tabs.Tab>} The updated tab.
   */
  activate(tabId) {
    return this.#call('update', tabId, { active: true });
  }

  /**
   * Unloads a tab from memory while keeping it in the tab bar.
   *
   * @param {number} tabId Tab id. Chromium refuses to unload the active tab.
   * @returns {Promise<chrome.tabs.Tab>} The unloaded tab.
   */
  discard(tabId) {
    return this.#call('discard', tabId);
  }

  /**
   * Listens to `chrome.tabs.onUpdated`.
   *
   * @param {(tabId: number, change: object, tab: chrome.tabs.Tab) => void} listener Called on every update.
   * @returns {() => void} A function that removes the listener.
   */
  onUpdated(listener) {
    const { onUpdated } = this.#require().tabs;
    onUpdated.addListener(listener);
    return () => onUpdated.removeListener(listener);
  }

  #call(method, ...args) {
    const chromeApi = this.#require();
    return new Promise((resolve, reject) => {
      chromeApi.tabs[method](...args, (result) => {
        const error = chromeApi.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(result);
        }
      });
    });
  }

  #require() {
    if (this.#chrome === null) {
      throw new Error('chrome.tabs is not available');
    }
    return this.#chrome;
  }
}
