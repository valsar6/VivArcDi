import { DomQuery } from "../../core/DomQuery.js";
import { FrameTask } from "../../core/FrameTask.js";
import { SerialTask } from "../../core/SerialTask.js";
import { AwayTabs } from "./AwayTabs.js";
import { TabBarMarker } from "./TabBarMarker.js";
class PinnedMarking {
  #context;
  #marks = { away: /* @__PURE__ */ new Set(), linked: /* @__PURE__ */ new Set() };
  #away;
  #marker;
  #read;
  #draw;
  #observer = null;
  #unsubscribe = [];
  /**
   * Keeps the marks of the tab bar in step with the tabs: away rows and the separator after
   * the last pinned row.
   *
   * @param context The context of the pinned-tabs module.
   */
  constructor(context) {
    this.#context = context;
    this.#away = new AwayTabs(context.tabs);
    this.#marker = new TabBarMarker(context.selectors);
    this.#draw = new FrameTask(() => this.#marker.apply(context.document, this.#marks));
    this.#read = new SerialTask(
      async () => {
        this.#marks = await this.#away.read();
        this.#draw.request();
      },
      (error) => context.logger.error("Could not read the pinned tabs", error)
    );
  }
  /**
   * @param tabId A tab.
   * @returns Whether it is a pinned tab away from its own page.
   */
  isAway(tabId) {
    return this.#marks.away.has(tabId);
  }
  /**
   * Reads the tabs, marks the tab bar and follows both.
   */
  async start() {
    const { document, selectors, tabs, logger } = this.#context;
    const read = () => this.#read.request();
    const events = [
      () => tabs.onUpdated(read),
      () => tabs.onActivated(read),
      () => tabs.onCreated(read),
      () => tabs.onRemoved(read)
    ];
    for (const subscribe of events) {
      try {
        this.#unsubscribe.push(subscribe());
      } catch {
        logger.warn("A tab event is missing: pinned rows may lag behind the tabs");
      }
    }
    this.#observer = new MutationObserver(() => this.#draw.request());
    this.#observer.observe(DomQuery.require(document, selectors.get("browser")), { childList: true, subtree: true });
    read();
    await this.#read.idle();
  }
  /**
   * Stops following and removes every mark.
   */
  stop() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.#observer?.disconnect();
    this.#observer = null;
    this.#draw.cancel();
    this.#marker.clear();
  }
}
export {
  PinnedMarking
};
