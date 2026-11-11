import { HIDDEN_ATTRIBUTE } from "./HiddenTabMarker.js";
import { TabSlot } from "./TabSlot.js";
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
   * @param selectors Gives `pinnedTab` and `pinnedGroup`, when the catalog has them.
   * @returns The selector of the slots that are not today's tabs.
   */
  static skippedBy(selectors) {
    const pinned = ["pinnedTab", "pinnedGroup"].filter((name) => selectors.has(name)).map((name) => selectors.get(name));
    return [`[${HIDDEN_ATTRIBUTE}]`, ...pinned].join(", ");
  }
  /**
   * @returns The place at the top of today's tabs: the row of the first tab that is not hidden or
   * pinned, or the list with no row when there is none, which leaves the tab where it is.
   */
  first() {
    const { document, stripSelector, wrapperSelector, skipSelector } = this.#deps;
    const rows = Array.from(document.querySelectorAll(`${stripSelector} ${wrapperSelector}`));
    const row = rows.find((candidate) => candidate.closest(skipSelector) === null);
    return { rowTabId: row === void 0 ? null : TabSlot.idOf(row, wrapperSelector) };
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
