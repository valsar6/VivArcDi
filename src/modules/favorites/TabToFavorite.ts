import { TabDragRelease } from '../../core/TabDragRelease.js';
import type { FavoriteDrop } from './FavoriteDrop.js';
import type { GridDropZone, GridTarget } from './GridDropZone.js';

export interface TabToFavoriteDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of Vivaldi's tab wrapper. */
  wrapperSelector: string;
  zone: Pick<GridDropZone, 'at' | 'mark' | 'clear'>;
  drop: Pick<FavoriteDrop, 'add'>;
}

export class TabToFavorite {
  #release: TabDragRelease<GridTarget>;

  /**
   * Lets a tab of Vivaldi's list be released over the Favorites grid to become a Favorite. It
   * shows the gap under the pointer while the tab is dragged. The release comes either as a mouse
   * event or as an HTML5 drop, which `TabDragRelease` handles once for each press.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, wrapperSelector, zone, drop }: TabToFavoriteDependencies) {
    this.#release = new TabDragRelease<GridTarget>({
      document,
      wrapperSelector,
      place: {
        at: (x, y): GridTarget | null => zone.at(x, y),
        mark: (target): void => zone.mark(target),
        clear: (): void => zone.clear(),
        release: (tabId, target): void => void drop.add(tabId, target.beforeId),
      },
    });
  }

  /**
   * Starts following the mouse and the drag events.
   */
  public start(): void {
    this.#release.start();
  }

  /**
   * Stops following the mouse and the drag events, and removes the gap.
   */
  public stop(): void {
    this.#release.stop();
  }
}
