import { AddressKey } from "../../core/AddressKey.js";
import { OwnPage } from "../../core/OwnPage.js";
const currentDate = () => /* @__PURE__ */ new Date();
const isPinned = (tab) => tab.pinned;
class ActivationRecorder {
  #tabs;
  #store;
  #logger;
  #now;
  #isTracked;
  #unsubscribe = null;
  /**
   * Records the date each time a tracked tab (a Favorite or pinned tab, or a bookmark link) becomes active, by any route.
   *
   * @param tabs Tabs API.
   * @param store Where dates are kept.
   * @param logger Logger for failures.
   * @param options Clock and the choice of tracked tabs.
   */
  constructor(tabs, store, logger, { now = currentDate, isTracked = isPinned } = {}) {
    this.#tabs = tabs;
    this.#store = store;
    this.#logger = logger;
    this.#now = now;
    this.#isTracked = isTracked;
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
      const key = tab.pinned ? OwnPage.keyOf(tab) : AddressKey.from(tab.url ?? tab.pendingUrl);
      if (key !== null && this.#isTracked(tab, key)) {
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
