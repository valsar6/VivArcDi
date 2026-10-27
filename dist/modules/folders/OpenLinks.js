import { AddressKey } from "../../core/AddressKey.js";
import { FrameTask } from "../../core/FrameTask.js";
import { TabData } from "../../core/TabData.js";
const WATCHED_CHANGES = ["url", "pendingUrl", "discarded", "status", "favIconUrl"];
class OpenLinks {
  #tabs;
  #onChange;
  #logger;
  #task;
  #open = /* @__PURE__ */ new Map();
  #signature = "";
  #unsubscribe = [];
  /**
   * Knows which address is open in a tab of the current window and workspace, so that a link can
   * show a dot and a click can switch to the tab. When several tabs show the same address, the
   * most recently used one counts.
   *
   * @param tabs Tabs API.
   * @param onChange Called when the set of open addresses changes.
   * @param logger Logger for failures.
   * @param timing Frame scheduling, replaceable in tests.
   */
  constructor(tabs, onChange, logger, timing = {}) {
    this.#tabs = tabs;
    this.#onChange = onChange;
    this.#logger = logger;
    this.#task = new FrameTask(() => void this.refresh(), timing);
  }
  /**
   * Reads the tabs and starts following them. Throws when a tab event is missing.
   */
  async start() {
    const request = () => this.#task.request();
    this.#unsubscribe = [
      this.#tabs.onCreated(request),
      this.#tabs.onUpdated((_id, change) => {
        if (WATCHED_CHANGES.some((name) => name in change)) {
          request();
        }
      }),
      this.#tabs.onActivated(request),
      this.#tabs.onRemoved(request)
    ];
    await this.refresh();
  }
  /**
   * Stops following the tabs.
   */
  stop() {
    this.#task.cancel();
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
  }
  /**
   * @param key An address key.
   * @returns The tab that shows that address, or undefined.
   */
  tabFor(key) {
    return this.#open.get(key);
  }
  /**
   * Reads the tabs again and reports a change.
   */
  async refresh() {
    try {
      this.#update(OpenLinks.#visibleByKey(await this.#tabs.query({ currentWindow: true })));
    } catch (error) {
      this.#logger.warn("could not read the open tabs", error);
    }
  }
  static #visibleByKey(tabs) {
    const active = tabs.find((tab) => tab.active);
    const open = /* @__PURE__ */ new Map();
    for (const tab of tabs) {
      const key = AddressKey.from(tab.url ?? tab.pendingUrl);
      if (key !== null && tab.id !== void 0 && (active === void 0 || TabData.shares(tab, active))) {
        open.set(key, OpenLinks.#moreRecent(open.get(key), tab));
      }
    }
    return open;
  }
  static #moreRecent(current, candidate) {
    return current !== void 0 && (current.lastAccessed ?? 0) >= (candidate.lastAccessed ?? 0) ? current : candidate;
  }
  #update(open) {
    const next = /* @__PURE__ */ new Map();
    open.forEach((tab, key) => next.set(key, { tabId: tab.id ?? -1, favIconUrl: tab.favIconUrl }));
    const signature = JSON.stringify([...next]);
    if (signature !== this.#signature) {
      this.#signature = signature;
      this.#open = next;
      this.#onChange();
    }
  }
}
export {
  OpenLinks
};
