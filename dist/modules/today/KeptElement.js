import { FrameTask } from "../../core/FrameTask.js";
const watchSubtree = (attributeFilter = []) => (target, onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(target, { childList: true, subtree: true, ...attributeFilter.length > 0 ? { attributes: true, attributeFilter } : {} });
  return () => observer.disconnect();
};
class KeptElement {
  #element;
  #placement;
  #task;
  #unwatch = null;
  /**
   * Keeps an element of VivArcDi as the last child of an element of Vivaldi's interface, and puts
   * it back, once per frame at most, when Vivaldi rebuilds that part of the interface.
   *
   * @param element The element to keep.
   * @param placement Where it goes and what to watch.
   */
  constructor(element, placement) {
    this.#element = element;
    this.#placement = placement;
    this.#task = new FrameTask(() => this.sync(), placement.timing);
  }
  /**
   * Places the element and starts watching.
   */
  start() {
    this.sync();
    this.#unwatch ??= (this.#placement.watch ?? watchSubtree())(this.#placement.root, () => this.#task.request());
  }
  /**
   * Puts the element at the end of its parent, or takes it away when the parent is gone.
   */
  sync() {
    const parent = this.#placement.parent();
    if (parent === null) {
      this.#element.remove();
    } else if (parent.lastElementChild !== this.#element) {
      parent.append(this.#element);
    }
  }
  /**
   * Stops watching and removes the element.
   */
  stop() {
    this.#unwatch?.();
    this.#unwatch = null;
    this.#task.cancel();
    this.#element.remove();
  }
}
export {
  KeptElement,
  watchSubtree
};
