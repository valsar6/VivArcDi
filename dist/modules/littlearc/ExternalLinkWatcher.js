const DETECTION_DELAY_MS = 80;
class ExternalLinkWatcher {
  #tabs;
  #detector;
  #launcher;
  #logger;
  /**
   * Looks at a new tab a moment after it appeared, when the focus events that tell where it came
   * from have arrived, and moves it into a Little Arc window if it is a link from another app.
   *
   * @param tabs Reads the tab again.
   * @param detector Decides whether the tab is a link from another app.
   * @param launcher Moves the tab into a Little Arc window.
   * @param logger Logger for failures.
   */
  constructor(tabs, detector, launcher, logger) {
    this.#tabs = tabs;
    this.#detector = detector;
    this.#launcher = launcher;
    this.#logger = logger;
  }
  /**
   * @param tabId The new tab.
   * @param createdAt When it appeared, in milliseconds.
   * @returns Whether the tab was moved into a Little Arc window.
   */
  async check(tabId, createdAt) {
    try {
      const tab = await this.#tabs.get(tabId);
      return this.#detector.accepts(tab, createdAt) && await this.#launcher.adopt(tabId);
    } catch (error) {
      this.#logger.warn("could not check whether the new tab is a link from another app", error);
      return false;
    }
  }
}
export {
  DETECTION_DELAY_MS,
  ExternalLinkWatcher
};
