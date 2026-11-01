import { AddressKey } from "../../core/AddressKey.js";
import { KeptTab } from "../../core/KeptTab.js";
import { TabPointerDrag } from "../../core/TabPointerDrag.js";
import { GRID_ORDER } from "./BookmarkFavorites.js";
const EMPTY_GRID_ATTRIBUTE = "data-vivarcdi-empty-grid";
const DROP_OVER_ATTRIBUTE = "data-vivarcdi-drop-over";
class EmptyGridDrop {
  #deps;
  #drag;
  #element = null;
  #detach = null;
  /**
   * The place to drop a tab when the Favorites grid is empty and Vivaldi has no pinned strip: a
   * placeholder with a hint where the grid goes. A tab of today's list released on it is pinned.
   * With tiles the placeholder is gone and Vivaldi's own drag pins.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#drag = new TabPointerDrag({
      document: dependencies.document,
      wrapperSelector: dependencies.wrapperSelector,
      onMove: (x, y) => this.#highlight(this.#isOver(x, y)),
      onDrop: (tabId, x, y) => {
        if (this.#isOver(x, y)) {
          void this.#pin(tabId);
        }
      },
      onEnd: () => this.#highlight(false)
    });
  }
  /**
   * Starts following the mouse.
   */
  start() {
    this.#drag.attach();
  }
  /**
   * Shows the placeholder while the grid is empty and removes it as soon as it is not.
   *
   * @param empty Whether the grid should show the placeholder.
   */
  show(empty) {
    if (!empty) {
      this.#remove();
      return;
    }
    if (this.#detach !== null) {
      return;
    }
    const element = this.#element ?? this.#create();
    try {
      this.#detach = this.#deps.anchor.add(element, GRID_ORDER);
    } catch {
      this.#detach = null;
    }
  }
  /**
   * Removes the placeholder and stops following the mouse.
   */
  stop() {
    this.#drag.detach();
    this.#remove();
    this.#element = null;
  }
  #create() {
    const element = this.#deps.document.createElement("div");
    element.setAttribute(EMPTY_GRID_ATTRIBUTE, "");
    element.textContent = this.#deps.hint;
    this.#element = element;
    return element;
  }
  #remove() {
    this.#detach?.();
    this.#detach = null;
    this.#highlight(false);
  }
  #highlight(over) {
    this.#element?.toggleAttribute(DROP_OVER_ATTRIBUTE, over && this.#detach !== null);
  }
  #isOver(x, y) {
    if (this.#detach === null || this.#element === null) {
      return false;
    }
    const { left, right, top, bottom } = this.#element.getBoundingClientRect();
    return x >= left && x <= right && y >= top && y <= bottom;
  }
  async #pin(tabId) {
    try {
      const tab = await this.#deps.tabs.get(tabId);
      if (AddressKey.from(tab.url) === null || KeptTab.is(tab)) {
        return;
      }
      await this.#deps.tabs.update(tabId, { pinned: true });
    } catch (error) {
      this.#deps.logger.warn("could not pin the dropped tab", error);
    }
  }
}
export {
  DROP_OVER_ATTRIBUTE,
  EMPTY_GRID_ATTRIBUTE,
  EmptyGridDrop
};
