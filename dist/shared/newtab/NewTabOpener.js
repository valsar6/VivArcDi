class NewTabOpener {
  #tabs;
  #runtime;
  #address;
  /**
   * Opens a blank tab, as the `New Tab` rows do.
   *
   * @param tabs Tabs API.
   * @param runtime Tells which window this is.
   * @param address Vivaldi's address field.
   */
  constructor(tabs, runtime, address) {
    this.#tabs = tabs;
    this.#runtime = runtime;
    this.#address = address;
  }
  /**
   * Opens a blank tab in this window and puts the cursor in the address field with its text selected.
   *
   * @returns Resolves once the tab exists.
   * @throws {Error} When the window or the tab cannot be reached.
   */
  async open() {
    const windowId = await this.#runtime.currentWindowId();
    await this.#tabs.create({ windowId });
    this.#address.focus();
  }
}
export {
  NewTabOpener
};
