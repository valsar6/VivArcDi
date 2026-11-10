import { TabSlot } from "../../core/TabSlot.js";
const TODAY_ATTRIBUTE = "data-vivarcdi-drop-today";
class TodayList {
  #deps;
  #marked = null;
  /**
   * The tab list under the separator as a place to drop a tile: it finds the row under a point and
   * marks the list while a tile is over it.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when the point is not over the tab list.
   */
  at(x, y) {
    const element = this.#deps.document.elementFromPoint(x, y);
    if (element?.closest(this.#deps.stripSelector) == null) {
      return null;
    }
    const onRow = element.closest(this.#deps.wrapperSelector) !== null;
    return { rowTabId: onRow ? TabSlot.idOf(element, this.#deps.wrapperSelector) : null };
  }
  /**
   * Marks the tab list with `data-vivarcdi-drop-today`.
   *
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  mark(x, y) {
    const strip = this.#deps.document.elementFromPoint(x, y)?.closest(this.#deps.stripSelector) ?? null;
    if (strip === this.#marked) {
      return;
    }
    this.clear();
    strip?.setAttribute(TODAY_ATTRIBUTE, "");
    this.#marked = strip;
  }
  /**
   * Removes the mark.
   */
  clear() {
    this.#marked?.removeAttribute(TODAY_ATTRIBUTE);
    this.#marked = null;
  }
}
export {
  TODAY_ATTRIBUTE,
  TodayList
};
