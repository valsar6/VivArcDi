import { KeptElement } from "../../core/KeptElement.js";
const BOTTOM_BAR_ATTRIBUTE = "data-vivarcdi-bottom-bar";
class BottomBar {
  #kept;
  /**
   * A footer owned by VivArcDi at the bottom of the tab bar, after the tab list, with buttons in a
   * row: the first at the left edge and the last at the right edge. It is put back at the end when
   * Vivaldi rebuilds the tab bar.
   *
   * @param document The browser window document.
   * @param containerSelector Selector of the element the footer ends, `#tabs-container`.
   * @param buttons The buttons, from left to right.
   * @param placement The watched root, and the watcher and frame scheduling replaceable in tests.
   */
  constructor(document, containerSelector, buttons, placement) {
    const footer = document.createElement("div");
    footer.setAttribute(BOTTOM_BAR_ATTRIBUTE, "");
    footer.append(...buttons.map(({ element }) => element));
    this.#kept = new KeptElement(footer, { ...placement, parent: () => document.querySelector(containerSelector) });
  }
  /**
   * Shows the footer.
   */
  start() {
    this.#kept.start();
  }
  /**
   * Removes the footer.
   */
  stop() {
    this.#kept.stop();
  }
}
export {
  BOTTOM_BAR_ATTRIBUTE,
  BottomBar
};
