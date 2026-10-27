class BrowserTabs {
  #chrome;
  /**
   * Promise-based access to the `chrome.tabs` API of Vivaldi's interface.
   * Uses callbacks underneath, so it works whether or not the API returns promises.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi) {
    this.#chrome = chromeApi?.tabs ? chromeApi : null;
  }
  /**
   * @returns Whether `chrome.tabs` exists in this document.
   */
  get available() {
    return this.#chrome !== null;
  }
  /**
   * @param tabId Tab id.
   * @returns The tab.
   */
  get(tabId) {
    return this.#call("get", tabId);
  }
  /**
   * @param queryInfo Filter, as accepted by `chrome.tabs.query`.
   * @returns The matching tabs.
   */
  query(queryInfo) {
    return this.#call("query", queryInfo);
  }
  /**
   * Makes a tab the active one of its window.
   *
   * @param tabId Tab id.
   * @returns The updated tab.
   */
  activate(tabId) {
    return this.#call("update", tabId, { active: true });
  }
  /**
   * Creates a tab.
   *
   * @param properties As accepted by `chrome.tabs.create`.
   * @returns The new tab.
   */
  create(properties) {
    return this.#call("create", properties);
  }
  /**
   * Changes a tab, including Vivaldi's own properties such as `vivExtData`.
   *
   * @param tabId Tab id.
   * @param properties Properties to change.
   * @returns The updated tab.
   */
  update(tabId, properties) {
    return this.#call("update", tabId, properties);
  }
  /**
   * Unloads a tab from memory while keeping it in the tab bar.
   *
   * @param tabId Tab id. Chromium refuses to unload the active tab.
   * @returns The unloaded tab.
   */
  discard(tabId) {
    return this.#call("discard", tabId);
  }
  /**
   * Loads a tab's page again, which also brings an unloaded tab back into memory.
   *
   * @param tabId Tab id.
   */
  async reload(tabId) {
    await this.#call("reload", tabId);
  }
  /**
   * Closes a tab.
   *
   * @param tabId Tab id.
   */
  async remove(tabId) {
    await this.#call("remove", tabId);
  }
  /**
   * Listens to `chrome.tabs.onUpdated`.
   *
   * @param listener Called on every update.
   * @returns A function that removes the listener.
   */
  onUpdated(listener) {
    const { onUpdated } = this.#requireTabs();
    onUpdated.addListener(listener);
    return () => onUpdated.removeListener(listener);
  }
  /**
   * Listens to `chrome.tabs.onActivated`.
   *
   * @param listener Called when the active tab of a window changes.
   * @returns A function that removes the listener.
   */
  onActivated(listener) {
    const { onActivated } = this.#requireTabs();
    if (onActivated === void 0) {
      throw new Error("chrome.tabs.onActivated is not available");
    }
    onActivated.addListener(listener);
    return () => onActivated.removeListener(listener);
  }
  /**
   * Listens to `chrome.tabs.onCreated`.
   *
   * @param listener Called with every new tab.
   * @returns A function that removes the listener.
   */
  onCreated(listener) {
    const { onCreated } = this.#requireTabs();
    if (onCreated === void 0) {
      throw new Error("chrome.tabs.onCreated is not available");
    }
    onCreated.addListener(listener);
    return () => onCreated.removeListener(listener);
  }
  /**
   * Listens to `chrome.tabs.onRemoved`.
   *
   * @param listener Called with the id of every closed tab.
   * @returns A function that removes the listener.
   */
  onRemoved(listener) {
    const { onRemoved } = this.#requireTabs();
    if (onRemoved === void 0) {
      throw new Error("chrome.tabs.onRemoved is not available");
    }
    onRemoved.addListener(listener);
    return () => onRemoved.removeListener(listener);
  }
  #call(method, ...args) {
    const chromeApi = this.#require();
    const tabs = this.#requireTabs();
    return new Promise((resolve, reject) => {
      tabs[method](...args, (result) => {
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
      throw new Error("chrome.tabs is not available");
    }
    return this.#chrome;
  }
  #requireTabs() {
    const { tabs } = this.#require();
    if (tabs === void 0) {
      throw new Error("chrome.tabs is not available");
    }
    return tabs;
  }
}
export {
  BrowserTabs
};
