import { SavedAddresses } from "./SavedAddresses.js";
class PinWatcher {
  #tabs;
  #addresses;
  #logger;
  #unsubscribe = null;
  /**
   * Gives pinned tabs their own page: the page they show when they are pinned, or when the
   * module first sees them pinned. Unpinning forgets it.
   *
   * @param tabs Tabs API.
   * @param addresses Where own pages are kept.
   * @param logger Reports failures.
   */
  constructor(tabs, addresses, logger) {
    this.#tabs = tabs;
    this.#addresses = addresses;
    this.#logger = logger;
  }
  /**
   * Saves the own page of pinned tabs that have none and starts following pins.
   */
  async start() {
    this.#unsubscribe = this.#tabs.onUpdated((tabId, change, tab) => void this.#follow(tabId, change, tab));
    const pinned = await this.#tabs.query({ pinned: true });
    await Promise.all(pinned.filter((tab) => SavedAddresses.needsAddress(tab)).map((tab) => this.#save(tab)));
  }
  /**
   * Stops following pins.
   */
  stop() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
  async #follow(tabId, change, tab) {
    try {
      if (change.pinned === true && SavedAddresses.needsAddress(tab)) {
        await this.#save(tab);
      } else if (change.pinned === false) {
        await this.#addresses.forget(tabId);
      }
    } catch (error) {
      this.#logger.error(`Could not update the own page of tab ${tabId}`, error);
    }
  }
  async #save(tab) {
    if (tab.id !== void 0 && tab.url !== void 0) {
      await this.#addresses.save(tab.id, tab.url);
    }
  }
}
export {
  PinWatcher
};
