import { LinkDropZone } from "../../core/LinkDropZone.js";
import { FavoriteDrop } from "./FavoriteDrop.js";
import { FavoriteRemoval } from "./FavoriteRemoval.js";
import { GridDropZone } from "./GridDropZone.js";
import { LinkedTabs } from "./LinkedTabs.js";
import { TabToFavorite } from "./TabToFavorite.js";
import { TileDrag } from "./TileDrag.js";
import { TodayList } from "./TodayList.js";
const inWindow = (element) => element?.parentElement == null ? null : element;
class GridDragging {
  #toFavorite;
  #tileDrag;
  /**
   * Both directions of dragging on the Favorites grid: a tab of the list released over the grid
   * becomes a Favorite, and a tile dragged out of the grid takes the Favorite out and keeps the
   * page, as a link of a folder or as a Today tab.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, selectors, tabs, writer, folder, logger, favorites, pinned }) {
    const wrapperSelector = selectors.get("tabWrapper");
    const stripSelector = selectors.get("tabStrip");
    const grid = () => favorites.active ? inWindow(favorites.element) : null;
    const below = () => inWindow(pinned?.element);
    const links = new LinkedTabs(tabs);
    this.#toFavorite = new TabToFavorite({
      document,
      wrapperSelector,
      zone: new GridDropZone({ document, grid, below }),
      drop: new FavoriteDrop({ tabs, writer, links, folder, logger })
    });
    const removal = new FavoriteRemoval({
      tabs,
      writer,
      links,
      zone: LinkDropZone.of(document),
      today: new TodayList({ document, stripSelector, wrapperSelector }),
      logger
    });
    this.#tileDrag = new TileDrag({
      document,
      grid,
      onMove: (_favoriteId, x, y) => removal.over(x, y),
      onDrop: (favoriteId, x, y) => void removal.release(favoriteId, x, y),
      onEnd: () => removal.clear()
    });
  }
  /**
   * Starts following the mouse and the drag events.
   */
  start() {
    this.#toFavorite.start();
    this.#tileDrag.attach();
  }
  /**
   * Stops following the mouse and the drag events, and removes the marks.
   */
  stop() {
    this.#toFavorite.stop();
    this.#tileDrag.detach();
  }
}
export {
  GridDragging
};
