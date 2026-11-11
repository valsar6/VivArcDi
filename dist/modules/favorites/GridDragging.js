import { ContextMenu } from "../../core/ContextMenu.js";
import { DragPill } from "../../core/DragPill.js";
import { FavoriteDropZone } from "../../core/FavoriteDropZone.js";
import { LinkDropZone } from "../../core/LinkDropZone.js";
import { RowDrag } from "../../core/RowDrag.js";
import { TodayList } from "../../core/TodayList.js";
import { FavoriteDrop } from "./FavoriteDrop.js";
import { FavoriteRemoval } from "./FavoriteRemoval.js";
import { TILE_ATTRIBUTE } from "./FavoritesView.js";
import { GridDropZone } from "./GridDropZone.js";
import { GridFavoriteTargets } from "./GridFavoriteTargets.js";
import { LinkedTabs } from "./LinkedTabs.js";
import { TileMenu } from "./TileMenu.js";
import { TabToFavorite } from "./TabToFavorite.js";
const inWindow = (element) => element?.parentElement == null ? null : element;
class GridDragging {
  #toFavorite;
  #tileDrag;
  #tileMenu;
  #zone;
  #targets;
  #unregister = null;
  /**
   * Both directions of dragging on the Favorites grid: a tab of the list released over the grid
   * becomes a Favorite, and a tile dragged out of the grid takes the Favorite out and keeps the
   * page, as a link of a folder or as a Today tab. The grid is also offered to the folders
   * through `FavoriteDropZone`, as the place where a link dragged out of them becomes a Favorite.
   * A pill with the icon and the title follows what is dragged, and the right-click menu of a tile
   * offers Untile tab and Pin tab, which do the same moves without dragging.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor({ document, selectors, tabs, writer, folder, logger, favorites, pinned }) {
    const wrapperSelector = selectors.get("tabWrapper");
    const stripSelector = selectors.get("tabStrip");
    const grid = () => favorites.active ? inWindow(favorites.element) : null;
    const below = () => inWindow(pinned?.element);
    const links = new LinkedTabs(tabs);
    const zone = new GridDropZone({ document, grid, below });
    const drop = new FavoriteDrop({ tabs, writer, links, folder, logger });
    const pill = DragPill.of(document, selectors);
    this.#toFavorite = new TabToFavorite({ document, wrapperSelector, zone, drop, tabs, pill, logger });
    this.#zone = FavoriteDropZone.of(document);
    this.#targets = new GridFavoriteTargets({ zone, drop });
    const removal = new FavoriteRemoval({
      tabs,
      writer,
      links,
      zone: LinkDropZone.of(document),
      today: new TodayList({ document, stripSelector, wrapperSelector, skipSelector: TodayList.skippedBy(selectors) }),
      logger
    });
    this.#tileDrag = new RowDrag({
      document,
      container: grid,
      selector: `[${TILE_ATTRIBUTE}]`,
      idAttribute: TILE_ATTRIBUTE,
      onMove: (_favoriteId, x, y) => removal.over(x, y),
      onDrop: (favoriteId, x, y) => void removal.release(favoriteId, x, y),
      onEnd: () => removal.clear(),
      pill
    });
    const menu = new ContextMenu({ document, parent: () => document.querySelector(selectors.get("browser")) ?? document.body });
    this.#tileMenu = new TileMenu({ document, grid, menu, removal });
  }
  /**
   * Starts following the mouse and the drag events, and offers the grid to `FavoriteDropZone`.
   */
  start() {
    this.#toFavorite.start();
    this.#tileDrag.attach();
    this.#tileMenu.attach();
    this.#unregister = this.#zone.register(this.#targets);
  }
  /**
   * Stops following the mouse and the drag events, removes the marks and withdraws the grid.
   */
  stop() {
    this.#toFavorite.stop();
    this.#tileDrag.detach();
    this.#tileMenu.detach();
    this.#unregister?.();
    this.#unregister = null;
  }
}
export {
  GridDragging
};
