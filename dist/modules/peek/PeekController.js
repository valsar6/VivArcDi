class PeekController {
  #deps;
  #current = null;
  /**
   * Holds the single open Peek and carries out what the user asks of it.
   *
   * @param dependencies Everything the controller collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @returns Whether a Peek is open.
   */
  get isOpen() {
    return this.#current !== null;
  }
  /**
   * Opens a link in Peek, replacing the open one. When the panel cannot be drawn,
   * opens the link the way Vivaldi would have.
   *
   * @param request The link.
   */
  open(request) {
    this.#discard();
    try {
      this.#current = { request, panel: this.#deps.createPanel(request) };
      this.#deps.onChange?.(true);
    } catch (error) {
      this.#deps.logger.error("Could not open Peek, opening the link normally", error);
      this.#deps.opener.openAsVivaldi(request).catch((fallbackError) => this.#deps.logger.error("Could not open the link", fallbackError));
    }
  }
  /**
   * Closes the open Peek, if any.
   */
  close() {
    if (this.#discard()) {
      this.#deps.onChange?.(false);
    }
  }
  /**
   * Turns the open Peek into a tab right after the tab it came from.
   *
   * @returns The id of the new tab, or null when nothing was open or the tab failed.
   */
  async expand() {
    const current = this.#current;
    if (current === null) {
      return null;
    }
    this.close();
    try {
      return await this.#deps.opener.openAfter(current.request.tabId, current.panel.url);
    } catch (error) {
      this.#deps.logger.error("Could not expand Peek", error);
      return null;
    }
  }
  /**
   * Turns the open Peek into a tab and tiles it with the tab it came from.
   * When tiling fails, the new tab stays as after Expand.
   */
  async split() {
    const sourceTabId = this.#current?.request.tabId;
    const tabId = await this.expand();
    if (sourceTabId === void 0 || tabId === null) {
      return;
    }
    await this.#deps.tiler.tile([sourceTabId, tabId]).catch((error) => this.#deps.logger.error("Could not tile the tabs, kept as a tab", error));
  }
  #discard() {
    const current = this.#current;
    this.#current = null;
    current?.panel.remove();
    return current !== null;
  }
}
export {
  PeekController
};
