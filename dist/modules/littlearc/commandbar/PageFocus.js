import { tabIdOf } from "../../../core/Webview.js";
class PageFocus {
  #options;
  #previous = null;
  /**
   * Remembers what had the keyboard focus when the command bar opened and gives it back when the bar
   * closes. When that element is gone, the page of the active tab takes the focus.
   *
   * @param options The document, the tabs API, this window's id and the selector of the page webviews.
   */
  constructor(options) {
    this.#options = options;
  }
  /**
   * Remembers the element that has the focus now.
   */
  remember() {
    this.#previous = this.#options.document.activeElement;
  }
  /**
   * Gives the focus back.
   */
  restore() {
    const previous = this.#previous;
    this.#previous = null;
    if (previous?.isConnected === true) {
      previous.focus();
    } else {
      void this.#focusActivePage().catch(() => void 0);
    }
  }
  async #focusActivePage() {
    const { document, tabs, windowId, webviewSelector } = this.#options;
    const [tab] = await tabs.query({ windowId, active: true });
    const webview = [...document.querySelectorAll(webviewSelector)].find((candidate) => tabIdOf(candidate) === tab?.id);
    webview?.focus();
  }
}
export {
  PageFocus
};
