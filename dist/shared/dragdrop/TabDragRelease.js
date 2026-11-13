import { TabEntries } from "./TabEntries.js";
import { TabPointerDrag } from "./TabPointerDrag.js";
class TabDragRelease {
  #deps;
  #drag;
  #handled = null;
  #onDragOver = (event) => this.#over(event);
  #onDrop = (event) => this.#drop(event);
  #onLeave = () => this.#deps.place.clear();
  #onDragEnd = () => this.#finish();
  /**
   * Lets a tab of Vivaldi's list be released over a place. The tab is followed with the mouse, and
   * when Vivaldi turns the drag into an HTML5 one, which carries `vivaldi/x-tab-entries` and sends
   * no mouse events, the `dragover` and `drop` over a target are accepted so the drag is not
   * cancelled. Both ways end in `release`, at most once for each press of the mouse. Drags that
   * carry no tab are left alone. `onDrag` and `onEnd` follow either kind of drag, for the pill.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    const { document, wrapperSelector, place } = dependencies;
    this.#drag = new TabPointerDrag({
      document,
      wrapperSelector,
      onMove: (x, y) => this.#moved(x, y),
      onDrop: (_tabId, x, y) => this.#release(place.at(x, y)),
      onEnd: () => this.#finish()
    });
  }
  /**
   * Starts following the mouse and the HTML5 drag events, in the capture phase.
   */
  start() {
    const { document } = this.#deps;
    this.#drag.attach();
    document.addEventListener("dragover", this.#onDragOver, true);
    document.addEventListener("drop", this.#onDrop, true);
    document.addEventListener("dragleave", this.#onLeave, true);
    document.addEventListener("dragend", this.#onDragEnd, true);
  }
  /**
   * Stops following the mouse and the drag events, and removes the marks.
   */
  stop() {
    const { document, place } = this.#deps;
    this.#drag.detach();
    document.removeEventListener("dragover", this.#onDragOver, true);
    document.removeEventListener("drop", this.#onDrop, true);
    document.removeEventListener("dragleave", this.#onLeave, true);
    document.removeEventListener("dragend", this.#onDragEnd, true);
    place.clear();
  }
  #moved(x, y) {
    this.#deps.place.mark(this.#deps.place.at(x, y));
    this.#feed(x, y);
  }
  #feed(x, y) {
    const press = this.#drag.lastPress;
    if (press !== null) {
      this.#deps.onDrag?.(press.tabId, x, y);
    }
  }
  #finish() {
    this.#deps.place.clear();
    this.#deps.onEnd?.();
  }
  #over(event) {
    if (!TabEntries.carriedBy(event.dataTransfer)) {
      return;
    }
    this.#feed(event.clientX, event.clientY);
    const target = this.#targetOf(event);
    if (target === null) {
      this.#deps.place.clear();
      return;
    }
    event.preventDefault();
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "move";
    }
    this.#deps.place.mark(target);
  }
  #drop(event) {
    const target = this.#targetOf(event);
    this.#finish();
    if (target !== null) {
      event.preventDefault();
      this.#release(target);
    }
  }
  #targetOf(event) {
    return TabEntries.carriedBy(event.dataTransfer) ? this.#deps.place.at(event.clientX, event.clientY) : null;
  }
  #release(target) {
    const press = this.#drag.lastPress;
    if (target === null || press === null || press.serial === this.#handled) {
      return;
    }
    this.#handled = press.serial;
    this.#deps.place.release(press.tabId, target);
  }
}
export {
  TabDragRelease
};
