import { TabData } from "../../core/TabData.js";
class ActivityStamps {
  #tabs;
  #now;
  #logger;
  #active = /* @__PURE__ */ new Map();
  #windowId = null;
  #unsubscribe = [];
  /**
   * Writes into each tab of this window the time it was last active, under VivArcDi's own key of
   * `vivExtData`, which Vivaldi saves with the session: when a tab stops being the active one,
   * when it is created, and at start for the active tab.
   *
   * @param tabs Tabs API.
   * @param now The current time in milliseconds, replaceable in tests.
   * @param logger Logger for failed writes.
   */
  constructor(tabs, now, logger) {
    this.#tabs = tabs;
    this.#now = now;
    this.#logger = logger;
  }
  /**
   * Stamps the active tab of this window and starts following activations and new tabs.
   */
  async start() {
    const [active] = await this.#tabs.query({ active: true, currentWindow: true });
    if (active?.id !== void 0) {
      this.#windowId = active.windowId;
      this.#active.set(active.windowId, active.id);
      await this.stamp(active.id);
    }
    this.#unsubscribe = [
      this.#tabs.onActivated((info) => this.#activated(info)),
      this.#tabs.onCreated((tab) => this.#created(tab)),
      this.#tabs.onRemoved((tabId) => this.#removed(tabId))
    ];
  }
  /**
   * Stops following the tabs. The stamps stay in the tabs.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#active.clear();
  }
  /**
   * Records now as the last active time of a tab.
   *
   * @param tabId Tab id.
   */
  async stamp(tabId) {
    try {
      const tab = await this.#tabs.get(tabId);
      await this.#tabs.update(tabId, { vivExtData: TabData.withOwn(tab, { lastActive: this.#now() }) });
    } catch (error) {
      this.#logger.warn(`could not record when tab ${tabId} was last active`, error);
    }
  }
  #activated({ tabId, windowId }) {
    if (!this.#isOwnWindow(windowId)) {
      return;
    }
    const left = this.#active.get(windowId);
    this.#active.set(windowId, tabId);
    if (left !== void 0 && left !== tabId) {
      void this.stamp(left);
    }
  }
  #created(tab) {
    if (tab.id !== void 0 && this.#isOwnWindow(tab.windowId)) {
      void this.stamp(tab.id);
    }
  }
  #removed(tabId) {
    for (const [windowId, active] of this.#active) {
      if (active === tabId) {
        this.#active.delete(windowId);
      }
    }
  }
  #isOwnWindow(windowId) {
    return this.#windowId === null || this.#windowId === windowId;
  }
}
export {
  ActivityStamps
};
