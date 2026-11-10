import { TabPointerDrag } from "../../core/TabPointerDrag.js";
class TabToFavorite {
  #drag;
  #zone;
  #drop;
  #handled = null;
  /**
   * Lets a tab of Vivaldi's list be released over the Favorites grid to become a Favorite. It
   * shows the gap under the pointer while the tab is dragged. The release comes either as a mouse
   * event or as an HTML5 drop; one press is handled once, whichever comes first.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, wrapperSelector, zone, drop }) {
    this.#zone = zone;
    this.#drop = drop;
    this.#drag = new TabPointerDrag({
      document,
      wrapperSelector,
      onMove: (x, y) => zone.showGap(zone.at(x, y)),
      onDrop: (_tabId, x, y) => this.#release(zone.at(x, y)),
      onEnd: () => zone.clearGap()
    });
  }
  /**
   * Starts following the mouse and the drag events.
   */
  start() {
    this.#drag.attach();
    this.#zone.listen((target) => this.#release(target));
  }
  /**
   * Stops following the mouse and the drag events, and removes the gap.
   */
  stop() {
    this.#drag.detach();
    this.#zone.unlisten();
  }
  #release(target) {
    const press = this.#drag.lastPress;
    if (target === null || press === null || press.serial === this.#handled) {
      return;
    }
    this.#handled = press.serial;
    void this.#drop.add(press.tabId, target.beforeId);
  }
}
export {
  TabToFavorite
};
