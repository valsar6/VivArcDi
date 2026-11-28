import { TabData } from "../../core/tabs/TabData.js";
import { ActivityClock } from "./ActivityClock.js";
import { TodayTabPolicy } from "./TodayTabPolicy.js";
const SWEEP_INTERVAL_MS = 6e4;
const KEPT_KEY = "today-archive-kept";
const KEPT_TEXT = "Today tabs stay open: VivArcDi cannot save the archive";
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
   * Archives now, whatever their age, the Today tabs of the active tab's workspace, the active
   * tab included. When no tab of the workspace would stay open, a blank tab is opened first.
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
    const closing = windowTabs.filter((tab) => TodayTabPolicy.isClearable(tab) && TabData.of(tab) === workspace);
    const staying = windowTabs.filter((tab) => TabData.of(tab) === workspace && !closing.includes(tab));
    const nearest = ArchiveSweeper.#nearestTo(active, staying, windowTabs);
    await this.#archive(closing, nearest === void 0 ? () => this.#deps.blank.open(null, workspace, {}, active.windowId) : () => this.#show(nearest));
  }
  async #show(tab) {
    await this.#deps.tabs.update(tab.id, { active: true });
    return void 0;
  }
  static #nearestTo(active, candidates, windowTabs) {
    const position = windowTabs.indexOf(active);
    const distance = (tab) => Math.abs(windowTabs.indexOf(tab) - position);
    return candidates.reduce((best, tab) => best === void 0 || distance(tab) < distance(best) ? tab : best, void 0);
  }
  async #windowTabs() {
    const windowTabs = await this.#deps.tabs.query({ currentWindow: true });
    return windowTabs.filter((tab) => tab.id !== void 0);
  }
  async #archive(tabs, beforeClose) {
    if (tabs.length === 0) {
      return;
    }
    const archivedAt = this.#deps.now();
    const outcome = await this.#deps.store.add(tabs.map((tab) => ArchiveSweeper.#entryOf(tab, archivedAt)));
    if (outcome !== "saved") {
      this.#deps.logger.warn(`could not save to the archive (${outcome}): the tabs stay open`);
      this.#deps.notices.once(KEPT_KEY, KEPT_TEXT, "error");
      return;
    }
    let blank;
    try {
      blank = await beforeClose?.();
    } catch (error) {
      this.#deps.logger.warn("could not show another tab or open a blank one: the Today tabs stay open", error);
      return;
    }
    for (const tab of tabs) {
      await this.#deps.tabs.remove(tab.id).catch((error) => this.#deps.logger.warn(`could not close tab ${tab.id}`, error));
    }
    if (blank?.id !== void 0) {
      await this.#deps.tabs.update(blank.id, { active: true }).catch((error) => this.#deps.logger.warn("could not show the blank tab", error));
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
