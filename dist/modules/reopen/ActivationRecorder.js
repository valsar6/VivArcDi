import { AddressKey } from "./AddressKey.js";
class ActivationRecorder {
  #tabs;
  #store;
  #logger;
  #now;
  #unsubscribe = null;
  /**
   * Records the date each time a Favorite or pinned tab becomes active, by any route.
   *
   * @param tabs Tabs API.
   * @param store Where dates are kept.
   * @param logger Logger for failures.
   * @param now Clock.
   */
  constructor(tabs, store, logger, now = () => /* @__PURE__ */ new Date()) {
    this.#tabs = tabs;
    this.#store = store;
    this.#logger = logger;
    this.#now = now;
  }
  /**
   * Starts listening. Throws when `chrome.tabs.onActivated` is missing.
   */
  start() {
    this.#unsubscribe = this.#tabs.onActivated(({ tabId }) => void this.#record(tabId));
  }
  /**
   * Stops listening.
   */
  stop() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
  async #record(tabId) {
    try {
      const tab = await this.#tabs.get(tabId);
      const key = AddressKey.from(tab.url ?? tab.pendingUrl);
      if (tab.pinned && key !== null) {
        this.#store.record(key, this.#now());
      }
    } catch (error) {
      this.#logger.warn("could not record the last-opened date", error);
    }
  }
}
export {
  ActivationRecorder
};
