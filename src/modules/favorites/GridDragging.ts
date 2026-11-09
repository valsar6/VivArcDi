import type { BookmarkWriter } from '../../core/bookmarks/BookmarkWriter.js';
import type { BrowserTabs } from '../../core/BrowserTabs.js';
import { LinkDropZone } from '../../core/LinkDropZone.js';
import type { Logger } from '../../core/Logger.js';
import type { SelectorCatalog } from '../../core/SelectorCatalog.js';
import { FavoriteDrop } from './FavoriteDrop.js';
import { FavoriteRemoval } from './FavoriteRemoval.js';
import { GridDropZone } from './GridDropZone.js';
import { LinkedTabs } from './LinkedTabs.js';
import { TabToFavorite } from './TabToFavorite.js';
import { TileDrag } from './TileDrag.js';
import { TodayList } from './TodayList.js';

export interface GridDraggingDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  /** Needs `tabWrapper` and `tabStrip`. */
  selectors: SelectorCatalog;
  tabs: BrowserTabs;
  writer: BookmarkWriter;
  /** Path of the Favorites folder. */
  folder: string;
  logger: Logger;
  /** The bookmark Favorites: whether they are shown, and the element of their grid. */
  favorites: { readonly active: boolean; readonly element: HTMLElement };
  /** The pinned tiles under them, if there are any. */
  pinned: { readonly element: HTMLElement } | null;
}

const inWindow = (element: HTMLElement | undefined): HTMLElement | null => (element?.parentElement == null ? null : element);

export class GridDragging {
  #toFavorite: TabToFavorite;
  #tileDrag: TileDrag;

  /**
   * Both directions of dragging on the Favorites grid: a tab of the list released over the grid
   * becomes a Favorite, and a tile dragged out of the grid takes the Favorite out and keeps the
   * page, as a link of a folder or as a Today tab.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, selectors, tabs, writer, folder, logger, favorites, pinned }: GridDraggingDependencies) {
    const wrapperSelector = selectors.get('tabWrapper');
    const stripSelector = selectors.get('tabStrip');
    const grid = (): HTMLElement | null => (favorites.active ? inWindow(favorites.element) : null);
    const below = (): HTMLElement | null => inWindow(pinned?.element);
    const links = new LinkedTabs(tabs);
    this.#toFavorite = new TabToFavorite({
      document,
      wrapperSelector,
      zone: new GridDropZone({ document, grid, below }),
      drop: new FavoriteDrop({ tabs, writer, links, folder, logger }),
    });
    const removal = new FavoriteRemoval({
      tabs,
      writer,
      links,
      zone: LinkDropZone.of(document),
      today: new TodayList({ document, stripSelector, wrapperSelector }),
      logger,
    });
    this.#tileDrag = new TileDrag({
      document,
      grid,
      onMove: (_favoriteId, x, y): void => removal.over(x, y),
      onDrop: (favoriteId, x, y): void => void removal.release(favoriteId, x, y),
      onEnd: (): void => removal.clear(),
    });
  }

  /**
   * Starts following the mouse and the drag events.
   */
  public start(): void {
    this.#toFavorite.start();
    this.#tileDrag.attach();
  }

  /**
   * Stops following the mouse and the drag events, and removes the marks.
   */
  public stop(): void {
    this.#toFavorite.stop();
    this.#tileDrag.detach();
  }
}
