import { TabDragPill } from "../../core/TabDragPill.js";
import { TabDragRelease } from "../../core/TabDragRelease.js";
class TabToFavorite {
  #release;
  /**
   * Lets a tab of Vivaldi's list be released over the Favorites grid to become a Favorite. It
   * shows the gap under the pointer and the pill of the tab while it is dragged. The release comes either as a mouse
   * event or as an HTML5 drop, which `TabDragRelease` handles once for each press.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, wrapperSelector, zone, drop, tabs, pill, logger }) {
    this.#release = new TabDragRelease({
      document,
      wrapperSelector,
      place: {
        at: (x, y) => zone.at(x, y),
        mark: (target) => zone.mark(target),
        clear: () => zone.clear(),
        release: (tabId, target) => void drop.add(tabId, target.beforeId)
      },
      ...new TabDragPill({ document, wrapperSelector, tabs, pill, logger }).hooks()
    });
  }
  /**
   * Starts following the mouse and the drag events.
   */
  start() {
    this.#release.start();
  }
  /**
   * Stops following the mouse and the drag events, and removes the gap.
   */
  stop() {
    this.#release.stop();
  }
}
export {
  TabToFavorite
};
