class BrowserRuntime {
  #chrome;
  #onMessage;
  #windows;
  /**
   * Access to `chrome.runtime` messages and `chrome.windows` from Vivaldi's interface.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi) {
    this.#chrome = chromeApi;
    this.#onMessage = chromeApi?.runtime?.onMessage ?? null;
    this.#windows = chromeApi?.windows ?? null;
  }
  /**
   * @returns Whether messages from injected scripts can be received.
   */
  get messagesAvailable() {
    return this.#onMessage !== null;
  }
  /**
   * Listens to messages sent with `chrome.runtime.sendMessage`.
   *
   * @param listener Called with each message.
   * @returns A function that removes the listener.
   * @throws {Error} When `chrome.runtime.onMessage` is missing.
   */
  onMessage(listener) {
    const event = this.#onMessage;
    if (event === null) {
      throw new Error("chrome.runtime.onMessage is not available");
    }
    event.addListener(listener);
    return () => event.removeListener(listener);
  }
  /**
   * Opens a URL in a new browser window.
   *
   * @param url Address to open.
   * @returns Resolves once the window was requested.
   */
  openWindow(url) {
    const windows = this.#windows;
    if (windows === null) {
      return Promise.reject(new Error("chrome.windows is not available"));
    }
    return new Promise((resolve) => windows.create({ url }, () => resolve()));
  }
  /**
   * @returns Whether this window is a private window.
   * @throws {Error} When `chrome.windows.getCurrent` is missing or fails.
   */
  async isPrivateWindow() {
    return (await this.#currentWindow()).incognito === true;
  }
  /**
   * @returns The id of this window, as `chrome.tabs` knows it.
   * @throws {Error} When `chrome.windows.getCurrent` is missing or fails, or gives no id.
   */
  async currentWindowId() {
    const { id } = await this.#currentWindow();
    if (id === void 0) {
      throw new Error("The current window has no id");
    }
    return id;
  }
  #currentWindow() {
    const getCurrent = this.#windows?.getCurrent;
    if (getCurrent === void 0) {
      return Promise.reject(new Error("chrome.windows.getCurrent is not available"));
    }
    return new Promise((resolve, reject) => {
      getCurrent.call(this.#windows, (info) => {
        const error = this.#chrome?.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(info ?? {});
        }
      });
    });
  }
}
export {
  BrowserRuntime
};
