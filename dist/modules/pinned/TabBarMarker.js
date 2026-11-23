import { TabSlot } from "../../core/tabs/TabSlot.js";
import { PINNED_LAST_ATTRIBUTE } from "../../shared/tabs/TabBarMarks.js";
const MISSING_STRIP = "The tab strip is missing: pinned rows are left as Vivaldi draws them";
class TabBarMarker {
  #selectors;
  #logger;
  #roots = [];
  #warned = false;
  /**
   * Marks the last pinned row shown with the separator, wherever Vivaldi puts it: in the tab
   * strip of 8.1 and 8.2 or in a group beside it on 8.3. Only changed attributes are written, so
   * it can run after every mutation of the tab bar.
   *
   * @param selectors Needs `tabStrip`, `pinnedTab` and `tabWrapper`; with `pinnedGroup`, the rows
   *   inside Vivaldi's groups of pinned tabs are marked too.
   * @param logger Reports a tab bar with neither a strip nor a group. Defaults to none.
   */
  constructor(selectors, logger) {
    this.#selectors = selectors;
    this.#logger = logger;
  }
  /**
   * @param root The document of Vivaldi's browser window.
   * @param marks What to mark.
   */
  apply(root, marks) {
    const strip = root.querySelector(this.#selectors.get("tabStrip"));
    const groups = this.#groups(root);
    if (strip === null && groups.length === 0) {
      this.clear();
      this.#warnMissing();
      return;
    }
    this.#remember(strip, groups);
    const slots = this.#slots(strip, groups);
    const last = this.#lastPinnedRow(slots, marks);
    for (const slot of slots) {
      TabBarMarker.#toggle(slot, PINNED_LAST_ATTRIBUTE, slot === last);
    }
  }
  /**
   * Removes every mark it wrote.
   */
  clear() {
    for (const root of this.#roots) {
      for (const slot of root.children) {
        slot.removeAttribute(PINNED_LAST_ATTRIBUTE);
      }
    }
    this.#roots = [];
  }
  #groups(root) {
    if (!this.#selectors.has("pinnedGroup")) {
      return [];
    }
    return [...root.querySelectorAll(this.#selectors.get("pinnedGroup"))];
  }
  #remember(strip, groups) {
    const roots = [...strip === null ? [] : [strip], ...groups];
    if (roots.length !== this.#roots.length || roots.some((root, index) => root !== this.#roots[index])) {
      this.clear();
    }
    this.#roots = roots;
  }
  #slots(strip, groups) {
    const groupSelector = this.#selectors.has("pinnedGroup") ? this.#selectors.get("pinnedGroup") : null;
    const slots = groups.flatMap((group) => [...group.children]);
    if (strip !== null) {
      slots.push(...[...strip.children].filter((child) => groupSelector === null || !child.matches(groupSelector)));
    }
    return slots;
  }
  #lastPinnedRow(slots, marks) {
    const pinned = this.#selectors.get("pinnedTab");
    const wrapper = this.#selectors.get("tabWrapper");
    const rows = slots.filter((slot) => {
      const tabId = TabSlot.idOf(slot, wrapper);
      return (slot.matches(pinned) || slot.querySelector(pinned) !== null) && tabId !== null && !marks.linked.has(tabId);
    });
    return rows.at(-1) ?? null;
  }
  #warnMissing() {
    if (!this.#warned) {
      this.#warned = true;
      this.#logger?.warn(MISSING_STRIP);
    }
  }
  static #toggle(slot, name, on) {
    if (slot.hasAttribute(name) !== on) {
      slot.toggleAttribute(name, on);
    }
  }
}
export {
  TabBarMarker
};
