import { InspectionTarget } from "../tabs/InspectionTarget.js";
import { TabData } from "../tabs/TabData.js";
class ActiveWorkspace {
  #tabs;
  #logger;
  #listed;
  #current = null;
  #generation = 0;
  #listeners = /* @__PURE__ */ new Set();
  #unsubscribe = [];
  #warnedUnlisted = false;
  /**
   * Follows the workspace of the active tab of the window and reports it when it changes.
   *
   * @param tabs Tabs API.
   * @param logger Logger for failures.
   * @param listed Says whether Vivaldi lists a workspace id; an id it does not list keeps the last
   * workspace. Every id is accepted when the list cannot be read.
   */
  constructor(tabs, logger, listed = () => true) {
    this.#tabs = tabs;
    this.#logger = logger;
    this.#listed = listed;
  }
  /**
   * @returns The workspace to show, or null outside any workspace.
   */
  get current() {
    return this.#current;
  }
  /**
   * Follows a change of the workspace.
   *
   * @param listener Called with the new workspace id, or null outside any workspace.
   * @returns A function that removes the listener.
   */
  onChange(listener) {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  }
  /**
   * Reads the workspace now, without reporting it, and starts following the tabs. Does nothing
   * when it already follows them. Throws when a tab event is missing.
   */
  async start() {
    if (this.#unsubscribe.length > 0) {
      return;
    }
    this.#unsubscribe = [
      this.#tabs.onActivated(() => void this.refresh()),
      this.#tabs.onUpdated((_id, change) => {
        if ("vivExtData" in change) {
          void this.refresh();
        }
      }),
      this.#tabs.onRemoved(() => void this.refresh())
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
      this.#listeners.forEach((listener) => listener(workspace));
    }
  }
  async #read() {
    try {
      const [active] = await this.#tabs.query({ active: true, currentWindow: true });
      if (active === void 0 || InspectionTarget.is(active.url ?? active.pendingUrl)) {
        return void 0;
      }
      const workspace = TabData.of(active);
      if (workspace !== null && !this.#listed(workspace)) {
        this.#warnUnlisted(workspace);
        return void 0;
      }
      return workspace;
    } catch (error) {
      this.#logger.warn("could not read the active workspace", error);
      return void 0;
    }
  }
  #warnUnlisted(workspaceId) {
    if (!this.#warnedUnlisted) {
      this.#warnedUnlisted = true;
      this.#logger.warn("the active tab names a workspace Vivaldi does not list", `${workspaceId}: keeping the last one`);
    }
  }
}
export {
  ActiveWorkspace
};
