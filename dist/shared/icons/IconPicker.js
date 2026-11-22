import { LabelIcon } from "./LabelIcon.js";
const PICKER_ATTRIBUTE = "data-vivarcdi-picker";
const TAB_ATTRIBUTE = "data-vivarcdi-picker-tab";
const SEARCH_ATTRIBUTE = "data-vivarcdi-picker-search";
const CELL_ATTRIBUTE = "data-vivarcdi-picker-cell";
const CATEGORY_ATTRIBUTE = "data-vivarcdi-picker-category";
const RESET_ATTRIBUTE = "data-vivarcdi-picker-reset";
const REFRESH_ATTRIBUTE = "data-vivarcdi-picker-refresh";
const ALL_TABS = ["emoji", "icons"];
const TAB_LABELS = { emoji: "Emoji", icons: "Icons" };
const EDGE_PX = 4;
function make(document, tag, attributes = {}) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}
function button(document, label, attributes, onClick) {
  const element = make(document, "button", { type: "button", "aria-label": label, ...attributes });
  element.addEventListener("click", onClick);
  return element;
}
function emojiCell(document, { emoji, name }, choose) {
  return Object.assign(button(document, name, { [CELL_ATTRIBUTE]: emoji }, () => choose({ icon: { emoji } })), { textContent: emoji });
}
function emojiBody(document, catalog, choose) {
  const element = make(document, "div");
  const search = make(document, "input", { type: "search", placeholder: "Search", [SEARCH_ATTRIBUTE]: "" });
  const grid = make(document, "div");
  const bar = make(document, "div");
  const sections = catalog.categories().map((category) => {
    const section = make(document, "div");
    section.append(...category.emoji.map((entry) => emojiCell(document, entry, choose)));
    const mark = button(document, category.label, { [CATEGORY_ATTRIBUTE]: category.id }, () => grid.scrollTop = section.offsetTop);
    bar.append(Object.assign(mark, { textContent: category.emoji[0]?.emoji ?? "" }));
    return section;
  });
  const showCategories = () => {
    search.value = "";
    grid.replaceChildren(...sections);
    grid.scrollTop = 0;
  };
  search.addEventListener("input", () => {
    const text = search.value.trim();
    return text === "" ? showCategories() : grid.replaceChildren(...catalog.search(text).map((entry) => emojiCell(document, entry, choose)));
  });
  element.append(search, grid, bar);
  showCategories();
  return { element, search, showCategories };
}
class IconPicker {
  #deps;
  #popover = null;
  #settle = null;
  #cache = null;
  #choose = (result) => this.#finish(result);
  #onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  };
  #onPress = (event) => {
    if (event.target?.closest?.(`[${PICKER_ATTRIBUTE}]`) == null) {
      this.close();
    }
  };
  /**
   * The popover that lets the user choose an emoji or a symbol for a link, reset it or read its
   * favicon again. It is drawn beside an anchor, outside the window drag region, and closes on
   * Escape and on a click elsewhere. The 1,400 emoji buttons are drawn once and reused.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Opens the picker beside an anchor, closing the one that is open.
   *
   * @param options The anchor, the tabs to show and whether the favicon can be refreshed.
   * @returns The choice, or null on Escape, on a click elsewhere or when it is closed.
   */
  pick(options) {
    this.close();
    return new Promise((resolve) => {
      this.#settle = resolve;
      this.#open(options);
    });
  }
  /**
   * Closes the picker without a choice, if it is open.
   */
  close() {
    this.#finish(null);
  }
  #finish(result) {
    const { document } = this.#deps;
    const settle = this.#settle;
    document.removeEventListener("keydown", this.#onKey, true);
    document.removeEventListener("mousedown", this.#onPress, true);
    this.#popover?.remove();
    this.#popover = null;
    this.#settle = null;
    settle?.(result);
  }
  #open({ anchor, tabs = ALL_TABS, refresh = false }) {
    const { document } = this.#deps;
    const popover = make(document, "div", { [PICKER_ATTRIBUTE]: "", role: "dialog" });
    const panes = new Map(tabs.map((name) => [name, make(document, "div")]));
    const show = (shown) => {
      panes.forEach((pane, name) => pane.toggleAttribute("hidden", name !== shown));
      if (shown === "emoji") {
        void this.#cache?.then((body) => body?.search.focus());
      }
    };
    popover.append(this.#header(tabs, refresh, show), ...panes.values());
    popover.style.setProperty("-webkit-app-region", "no-drag");
    this.#deps.parent().append(popover);
    this.#popover = popover;
    this.#place(popover, anchor);
    document.addEventListener("keydown", this.#onKey, true);
    document.addEventListener("mousedown", this.#onPress, true);
    panes.get("icons")?.append(...this.#symbolCells());
    const emoji = panes.get("emoji");
    if (emoji !== void 0) {
      void this.#drawEmoji(popover, emoji);
    }
    show(tabs[0] ?? "emoji");
  }
  #header(tabs, refresh, show) {
    const { document } = this.#deps;
    const header = make(document, "div");
    header.append(...tabs.map((name) => Object.assign(button(document, TAB_LABELS[name], { [TAB_ATTRIBUTE]: name }, () => show(name)), { textContent: TAB_LABELS[name] })));
    if (refresh) {
      header.append(button(document, "Refresh favicon", { [REFRESH_ATTRIBUTE]: "" }, () => this.#choose({ refresh: true })));
    }
    header.append(button(document, "Reset", { [RESET_ATTRIBUTE]: "" }, () => this.#choose({ reset: true })));
    return header;
  }
  #symbolCells() {
    const { document, symbols } = this.#deps;
    return symbols.map(({ id, label, path }) => {
      const cell = button(document, label, { [CELL_ATTRIBUTE]: id }, () => this.#finish({ icon: { symbol: id } }));
      cell.append(LabelIcon.glyph(document, path));
      return cell;
    });
  }
  async #load() {
    try {
      const catalog = await this.#deps.catalog();
      return catalog.categories().length === 0 ? null : emojiBody(this.#deps.document, catalog, this.#choose);
    } catch {
      return null;
    }
  }
  async #drawEmoji(popover, pane) {
    this.#cache ??= this.#load();
    const body = await this.#cache;
    if (this.#popover !== popover) {
      return;
    }
    if (body === null) {
      pane.textContent = "Emoji are not available";
      this.#cache = null;
      return;
    }
    body.showCategories();
    pane.append(body.element);
  }
  #place(popover, anchor) {
    const { innerWidth = 0, innerHeight = 0 } = this.#deps.document.defaultView ?? {};
    const side = anchor.getBoundingClientRect();
    const { left, right, top, bottom } = popover.getBoundingClientRect();
    const width = right - left;
    const x = side.right + width <= innerWidth - EDGE_PX ? side.right : side.left - width;
    const y = Math.min(side.top, innerHeight - (bottom - top) - EDGE_PX);
    popover.style.setProperty("left", `${Math.max(EDGE_PX, Math.min(x, innerWidth - width - EDGE_PX))}px`);
    popover.style.setProperty("top", `${Math.max(EDGE_PX, y)}px`);
  }
}
export {
  CATEGORY_ATTRIBUTE,
  CELL_ATTRIBUTE,
  IconPicker,
  PICKER_ATTRIBUTE,
  REFRESH_ATTRIBUTE,
  RESET_ATTRIBUTE,
  SEARCH_ATTRIBUTE,
  TAB_ATTRIBUTE
};
