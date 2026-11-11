const MENU_ATTRIBUTE = "data-vivarcdi-menu";
const EDGE_PX = 4;
class ContextMenu {
  #deps;
  #element = null;
  #onKey = (event) => this.#key(event);
  #onPress = (event) => this.#press(event);
  /**
   * VivArcDi's own menu, drawn at the pointer for the rows and tiles that VivArcDi owns. It stays
   * inside the window, and closes on Escape, on a click elsewhere and after a command. It is
   * outside the window drag region.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Opens the menu at a point, closing the one that is open.
   *
   * @param items The commands, in order.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  open(items, x, y) {
    this.close();
    const { document } = this.#deps;
    const element = document.createElement("div");
    element.setAttribute(MENU_ATTRIBUTE, "");
    element.setAttribute("role", "menu");
    items.forEach((item) => element.append(this.#row(item)));
    this.#deps.parent().append(element);
    this.#element = element;
    this.#place(element, x, y);
    document.addEventListener("keydown", this.#onKey, true);
    document.addEventListener("mousedown", this.#onPress, true);
  }
  /**
   * Closes the menu, if it is open.
   */
  close() {
    const { document } = this.#deps;
    document.removeEventListener("keydown", this.#onKey, true);
    document.removeEventListener("mousedown", this.#onPress, true);
    this.#element?.remove();
    this.#element = null;
  }
  #row(item) {
    const row = this.#deps.document.createElement("div");
    row.setAttribute("role", "menuitem");
    row.textContent = item.label;
    row.addEventListener("click", () => {
      this.close();
      item.run();
    });
    return row;
  }
  #place(element, x, y) {
    const { innerWidth = 0, innerHeight = 0 } = this.#deps.document.defaultView ?? {};
    const { left, right, top, bottom } = element.getBoundingClientRect();
    const left0 = Math.min(x, innerWidth - (right - left) - EDGE_PX);
    const top0 = Math.min(y, innerHeight - (bottom - top) - EDGE_PX);
    element.style.setProperty("left", `${Math.max(EDGE_PX, left0)}px`);
    element.style.setProperty("top", `${Math.max(EDGE_PX, top0)}px`);
  }
  #key(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }
  #press(event) {
    if (event.target?.closest?.(`[${MENU_ATTRIBUTE}]`) == null) {
      this.close();
    }
  }
}
export {
  ContextMenu,
  MENU_ATTRIBUTE
};
