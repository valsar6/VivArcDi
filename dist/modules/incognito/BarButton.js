const BAR_BUTTON_ATTRIBUTE = "data-vivarcdi-bar-button";
class BarButton {
  #element;
  /**
   * One round button of the bottom bar.
   *
   * @param document The browser window document.
   * @param spec Its name, label and action.
   */
  constructor(document, { name, title, onClick }) {
    this.#element = document.createElement("button");
    this.#element.setAttribute("type", "button");
    this.#element.setAttribute(BAR_BUTTON_ATTRIBUTE, name);
    this.#element.setAttribute("title", title);
    this.#element.setAttribute("aria-label", title);
    this.#element.addEventListener("click", () => onClick());
  }
  /**
   * @returns The element to put in the bar.
   */
  get element() {
    return this.#element;
  }
}
export {
  BAR_BUTTON_ATTRIBUTE,
  BarButton
};
