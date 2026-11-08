import { BrowserSearch } from "../../core/BrowserSearch.js";
import { AddressResolver } from "./AddressResolver.js";
const BAR_ATTRIBUTE = "data-vivarcdi-little-arc";
const BAR_CLASS = "vivarcdi-little-arc-bar";
class LittleArcBar {
  #options;
  #root = null;
  #field = null;
  #unsubscribe = null;
  /**
   * The compact bar of a Little Arc window: back, reload, the address field and the button that
   * keeps the page. Vivaldi's popup window has no address field of its own.
   *
   * @param options The window, its tab and what the bar calls.
   */
  constructor(options) {
    this.#options = options;
  }
  /**
   * Draws the bar at the top of the window and puts the cursor in the address field.
   */
  mount() {
    const { document, host, tabs, tabId } = this.#options;
    const root = document.createElement("div");
    root.className = BAR_CLASS;
    const field = document.createElement("input");
    field.type = "text";
    field.placeholder = "Search or enter address";
    field.setAttribute("aria-label", "Search or type an address");
    field.addEventListener("keydown", (event) => this.#submitOnEnter(event));
    root.append(
      this.#button("Back", "\u2039", () => void this.#run(() => tabs.goBack(tabId))),
      this.#button("Reload", "\u21BB", () => void this.#run(() => tabs.reload(tabId))),
      field,
      this.#button("Move to workspace", "Move to workspace", () => this.#options.onKeep())
    );
    host.setAttribute(BAR_ATTRIBUTE, "");
    host.prepend(root);
    this.#root = root;
    this.#field = field;
    this.#unsubscribe = tabs.onUpdated((id, change) => this.#follow(id, change));
    field.focus();
  }
  /**
   * Removes the bar.
   */
  unmount() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#root?.remove();
    this.#options.host.removeAttribute(BAR_ATTRIBUTE);
    this.#root = null;
    this.#field = null;
  }
  /**
   * @returns Whether the address field has no text.
   */
  get isEmpty() {
    return (this.#field?.value ?? "") === "";
  }
  /**
   * Empties the address field.
   */
  clear() {
    if (this.#field !== null) {
      this.#field.value = "";
    }
  }
  #button(label, text, onClick) {
    const button = this.#options.document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", onClick);
    return button;
  }
  #submitOnEnter(event) {
    if (event.key !== "Enter") {
      return;
    }
    const resolved = AddressResolver.resolve(this.#field?.value ?? "");
    if (resolved === null) {
      return;
    }
    event.preventDefault();
    const { tabs, tabId, search } = this.#options;
    if (resolved.kind === "url") {
      void this.#run(() => tabs.update(tabId, { url: resolved.url }));
    } else {
      void this.#run(() => search.run(resolved.text, tabId)).then((done) => {
        if (!done) {
          void this.#run(() => tabs.update(tabId, { url: BrowserSearch.fallbackAddress(resolved.text) }));
        }
      });
    }
  }
  #follow(tabId, change) {
    if (tabId === this.#options.tabId && change.url !== void 0 && this.#field !== null && this.#field !== this.#options.document.activeElement) {
      this.#field.value = change.url;
    }
  }
  async #run(action) {
    try {
      await action();
      return true;
    } catch (error) {
      this.#options.logger.warn("Little Arc bar action failed", error);
      return false;
    }
  }
}
export {
  BAR_ATTRIBUTE,
  BAR_CLASS,
  LittleArcBar
};
