import { TabDataWriter } from "../../core/TabDataWriter.js";
import { TabData } from "../../core/TabData.js";
class TabTiler {
  #writer;
  #newId;
  /**
   * Tiles tabs side by side the way Vivaldi's own "Tile tabs" command does: by
   * writing a shared tiling group into each tab's `vivExtData`.
   *
   * @param tabs The tabs API.
   * @param newId Creates the id of a tiling group.
   */
  constructor(tabs, newId = () => crypto.randomUUID()) {
    this.#writer = TabDataWriter.of(tabs);
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
    await this.#writer.write(tabId, (tab) => TabData.with(tab, "tiling", tiling));
  }
}
export {
  TabTiler
};
