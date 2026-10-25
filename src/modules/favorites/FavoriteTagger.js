export const FAVORITE_ATTRIBUTE = 'data-vivarcdi-favorite';
export const UNLOADED_ATTRIBUTE = 'data-vivarcdi-unloaded';
export const GRID_ATTRIBUTE = 'data-vivarcdi-favorites';

export class FavoriteTagger {
  #selectors;
  #maxTiles;
  #unloadedTabs;
  #strip = null;

  /**
   * Marks the first pinned tabs of a vertical tab bar as Favorites tiles.
   * Marks are data attributes, which Vivaldi's own re-renders leave alone,
   * and stylesheets lay out the grid from them.
   *
   * @param {import('../../core/SelectorCatalog.js').SelectorCatalog} selectors Needs
   *   `verticalTabBar`, `tabStrip`, `pinnedTab` and `tabWrapper`.
   * @param {number} maxTiles How many pinned tabs become tiles; the others stay rows.
   * @param {{ has(tabId: number): boolean }} unloadedTabs Ids of tabs unloaded from memory.
   */
  constructor(selectors, maxTiles, unloadedTabs) {
    this.#selectors = selectors;
    this.#maxTiles = maxTiles;
    this.#unloadedTabs = unloadedTabs;
  }

  /**
   * Reads the tab id that Vivaldi stores on a tab wrapper as `data-id="tab-<id>"`.
   *
   * @param {Element} slot A child of the tab strip.
   * @param {string} wrapperSelector Selector of the tab wrapper.
   * @returns {number | null} The tab id, or null when the slot holds no tab.
   */
  static tabIdOf(slot, wrapperSelector) {
    const wrapper = slot.matches(wrapperSelector) ? slot : slot.querySelector(wrapperSelector);
    const match = /^tab-(\d+)$/.exec(wrapper?.dataset.id ?? '');
    return match ? Number(match[1]) : null;
  }

  /**
   * Marks the tiles of a tab bar, or removes every mark when the tab bar is not vertical.
   * Only touches what changed, so it can run after every mutation of the tab bar.
   *
   * @param {Element | null} tabBar Vivaldi's tab bar container.
   * @returns {Element | null} The tab strip laid out as a grid, or null.
   */
  apply(tabBar) {
    const strip = this.#gridStripOf(tabBar);
    if (strip !== this.#strip) {
      this.clear();
    }
    if (strip === null) {
      return null;
    }
    this.#strip = strip;
    strip.toggleAttribute(GRID_ATTRIBUTE, true);
    let tiles = 0;
    for (const slot of strip.children) {
      const isTile = tiles < this.#maxTiles && this.#isPinned(slot);
      if (isTile) {
        tiles += 1;
      }
      this.#mark(slot, isTile);
    }
    return strip;
  }

  /**
   * Removes every mark from the last tab strip it touched.
   */
  clear() {
    if (this.#strip === null) {
      return;
    }
    this.#strip.removeAttribute(GRID_ATTRIBUTE);
    for (const slot of this.#strip.children) {
      slot.removeAttribute(FAVORITE_ATTRIBUTE);
      slot.removeAttribute(UNLOADED_ATTRIBUTE);
    }
    this.#strip = null;
  }

  #gridStripOf(tabBar) {
    if (!tabBar?.matches(this.#selectors.get('verticalTabBar'))) {
      return null;
    }
    return tabBar.querySelector(this.#selectors.get('tabStrip'));
  }

  #isPinned(slot) {
    const pinned = this.#selectors.get('pinnedTab');
    return slot.matches(pinned) || slot.querySelector(pinned) !== null;
  }

  #mark(slot, isTile) {
    slot.toggleAttribute(FAVORITE_ATTRIBUTE, isTile);
    const tabId = isTile ? FavoriteTagger.tabIdOf(slot, this.#selectors.get('tabWrapper')) : null;
    slot.toggleAttribute(UNLOADED_ATTRIBUTE, tabId !== null && this.#unloadedTabs.has(tabId));
  }
}
