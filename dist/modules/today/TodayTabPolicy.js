import { KeptTab } from "../../shared/tabs/KeptTab.js";
import { TabData } from "../../core/tabs/TabData.js";
const ARCHIVABLE_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:", "file:"]);
class TodayTabPolicy {
  /**
   * Tells whether Clear may close a tab: not kept (pinned, a Favorite, or the tab of a bookmark
   * link), not in a tab stack, not playing audio, and showing a web page or a file. The active
   * tab qualifies: the user asked for Clear.
   *
   * @param tab A tab.
   * @returns Whether Clear may close the tab into the archive.
   */
  static isClearable(tab) {
    return !KeptTab.is(tab) && tab.audible !== true && TabData.stackOf(tab) === null && TodayTabPolicy.#isPage(tab.url);
  }
  /**
   * Tells whether the sweep may archive a tab: a tab Clear may close that is not the active tab of
   * its window.
   *
   * @param tab A tab.
   * @returns Whether the tab may be closed into the archive on its own.
   */
  static isArchivable(tab) {
    return tab.active !== true && TodayTabPolicy.isClearable(tab);
  }
  static #isPage(url) {
    try {
      return url !== void 0 && ARCHIVABLE_PROTOCOLS.has(new URL(url).protocol);
    } catch {
      return false;
    }
  }
}
export {
  TodayTabPolicy
};
