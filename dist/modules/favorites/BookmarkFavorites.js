import { TabBarAnchor } from "../../core/TabBarAnchor.js";
import { SerialTask } from "../../core/SerialTask.js";
import { TabUnloader } from "../../core/TabUnloader.js";
import { FavoriteOpener } from "./FavoriteOpener.js";
import { FavoriteStates } from "./FavoriteStates.js";
import { FavoritesFolder } from "./FavoritesFolder.js";
import { FavoritesView } from "./FavoritesView.js";
import { LinkedTabs } from "./LinkedTabs.js";
const GRID_ORDER = 10;
class BookmarkFavorites {
  #deps;
  #links;
  #view;
  #anchor;
  #detach = null;
  #folder;
  #favorites = null;
  #unsubscribe = [];
  #states;
  /**
   * The Favorites drawn from a bookmark folder: the same tiles in every workspace, each one
   * opening a pinned tab of the current workspace that the tab list hides.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    const { document, selectors, tabs, bookmarks, logger, folder } = dependencies;
    this.#deps = dependencies;
    this.#links = new LinkedTabs(tabs);
    const opener = new FavoriteOpener(tabs, this.#links, new TabUnloader(tabs), logger);
    this.#view = new FavoritesView(document, {
      open: (favorite) => void opener.open(favorite),
      unload: (favorite) => void opener.unload(favorite)
    });
    this.#anchor = TabBarAnchor.of(document, selectors.get("tabListHost"));
    this.#folder = new FavoritesFolder(bookmarks, folder, (favorites) => this.#receive(favorites));
    this.#states = new SerialTask(
      () => this.#applyStates(),
      (error) => logger.error("Could not read the Favorites tabs", error)
    );
  }
  /**
   * @returns Whether the folder was found, so the tiles come from it.
   */
  get active() {
    return this.#favorites !== null;
  }
  /**
   * @returns How many tiles are shown.
   */
  get count() {
    return this.#view.count;
  }
  /**
   * Reads the folder and starts following bookmarks and tabs.
   */
  async start() {
    this.#subscribeToTabs();
    await this.#folder.start();
  }
  /**
   * Removes the tiles and every listener.
   */
  stop() {
    this.#folder.stop();
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    this.place(false);
    this.#view.destroy();
    this.#deps.hiddenTabs.clear();
  }
  /**
   * Shows or hides the tiles above the tab list; the shared anchor keeps them there
   * through Vivaldi's redraws.
   *
   * @param visible Whether the vertical tab bar is shown.
   * @returns The grid element when it is in place, otherwise null.
   */
  place(visible) {
    if (!visible || !this.active) {
      this.#detach?.();
      this.#detach = null;
      return null;
    }
    try {
      this.#detach ??= this.#anchor.add(this.#view.element, GRID_ORDER);
    } catch {
      return null;
    }
    return this.#view.element;
  }
  #subscribeToTabs() {
    const { tabs, logger } = this.#deps;
    const read = () => this.#readStates();
    const events = [
      () => tabs.onUpdated(read),
      () => tabs.onActivated(read),
      () => tabs.onRemoved(read),
      () => tabs.onCreated(read)
    ];
    for (const subscribe of events) {
      try {
        this.#unsubscribe.push(subscribe());
      } catch {
        logger.warn("A tab event is missing: tiles may lag behind the tabs");
      }
    }
  }
  #receive(favorites) {
    const { logger, folder, maxTiles } = this.#deps;
    if (favorites === null) {
      logger.warn(`Bookmark folder "${folder}" not found: the Favorites are the first pinned tabs`);
    } else {
      this.#view.show(favorites.slice(0, maxTiles));
      this.#links.sync(favorites).catch((error) => logger.error("Could not update linked tabs", error));
    }
    this.#favorites = favorites === null ? null : favorites.slice(0, maxTiles);
    this.#readStates();
    this.#deps.onChange();
  }
  #readStates() {
    this.#states.request();
  }
  async #applyStates() {
    if (this.#favorites === null) {
      return;
    }
    const snapshot = await this.#links.snapshot();
    this.#view.apply(FavoriteStates.of(this.#favorites, snapshot));
    const { hiddenTabs } = this.#deps;
    hiddenTabs.clear();
    snapshot.linkedTabIds.forEach((id) => hiddenTabs.add(id));
    this.#deps.onChange();
  }
}
export {
  BookmarkFavorites
};
