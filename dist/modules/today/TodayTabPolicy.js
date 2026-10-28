import { KeptTab } from "../../core/KeptTab.js";
import { TabData } from "../../core/TabData.js";
const ARCHIVABLE_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:", "file:"]);
class TodayTabPolicy {
  /**
   * Tells whether a tab is a Today tab that may be archived: not kept (pinned, a Favorite,
   * or the tab of a bookmark link), not in a tab stack, not the active tab of its window, not playing audio, and showing
   * a web page or a file.
   *
   * @param tab A tab.
   * @returns Whether the tab may be closed into the archive.
   */
  static isArchivable(tab) {
    return !KeptTab.is(tab) && tab.active !== true && tab.audible !== true && TabData.stackOf(tab) === null && TodayTabPolicy.#isPage(tab.url);
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
