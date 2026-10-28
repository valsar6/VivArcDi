import { TabData } from "../../core/TabData.js";
import { UnloadedTabs } from "../favorites/UnloadedTabs.js";
const HIDDEN_OWNER = "space-header";
const RELEVANT_CHANGES = ["discarded", "pinned", "status"];
class CollapsedPinned {
  #tabs;
  #collapse;
  #hidden;
  #workspace;
  #logger;
  #generation = 0;
  #stops = [];
  /**
   * While the space is collapsed, hides the pinned tabs of the active workspace that are unloaded
   * and not active, so that only the open ones stay in the list. The active tab is never hidden,
   * even when Vivaldi reports it unloaded for a moment.
   *
   * @param tabs Tabs API.
   * @param parts The collapsed state, the hidden tabs and the active workspace.
   * @param logger Logger for failures.
   */
  constructor(tabs, { collapse, hidden, workspace }, logger) {
    this.#tabs = tabs;
    this.#collapse = collapse;
    this.#hidden = hidden;
    this.#workspace = workspace;
    this.#logger = logger;
  }
  /**
   * Starts following the tabs and the collapsed state, and hides what the state asks for. Throws
   * when a tab event is missing; call `stop` then.
   */
  async start() {
    this.#stops.push(
      this.#collapse.onChange(() => void this.refresh()),
      this.#tabs.onUpdated((_id, change) => {
        if (RELEVANT_CHANGES.some((key) => key in change)) {
          void this.refresh();
        }
      }),
      this.#tabs.onActivated(() => void this.refresh()),
      this.#tabs.onRemoved(() => void this.refresh())
    );
    await this.refresh();
  }
  /**
   * Stops following the tabs and shows the hidden pinned tabs again.
   */
  stop() {
    this.#generation += 1;
    this.#stops.forEach((stop) => stop());
    this.#stops = [];
    this.#hidden.clear(HIDDEN_OWNER);
  }
  /**
   * Hides the pinned tabs that must be hidden now, or shows them all when the space is open.
   * Call it when the active workspace changes.
   */
  async refresh() {
    const generation = ++this.#generation;
    if (!this.#collapse.collapsed) {
      this.#hidden.clear(HIDDEN_OWNER);
      return;
    }
    try {
      const pinned = await this.#tabs.query({ pinned: true, currentWindow: true });
      if (generation === this.#generation && this.#collapse.collapsed) {
        this.#hidden.set(HIDDEN_OWNER, this.#toHide(pinned));
      }
    } catch (error) {
      this.#logger.warn("could not read the pinned tabs", error);
    }
  }
  #toHide(pinned) {
    const workspace = this.#workspace();
    return pinned.flatMap((tab) => tab.id !== void 0 && tab.active !== true && UnloadedTabs.isUnloaded(tab) && TabData.of(tab) === workspace ? [tab.id] : []);
  }
}
export {
  CollapsedPinned,
  HIDDEN_OWNER
};
