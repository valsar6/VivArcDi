import { TabSlot } from "../../core/TabSlot.js";
class CloseShortcut {
  #deps;
  #onKey = (event) => this.#handleKey(event);
  #onClick = (event) => this.#handleClick(event);
  /**
   * Makes Cmd/Ctrl+W and the close button unload Favorites and pinned tabs instead of closing
   * them. Ordinary tabs are left to Vivaldi, and so is a shortcut another module already took.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param event A key press.
   * @returns Whether it is Cmd/Ctrl+W without other modifiers.
   */
  static isCloseKey(event) {
    return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "w";
  }
  /**
   * Starts listening, in the capture phase.
   */
  attach() {
    this.#deps.document.addEventListener("keydown", this.#onKey, true);
    this.#deps.document.addEventListener("click", this.#onClick, true);
  }
  /**
   * Stops listening.
   */
  detach() {
    this.#deps.document.removeEventListener("keydown", this.#onKey, true);
    this.#deps.document.removeEventListener("click", this.#onClick, true);
  }
  #handleKey(event) {
    const tabId = event.defaultPrevented || !CloseShortcut.isCloseKey(event) ? null : this.#deps.activePinned();
    if (tabId !== null) {
      CloseShortcut.#take(event);
      this.#deps.unload(tabId);
    }
  }
  #handleClick(event) {
    const button = event.target?.closest?.(this.#deps.closeSelector) ?? null;
    if (button?.closest(this.#deps.pinnedSelector) == null) {
      return;
    }
    const tabId = TabSlot.idOf(button, this.#deps.wrapperSelector);
    if (tabId !== null) {
      CloseShortcut.#take(event);
      this.#deps.unload(tabId);
    }
  }
  static #take(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}
export {
  CloseShortcut
};
