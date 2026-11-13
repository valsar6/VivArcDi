import { DomQuery } from "../../core/dom/DomQuery.js";
import { FrameTask } from "../../core/support/FrameTask.js";
import { TabSlot } from "../../core/tabs/TabSlot.js";
const HIDDEN_ATTRIBUTE = "data-vivarcdi-hidden";
const watchSubtree = (target, onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(target, { childList: true, subtree: true });
  return () => observer.disconnect();
};
class HiddenTabMarker {
  #document;
  #selectors;
  #hidden;
  #watch;
  #task;
  #stops = [];
  #collapsed = /* @__PURE__ */ new WeakSet();
  /**
   * Marks the slots of Vivaldi's tab strip whose tab is hidden and takes them out of the list. The
   * marks are data attributes, which Vivaldi's redraws of the strip leave alone, and the slots are
   * collapsed with an inline style, since Vivaldi's own `!important` rules beat a stylesheet. The
   * marker repeats both after every change of the strip, for slots that are new.
   * Several markers may run at once, since each one writes the marks the shared set asks for.
   *
   * @param document The browser window document.
   * @param selectors Needs `browser`, `tabStrip` and `tabWrapper`; with `pinnedGroup`, the slots inside Vivaldi's groups of pinned tabs, wherever they sit in the window, are marked too, and a group is collapsed when all of them are hidden.
   * @param hidden The tabs to hide.
   * @param options Replaceable watching and frame scheduling, for tests.
   */
  constructor(document, selectors, hidden, { watch = watchSubtree, timing = {} } = {}) {
    this.#document = document;
    this.#selectors = selectors;
    this.#hidden = hidden;
    this.#watch = watch;
    this.#task = new FrameTask(() => this.apply(), timing);
  }
  /**
   * Marks the slots now and keeps marking them.
   *
   * @throws {Error} When the browser root is not found.
   */
  start() {
    const root = DomQuery.require(this.#document, this.#selectors.get("browser"));
    this.#stops = [this.#watch(root, () => this.#task.request()), this.#hidden.onChange(() => this.apply())];
    this.apply();
  }
  /**
   * Stops following the strip and the hidden tabs. The marks stay as the shared set of hidden tabs
   * says, so a module clears its own ids before it stops its marker.
   */
  stop() {
    this.#task.cancel();
    this.#stops.forEach((stop) => stop());
    this.#stops = [];
  }
  /**
   * Marks and collapses the slots of hidden tabs and restores the others.
   */
  apply() {
    const strip = this.#document.querySelector(this.#selectors.get("tabStrip"));
    if (strip === null) {
      return;
    }
    const group = this.#selectors.has("pinnedGroup") ? this.#selectors.get("pinnedGroup") : null;
    for (const child of strip.children) {
      if (group === null || !child.matches(group)) {
        this.#mark(child);
      }
    }
    if (group !== null) {
      this.#document.querySelectorAll(group).forEach((element) => this.#markGroup(element));
    }
  }
  #markGroup(group) {
    const slots = [...group.children];
    const allHidden = slots.length > 0 && slots.map((slot) => this.#mark(slot)).every(Boolean);
    this.#collapse(group, allHidden);
  }
  #mark(slot) {
    const tabId = TabSlot.idOf(slot, this.#selectors.get("tabWrapper"));
    const hidden = tabId !== null && this.#hidden.has(tabId);
    slot.toggleAttribute(HIDDEN_ATTRIBUTE, hidden);
    this.#collapse(slot, hidden);
    return hidden;
  }
  #collapse(slot, hidden) {
    if (hidden) {
      slot.style.setProperty("display", "none", "important");
      this.#collapsed.add(slot);
    } else if (this.#collapsed.delete(slot)) {
      slot.style.removeProperty("display");
    }
  }
}
export {
  HIDDEN_ATTRIBUTE,
  HiddenTabMarker
};
