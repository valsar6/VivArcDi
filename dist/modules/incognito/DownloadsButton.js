const DEFAULT_TITLES = ["Trasferimenti", "Downloads"];
class DownloadsButton {
  #document;
  #titles;
  /**
   * Vivaldi's Downloads button of the panel bar. It has no stable class, and its title follows the
   * language of the user, so it is found by the start of its title.
   *
   * @param document The browser window document.
   * @param titles What the title may start with, in any case.
   */
  constructor(document, titles = DEFAULT_TITLES) {
    this.#document = document;
    this.#titles = titles.map((title) => title.toLowerCase());
  }
  /**
   * Clicks the button, which opens the Downloads panel.
   *
   * @returns Whether the button was found.
   */
  click() {
    const button = [...this.#document.querySelectorAll("button[title]")].find((candidate) => this.#matches(candidate));
    button?.click();
    return button !== void 0;
  }
  #matches(button) {
    const title = (button.getAttribute("title") ?? "").toLowerCase();
    return this.#titles.some((start) => title.startsWith(start));
  }
}
export {
  DownloadsButton
};
