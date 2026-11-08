const WEB_ADDRESS = /^https?:\/\//i;
const FOCUS_WINDOW_MS = 100;
class ExternalLinkDetector {
  #history;
  #isLittleArc;
  /**
   * Tells whether a new tab is a link opened from another app. Seen on Vivaldi 8.2 for macOS: such a
   * tab is active, has no opener, has a web address, lands in a normal window and appears within a
   * few milliseconds of the application coming to the foreground.
   *
   * @param history The focus events of the browser's windows.
   * @param isLittleArc Tells whether a window is a Little Arc window.
   */
  constructor(history, isLittleArc) {
    this.#history = history;
    this.#isLittleArc = isLittleArc;
  }
  /**
   * @param tab The new tab, read again a moment after it appeared.
   * @param createdAt When the tab appeared, in milliseconds.
   * @returns Whether the tab is a link from another app.
   */
  accepts(tab, createdAt) {
    const address = tab.pendingUrl ?? tab.url ?? "";
    return tab.openerTabId === void 0 && tab.active && WEB_ADDRESS.test(address) && !(tab.windowId !== void 0 && this.#isLittleArc(tab.windowId)) && this.#history.broughtForwardNear(createdAt, FOCUS_WINDOW_MS);
  }
}
export {
  ExternalLinkDetector,
  FOCUS_WINDOW_MS
};
