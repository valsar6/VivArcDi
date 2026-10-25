import { FAVORITE_ATTRIBUTE, FavoriteTagger } from "./FavoriteTagger.js";
const MIDDLE_BUTTON = 1;
const BLOCKED_EVENTS = ["pointerdown", "pointerup", "mousedown", "mouseup", "auxclick"];
class MiddleClickUnload {
  #document;
  #unloader;
  #wrapperSelector;
  #logger;
  #listener = (event) => this.#handle(event);
  /**
   * Turns a middle click on a tile, which Vivaldi treats as close, into an unload.
   * Listens in the capture phase so Vivaldi never sees the click.
   *
   * @param dependencies Everything the interceptor collaborates with.
   */
  constructor({ document, unloader, wrapperSelector, logger }) {
    this.#document = document;
    this.#unloader = unloader;
    this.#wrapperSelector = wrapperSelector;
    this.#logger = logger;
  }
  /**
   * Starts intercepting middle clicks on tiles.
   */
  attach() {
    BLOCKED_EVENTS.forEach((type) => this.#document.addEventListener(type, this.#listener, true));
  }
  /**
   * Gives middle clicks back to Vivaldi.
   */
  detach() {
    BLOCKED_EVENTS.forEach((type) => this.#document.removeEventListener(type, this.#listener, true));
  }
  #handle(event) {
    if (event.button !== MIDDLE_BUTTON) {
      return;
    }
    const tile = event.target?.closest?.(`[${FAVORITE_ATTRIBUTE}]`);
    if (!tile) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type !== "auxclick") {
      return;
    }
    const tabId = FavoriteTagger.tabIdOf(tile, this.#wrapperSelector);
    if (tabId !== null) {
      this.#unloader.unload(tabId).catch((error) => this.#logger.error(`Could not unload tab ${tabId}`, error));
    }
  }
}
export {
  MiddleClickUnload
};
