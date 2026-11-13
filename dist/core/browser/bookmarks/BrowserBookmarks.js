const CHANGE_EVENTS = ["onCreated", "onRemoved", "onChanged", "onMoved"];
class BrowserBookmarks {
  #chrome;
  /**
   * Read-only access to the `chrome.bookmarks` API of Vivaldi's interface. It has no method that
   * creates, changes or deletes a bookmark, so no module can do it through here.
   *
   * @param chromeApi The global `chrome` object, or undefined where it does not exist.
   */
  constructor(chromeApi) {
    this.#chrome = chromeApi?.bookmarks ? chromeApi : null;
  }
  /**
   * @returns Whether `chrome.bookmarks` exists in this document.
   */
  get available() {
    return this.#chrome !== null;
  }
  /**
   * @returns The whole bookmark tree.
   */
  getTree() {
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
   * Looks for bookmarks whose title or address contains the text.
   *
   * @param text The text to look for.
   * @returns The matching bookmarks and folders, in the order Vivaldi gives.
   * @throws {Error} When `chrome.bookmarks.search` is missing.
   */
  search(text) {
    const { api, host } = this.#require();
    const search = api.search;
    if (search === void 0) {
      return Promise.reject(new Error("chrome.bookmarks.search is not available"));
    }
    return new Promise((resolve, reject) => {
      search.call(api, text, (nodes) => {
        const error = host.runtime?.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(nodes);
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
  onChange(listener) {
    const { api } = this.#require();
    const events = CHANGE_EVENTS.map((name) => {
      const event = api[name];
      if (event === void 0) {
        throw new Error(`chrome.bookmarks.${name} is not available`);
      }
      return event;
    });
    events.forEach((event) => event.addListener(listener));
    return () => events.forEach((event) => event.removeListener(listener));
  }
  #require() {
    const api = this.#chrome?.bookmarks;
    if (this.#chrome === null || api === void 0) {
      throw new Error("chrome.bookmarks is not available");
    }
    return { api, host: this.#chrome };
  }
}
export {
  BrowserBookmarks
};
