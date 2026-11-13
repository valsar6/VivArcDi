import { DRAGGING_ATTRIBUTE } from "./RowDrag.js";
class TabDragPill {
  #deps;
  #tabId = null;
  /**
   * Shows the pill for a tab of Vivaldi's list while it is dragged, and fades the slot it came
   * from with `data-vivarcdi-dragging`. The title and the icon come from the tab, read on the
   * first move. Meant for the `onDrag` and `onEnd` hooks of `TabDragRelease`.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @returns The `onDrag` and `onEnd` hooks of `TabDragRelease` that feed this pill.
   */
  hooks() {
    return { onDrag: (tabId, x, y) => this.drag(tabId, x, y), onEnd: () => this.end() };
  }
  /**
   * @param tabId The dragged tab.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  drag(tabId, x, y) {
    if (this.#tabId === tabId) {
      this.#deps.pill.move(x, y);
      return;
    }
    this.end();
    this.#tabId = tabId;
    this.#slot(tabId)?.setAttribute(DRAGGING_ATTRIBUTE, "");
    this.#deps.tabs.get(tabId).then((tab) => this.#show(tabId, tab, x, y)).catch((error) => this.#deps.logger.warn("could not read the dragged tab for the pill", error));
  }
  /**
   * Removes the pill and restores the slot.
   */
  end() {
    if (this.#tabId !== null) {
      this.#slot(this.#tabId)?.removeAttribute(DRAGGING_ATTRIBUTE);
    }
    this.#tabId = null;
    this.#deps.pill.hide();
  }
  #show(tabId, tab, x, y) {
    if (this.#tabId === tabId) {
      this.#deps.pill.show({ title: tab.title ?? tab.url ?? "", iconUrl: tab.favIconUrl ?? null }, x, y);
    }
  }
  #slot(tabId) {
    return this.#deps.document.querySelector(`${this.#deps.wrapperSelector}[data-id="tab-${tabId}"]`);
  }
}
export {
  TabDragPill
};
