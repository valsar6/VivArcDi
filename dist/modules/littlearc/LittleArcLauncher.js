import { WindowBounds } from "./WindowBounds.js";
const BLANK_PAGE = "about:blank";
class LittleArcLauncher {
  #windows;
  #registry;
  #screen;
  #size;
  #logger;
  /**
   * Opens Little Arc windows: a small popup window, centred on the screen.
   *
   * @param dependencies The windows API, the registry of Little Arc windows, the screen, the share
   * of the screen the window takes and a logger.
   */
  constructor({ windows, registry, screen, size, logger }) {
    this.#windows = windows;
    this.#registry = registry;
    this.#screen = screen;
    this.#size = size;
    this.#logger = logger;
  }
  /**
   * Opens an empty Little Arc window, where the user types an address.
   *
   * @returns Whether the window was opened.
   */
  openBlank() {
    return this.#opened({ url: BLANK_PAGE });
  }
  /**
   * Opens a Little Arc window that starts loading an address. A search is opened through the fallback
   * search address by the caller, because `chrome.search.query` is missing in the main window.
   *
   * @param url The address to load.
   * @returns Whether the window was opened.
   */
  openAddress(url) {
    return this.#opened({ url });
  }
  /**
   * Opens a Little Arc window for a link of another page and keeps its id, so the row or tile the
   * link came from can be marked.
   *
   * @param url The address of the link.
   * @returns The id of the new window, or null when it could not be opened.
   */
  async openAddressIn(url) {
    const details = await this.#open({ url });
    return details?.id ?? null;
  }
  /**
   * Moves a tab that Vivaldi opened in the main window into a new Little Arc window, so that the
   * page is not loaded twice. When the window cannot be created the tab stays where Vivaldi put it.
   *
   * @param tabId The tab to move.
   * @returns Whether the tab was moved.
   */
  adopt(tabId) {
    return this.#opened({ tabId });
  }
  async #opened(source) {
    return await this.#open(source) !== null;
  }
  async #open(source) {
    try {
      const details = await this.#windows.create({ ...source, type: "popup", focused: true, ...WindowBounds.centred(this.#screen(), this.#size) });
      if (details.id !== void 0) {
        this.#registry.mark(details.id);
      }
      return details;
    } catch (error) {
      this.#logger.error("could not open a Little Arc window, leaving the link to Vivaldi", error);
      return null;
    }
  }
}
export {
  LittleArcLauncher
};
