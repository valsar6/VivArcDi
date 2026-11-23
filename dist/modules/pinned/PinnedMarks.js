import { TabData } from "../../core/tabs/TabData.js";
class PinnedMarks {
  #tabs;
  /**
   * Reads which pinned tabs of the window are linked to a Favorite, which the grid stands for.
   *
   * @param tabs Tabs API.
   */
  constructor(tabs) {
    this.#tabs = tabs;
  }
  /**
   * @param tabs Tabs of a window.
   * @returns What the tab bar marks on them.
   */
  static marksOf(tabs) {
    const marks = { linked: /* @__PURE__ */ new Set() };
    for (const tab of tabs) {
      if (tab.id !== void 0 && tab.pinned === true && TabData.ownOf(tab).favoriteId !== void 0) {
        marks.linked.add(tab.id);
      }
    }
    return marks;
  }
  /**
   * @returns The marks of the current window.
   */
  async read() {
    return PinnedMarks.marksOf(await this.#tabs.query({ currentWindow: true }));
  }
}
export {
  PinnedMarks
};
