import { AddressKey } from "./AddressKey.js";
const START_PAGES = ["chrome://vivaldi-webui/startpage", "vivaldi://startpage", "chrome://newtab", "about:blank"];
class NewTabWatcher {
  #events;
  #onNavigate;
  #watched = /* @__PURE__ */ new Set();
  #unsubscribe = [];
  /**
   * Watches tabs that the user opens empty, with Cmd/Ctrl+T or the "+" button,
   * and reports their first navigation to a web address, once per tab.
   * Tabs opened from links, by extensions or by session restore carry an opener or an address
   * and are never watched.
   *
   * @param events Tab events.
   * @param onNavigate Called with the first web navigation of a watched tab.
   */
  constructor(events, onNavigate) {
    this.#events = events;
    this.#onNavigate = onNavigate;
  }
  /**
   * @param tab A tab just created.
   * @returns Whether it is an empty tab opened by the user.
   */
  static isEmptyNewTab(tab) {
    return tab.openerTabId === void 0 && NewTabWatcher.#isStartPage(tab.pendingUrl ?? tab.url);
  }
  /**
   * Starts listening. Throws when an event is not available.
   */
  start() {
    this.#unsubscribe = [
      this.#events.onCreated((tab) => this.#watch(tab)),
      this.#events.onUpdated((tabId, change, tab) => this.#check(tabId, change, tab))
    ];
  }
  /**
   * Stops listening and forgets every watched tab.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#watched.clear();
  }
  static #isStartPage(url) {
    return url === void 0 || url === "" || START_PAGES.some((page) => url.startsWith(page));
  }
  #watch(tab) {
    if (tab.id !== void 0 && NewTabWatcher.isEmptyNewTab(tab)) {
      this.#watched.add(tab.id);
    }
  }
  #check(tabId, change, tab) {
    const { url } = change;
    if (url === void 0 || !this.#watched.has(tabId) || NewTabWatcher.#isStartPage(url)) {
      return;
    }
    this.#watched.delete(tabId);
    if (AddressKey.from(url) !== null) {
      this.#onNavigate({ tab, url });
    }
  }
}
export {
  NewTabWatcher
};
