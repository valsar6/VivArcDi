const PANEL_SELECTOR_NAMES = ["panelAddButton", "panelAddressField", "panelAddSubmit", "webPanelButton"];
class PanelBar {
  #document;
  #selectors;
  /**
   * Vivaldi's panel bar and its form for adding a web panel, the only place that touches their
   * elements. The form is Vivaldi's own: filling it and submitting it makes Vivaldi create the panel.
   *
   * @param document The document of Vivaldi's browser window.
   * @param selectors The selectors of the bar's elements.
   */
  constructor(document, selectors) {
    this.#document = document;
    this.#selectors = selectors;
  }
  /**
   * @param document The document of Vivaldi's browser window.
   * @param catalog The selectors of the running Vivaldi.
   * @returns The bar, or null when the catalog lacks a name it needs.
   */
  static of(document, catalog) {
    if (!PANEL_SELECTOR_NAMES.every((name) => catalog.has(name))) {
      return null;
    }
    return new PanelBar(document, {
      addButton: catalog.get("panelAddButton"),
      addressField: catalog.get("panelAddressField"),
      addSubmit: catalog.get("panelAddSubmit"),
      panelButton: catalog.get("webPanelButton")
    });
  }
  /**
   * @returns Whether the button that opens the form is in the window.
   */
  get available() {
    return this.#document.querySelector(this.#selectors.addButton) !== null;
  }
  /**
   * @returns The ids of the web panels that have a button in the bar.
   */
  panelIds() {
    return [...this.#document.querySelectorAll(this.#selectors.panelButton)].map((button) => button.getAttribute("data-name") ?? "").filter((id) => id !== "");
  }
  /**
   * Clicks the button that opens the form.
   *
   * @returns Whether the button was there.
   */
  openForm() {
    return this.#click(this.#selectors.addButton);
  }
  /**
   * Types an address into the form, the way a React field notices it: through the native setter,
   * then an `input` event.
   *
   * @param address The address to type.
   * @returns Whether the field was there.
   */
  fill(address) {
    const field = this.#document.querySelector(this.#selectors.addressField);
    if (field === null) {
      return false;
    }
    Reflect.set(Object.getPrototypeOf(field), "value", address, field);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  /**
   * Clicks the button that adds the panel.
   *
   * @returns Whether the button was there.
   */
  submit() {
    return this.#click(this.#selectors.addSubmit);
  }
  /**
   * Clicks the button of a panel, which brings up its side panel.
   *
   * @param id The id of the panel, such as `WEBPANEL_<uuid>`.
   * @returns Whether the panel has a button in the bar.
   */
  show(id) {
    const button = [...this.#document.querySelectorAll(this.#selectors.panelButton)].find((candidate) => candidate.getAttribute("data-name") === id);
    button?.click();
    return button !== void 0;
  }
  #click(selector) {
    const element = this.#document.querySelector(selector);
    element?.click();
    return element !== null;
  }
}
export {
  PANEL_SELECTOR_NAMES,
  PanelBar
};
