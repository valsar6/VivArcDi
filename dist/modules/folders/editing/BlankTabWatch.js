const BLANK_MARKS = ["newtab", "startpage"];
class BlankTabWatch {
  #tabs;
  #stops = [];
  /**
   * Waits for a blank tab that the user may close without choosing a page.
   *
   * @param tabs The tabs API.
   */
  constructor(tabs) {
    this.#tabs = tabs;
  }
  /**
   * Watches one blank tab until it gets a page or closes; one watch at a time.
   *
   * @param tabId The blank tab.
   * @param onAbandoned Runs once when the tab closes while still blank.
   */
  start(tabId, onAbandoned) {
    this.stop();
    this.#stops.push(
      this.#tabs.onUpdated((id, change) => {
        if (id === tabId && change.url !== void 0 && !BlankTabWatch.#isBlank(change.url)) {
          this.stop();
        }
      }),
      this.#tabs.onRemoved((id) => {
        if (id === tabId) {
          this.stop();
          onAbandoned();
        }
      })
    );
  }
  /**
   * Removes the listeners.
   */
  stop() {
    this.#stops.forEach((stop) => stop());
    this.#stops = [];
  }
  static #isBlank(url) {
    return url === "" || BLANK_MARKS.some((mark) => url.includes(mark));
  }
}
export {
  BlankTabWatch
};
