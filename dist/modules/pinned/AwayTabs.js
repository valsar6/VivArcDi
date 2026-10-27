import { OwnPage } from "../../core/OwnPage.js";
import { TabData } from "../../core/TabData.js";
class AwayTabs {
  #tabs;
  /**
   * Reads which pinned tabs of the window left their own page.
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
    const marks = { away: /* @__PURE__ */ new Set(), linked: /* @__PURE__ */ new Set() };
    for (const tab of tabs) {
      if (tab.id === void 0 || !tab.pinned) {
        continue;
      }
      if (OwnPage.isAway(tab)) {
        marks.away.add(tab.id);
      }
      if (TabData.ownOf(tab).favoriteId !== void 0) {
        marks.linked.add(tab.id);
      }
    }
    return marks;
  }
  /**
   * @returns The marks of the current window.
   */
  async read() {
    return AwayTabs.marksOf(await this.#tabs.query({ currentWindow: true }));
  }
}
export {
  AwayTabs
};
