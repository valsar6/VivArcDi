import { watchSubtree } from "../../core/dom/KeptElement.js";
import { FrameTask } from "../../core/support/FrameTask.js";
import { TabSlot } from "../../core/tabs/TabSlot.js";
import { TabUnloader } from "../../core/tabs/TabUnloader.js";
const PINNED_UNLOAD_ATTRIBUTE = "data-vivarcdi-pinned-unload";
const PINNED_MINUS_ATTRIBUTE = "data-vivarcdi-pinned-minus";
class PinnedMinus {
  #deps;
  #unloader;
  #draw;
  #buttons = /* @__PURE__ */ new Map();
  #unwatch = null;
  #onClick = (event) => this.#handle(event);
  #onMouseDown = (event) => this.#swallow(event);
  /**
   * The minus at the right end of every pinned row: Vivaldi 8.3 draws no close button there, so
   * the module adds its own and unloads the tab instead of closing it.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#unloader = new TabUnloader(dependencies.tabs);
    this.#draw = new FrameTask(() => this.sync(), dependencies.timing);
  }
  /**
   * Marks the browser, puts the minuses in place and follows the redraws of the tab bar.
   */
  start() {
    const { document, selectors } = this.#deps;
    document.addEventListener("click", this.#onClick, true);
    document.addEventListener("mousedown", this.#onMouseDown, true);
    const browser = document.querySelector(selectors.get("browser"));
    browser?.setAttribute(PINNED_UNLOAD_ATTRIBUTE, "");
    this.#unwatch = (this.#deps.watch ?? watchSubtree())(browser ?? document, () => this.#draw.request());
    this.#draw.request();
  }
  /**
   * Puts the minuses in place once: one per pinned row, replacing the ones Vivaldi dropped.
   */
  sync() {
    const rows = [...this.#deps.document.querySelectorAll(this.#deps.selectors.get("pinnedTab"))];
    const present = new Set(rows);
    this.#buttons.forEach((button, row) => {
      if (!present.has(row) || !PinnedMinus.#inside(button, row)) {
        button.remove();
        this.#buttons.delete(row);
      }
    });
    rows.forEach((row) => this.#place(row));
  }
  /**
   * Removes the minuses, the mark and every listener.
   */
  stop() {
    this.#deps.document.removeEventListener("click", this.#onClick, true);
    this.#deps.document.removeEventListener("mousedown", this.#onMouseDown, true);
    this.#unwatch?.();
    this.#unwatch = null;
    this.#draw.cancel();
    this.#buttons.forEach((button) => button.remove());
    this.#buttons.clear();
    this.#deps.document.querySelector(this.#deps.selectors.get("browser"))?.removeAttribute(PINNED_UNLOAD_ATTRIBUTE);
  }
  #place(row) {
    const button = this.#buttons.get(row) ?? this.#create();
    if (!PinnedMinus.#inside(button, row)) {
      this.#targetOf(row).append(button);
    }
    this.#buttons.set(row, button);
  }
  #create() {
    const button = this.#deps.document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute(PINNED_MINUS_ATTRIBUTE, "");
    button.setAttribute("aria-label", "Unload tab");
    return button;
  }
  #targetOf(row) {
    return row.querySelector(this.#deps.selectors.get("tabFavicon"))?.parentElement ?? row;
  }
  #handle(event) {
    const button = event.target?.closest?.(`[${PINNED_MINUS_ATTRIBUTE}]`) ?? null;
    if (button === null) {
      return;
    }
    this.#swallow(event);
    const tabId = TabSlot.idOf(button, this.#deps.selectors.get("tabWrapper"));
    if (tabId !== null) {
      this.#unload(tabId);
    }
  }
  #swallow(event) {
    const button = event.target?.closest?.(`[${PINNED_MINUS_ATTRIBUTE}]`) ?? null;
    if (button === null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  #unload(tabId) {
    this.#unloader.unload(tabId).catch((error) => this.#deps.logger.error(`Could not unload tab ${tabId}`, error));
  }
  static #inside(element, ancestor) {
    let node = element;
    while (node !== null) {
      if (node === ancestor) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }
}
export {
  PINNED_MINUS_ATTRIBUTE,
  PINNED_UNLOAD_ATTRIBUTE,
  PinnedMinus
};
