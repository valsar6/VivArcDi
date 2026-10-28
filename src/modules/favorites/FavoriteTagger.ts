import { TabSlot } from '../../core/TabSlot.js';
import type { SelectorCatalog } from '../../core/SelectorCatalog.js';

export const FAVORITE_ATTRIBUTE = 'data-vivarcdi-favorite';
export const UNLOADED_ATTRIBUTE = 'data-vivarcdi-unloaded';
export const GRID_ATTRIBUTE = 'data-vivarcdi-favorites';

export interface UnloadedLookup {
  has(tabId: number): boolean;
}

export class FavoriteTagger {
  #selectors: SelectorCatalog;
  #maxTiles: number;
  #unloadedTabs: UnloadedLookup;
  #strip: HTMLElement | null = null;
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
  constructor(selectors: SelectorCatalog, maxTiles: number, unloadedTabs: UnloadedLookup) {
    this.#selectors = selectors;
    this.#maxTiles = maxTiles;
    this.#unloadedTabs = unloadedTabs;
  }

  /**
   * @param value How many pinned tabs become tiles from the next `apply`; 0 when the Favorites
   *   come from bookmarks.
   */
  public set maxTiles(value: number) {
    this.#maxTiles = value;
  }

  /**
   * Reads the tab id that Vivaldi stores on a tab wrapper as `data-id="tab-<id>"`.
   *
   * @param slot A child of the tab strip.
   * @param wrapperSelector Selector of the tab wrapper.
   * @returns The tab id, or null when the slot holds no tab.
   */
  public static tabIdOf(slot: Element, wrapperSelector: string): number | null {
    return TabSlot.idOf(slot, wrapperSelector);
  }

  /**
   * @returns How many tiles the last `apply` marked.
   */
  public get tileCount(): number {
    return this.#tileCount;
  }

  /**
   * Marks the tiles of a tab bar, or removes every mark when the tab bar is not vertical.
   * Only touches what changed, so it can run after every mutation of the tab bar.
   *
   * @param tabBar Vivaldi's tab bar container.
   * @returns The tab strip laid out as a grid, or null.
   */
  public apply(tabBar: Element | null): HTMLElement | null {
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
  public clear(): void {
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

  #gridStripOf(tabBar: Element | null): HTMLElement | null {
    if (!tabBar?.matches(this.#selectors.get('verticalTabBar'))) {
      return null;
    }
    return tabBar.querySelector<HTMLElement>(this.#selectors.get('tabStrip'));
  }

  #isPinned(slot: Element): boolean {
    const pinned = this.#selectors.get('pinnedTab');
    return slot.matches(pinned) || slot.querySelector(pinned) !== null;
  }

  #mark(slot: Element, isTile: boolean): void {
    slot.toggleAttribute(FAVORITE_ATTRIBUTE, isTile);
    const tabId = FavoriteTagger.tabIdOf(slot, this.#selectors.get('tabWrapper'));
    slot.toggleAttribute(UNLOADED_ATTRIBUTE, isTile && tabId !== null && this.#unloadedTabs.has(tabId));
  }
}
