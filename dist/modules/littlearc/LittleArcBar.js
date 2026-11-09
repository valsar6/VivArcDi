import { BrowserSearch } from "../../core/BrowserSearch.js";
import { AddressDisplay } from "./AddressDisplay.js";
import { AddressResolver } from "./AddressResolver.js";
import { BackButtonState } from "./BackButtonState.js";
import { BarView } from "./BarView.js";
import { DestinationPalette } from "./DestinationPalette.js";
import { KeepLabel } from "./KeepLabel.js";
import { BAR_CLASS } from "./BarView.js";
const BAR_ATTRIBUTE = "data-vivarcdi-little-arc";
const PLATFORM_ATTRIBUTE = "data-vivarcdi-little-arc-mac";
class LittleArcBar {
  #options;
  #view = null;
  #back = new BackButtonState();
  #address = "";
  #selectOnRelease = false;
  #painted = false;
  #unsubscribe = null;
  /**
   * The bar of a Little Arc window: the space of the window buttons, back, the address pill and the
   * button that keeps the page. Vivaldi's popup window has no address field of its own.
   *
   * @param options The window, its tab and what the bar calls.
   */
  constructor(options) {
    this.#options = options;
  }
  /**
   * Draws the bar at the top of the window. The cursor goes in the pill unless a page is loaded.
   */
  mount() {
    const { document, host, tabs, platform, address } = this.#options;
    const view = new BarView(document);
    this.#view = view;
    this.#address = address;
    this.#back.record(address);
    view.showLabel(KeepLabel.of(null, platform));
    this.#listen(view);
    if (KeepLabel.isMac(platform)) {
      host.setAttribute(PLATFORM_ATTRIBUTE, "");
    }
    host.setAttribute(BAR_ATTRIBUTE, "");
    host.prepend(view.root);
    this.#unsubscribe = tabs.onUpdated((id, change) => this.#follow(id, change));
    this.#rest();
    if (!AddressDisplay.isWeb(address)) {
      view.field.focus();
    }
  }
  /**
   * Removes the bar and the colors it set.
   */
  unmount() {
    const { host } = this.#options;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#view?.root.remove();
    this.#view = null;
    host.removeAttribute(BAR_ATTRIBUTE);
    host.removeAttribute(PLATFORM_ATTRIBUTE);
    if (this.#painted) {
      DestinationPalette.clear(host);
    }
  }
  /**
   * @returns The bar's element, or null while it is not mounted.
   */
  get element() {
    return this.#view?.root ?? null;
  }
  /**
   * @returns Whether the pill has no text, which is when Esc closes the window.
   */
  get isEmpty() {
    return (this.#view?.field.value ?? "") === "";
  }
  /**
   * Puts the pill back at rest: it shows the host again, or nothing when no page is loaded.
   */
  revert() {
    this.#view?.field.blur();
    this.#rest();
  }
  /**
   * Shows the workspace that would receive the page and takes its colors.
   *
   * @param answer What the main window answered; null keeps "Open in workspace" and the default palette.
   */
  setDestination(answer) {
    if (answer === null || this.#view === null) {
      return;
    }
    this.#view.showLabel(KeepLabel.of(answer.name, this.#options.platform));
    if (answer.colors !== null) {
      DestinationPalette.apply(this.#options.host, answer.colors);
      this.#painted = true;
    }
  }
  #listen(view) {
    const { tabs, tabId, onKeep, logger } = this.#options;
    const { field } = view;
    field.addEventListener("keydown", (event) => this.#submitOnEnter(event));
    field.addEventListener("focus", () => this.#edit(field));
    field.addEventListener("blur", () => this.#leave());
    field.addEventListener("mouseup", (event) => this.#keepSelection(event));
    view.back.addEventListener("click", () => void this.#run(() => tabs.goBack(tabId), logger));
    view.keep.addEventListener("click", onKeep);
  }
  #edit(field) {
    field.value = AddressDisplay.isWeb(this.#address) ? this.#address : "";
    field.select();
    this.#selectOnRelease = true;
  }
  #leave() {
    this.#selectOnRelease = false;
    this.#rest();
  }
  #keepSelection(event) {
    if (this.#selectOnRelease) {
      event.preventDefault();
      this.#selectOnRelease = false;
    }
  }
  #rest() {
    if (this.#view !== null && this.#view.field !== this.#options.document.activeElement) {
      this.#view.field.value = AddressDisplay.of(this.#address);
    }
  }
  #submitOnEnter(event) {
    const field = this.#view?.field;
    const resolved = event.key === "Enter" ? AddressResolver.resolve(field?.value ?? "") : null;
    if (resolved === null) {
      return;
    }
    event.preventDefault();
    field?.blur();
    const { tabs, tabId, search, logger } = this.#options;
    if (resolved.kind === "url") {
      void this.#run(() => tabs.update(tabId, { url: resolved.url }), logger);
      return;
    }
    void this.#run(() => search.run(resolved.text, tabId), logger).then((done) => {
      if (!done) {
        void this.#run(() => tabs.update(tabId, { url: BrowserSearch.fallbackAddress(resolved.text) }), logger);
      }
    });
  }
  #follow(tabId, change) {
    if (tabId !== this.#options.tabId || change.url === void 0 || this.#view === null) {
      return;
    }
    this.#address = change.url;
    this.#back.record(change.url);
    this.#view.back.hidden = !this.#back.visible;
    this.#rest();
  }
  async #run(action, logger) {
    try {
      await action();
      return true;
    } catch (error) {
      logger.warn("Little Arc bar action failed", error);
      return false;
    }
  }
}
export {
  BAR_ATTRIBUTE,
  BAR_CLASS,
  LittleArcBar,
  PLATFORM_ATTRIBUTE
};
