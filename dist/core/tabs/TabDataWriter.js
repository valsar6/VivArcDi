import { Logger } from "../support/Logger.js";
class TabDataWriter {
  static #instances = /* @__PURE__ */ new WeakMap();
  #tabs;
  #logger;
  #warned = false;
  #queues = /* @__PURE__ */ new Map();
  /**
   * Writes the `vivExtData` of tabs one write at a time for each tab, so that two modules never
   * overwrite each other's keys with a copy of the tab that went stale while they waited.
   *
   * A tab that belongs to another window is left alone, so two windows never both write it.
   *
   * @param tabs Tabs API.
   * @param logger Where skipped writes and an unreadable window id are reported.
   */
  constructor(tabs, logger = new Logger("VivArcDi:tab-data")) {
    this.#tabs = tabs;
    this.#logger = logger;
  }
  /**
   * @param tabs The tabs API of a window; the same object gives the same writer.
   * @returns The writer shared by every module that uses that tabs API.
   */
  static of(tabs) {
    const existing = TabDataWriter.#instances.get(tabs);
    if (existing !== void 0) {
      return existing;
    }
    const created = new TabDataWriter(tabs);
    TabDataWriter.#instances.set(tabs, created);
    return created;
  }
  /**
   * Queues a change of a tab's `vivExtData`. When its turn comes, the tab is read again, the
   * change builds the new text from that fresh copy, and the text is written.
   *
   * @param tabId The tab.
   * @param change Builds the new `vivExtData` text from the tab as just read; null writes nothing.
   * @returns Resolves once the write is done; rejects when it fails, without blocking later writes.
   */
  write(tabId, change) {
    const previous = this.#queues.get(tabId) ?? Promise.resolve();
    const run = previous.then(() => this.#apply(tabId, change));
    const settled = run.catch(() => void 0);
    this.#queues.set(tabId, settled);
    void settled.then(() => {
      if (this.#queues.get(tabId) === settled) {
        this.#queues.delete(tabId);
      }
    });
    return run;
  }
  async #apply(tabId, change) {
    const tab = await this.#tabs.get(tabId);
    const own = await this.#own();
    if (own !== null && tab.windowId !== own) {
      this.#logger.debug(`skipped tab ${tabId}: it belongs to window ${tab.windowId}`);
      return;
    }
    const data = change(tab);
    if (data !== null) {
      await this.#tabs.update(tabId, { vivExtData: data });
    }
  }
  async #own() {
    if (this.#tabs.ownWindowId === void 0) {
      return null;
    }
    const own = await this.#tabs.ownWindowId();
    if (own === null && !this.#warned) {
      this.#warned = true;
      this.#logger.warn("cannot read the window id: writing tabs of any window");
    }
    return own;
  }
}
export {
  TabDataWriter
};
