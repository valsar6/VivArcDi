class PrivateTabs {
  #tabs;
  #runtime;
  /**
   * The tabs of the private window. Nothing is archived: a private tab is closed, not kept.
   *
   * @param tabs The `chrome.tabs` API.
   * @param runtime Tells which window this is, so that a normal window is never touched.
   */
  constructor(tabs, runtime) {
    this.#tabs = tabs;
    this.#runtime = runtime;
  }
  /**
   * Closes every tab of this window except the active one.
   *
   * @returns Resolves once the tabs are closed.
   * @throws {Error} When the window or its tabs cannot be reached.
   */
  async clear() {
    const windowId = await this.#runtime.currentWindowId();
    const tabs = await this.#tabs.query({ windowId });
    if (!tabs.some(({ active }) => active)) {
      return;
    }
    const closing = tabs.filter(({ active, id }) => !active && id !== void 0);
    await Promise.all(closing.map(({ id }) => this.#tabs.remove(id)));
  }
}
export {
  PrivateTabs
};
