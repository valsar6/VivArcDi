import { TabPointerDrag } from '../../core/TabPointerDrag.js';
import type { FavoriteDrop } from './FavoriteDrop.js';
import type { GridDropZone, GridTarget } from './GridDropZone.js';

export interface TabToFavoriteDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Selector of Vivaldi's tab wrapper. */
  wrapperSelector: string;
  zone: Pick<GridDropZone, 'at' | 'showGap' | 'clearGap' | 'listen' | 'unlisten'>;
  drop: Pick<FavoriteDrop, 'add'>;
}

export class TabToFavorite {
  #drag: TabPointerDrag;
  #zone: TabToFavoriteDependencies['zone'];
  #drop: Pick<FavoriteDrop, 'add'>;
  #handled: number | null = null;

  /**
   * Lets a tab of Vivaldi's list be released over the Favorites grid to become a Favorite. It
   * shows the gap under the pointer while the tab is dragged. The release comes either as a mouse
   * event or as an HTML5 drop; one press is handled once, whichever comes first.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, wrapperSelector, zone, drop }: TabToFavoriteDependencies) {
    this.#zone = zone;
    this.#drop = drop;
    this.#drag = new TabPointerDrag({
      document,
      wrapperSelector,
      onMove: (x, y): void => zone.showGap(zone.at(x, y)),
      onDrop: (_tabId, x, y): void => this.#release(zone.at(x, y)),
      onEnd: (): void => zone.clearGap(),
    });
  }

  /**
   * Starts following the mouse and the drag events.
   */
  public start(): void {
    this.#drag.attach();
    this.#zone.listen((target) => this.#release(target));
  }

  /**
   * Stops following the mouse and the drag events, and removes the gap.
   */
  public stop(): void {
    this.#drag.detach();
    this.#zone.unlisten();
  }

  #release(target: GridTarget | null): void {
    const press = this.#drag.lastPress;
    if (target === null || press === null || press.serial === this.#handled) {
      return;
    }
    this.#handled = press.serial;
    void this.#drop.add(press.tabId, target.beforeId);
  }
}
