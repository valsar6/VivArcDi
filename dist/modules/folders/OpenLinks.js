import { AddressKey } from "../../core/AddressKey.js";
import { FrameTask } from "../../core/FrameTask.js";
import { TabData } from "../../core/TabData.js";
import { UnloadedTabs } from "../favorites/UnloadedTabs.js";
const WATCHED_CHANGES = ["url", "pendingUrl", "discarded", "status", "favIconUrl", "title", "vivExtData"];
class OpenLinks {
  #tabs;
  #onChange;
  #logger;
  #task;
  #linkedTabIds = [];
  #linked = /* @__PURE__ */ new Map();
  #unlinked = /* @__PURE__ */ new Map();
  #signature = "";
  #unsubscribe = [];
  /**
   * Knows which tab stands for each link in the current window and workspace, so that a link can
   * show its tab and a click can switch to it. A tab belongs to the link whose bookmark id it
   * carries, whatever page it shows. A tab with no bookmark id at all belongs to the link that has
   * its address, until the tab is linked. When several tabs qualify, the most recently used one
   * counts.
   *
   * @param tabs Tabs API.
   * @param onChange Called when the tabs of the links change.
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
   * @returns The ids of the tabs of the window that carry a bookmark id, in any workspace.
   */
  get linkedTabIds() {
    return this.#linkedTabIds;
  }
  /**
   * @param link A link of the section.
   * @returns The tab linked to it, else the unlinked tab that shows its address, or undefined.
   */
  tabFor(link) {
    return this.#linked.get(link.id) ?? this.#unlinked.get(link.key);
  }
  /**
   * Reads the tabs again and reports a change.
   */
  async refresh() {
    try {
      this.#update(await this.#tabs.query({ currentWindow: true }));
    } catch (error) {
      this.#logger.warn("could not read the open tabs", error);
    }
  }
  static #bookmarkIdOf(tab) {
    return TabData.ownOf(tab).bookmarkId;
  }
  static #openTab(tab) {
    return {
      tabId: tab.id ?? -1,
      title: tab.title,
      key: AddressKey.from(tab.url ?? tab.pendingUrl),
      favIconUrl: tab.favIconUrl,
      active: tab.active,
      unloaded: UnloadedTabs.isUnloaded(tab)
    };
  }
  static #moreRecent(current, candidate) {
    return current !== void 0 && (current.lastAccessed ?? 0) >= (candidate.lastAccessed ?? 0) ? current : candidate;
  }
  static #byGroup(tabs, groupOf) {
    const chosen = /* @__PURE__ */ new Map();
    for (const tab of tabs) {
      const group = groupOf(tab);
      if (group !== null && group !== void 0) {
        chosen.set(group, OpenLinks.#moreRecent(chosen.get(group), tab));
      }
    }
    return new Map([...chosen].map(([group, tab]) => [group, OpenLinks.#openTab(tab)]));
  }
  #update(tabs) {
    const linkedTabIds = tabs.filter((tab) => OpenLinks.#bookmarkIdOf(tab) !== void 0).flatMap((tab) => tab.id === void 0 ? [] : [tab.id]);
    const active = tabs.find((tab) => tab.active);
    const visible = tabs.filter((tab) => tab.id !== void 0 && (active === void 0 || TabData.shares(tab, active)));
    const linked = OpenLinks.#byGroup(visible, OpenLinks.#bookmarkIdOf);
    const unlinked = OpenLinks.#byGroup(
      visible.filter((tab) => OpenLinks.#bookmarkIdOf(tab) === void 0),
      (tab) => AddressKey.from(tab.url ?? tab.pendingUrl)
    );
    const signature = JSON.stringify([linkedTabIds, [...linked], [...unlinked]]);
    if (signature !== this.#signature) {
      this.#signature = signature;
      this.#linkedTabIds = linkedTabIds;
      this.#linked = linked;
      this.#unlinked = unlinked;
      this.#onChange();
    }
  }
}
export {
  OpenLinks
};
