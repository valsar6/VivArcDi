import { TabData } from "./TabData.js";
class ActiveWorkspace {
  #tabs;
  #onChange;
  #logger;
  #current = null;
  #generation = 0;
  #unsubscribe = [];
  /**
   * Follows the workspace of the active tab of the window and reports it when it changes. While no
   * tab is active the last known workspace stays, so the section does not flicker during a switch.
   *
   * @param tabs Tabs API.
   * @param onChange Called with the new workspace id, or null outside any workspace.
   * @param logger Logger for failures.
   */
  constructor(tabs, onChange, logger) {
    this.#tabs = tabs;
    this.#onChange = onChange;
    this.#logger = logger;
  }
  /**
   * @returns The workspace id of the active tab, or null outside any workspace.
   */
  get current() {
    return this.#current;
  }
  /**
   * Reads the workspace now, without reporting it, and starts following the tabs. Throws when a
   * tab event is missing.
   */
  async start() {
    this.#unsubscribe = [
      this.#tabs.onActivated(() => void this.refresh()),
      this.#tabs.onUpdated((_id, change) => {
        if ("vivExtData" in change) {
          void this.refresh();
        }
      })
    ];
    const workspace = await this.#read();
    if (workspace !== void 0) {
      this.#current = workspace;
    }
  }
  /**
   * Stops following the tabs.
   */
  stop() {
    this.#generation += 1;
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
  }
  /**
   * Reads the workspace of the active tab and reports a change.
   */
  async refresh() {
    const generation = ++this.#generation;
    const workspace = await this.#read();
    if (generation === this.#generation && workspace !== void 0 && workspace !== this.#current) {
      this.#current = workspace;
      this.#onChange(workspace);
    }
  }
  async #read() {
    try {
      const [active] = await this.#tabs.query({ active: true, currentWindow: true });
      return active === void 0 ? void 0 : TabData.of(active);
    } catch (error) {
      this.#logger.warn("could not read the active workspace", error);
      return void 0;
    }
  }
}
export {
  ActiveWorkspace
};
