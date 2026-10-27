import { Module } from "../../core/Module.js";
import { LinkActivator } from "../folders/LinkActivator.js";
import { OpenLinks } from "../folders/OpenLinks.js";
import { PreviewController } from "./PreviewController.js";
const DEFAULT_DELAY_MS = 400;
const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 2e3;
class FolderPreview extends Module {
  static id = "folder-preview";
  #controller = null;
  /**
   * Opens a panel with a search field and the links of a folder, each with the time since it was
   * last opened, when the pointer rests on a closed folder of the `bookmark-folders` section.
   * Without `chrome.bookmarks`, `chrome.tabs` or the browser element it stays off.
   *
   * @param context What the module may use.
   */
  start(context) {
    const { document, tabs, bookmarks, logger, options, selectors } = context;
    const parent = bookmarks.available && tabs.available ? document.querySelector(selectors.get("browser")) : null;
    if (parent === null) {
      logger.warn("chrome.bookmarks, chrome.tabs or the browser element is missing: the folder panel is off");
      return;
    }
    const delay = options["hoverDelayMs"];
    const openLinks = new OpenLinks(tabs, () => void 0, logger);
    this.#controller = new PreviewController({
      document,
      parent,
      bar: () => document.querySelector(selectors.get("tabBar")),
      bookmarks,
      openLinks,
      activator: new LinkActivator(tabs, openLinks, logger),
      storage: FolderPreview.#storageOf(document),
      locale: document.defaultView?.navigator.language ?? "en",
      delayMs: typeof delay === "number" ? Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, delay)) : DEFAULT_DELAY_MS,
      logger
    });
    this.#controller.start();
  }
  /**
   * Removes the panel and every listener.
   */
  stop() {
    this.#controller?.stop();
    this.#controller = null;
  }
  static #storageOf(document) {
    try {
      return document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
export {
  FolderPreview
};
