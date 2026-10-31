import { PINNED_LAST_ATTRIBUTE } from "../pinned/TabBarMarker.js";
import { KeptElement, watchSubtree } from "../../core/KeptElement.js";
const CLEAR_ATTRIBUTE = "data-vivarcdi-clear";
const CLEAR_TARGET = `[${CLEAR_ATTRIBUTE}]`;
const SWALLOWED_EVENTS = ["pointerdown", "mousedown", "click"];
class ClearButton {
  #document;
  #onClear;
  #kept;
  #listener = (event) => this.#handle(event);
  /**
   * The "Clear" button on the separator that 003 draws under the last pinned row. It lives inside
   * that row, so it is put back whenever Vivaldi rebuilds the row or the mark moves. One listener
   * on the document, in the capture phase, takes its clicks before Vivaldi's tab row sees them.
   *
   * @param document The browser window document.
   * @param root The element below which the separator row is rebuilt, such as `#browser`.
   * @param onClear What a click does.
   * @param placement Watcher and frame scheduling, replaceable in tests.
   */
  constructor(document, root, onClear, placement = {}) {
    this.#document = document;
    this.#onClear = onClear;
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute(CLEAR_ATTRIBUTE, "");
    button.setAttribute("title", "Archive the Today tabs of this workspace");
    button.textContent = "Clear";
    this.#kept = new KeptElement(button, {
      parent: () => document.querySelector(`[${PINNED_LAST_ATTRIBUTE}]`),
      root,
      watch: placement.watch ?? watchSubtree([PINNED_LAST_ATTRIBUTE]),
      ...placement.timing === void 0 ? {} : { timing: placement.timing }
    });
  }
  /**
   * Shows the button and starts listening.
   */
  start() {
    SWALLOWED_EVENTS.forEach((type) => this.#document.addEventListener(type, this.#listener, true));
    this.#kept.start();
  }
  /**
   * Removes the button and every listener.
   */
  stop() {
    SWALLOWED_EVENTS.forEach((type) => this.#document.removeEventListener(type, this.#listener, true));
    this.#kept.stop();
  }
  #handle(event) {
    if (event.target?.closest?.(CLEAR_TARGET) == null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === "click") {
      this.#onClear();
    }
  }
}
export {
  CLEAR_ATTRIBUTE,
  ClearButton
};
