const HEADER_ATTRIBUTE = "data-vivarcdi-space-header";
const COLLAPSED_ATTRIBUTE = "data-vivarcdi-collapsed";
const ADD_ATTRIBUTE = "data-vivarcdi-space-add";
const ADD_LABEL = "New folder";
class SpaceHeaderView {
  #document;
  #element;
  #add;
  /**
   * The row above the folders: an arrow, the icon and the name of the workspace, and a `+` button
   * that shows on hover. A click anywhere on the row calls the first handler, except on the
   * button, which calls the second one; the view keeps no state of its own.
   *
   * @param document The browser window document.
   * @param onToggle Called when the row is clicked.
   * @param onNewFolder Called when the `+` button is clicked.
   */
  constructor(document, onToggle, onNewFolder) {
    this.#document = document;
    this.#add = SpaceHeaderView.#addButton(document, onNewFolder);
    this.#element = document.createElement("div");
    this.#element.setAttribute(HEADER_ATTRIBUTE, "");
    this.#element.setAttribute("role", "button");
    this.#element.style.setProperty("-webkit-app-region", "no-drag");
    this.#element.addEventListener("click", (event) => {
      if (event.target?.closest(`[${ADD_ATTRIBUTE}]`) == null) {
        onToggle();
      }
    });
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
    this.#element.replaceChildren(this.#part("vivarcdi-space-arrow", ""), ...icon === null ? [] : [this.#icon(icon)], this.#part("vivarcdi-space-name", name), this.#add);
  }
  /**
   * Removes the row from the document.
   */
  remove() {
    this.#element.remove();
  }
  static #addButton(document, onNewFolder) {
    const button = document.createElement("span");
    button.className = "vivarcdi-space-add";
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", ADD_LABEL);
    button.setAttribute("title", ADD_LABEL);
    button.setAttribute(ADD_ATTRIBUTE, "");
    button.style.setProperty("-webkit-app-region", "no-drag");
    button.addEventListener("click", () => onNewFolder());
    return button;
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
