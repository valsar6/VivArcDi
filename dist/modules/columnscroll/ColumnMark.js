import { FrameTask } from "../../core/support/FrameTask.js";
const COLUMN_SCROLL_ATTRIBUTE = "data-vivarcdi-column-scroll";
const watchTree = (target, onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(target, { childList: true, subtree: true });
  return () => observer.disconnect();
};
class ColumnMark {
  #document;
  #selectors;
  #watch;
  #task;
  #marked = null;
  #unwatch = null;
  /**
   * Marks the column of the vertical tab bar, so that `column-scroll.css` makes it the one scroller
   * of the sidebar. Vivaldi builds a new column when the layout changes, so the whole document is
   * watched and the mark moves to the new one.
   *
   * @param document The browser window document.
   * @param selectors Selectors of the column and of the vertical tab bar.
   * @param watch Reports added and removed nodes anywhere in the document, replaceable in tests.
   * @param timing Frame scheduling for the repairs, replaceable in tests.
   */
  constructor(document, selectors, watch = watchTree, timing = {}) {
    this.#document = document;
    this.#selectors = selectors;
    this.#watch = watch;
    this.#task = new FrameTask(() => this.#sync(), timing);
  }
  /**
   * Marks the column now and keeps the mark on it while Vivaldi redraws.
   */
  start() {
    this.#sync();
    this.#unwatch ??= this.#watch(this.#document, () => this.#task.request());
  }
  /**
   * Removes the mark and stops watching.
   */
  stop() {
    this.#task.cancel();
    this.#unwatch?.();
    this.#unwatch = null;
    this.#marked?.removeAttribute(COLUMN_SCROLL_ATTRIBUTE);
    this.#marked = null;
  }
  #sync() {
    const column = this.#document.querySelector(this.#selectors.column);
    const wanted = column !== null && this.#document.querySelector(this.#selectors.verticalBar) !== null ? column : null;
    if (wanted === this.#marked) {
      return;
    }
    this.#marked?.removeAttribute(COLUMN_SCROLL_ATTRIBUTE);
    wanted?.setAttribute(COLUMN_SCROLL_ATTRIBUTE, "");
    this.#marked = wanted;
  }
}
export {
  COLUMN_SCROLL_ATTRIBUTE,
  ColumnMark
};
