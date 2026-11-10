class BrowserWindows {
  #chrome;
  #windows;
  /**
   * Promise-based access to `chrome.windows`, with the parts Little Arc needs.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi) {
    this.#chrome = chromeApi;
    this.#windows = chromeApi?.windows ?? null;
  }
  /**
   * @returns Whether `chrome.windows` exists in this document.
   */
  get available() {
    return this.#windows !== null;
  }
  /**
   * Creates a window, or moves an existing tab into a new one when `tabId` is given.
   *
   * @param properties As accepted by `chrome.windows.create`.
   * @returns The new window.
   */
  create(properties) {
    return this.#call("create", properties);
  }
  /**
   * @returns The window this document belongs to.
   */
  current() {
    return this.#call("getCurrent");
  }
  /**
   * @param types The window types to consider, such as `['normal']`.
   * @returns The window that had the focus last among those types.
   */
  lastFocused(types) {
    return this.#call("getLastFocused", { windowTypes: types });
  }
  /**
   * @returns The ids of the normal windows that are not private, in ascending order.
   */
  async normalIds() {
    const windows = await this.#call("getAll", { windowTypes: ["normal"] });
    return windows.filter((details) => details.incognito !== true).flatMap(({ id }) => id === void 0 ? [] : [id]).sort((left, right) => left - right);
  }
  /**
   * Closes a window with all its tabs.
   *
   * @param windowId Window id.
   */
  async remove(windowId) {
    await this.#call("remove", windowId);
  }
  /**
   * Listens to focus changes; the id is -1 when no window of the browser has the focus.
   *
   * @param listener Called with the id of the window that got the focus.
   * @returns A function that removes the listener.
   * @throws {Error} When `chrome.windows.onFocusChanged` is missing.
   */
  onFocusChanged(listener) {
    const event = this.#windows?.onFocusChanged;
    if (event === void 0) {
      throw new Error("chrome.windows.onFocusChanged is not available");
    }
    event.addListener(listener);
    return () => event.removeListener(listener);
  }
  #call(method, ...args) {
    const windows = this.#windows;
    const call = windows?.[method];
    if (windows === null || call === void 0) {
      return Promise.reject(new Error(`chrome.windows.${method} is not available`));
    }
    return new Promise((resolve, reject) => {
      call.call(windows, ...args, (result) => {
        const error = this.#chrome?.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(result);
        }
      });
    });
  }
}
export {
  BrowserWindows
};
