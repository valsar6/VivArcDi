import { Module } from "../../core/Module.js";
import { WorkspaceTabs } from "../../core/WorkspaceTabs.js";
import { ActivityStamps } from "./ActivityStamps.js";
import { ArchiveButton } from "./ArchiveButton.js";
import { ArchiveKeys } from "./ArchiveKeys.js";
import { ArchivePanelView } from "./ArchivePanelView.js";
import { ArchiveRestorer } from "./ArchiveRestorer.js";
import { ArchiveStore } from "./ArchiveStore.js";
import { ArchiveSweeper, repeatEvery } from "./ArchiveSweeper.js";
import { ClearButton } from "./ClearButton.js";
const HOUR_MS = 36e5;
const DEFAULT_HOURS = 12;
const MIN_HOURS = 1;
const MAX_HOURS = 720;
const DEFAULT_LIMIT = 500;
const MIN_LIMIT = 50;
const MAX_LIMIT = 5e3;
const SYSTEM_CLOCK = { now: () => Date.now(), repeat: repeatEvery };
class TodayArchive extends Module {
  static id = "today-archive";
  #clock;
  #stops = [];
  #store = null;
  #sweeper = null;
  #panel = null;
  /**
   * @param clock Time and timers, replaceable in tests.
   */
  constructor(clock = SYSTEM_CLOCK) {
    super();
    this.#clock = clock;
  }
  /**
   * Archives Today tabs as in Arc: a tab inactive for `archiveAfterHours` is saved to the archive
   * and closed, "Clear" on the pinned separator archives the workspace's Today tabs at once, and
   * the archive opens from a tab bar button and Cmd/Ctrl+Shift+A. Without `chrome.tabs` it stays
   * off and closes nothing.
   *
   * @param context What the module may use.
   */
  async start(context) {
    const { tabs, logger, options, storage } = context;
    if (!tabs.available) {
      logger.warn("chrome.tabs is missing: the archive is off");
      return;
    }
    const limitMs = TodayArchive.#number(options["archiveAfterHours"], DEFAULT_HOURS, MIN_HOURS, MAX_HOURS) * HOUR_MS;
    const store = new ArchiveStore(storage, TodayArchive.#number(options["archiveLimit"], DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT), logger);
    store.load();
    this.#store = store;
    try {
      const stamps = new ActivityStamps(tabs, this.#clock.now, logger);
      this.#stops.push(() => stamps.stop());
      await stamps.start();
      this.#sweeper = new ArchiveSweeper({ tabs, store, stamps, limitMs, now: this.#clock.now, repeat: this.#clock.repeat, logger });
      this.#sweeper.start();
      this.#stops.push(() => this.#sweeper?.stop());
      await this.#startInterface(context, new ArchiveRestorer(new WorkspaceTabs(tabs, logger), store, logger));
    } catch (error) {
      this.stop();
      logger.warn("the archive is off", error);
    }
  }
  /**
   * Stops sweeping and removes the panel, the buttons and every listener. The archive and the
   * stamps in the tabs stay.
   */
  stop() {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
    this.#sweeper = null;
    this.#panel = null;
    this.#store = null;
  }
  async #startInterface(context, restorer) {
    const { document, selectors, logger } = context;
    const browser = document.querySelector(selectors.get("browser"));
    if (browser === null) {
      logger.warn("the browser element is missing: the archive panel is off");
      return;
    }
    const panel = new ArchivePanelView(
      document,
      browser,
      {
        onRestore: (entry) => this.#restore(restorer, entry),
        onArchiveToday: () => void this.#clear(),
        onClose: () => panel.close()
      },
      document.defaultView?.navigator.language ?? "en"
    );
    this.#panel = panel;
    this.#stops.push(() => panel.close());
    const toggle = () => this.#toggle(context);
    const frames = this.#clock.frames === void 0 ? {} : { timing: this.#clock.frames };
    const clear = new ClearButton(document, browser, () => void this.#clear(), frames);
    this.#startPart(clear);
    if (selectors.has("tabsContainer")) {
      this.#startPart(new ArchiveButton(document, selectors.get("tabsContainer"), toggle, { root: browser, ...frames }));
    }
    const keys = new ArchiveKeys(context, toggle);
    this.#stops.push(() => keys.stop());
    await keys.start();
  }
  #startPart(part) {
    this.#stops.push(() => part.stop());
    part.start();
  }
  #toggle({ document, selectors }) {
    const panel = this.#panel;
    if (panel === null || this.#store === null) {
      return;
    }
    if (panel.isOpen) {
      panel.close();
      return;
    }
    const bar = document.querySelector(selectors.get("tabBar")) ?? document.querySelector(selectors.get("browser"));
    if (bar !== null) {
      panel.open(this.#store.entries, bar.getBoundingClientRect());
    }
  }
  #restore(restorer, entry) {
    this.#panel?.close();
    void restorer.restore(entry);
  }
  async #clear() {
    await this.#sweeper?.clear();
    if (this.#panel?.isOpen === true && this.#store !== null) {
      this.#panel.refresh(this.#store.entries);
    }
  }
  static #number(value, fallback, min, max) {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }
}
export {
  TodayArchive
};
