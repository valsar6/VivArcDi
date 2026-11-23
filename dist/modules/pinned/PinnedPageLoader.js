import { OwnPage } from "../../shared/tabs/OwnPage.js";
import { UnloadedTabs } from "../../shared/tabs/UnloadedTabs.js";
class PinnedPageLoader {
  #tabs;
  #logger;
  #pending = /* @__PURE__ */ new Set();
  #unloaded = /* @__PURE__ */ new Set();
  #unsubscribe = [];
  /**
   * Loads the pinned page of a pinned tab when it is opened after an unload or a restart, so
   * the page the tab showed last never replaces it. A tab without a pinned page is left alone.
   *
   * @param tabs Tabs API.
   * @param logger Reports a page that could not be loaded.
   */
  constructor(tabs, logger) {
    this.#tabs = tabs;
    this.#logger = logger;
  }
  /**
   * Starts following activations and updates, and reopens the active tab of the window.
   */
  async start() {
    this.#unsubscribe.push(this.#tabs.onActivated(({ tabId }) => void this.#load(tabId)));
    this.#unsubscribe.push(this.#tabs.onUpdated((tabId, change, tab) => void this.#follow(tabId, change, tab)));
    this.#unsubscribe.push(this.#tabs.onRemoved((tabId) => this.#forget(tabId)));
    const [active] = await this.#tabs.query({ active: true, currentWindow: true });
    if (active?.id !== void 0) {
      await this.#load(active.id);
    }
  }
  /**
   * Stops following the tabs.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#pending.clear();
    this.#unloaded.clear();
  }
  async #load(tabId) {
    try {
      const tab = await this.#tabs.get(tabId);
      const page = OwnPage.of(tab);
      if (!tab.pinned || page === null || !this.#wasUnloaded(tabId, tab)) {
        return;
      }
      this.#pending.add(tabId);
      await this.#tabs.update(tabId, { url: page });
    } catch (error) {
      this.#warn(tabId, error);
    }
  }
  async #follow(tabId, change, tab) {
    this.#note(tabId, change);
    if (change.status !== "complete") {
      return;
    }
    this.#unloaded.delete(tabId);
    if (!this.#pending.delete(tabId)) {
      return;
    }
    const page = OwnPage.of(tab);
    if (!tab.pinned || page === null || !OwnPage.isAway(tab)) {
      return;
    }
    try {
      await this.#tabs.update(tabId, { url: page });
    } catch (error) {
      this.#warn(tabId, error);
    }
  }
  #note(tabId, change) {
    if (UnloadedTabs.isUnloaded(change)) {
      this.#unloaded.add(tabId);
    }
  }
  #wasUnloaded(tabId, tab) {
    return this.#unloaded.has(tabId) || UnloadedTabs.isUnloaded(tab);
  }
  #forget(tabId) {
    this.#pending.delete(tabId);
    this.#unloaded.delete(tabId);
  }
  #warn(tabId, error) {
    this.#logger.warn(`Could not load the pinned page of tab ${tabId}`, error);
  }
}
export {
  PinnedPageLoader
};
