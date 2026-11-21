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
    await this.create();
    this.#address.focus();
  }
  /**
   * Opens a blank tab in this window without touching the address field.
   *
   * @returns The new tab.
   * @throws {Error} When the window or the tab cannot be reached.
   */
  async create() {
    const windowId = await this.#runtime.currentWindowId();
    return this.#tabs.create({ windowId });
  }
}
export {
  NewTabOpener
};
