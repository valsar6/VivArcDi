import { TabData } from "../../core/TabData.js";
import { TabDataWriter } from "../../core/TabDataWriter.js";
class WorkspaceAdopter {
  #tabs;
  #windows;
  #windowId;
  #recentWorkspace;
  #picker;
  #logger;
  /**
   * Takes the page of a Little Arc window into this window, as a tab of the most recent workspace.
   * Every normal window receives the request; only the one that was in front answers.
   *
   * @param dependencies The tabs and windows APIs, the id of this window, what it last showed,
   * the destination picker and a logger.
   */
  constructor({ tabs, windows, windowId, recentWorkspace, picker, logger }) {
    this.#tabs = tabs;
    this.#windows = windows;
    this.#windowId = windowId;
    this.#recentWorkspace = recentWorkspace;
    this.#picker = picker;
    this.#logger = logger;
  }
  /**
   * Moves the tab into this window, if this is the window that was in front, then closes the
   * Little Arc window.
   *
   * @param message The request of a Little Arc window.
   * @returns Whether this window took the tab.
   */
  async adopt(message) {
    try {
      if ((await this.#windows.lastFocused(["normal"])).id !== this.#windowId) {
        return false;
      }
      const workspace = await this.#picker.pick(this.#recentWorkspace(), []);
      await this.#tabs.move(message.tabId, { windowId: this.#windowId, index: -1 });
      await this.#store(message.tabId, workspace);
      await this.#tabs.activate(message.tabId);
      await this.#windows.remove(message.windowId).catch(() => void 0);
      return true;
    } catch (error) {
      this.#logger.error("could not move the Little Arc page into the window", error);
      return false;
    }
  }
  async #store(tabId, workspace) {
    if (workspace === null) {
      return;
    }
    try {
      const extra = { workspaceId: TabData.rawWorkspace(workspace) };
      await TabDataWriter.of(this.#tabs).write(tabId, (tab) => TabData.withOwn(tab, {}, extra));
    } catch (error) {
      this.#logger.warn("could not store the workspace of the moved tab", error);
    }
  }
}
export {
  WorkspaceAdopter
};
