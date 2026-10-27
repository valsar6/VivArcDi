import { TabData } from "../../core/TabData.js";
class TabTiler {
  #tabs;
  #newId;
  /**
   * Tiles tabs side by side the way Vivaldi's own "Tile tabs" command does: by
   * writing a shared tiling group into each tab's `vivExtData`.
   *
   * @param tabs The tabs API.
   * @param newId Creates the id of a tiling group.
   */
  constructor(tabs, newId = () => crypto.randomUUID()) {
    this.#tabs = tabs;
    this.#newId = newId;
  }
  /**
   * @param tabIds Tabs to show side by side, from left to right.
   * @returns Resolves once every tab is marked.
   */
  async tile(tabIds) {
    const id = this.#newId();
    await Promise.all(
      tabIds.map((tabId, index) => this.#mark(tabId, { id, index, layout: "row", type: "selection" }))
    );
  }
  async #mark(tabId, tiling) {
    const tab = await this.#tabs.get(tabId);
    await this.#tabs.update(tabId, { vivExtData: TabData.with(tab, "tiling", tiling) });
  }
}
export {
  TabTiler
};
