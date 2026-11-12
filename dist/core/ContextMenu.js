const MENU_ATTRIBUTE = "data-vivarcdi-menu";
const CHECKED_ATTRIBUTE = "data-vivarcdi-checked";
const EDGE_PX = 4;
class ContextMenu {
  #deps;
  #levels = [];
  #onKey = (event) => this.#key(event);
  #onPress = (event) => this.#press(event);
  /**
   * VivArcDi's own menu, drawn at the pointer for the rows and tiles that VivArcDi owns. It stays
   * inside the window, and closes on Escape, on a click elsewhere and after a command. It is
   * outside the window drag region. An item can show a check mark, and an item with items opens
   * a submenu to its side while the pointer is on it.
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
    this.#show(items, 0, { x, y });
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
    this.#closeAbove(-1);
  }
  #show(items, level, at) {
    const element = this.#deps.document.createElement("div");
    element.setAttribute(MENU_ATTRIBUTE, "");
    element.setAttribute("role", "menu");
    items.forEach((item) => element.append(this.#row(item, level)));
    this.#deps.parent().append(element);
    this.#levels.push(element);
    this.#place(element, at);
  }
  #closeAbove(level) {
    this.#levels.splice(level + 1).forEach((element) => element.remove());
  }
  #row(item, level) {
    const row = this.#deps.document.createElement("div");
    row.setAttribute("role", "menuitem");
    row.textContent = item.label;
    if ("items" in item) {
      this.#submenuRow(row, item, level);
    } else {
      this.#commandRow(row, item, level);
    }
    return row;
  }
  #commandRow(row, item, level) {
    if (item.checked !== void 0) {
      row.setAttribute("role", "menuitemcheckbox");
      row.setAttribute("aria-checked", String(item.checked));
      row.toggleAttribute(CHECKED_ATTRIBUTE, item.checked);
    }
    row.addEventListener("mouseenter", () => this.#closeAbove(level));
    row.addEventListener("click", () => {
      this.close();
      item.run();
    });
  }
  #submenuRow(row, { items }, level) {
    row.setAttribute("aria-haspopup", "menu");
    const open = () => {
      this.#closeAbove(level);
      const rect = row.getBoundingClientRect();
      this.#show(items, level + 1, { x: rect.right, y: rect.top, side: rect });
    };
    row.addEventListener("mouseenter", open);
    row.addEventListener("click", open);
  }
  #place(element, { x, y, side }) {
    const { innerWidth = 0, innerHeight = 0 } = this.#deps.document.defaultView ?? {};
    const { left, right, top, bottom } = element.getBoundingClientRect();
    const width = right - left;
    const fitsRight = x + width <= innerWidth - EDGE_PX;
    const beside = side !== void 0 && !fitsRight ? side.left - width : x;
    const left0 = Math.min(beside, innerWidth - width - EDGE_PX);
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
  CHECKED_ATTRIBUTE,
  ContextMenu,
  MENU_ATTRIBUTE
};
