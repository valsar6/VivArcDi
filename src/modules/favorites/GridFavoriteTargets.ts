import type { FavoriteDropTarget, FavoritePage, FavoriteTargets } from '../../core/FavoriteDropZone.js';
import type { FavoriteDrop } from './FavoriteDrop.js';
import type { GridDropZone, GridTarget } from './GridDropZone.js';

export interface GridFavoriteTargetsDependencies {
  zone: Pick<GridDropZone, 'at' | 'mark' | 'clear'>;
  drop: Pick<FavoriteDrop, 'add' | 'addPage'>;
}

export class GridFavoriteTargets implements FavoriteTargets {
  #deps: GridFavoriteTargetsDependencies;

  /**
   * The Favorites grid, offered to the other modules as the place where a dragged page becomes a
   * Favorite, before the tile under the pointer or at the end.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: GridFavoriteTargetsDependencies) {
    this.#deps = dependencies;
  }

  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when it is outside the grid.
   */
  public at(x: number, y: number): FavoriteDropTarget | null {
    return this.#deps.zone.at(x, y);
  }

  /**
   * @param target The place to mark, or null to unmark.
   */
  public mark(target: FavoriteDropTarget | null): void {
    this.#deps.zone.mark(target as GridTarget | null);
  }

  /**
   * Removes the mark.
   */
  public clear(): void {
    this.#deps.zone.clear();
  }

  /**
   * @param target A place given by `at`.
   * @param page The tab or the title and address to add.
   * @returns Whether a Favorite was added.
   */
  public async drop(target: FavoriteDropTarget, page: FavoritePage): Promise<boolean> {
    const { beforeId } = target as GridTarget;
    const result = 'tab' in page ? await this.#addTab(page.tab, beforeId) : await this.#deps.drop.addPage(page, beforeId);
    return result === 'added';
  }

  async #addTab(tab: chrome.tabs.Tab, beforeId: string | null): Promise<'added' | 'ignored' | 'failed'> {
    return tab.id === undefined ? 'ignored' : this.#deps.drop.add(tab.id, beforeId);
  }
}
