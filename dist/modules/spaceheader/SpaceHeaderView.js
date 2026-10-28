const HEADER_ATTRIBUTE = "data-vivarcdi-space-header";
const COLLAPSED_ATTRIBUTE = "data-vivarcdi-collapsed";
class SpaceHeaderView {
  #document;
  #element;
  /**
   * The row above the folders: an arrow, the icon and the name of the workspace. A click anywhere
   * on it calls the handler; the view keeps no state of its own.
   *
   * @param document The browser window document.
   * @param onToggle Called when the row is clicked.
   */
  constructor(document, onToggle) {
    this.#document = document;
    this.#element = document.createElement("div");
    this.#element.setAttribute(HEADER_ATTRIBUTE, "");
    this.#element.setAttribute("role", "button");
    this.#element.style.setProperty("-webkit-app-region", "no-drag");
    this.#element.addEventListener("click", () => onToggle());
  }
  /**
   * @returns The element to put in the tab bar.
   */
  get element() {
    return this.#element;
  }
  /**
   * Replaces the content of the row.
   *
   * @param state What to show.
   */
  render({ name, icon, collapsed }) {
    this.#element.toggleAttribute(COLLAPSED_ATTRIBUTE, collapsed);
    this.#element.setAttribute("aria-expanded", String(!collapsed));
    this.#element.setAttribute("title", name);
    this.#element.replaceChildren(this.#part("vivarcdi-space-arrow", ""), ...icon === null ? [] : [this.#icon(icon)], this.#part("vivarcdi-space-name", name));
  }
  /**
   * Removes the row from the document.
   */
  remove() {
    this.#element.remove();
  }
  #icon({ kind, text }) {
    return this.#part(kind === "letter" ? "vivarcdi-space-icon vivarcdi-space-letter" : "vivarcdi-space-icon", text);
  }
  #part(className, text) {
    const part = this.#document.createElement("span");
    part.className = className;
    part.textContent = text;
    return part;
  }
}
export {
  SpaceHeaderView
};
