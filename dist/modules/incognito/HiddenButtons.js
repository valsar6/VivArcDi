import { FrameTask } from "../../core/FrameTask.js";
import { watchSubtree } from "../../core/KeptElement.js";
const PRIVATE_HIDDEN_ATTRIBUTE = "data-vivarcdi-private-hidden";
class HiddenButtons {
  #document;
  #selectors;
  #root;
  #watch;
  #task;
  #unwatch = null;
  /**
   * Marks Vivaldi's own buttons that the private tab bar replaces, found by selectors of the
   * catalog, and keeps marking them when Vivaldi redraws the bar. The stylesheet hides what is
   * marked, since a stylesheet cannot read the catalog. A selector that matches nothing is ignored.
   *
   * @param document The browser window document.
   * @param selectors Selectors of the buttons to hide.
   * @param root The element below which Vivaldi redraws the buttons, such as `#browser`.
   * @param options Watcher and frame scheduling, replaceable in tests.
   */
  constructor(document, selectors, root, { watch = watchSubtree(), timing = {} } = {}) {
    this.#document = document;
    this.#selectors = selectors;
    this.#root = root;
    this.#watch = watch;
    this.#task = new FrameTask(() => this.mark(), timing);
  }
  /**
   * Marks the buttons now and keeps marking them.
   */
  start() {
    this.mark();
    this.#unwatch ??= this.#watch(this.#root, () => this.#task.request());
  }
  /**
   * Marks the buttons that are on screen now.
   */
  mark() {
    this.#selectors.forEach((selector) => this.#document.querySelectorAll(selector).forEach((button) => button.setAttribute(PRIVATE_HIDDEN_ATTRIBUTE, "")));
  }
  /**
   * Stops watching and shows the buttons again.
   */
  stop() {
    this.#unwatch?.();
    this.#unwatch = null;
    this.#task.cancel();
    this.#document.querySelectorAll(`[${PRIVATE_HIDDEN_ATTRIBUTE}]`).forEach((button) => button.removeAttribute(PRIVATE_HIDDEN_ATTRIBUTE));
  }
}
export {
  HiddenButtons,
  PRIVATE_HIDDEN_ATTRIBUTE
};
