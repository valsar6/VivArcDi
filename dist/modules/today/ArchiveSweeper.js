import { TabData } from "../../core/TabData.js";
import { ActivityClock } from "./ActivityClock.js";
import { TodayTabPolicy } from "./TodayTabPolicy.js";
const SWEEP_INTERVAL_MS = 6e4;
const repeatEvery = (run, intervalMs) => {
  const handle = setInterval(run, intervalMs);
  return () => clearInterval(handle);
};
class ArchiveSweeper {
  #deps;
  #queue = Promise.resolve();
  #cancel = null;
  /**
   * Closes Today tabs into the archive: once a minute those inactive for too long, and on request
   * every Today tab of the current workspace. A tab is saved to the archive before it is closed,
   * so a tab whose entry cannot be saved stays open.
   *
   * @param dependencies Everything the sweeper collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Sweeps a minute from now and then once a minute.
   */
  start() {
    this.#cancel ??= this.#deps.repeat(() => void this.sweep(), SWEEP_INTERVAL_MS);
  }
  /**
   * Stops sweeping.
   */
  stop() {
    this.#cancel?.();
    this.#cancel = null;
  }
  /**
   * Archives every Today tab of this window inactive past the limit. A tab never stamped is
   * stamped instead, so that its time starts now.
   *
   * @returns Settles once the sweep is over; sweeps and clears run one at a time.
   */
  sweep() {
    return this.#enqueue(() => this.#sweepNow());
  }
  /**
   * Archives now, whatever their age, the Today tabs of the active tab's workspace. The active
   * tab is never among them.
   *
   * @returns Settles once the tabs are archived.
   */
  clear() {
    return this.#enqueue(() => this.#clearNow());
  }
  #enqueue(job) {
    this.#queue = this.#queue.then(job).catch((error) => this.#deps.logger.warn("the archive sweep failed", error));
    return this.#queue;
  }
  async #sweepNow() {
    const now = this.#deps.now();
    const stale = [];
    for (const tab of (await this.#windowTabs()).filter((candidate) => TodayTabPolicy.isArchivable(candidate))) {
      const lastActive = ActivityClock.lastActiveOf(tab);
      if (lastActive === null) {
        await this.#deps.stamps.stamp(tab.id);
      } else if (now - lastActive >= this.#deps.limitMs) {
        stale.push(tab);
      }
    }
    await this.#archive(stale);
  }
  async #clearNow() {
    const windowTabs = await this.#windowTabs();
    const active = windowTabs.find((tab) => tab.active);
    if (active === void 0) {
      return;
    }
    const workspace = TabData.of(active);
    await this.#archive(windowTabs.filter((tab) => TodayTabPolicy.isArchivable(tab) && TabData.of(tab) === workspace));
  }
  async #windowTabs() {
    const windowTabs = await this.#deps.tabs.query({ currentWindow: true });
    return windowTabs.filter((tab) => tab.id !== void 0);
  }
  async #archive(tabs) {
    if (tabs.length === 0) {
      return;
    }
    const archivedAt = this.#deps.now();
    try {
      this.#deps.store.add(tabs.map((tab) => ArchiveSweeper.#entryOf(tab, archivedAt)));
    } catch (error) {
      this.#deps.logger.warn("could not save to the archive: the tabs stay open", error);
      return;
    }
    for (const tab of tabs) {
      await this.#deps.tabs.remove(tab.id).catch((error) => this.#deps.logger.warn(`could not close tab ${tab.id}`, error));
    }
  }
  static #entryOf(tab, archivedAt) {
    const url = tab.url ?? "";
    return { url, title: tab.title ?? url, favIconUrl: tab.favIconUrl ?? null, workspace: TabData.of(tab), archivedAt };
  }
}
export {
  ArchiveSweeper,
  repeatEvery
};
