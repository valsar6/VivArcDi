import { BookmarkFolderFinder } from "../../core/bookmarks/BookmarkFolderFinder.js";
import { FrameTask } from "../../core/FrameTask.js";
import { Module } from "../../core/Module.js";
import { TabBarAnchor } from "../../core/TabBarAnchor.js";
import { FolderRows } from "./FolderRows.js";
import { FolderSectionView } from "./FolderSectionView.js";
import { FolderTreeSource } from "./FolderTreeSource.js";
import { LinkActivator } from "./LinkActivator.js";
import { OpenFolders } from "./OpenFolders.js";
import { OpenLinks } from "./OpenLinks.js";
const ANCHOR_ORDER = 20;
const DEFAULT_ROOT = "VivArcDi";
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_HEIGHT_PERCENT = 60;
const MAX_DEPTH_LIMIT = 10;
const MIN_PERCENT = 20;
const MAX_PERCENT = 100;
class BookmarkFolders extends Module {
  static id = "bookmark-folders";
  #stops = [];
  /**
   * Shows a bookmark folder in the vertical tab bar, below the Favorites grid: folders open and
   * close, a click opens a link or brings its tab forward, and links that are open stay visible.
   * Bookmarks are only read. Without `chrome.bookmarks`, `chrome.tabs` or the tab bar it stays off.
   *
   * @param context What the module may use.
   */
  async start(context) {
    const { tabs, bookmarks, logger, options } = context;
    if (!bookmarks.available || !tabs.available) {
      logger.warn("chrome.bookmarks or chrome.tabs is missing: the bookmark folders are off");
      return;
    }
    const maxDepth = BookmarkFolders.#number(options["maxDepth"], DEFAULT_MAX_DEPTH, 1, MAX_DEPTH_LIMIT);
    const maxHeight = BookmarkFolders.#number(options["maxHeightPercent"], DEFAULT_MAX_HEIGHT_PERCENT, MIN_PERCENT, MAX_PERCENT);
    const root = BookmarkFolderFinder.parsePath(typeof options["root"] === "string" ? options["root"] : DEFAULT_ROOT);
    const openFolders = new OpenFolders(context.storage, logger);
    openFolders.load();
    const redraw = new FrameTask(() => draw());
    const source = new FolderTreeSource(bookmarks, { path: root, maxDepth, onChange: () => redraw.request(), logger });
    const openLinks = new OpenLinks(tabs, () => redraw.request(), logger);
    const activator = new LinkActivator(tabs, openLinks, logger);
    const view = new FolderSectionView(
      context.document,
      {
        onFolder: (id) => {
          openFolders.toggle(id);
          redraw.request();
        },
        onLink: (link) => void activator.activate(link)
      },
      maxHeight
    );
    const draw = () => view.render(FolderRows.build(source.entries, { isOpen: (id) => openFolders.has(id), tabFor: (key) => openLinks.tabFor(key) }));
    try {
      const removeSection = TabBarAnchor.of(context.document, context.selectors.get("tabListHost")).add(view.element, ANCHOR_ORDER);
      this.#stops = [removeSection, () => redraw.cancel(), () => source.stop(), () => openLinks.stop()];
      await Promise.all([source.start(), openLinks.start()]);
      draw();
    } catch (error) {
      this.stop();
      logger.warn("the bookmark folders are off", error);
    }
  }
  /**
   * Removes the section and every listener. Bookmarks and saved folder states stay.
   */
  stop() {
    this.#stops.reverse().forEach((stop) => stop());
    this.#stops = [];
  }
  static #number(value, fallback, min, max) {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }
}
export {
  BookmarkFolders
};
