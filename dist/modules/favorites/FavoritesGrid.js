import { DomQuery } from "../../core/DomQuery.js";
import { FrameTask } from "../../core/FrameTask.js";
import { HiddenTabMarker } from "../../core/HiddenTabMarker.js";
import { HiddenTabs } from "../../core/HiddenTabs.js";
import { Module } from "../../core/Module.js";
import { TabUnloader } from "../../core/TabUnloader.js";
import { BookmarkFavorites } from "./BookmarkFavorites.js";
import { FavoriteTagger } from "./FavoriteTagger.js";
import { GridLayout } from "./GridLayout.js";
import { MiddleClickUnload } from "./MiddleClickUnload.js";
import { PinnedFavorites } from "./PinnedFavorites.js";
import { TileSourceChoice } from "./TileSource.js";
import { UnloadedTabs } from "./UnloadedTabs.js";
const NO_TABS = { has: () => false };
class FavoritesGrid extends Module {
  static id = "favorites-grid";
  /**
   * Options accepted in `config.json`, with their defaults.
   */
  static defaults = Object.freeze({
    folder: "Favorites",
    maxTiles: 12,
    maxColumns: 3,
    tileMinWidth: 64,
    tileHeight: 44,
    gap: 8,
    unloadOnMiddleClick: true
  });
  #document = null;
  #selectors = null;
  #settings = FavoritesGrid.defaults;
  #observer = null;
  #refresh = null;
  #tagger = null;
  #layout = null;
  #unloadedTabs = null;
  #middleClick = null;
  #fromBookmarks = null;
  #hiddenTabs = null;
  #hiddenMarker = null;
  #fromPinned = null;
  /**
   * Shows the Favorites as an Arc-style grid of icon tiles at the top of a vertical tab bar.
   * With `chrome.bookmarks` and `chrome.tabs`, the Favorites are the links of a bookmark folder,
   * the same in every workspace, and each opens a pinned tab hidden from the list. While the
   * folder is missing or has no links, the first pinned tabs of the workspace become the tiles,
   * drawn the same way, and their slots are hidden from the list. Without `chrome.tabs`, the first
   * pinned tabs are laid out as a grid in Vivaldi's own list. Tiles of unloaded tabs are dimmed,
   * and a middle click unloads a tile instead of closing it.
   *
   * @param context What the module may use.
   */
  async start({ document, selectors, logger, options, tabs, bookmarks }) {
    const settings = { ...FavoritesGrid.defaults, ...options };
    this.#settings = settings;
    this.#document = document;
    this.#selectors = selectors;
    this.#refresh = new FrameTask(() => this.#update());
    this.#layout = new GridLayout(settings);
    if (tabs.available) {
      this.#unloadedTabs = new UnloadedTabs(tabs, () => this.#refresh?.request());
      this.#startMiddleClick(settings, tabs, logger);
    } else {
      logger.warn("chrome.tabs is missing: unloaded tiles are not dimmed and middle click closes tabs");
    }
    this.#tagger = new FavoriteTagger(selectors, settings.maxTiles, this.#unloadedTabs ?? NO_TABS);
    this.#hiddenTabs = HiddenTabs.of(document);
    this.#hiddenMarker = new HiddenTabMarker(document, selectors, this.#hiddenTabs);
    this.#hiddenMarker.start();
    this.#observer = new MutationObserver(() => this.#refresh?.request());
    this.#observer.observe(DomQuery.require(document, selectors.get("browser")), {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
    this.#fromPinned = this.#pinnedFavorites(tabs, logger);
    this.#update();
    await this.#unloadedTabs?.start().catch((error) => logger.error("Could not read unloaded tabs", error));
    await this.#fromPinned?.start().catch((error) => logger.error("Could not read the pinned tabs", error));
    await this.#startBookmarks(tabs, bookmarks, logger);
  }
  /**
   * Removes the grid and every listener, leaving Vivaldi's tab bar as it was.
   */
  stop() {
    this.#observer?.disconnect();
    this.#refresh?.cancel();
    this.#middleClick?.detach();
    this.#unloadedTabs?.stop();
    this.#stopBookmarks();
    this.#layout?.release();
    this.#tagger?.clear();
    this.#observer = null;
    this.#middleClick = null;
    this.#unloadedTabs = null;
  }
  #stopBookmarks() {
    this.#fromBookmarks?.stop();
    this.#fromPinned?.stop();
    this.#hiddenMarker?.stop();
    this.#fromBookmarks = null;
    this.#fromPinned = null;
    this.#hiddenMarker = null;
    this.#hiddenTabs = null;
  }
  #startMiddleClick(settings, tabs, logger) {
    if (!settings.unloadOnMiddleClick || this.#document === null || this.#selectors === null) {
      return;
    }
    this.#middleClick = new MiddleClickUnload({
      document: this.#document,
      unloader: new TabUnloader(tabs),
      wrapperSelector: this.#selectors.get("tabWrapper"),
      logger
    });
    this.#middleClick.attach();
  }
  #pinnedFavorites(tabs, logger) {
    const document = this.#document;
    const selectors = this.#selectors;
    const hiddenTabs = this.#hiddenTabs;
    if (!tabs.available || document === null || hiddenTabs === null || selectors?.has("tabListHost") !== true) {
      return null;
    }
    return new PinnedFavorites({
      document,
      selectors,
      tabs,
      logger,
      maxTiles: this.#settings.maxTiles,
      hiddenTabs,
      onChange: () => this.#refresh?.request()
    });
  }
  async #startBookmarks(tabs, bookmarks, logger) {
    const document = this.#document;
    const selectors = this.#selectors;
    const hiddenTabs = this.#hiddenTabs;
    if (!tabs.available || bookmarks?.available !== true || document === null || hiddenTabs === null || selectors?.has("tabListHost") !== true) {
      logger.warn("Bookmarks, tabs or the tab list are missing: the Favorites are the first pinned tabs");
      return;
    }
    this.#fromBookmarks = new BookmarkFavorites({
      document,
      selectors,
      tabs,
      bookmarks,
      logger,
      folder: this.#settings.folder,
      maxTiles: this.#settings.maxTiles,
      hiddenTabs,
      onChange: () => this.#refresh?.request()
    });
    await this.#fromBookmarks.start().catch((error) => logger.error("Could not read the Favorites folder", error));
  }
  #update() {
    const tagger = this.#tagger;
    const tabBar = this.#tabBar();
    if (tagger === null || tabBar === void 0) {
      return;
    }
    tagger.maxTiles = this.#fromPinned === null ? this.#settings.maxTiles : 0;
    const strip = tagger.apply(tabBar);
    const sources = this.#sources();
    const chosen = TileSourceChoice.of(sources);
    const placed = sources.map((source) => source.place(source === chosen && strip !== null));
    this.#layout?.follow(placed.find((grid) => grid !== null) ?? strip, chosen?.count ?? tagger.tileCount);
  }
  #sources() {
    return [this.#fromBookmarks, this.#fromPinned].filter((source) => source !== null);
  }
  #tabBar() {
    if (this.#document === null || this.#selectors === null) {
      return void 0;
    }
    return this.#document.querySelector(this.#selectors.get("tabBar"));
  }
}
export {
  FavoritesGrid
};
