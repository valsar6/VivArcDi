const NEW_TAB_ROW_ATTRIBUTE = "data-vivarcdi-new-tab-row";
class NewTabRow {
  #element;
  /**
   * The `New Tab` row: a button with a `+` icon and the text `New Tab`.
   *
   * @param document The browser window document.
   * @param onOpen What a click does.
   */
  constructor(document, onOpen) {
    const icon = document.createElement("span");
    icon.className = "vivarcdi-new-tab-icon";
    const label = document.createElement("span");
    label.textContent = "New Tab";
    this.#element = document.createElement("button");
    this.#element.setAttribute("type", "button");
    this.#element.setAttribute(NEW_TAB_ROW_ATTRIBUTE, "");
    this.#element.style.setProperty("-webkit-app-region", "no-drag");
    this.#element.append(icon, label);
    this.#element.addEventListener("click", () => onOpen());
  }
  /**
   * @returns The element to put in the tab bar.
   */
  get element() {
    return this.#element;
  }
}
export {
  NEW_TAB_ROW_ATTRIBUTE,
  NewTabRow
};
