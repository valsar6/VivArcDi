import { AddressKey } from "../../core/AddressKey.js";
import { KeptTab } from "../../core/KeptTab.js";
import { TabData } from "../../core/TabData.js";
class LinkTabAdopter {
  #tabs;
  #links;
  #tabLinks;
  #logger;
  #fresh = /* @__PURE__ */ new Set();
  #queue = Promise.resolve();
  #unsubscribe = [];
  /**
   * Makes a tab the tab of a link when it shows the link's address and the link has no tab in the
   * tab's workspace. It looks at the tabs open at start-up and at every new tab on its first
   * navigation to a web address; a tab that already showed a web page is never adopted, so
   * following a link inside a today's tab does not pull it into a folder.
   *
   * @param tabs Tabs API.
   * @param links The links of the section now.
   * @param tabLinks Writes the link into a tab.
   * @param logger Logger for failures.
   */
  constructor(tabs, links, tabLinks, logger) {
    this.#tabs = tabs;
    this.#links = links;
    this.#tabLinks = tabLinks;
    this.#logger = logger;
  }
  /**
   * Starts watching new tabs. Throws when a tab event is missing.
   */
  start() {
    this.#unsubscribe = [
      this.#tabs.onCreated((tab) => this.#watch(tab)),
      this.#tabs.onUpdated((tabId, change) => this.#navigated(tabId, change)),
      this.#tabs.onRemoved((tabId) => void this.#fresh.delete(tabId))
    ];
  }
  /**
   * Stops watching tabs.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#fresh.clear();
  }
  /**
   * Adopts the tabs of the current window that already show the address of a link with no tab.
   */
  async adoptOpenTabs() {
    try {
      const tabs = await this.#tabs.query({ currentWindow: true });
      const claims = LinkTabAdopter.#claimsOf(tabs);
      for (const tab of tabs) {
        await this.#adopt(tab, AddressKey.from(tab.url ?? tab.pendingUrl), claims);
      }
    } catch (error) {
      this.#logger.warn("could not link the open tabs to the folders", error);
    }
  }
  static #claim(tab, bookmarkId) {
    return `${TabData.of(tab) ?? ""}|${bookmarkId}`;
  }
  static #claimsOf(tabs) {
    return new Set(tabs.flatMap((tab) => {
      const { bookmarkId } = TabData.ownOf(tab);
      return bookmarkId === void 0 ? [] : [LinkTabAdopter.#claim(tab, bookmarkId)];
    }));
  }
  #watch(tab) {
    if (tab.id !== void 0 && AddressKey.from(tab.url) === null) {
      this.#fresh.add(tab.id);
    }
  }
  #navigated(tabId, change) {
    const key = AddressKey.from(change.url);
    if (!this.#fresh.has(tabId) || key === null) {
      return;
    }
    this.#fresh.delete(tabId);
    this.#queue = this.#queue.then(() => this.#adoptNew(tabId, key)).catch((error) => this.#logger.warn("could not link the new tab to a folder", error));
  }
  async #adoptNew(tabId, key) {
    const tab = await this.#tabs.get(tabId);
    const sameWindow = await this.#tabs.query({ windowId: tab.windowId });
    await this.#adopt(tab, key, LinkTabAdopter.#claimsOf(sameWindow));
  }
  async #adopt(tab, key, claims) {
    if (tab.id === void 0 || key === null || KeptTab.is(tab)) {
      return;
    }
    const link = this.#links().find((candidate) => candidate.key === key && !claims.has(LinkTabAdopter.#claim(tab, candidate.id)));
    if (link !== void 0) {
      claims.add(LinkTabAdopter.#claim(tab, link.id));
      await this.#tabLinks.link(tab.id, link.id);
    }
  }
}
export {
  LinkTabAdopter
};
