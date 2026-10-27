import type { SelectorCatalog } from '../../core/SelectorCatalog.js';
import { TabSlot } from '../../core/TabSlot.js';
import type { TabMarks } from './AwayTabs.js';

export const AWAY_ATTRIBUTE = 'data-vivarcdi-away';
export const PINNED_LAST_ATTRIBUTE = 'data-vivarcdi-pinned-last';

export class TabBarMarker {
  #selectors: SelectorCatalog;
  #strip: Element | null = null;

  /**
   * Marks the slots of Vivaldi's tab strip: away pinned tabs get the reset arrow, and the last
   * pinned row shown gets the separator. Only changed attributes are written, so it can run
   * after every mutation of the tab bar.
   *
   * @param selectors Needs `tabStrip`, `pinnedTab` and `tabWrapper`.
   */
  constructor(selectors: SelectorCatalog) {
    this.#selectors = selectors;
  }

  /**
   * @param root The document of Vivaldi's browser window.
   * @param marks What to mark.
   */
  public apply(root: ParentNode, marks: TabMarks): void {
    const strip = root.querySelector(this.#selectors.get('tabStrip'));
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
      const tabId = TabSlot.idOf(slot, this.#selectors.get('tabWrapper'));
      TabBarMarker.#toggle(slot, AWAY_ATTRIBUTE, tabId !== null && marks.away.has(tabId));
      TabBarMarker.#toggle(slot, PINNED_LAST_ATTRIBUTE, slot === last);
    }
  }

  /**
   * Removes every mark it wrote.
   */
  public clear(): void {
    for (const slot of this.#strip?.children ?? []) {
      slot.removeAttribute(AWAY_ATTRIBUTE);
      slot.removeAttribute(PINNED_LAST_ATTRIBUTE);
    }
    this.#strip = null;
  }

  #lastPinnedRow(slots: Element[], marks: TabMarks): Element | null {
    const pinned = this.#selectors.get('pinnedTab');
    const wrapper = this.#selectors.get('tabWrapper');
    const rows = slots.filter((slot) => {
      const tabId = TabSlot.idOf(slot, wrapper);
      return (slot.matches(pinned) || slot.querySelector(pinned) !== null) && tabId !== null && !marks.linked.has(tabId);
    });
    return rows.at(-1) ?? null;
  }

  static #toggle(slot: Element, name: string, on: boolean): void {
    if (slot.hasAttribute(name) !== on) {
      slot.toggleAttribute(name, on);
    }
  }
}
