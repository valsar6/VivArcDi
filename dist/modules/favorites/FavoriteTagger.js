import { TabSlot } from "../../core/TabSlot.js";
const FAVORITE_ATTRIBUTE = "data-vivarcdi-favorite";
const UNLOADED_ATTRIBUTE = "data-vivarcdi-unloaded";
const GRID_ATTRIBUTE = "data-vivarcdi-favorites";
class FavoriteTagger {
  #selectors;
  #maxTiles;
  #unloadedTabs;
  #strip = null;
  #tileCount = 0;
  /**
   * Marks the slots of a vertical tab bar: the first pinned tabs as Favorites tiles when the
   * Favorites come from pinned tabs.
   * Marks are data attributes, which Vivaldi's own re-renders leave alone,
   * and stylesheets lay out the tab strip from them.
   *
   * @param selectors Needs `verticalTabBar`, `tabStrip`, `pinnedTab` and `tabWrapper`.
   * @param maxTiles How many pinned tabs become tiles; the others stay rows.
   * @param unloadedTabs Ids of tabs unloaded from memory.
   */
  constructor(selectors, maxTiles, unloadedTabs) {
    this.#selectors = selectors;
    this.#maxTiles = maxTiles;
    this.#unloadedTabs = unloadedTabs;
  }
  /**
   * @param value How many pinned tabs become tiles from the next `apply`; 0 when the Favorites
   *   come from bookmarks.
   */
  set maxTiles(value) {
    this.#maxTiles = value;
  }
  /**
   * Reads the tab id that Vivaldi stores on a tab wrapper as `data-id="tab-<id>"`.
   *
   * @param slot A child of the tab strip.
   * @param wrapperSelector Selector of the tab wrapper.
   * @returns The tab id, or null when the slot holds no tab.
   */
  static tabIdOf(slot, wrapperSelector) {
    return TabSlot.idOf(slot, wrapperSelector);
  }
  /**
   * @returns How many tiles the last `apply` marked.
   */
  get tileCount() {
    return this.#tileCount;
  }
  /**
   * Marks the tiles of a tab bar, or removes every mark when the tab bar is not vertical.
   * Only touches what changed, so it can run after every mutation of the tab bar.
   *
   * @param tabBar Vivaldi's tab bar container.
   * @returns The tab strip laid out as a grid, or null.
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
    this.#tileCount = tiles;
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
    this.#tileCount = 0;
  }
  #gridStripOf(tabBar) {
    if (!tabBar?.matches(this.#selectors.get("verticalTabBar"))) {
      return null;
    }
    return tabBar.querySelector(this.#selectors.get("tabStrip"));
  }
  #isPinned(slot) {
    const pinned = this.#selectors.get("pinnedTab");
    return slot.matches(pinned) || slot.querySelector(pinned) !== null;
  }
  #mark(slot, isTile) {
    slot.toggleAttribute(FAVORITE_ATTRIBUTE, isTile);
    const tabId = FavoriteTagger.tabIdOf(slot, this.#selectors.get("tabWrapper"));
    slot.toggleAttribute(UNLOADED_ATTRIBUTE, isTile && tabId !== null && this.#unloadedTabs.has(tabId));
  }
}
export {
  FAVORITE_ATTRIBUTE,
  FavoriteTagger,
  GRID_ATTRIBUTE,
  UNLOADED_ATTRIBUTE
};
