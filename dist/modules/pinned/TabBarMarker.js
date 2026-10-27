import { TabSlot } from "../../core/TabSlot.js";
const AWAY_ATTRIBUTE = "data-vivarcdi-away";
const PINNED_LAST_ATTRIBUTE = "data-vivarcdi-pinned-last";
class TabBarMarker {
  #selectors;
  #strip = null;
  /**
   * Marks the slots of Vivaldi's tab strip: away pinned tabs get the reset arrow, and the last
   * pinned row shown gets the separator. Only changed attributes are written, so it can run
   * after every mutation of the tab bar.
   *
   * @param selectors Needs `tabStrip`, `pinnedTab` and `tabWrapper`.
   */
  constructor(selectors) {
    this.#selectors = selectors;
  }
  /**
   * @param root The document of Vivaldi's browser window.
   * @param marks What to mark.
   */
  apply(root, marks) {
    const strip = root.querySelector(this.#selectors.get("tabStrip"));
    if (strip !== this.#strip) {
      this.clear();
    }
    this.#strip = strip;
    if (strip === null) {
      return;
    }
    const slots = [...strip.children];
    const last = this.#lastPinnedRow(slots, marks);
    for (const slot of slots) {
      const tabId = TabSlot.idOf(slot, this.#selectors.get("tabWrapper"));
      TabBarMarker.#toggle(slot, AWAY_ATTRIBUTE, tabId !== null && marks.away.has(tabId));
      TabBarMarker.#toggle(slot, PINNED_LAST_ATTRIBUTE, slot === last);
    }
  }
  /**
   * Removes every mark it wrote.
   */
  clear() {
    for (const slot of this.#strip?.children ?? []) {
      slot.removeAttribute(AWAY_ATTRIBUTE);
      slot.removeAttribute(PINNED_LAST_ATTRIBUTE);
    }
    this.#strip = null;
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
  static #toggle(slot, name, on) {
    if (slot.hasAttribute(name) !== on) {
      slot.toggleAttribute(name, on);
    }
  }
}
export {
  AWAY_ATTRIBUTE,
  PINNED_LAST_ATTRIBUTE,
  TabBarMarker
};
