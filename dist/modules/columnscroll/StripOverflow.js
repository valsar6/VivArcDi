import { FrameTask } from "../../core/support/FrameTask.js";
import { HIDDEN_ATTRIBUTE } from "../../shared/tabs/HiddenAttribute.js";
const STRIP_OVERFLOW_PROPERTY = "--vivarcdi-strip-overflow";
const watchTabs = (target, onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", HIDDEN_ATTRIBUTE] });
  return () => observer.disconnect();
};
class StripOverflow {
  #document;
  #selectors;
  #watch;
  #task;
  #column = null;
  #unwatch = null;
  /**
   * Gives the column the height of the tabs that overflow Vivaldi's tab strip. Vivaldi caps the
   * strip at the room left and places its slots absolutely, so the strip cannot grow by styles
   * alone; `column-scroll.css` reserves this height under the strip and lets the tabs show.
   *
   * @param document The browser window document.
   * @param selectors Selectors of the column and of the tab strip.
   * @param watch Reports changes of the tabs, replaceable in tests.
   * @param timing Frame scheduling for the measures, replaceable in tests.
   */
  constructor(document, selectors, watch = watchTabs, timing = {}) {
    this.#document = document;
    this.#selectors = selectors;
    this.#watch = watch;
    this.#task = new FrameTask(() => this.#measure(), timing);
  }
  /**
   * Measures now and again whenever the tabs change.
   */
  start() {
    this.#measure();
    this.#unwatch ??= this.#watch(this.#document, () => this.#task.request());
  }
  /**
   * Removes the reserved height and stops watching.
   */
  stop() {
    this.#task.cancel();
    this.#unwatch?.();
    this.#unwatch = null;
    this.#column?.style.removeProperty(STRIP_OVERFLOW_PROPERTY);
    this.#column = null;
  }
  #measure() {
    const column = this.#document.querySelector(this.#selectors.column);
    const strip = this.#document.querySelector(this.#selectors.strip);
    if (this.#column !== column) {
      this.#column?.style.removeProperty(STRIP_OVERFLOW_PROPERTY);
      this.#column = column;
    }
    if (column === null || strip === null) {
      return;
    }
    const value = `${Math.max(0, strip.scrollHeight - strip.clientHeight)}px`;
    if (column.style.getPropertyValue(STRIP_OVERFLOW_PROPERTY) !== value) {
      column.style.setProperty(STRIP_OVERFLOW_PROPERTY, value);
    }
  }
}
export {
  STRIP_OVERFLOW_PROPERTY,
  StripOverflow
};
