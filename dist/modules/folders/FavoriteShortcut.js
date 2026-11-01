import { AddressKey } from "../../core/AddressKey.js";
import { KeptTab } from "../../core/KeptTab.js";
import { TabData } from "../../core/TabData.js";
const NOT_A_PAGE_TEXT = "Only web pages can go to the favorites";
const KEPT_TEXT = "This link was already a bookmark: it stays";
const FAILED_TEXT = "Could not change the favorites";
class FavoriteShortcut {
  #deps;
  #onKey = (event) => this.#handleKey(event);
  /**
   * Makes Cmd/Ctrl+D add the page of the active tab to the favorites of the workspace, as Arc does,
   * and the same keys take it back to the open tabs. It listens in the capture phase, like
   * `CloseShortcut`, and takes the key press so that Vivaldi does not also handle it. A page that
   * is not `http` or `https` gets a message, and a pinned tab or a Favorite is left alone.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param event A key press.
   * @returns Whether it is Cmd/Ctrl+D without other modifiers.
   */
  static isFavoriteKey(event) {
    return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "d";
  }
  /**
   * Starts listening, in the capture phase.
   */
  attach() {
    this.#deps.document.addEventListener("keydown", this.#onKey, true);
  }
  /**
   * Stops listening.
   */
  detach() {
    this.#deps.document.removeEventListener("keydown", this.#onKey, true);
  }
  #handleKey(event) {
    if (event.defaultPrevented || !FavoriteShortcut.isFavoriteKey(event)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#press().catch((error) => this.#deps.logger.warn("could not handle the favorites shortcut", error));
  }
  async #press() {
    const tab = await this.#deps.activeTab();
    if (tab === void 0) {
      return;
    }
    if (TabData.ownOf(tab).bookmarkId !== void 0) {
      await this.#takeBack(tab);
    } else if (!KeptTab.is(tab)) {
      await this.#add(tab);
    }
  }
  async #takeBack(tab) {
    const result = await this.#deps.favorites.take(tab);
    if (result === "kept") {
      this.#deps.notify(KEPT_TEXT);
    } else if (result === "failed") {
      this.#deps.notify(FAILED_TEXT);
    }
  }
  async #add(tab) {
    if (AddressKey.from(tab.url) === null) {
      this.#deps.notify(NOT_A_PAGE_TEXT);
    } else if (await this.#deps.favorites.add(tab) === "failed") {
      this.#deps.notify(FAILED_TEXT);
    }
  }
}
export {
  FAILED_TEXT,
  FavoriteShortcut,
  KEPT_TEXT,
  NOT_A_PAGE_TEXT
};
