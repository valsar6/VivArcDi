import { FrameTask } from "../../core/support/FrameTask.js";
import { TabData } from "../../core/tabs/TabData.js";
const LITTLE_ARC_MARK_ATTRIBUTE = "data-vivarcdi-little-arc";
const TILE_SELECTOR = "data-vivarcdi-tile";
class LittleArcIndicator {
  #document;
  #selectors;
  #tabs;
  #windows;
  #logger;
  #sources = /* @__PURE__ */ new Map();
  #draw;
  #observer = null;
  #unsubscribe = null;
  #enabled = true;
  /**
   * Marks the row or the Favorite tile a Little Arc window came from, while that window is open.
   *
   * @param dependencies The document, the selector catalog, the tabs and windows APIs and a logger.
   */
  constructor({ document, selectors, tabs, windows, logger }) {
    this.#document = document;
    this.#selectors = selectors;
    this.#tabs = tabs;
    this.#windows = windows;
    this.#logger = logger;
    this.#draw = new FrameTask(() => this.#reapply());
  }
  /**
   * Follows the closed windows and the tab bar. Without `chrome.windows.onRemoved` the indicator
   * stays off, so that no mark is left behind.
   *
   * @returns A function that stops the indicator.
   */
  start() {
    try {
      this.#unsubscribe = this.#windows.onRemoved((windowId) => this.clear(windowId));
    } catch (error) {
      this.#enabled = false;
      this.#logger.warn("chrome.windows.onRemoved is missing: the Little Arc indicator stays off", error);
      return () => this.stop();
    }
    this.#observe();
    return () => this.stop();
  }
  /**
   * Stops following, removes every mark and forgets the windows.
   */
  stop() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#draw.cancel();
    for (const windowId of [...this.#sources.keys()]) {
      this.clear(windowId);
    }
  }
  /**
   * Marks the visible row or tile of a tab with the window a Little Arc window came from.
   *
   * @param sourceTabId The tab whose page opened the link.
   * @param windowId The Little Arc window.
   * @param url The address shown in the Little Arc window, for its favicon.
   */
  async show(sourceTabId, windowId, url) {
    if (!this.#enabled) {
      return;
    }
    try {
      const favoriteId = TabData.ownOf(await this.#tabs.get(sourceTabId)).favoriteId;
      const element = this.#elementOf(sourceTabId, favoriteId);
      if (element === null) {
        return;
      }
      this.#mark(element, url);
      this.#sources.set(windowId, { tabId: sourceTabId, favoriteId, url, element });
    } catch (error) {
      this.#logger.warn("could not mark the row of a Little Arc link", error);
    }
  }
  /**
   * Removes the mark of a Little Arc window that closed.
   *
   * @param windowId The Little Arc window.
   */
  clear(windowId) {
    const source = this.#sources.get(windowId);
    if (source === void 0) {
      return;
    }
    source.element.removeAttribute(LITTLE_ARC_MARK_ATTRIBUTE);
    source.element.style.removeProperty("--vivarcdi-little-arc-icon");
    this.#sources.delete(windowId);
  }
  #observe() {
    try {
      const root = this.#document.querySelector(this.#selectors.get("browser"));
      if (root === null) {
        return;
      }
      this.#observer = new MutationObserver(() => this.#draw.request());
      this.#observer.observe(root, { childList: true, subtree: true });
    } catch (error) {
      this.#logger.warn("cannot follow the tab bar: the Little Arc indicator may lag behind it", error);
    }
  }
  #reapply() {
    for (const source of this.#sources.values()) {
      const element = this.#elementOf(source.tabId, source.favoriteId);
      if (element !== null) {
        source.element = element;
        this.#mark(element, source.url);
      }
    }
  }
  #mark(element, url) {
    element.setAttribute(LITTLE_ARC_MARK_ATTRIBUTE, "");
    element.style.setProperty("--vivarcdi-little-arc-icon", `url("chrome://favicon/size/16@2x/${url}")`);
  }
  #elementOf(tabId, favoriteId) {
    if (favoriteId !== void 0) {
      return this.#document.querySelector(`[${TILE_SELECTOR}="${favoriteId}"]`);
    }
    return this.#document.querySelector(`${this.#selectors.get("tabWrapper")}[data-id="tab-${tabId}"]`);
  }
}
export {
  LITTLE_ARC_MARK_ATTRIBUTE,
  LittleArcIndicator
};
