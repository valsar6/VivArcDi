import { TabSlot } from "../../core/TabSlot.js";
class ResetClick {
  #deps;
  #listener = (event) => this.#handle(event);
  /**
   * Turns the favicon of an away pinned row into a reset button, as in Arc.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Starts listening, in the capture phase so Vivaldi does not see the click first.
   */
  attach() {
    this.#deps.document.addEventListener("click", this.#listener, true);
  }
  /**
   * Stops listening.
   */
  detach() {
    this.#deps.document.removeEventListener("click", this.#listener, true);
  }
  #handle(event) {
    const favicon = event.target?.closest?.(this.#deps.faviconSelector) ?? null;
    const tabId = favicon === null ? null : TabSlot.idOf(favicon, this.#deps.wrapperSelector);
    if (tabId === null || !this.#deps.isAway(tabId)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#deps.reset(tabId);
  }
}
export {
  ResetClick
};
