import { TabSlot } from "../../core/tabs/TabSlot.js";
import { OwnPage } from "../../shared/tabs/OwnPage.js";
const SEPARATOR = { separator: true };
class PinnedRowMenu {
  #deps;
  #onContext = (event) => this.#context(event);
  /**
   * VivArcDi's menu of a pinned row, opened with a right click: `Edit Pinned Page ▸` with Replace
   * and Edit…, then a real Close tab and Unpin tab. Vivaldi's own menu is cancelled for pinned rows
   * only; outside it, right clicks are left to Vivaldi.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Starts listening to `contextmenu`, in the capture phase.
   */
  start() {
    this.#deps.document.addEventListener("contextmenu", this.#onContext, true);
  }
  /**
   * Stops listening and closes the menu.
   */
  stop() {
    this.#deps.document.removeEventListener("contextmenu", this.#onContext, true);
    this.#deps.menu.close();
  }
  #context(event) {
    const target = event.target;
    const row = target?.closest(this.#deps.selectors.get("pinnedTab")) ?? null;
    if (row === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const tabId = TabSlot.idOf(row, this.#deps.selectors.get("tabWrapper"));
    if (tabId !== null) {
      void this.#open(tabId, event.clientX, event.clientY);
    }
  }
  async #open(tabId, x, y) {
    this.#deps.menu.open(this.#items(tabId, await this.#snapshot(tabId)), x, y);
  }
  async #snapshot(tabId) {
    try {
      const tab = await this.#deps.tabs.get(tabId);
      return { saved: OwnPage.of(tab) ?? void 0, current: tab.url ?? tab.pendingUrl, open: true };
    } catch (error) {
      this.#deps.logger.warn(`could not read the pinned tab ${tabId}`, error);
      return { open: false };
    }
  }
  #items(tabId, snapshot) {
    return [
      this.#deps.address.menuFor(String(tabId), snapshot),
      SEPARATOR,
      { label: "Close tab", run: () => void this.#close(tabId) },
      { label: "Unpin tab", run: () => void this.#unpin(tabId) }
    ];
  }
  async #close(tabId) {
    try {
      await this.#deps.tabs.remove(tabId);
    } catch (error) {
      this.#deps.logger.warn(`could not close tab ${tabId}`, error);
    }
  }
  async #unpin(tabId) {
    try {
      await this.#deps.tabs.update(tabId, { pinned: false });
    } catch (error) {
      this.#deps.logger.warn(`could not unpin tab ${tabId}`, error);
    }
  }
}
export {
  PinnedRowMenu
};
