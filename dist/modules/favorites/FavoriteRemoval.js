import { TabData } from "../../core/TabData.js";
import { TabDataWriter } from "../../core/TabDataWriter.js";
import { TabRowMove } from "../../core/TabRowMove.js";
class FavoriteRemoval {
  #deps;
  #writer;
  #rows;
  /**
   * Takes a Favorite out of the grid and keeps its page, as Arc does. Released over the folders or
   * the space header, the page becomes a link of the workspace; released over the tab list, it
   * becomes a Today tab at the row under the pointer. The tab of the Favorite in the active
   * workspace is the page; without one the page is opened or linked from its address. Its tabs in
   * other workspaces are closed so the tile is gone everywhere. The bookmark is removed last, so
   * a failure leaves the Favorite where it was. The menu commands use the same move with a fixed
   * place: the top of today's tabs, or the end of the workspace favorites.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#writer = TabDataWriter.of(dependencies.tabs);
    this.#rows = new TabRowMove({ tabs: dependencies.tabs, logger: dependencies.logger });
  }
  /**
   * Marks the place under the pointer while a tile is dragged.
   *
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  over(x, y) {
    const { zone, today } = this.#deps;
    const place = this.placeAt(x, y);
    zone.mark(place?.kind === "link" ? place.target : null);
    if (place?.kind === "today") {
      today.mark(x, y);
    } else {
      today.clear();
    }
  }
  /**
   * Removes the marks.
   */
  clear() {
    this.#deps.zone.clear();
    this.#deps.today.clear();
  }
  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when it is neither the folders nor the tab list.
   */
  placeAt(x, y) {
    const target = this.#deps.zone.at(x, y);
    if (target !== null) {
      return { kind: "link", target };
    }
    const today = this.#deps.today.at(x, y);
    return today === null ? null : { kind: "today", target: today };
  }
  /**
   * @param favoriteId The Favorite whose tile was released.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  async release(favoriteId, x, y) {
    const place = this.placeAt(x, y);
    if (place !== null) {
      await this.moveTo(favoriteId, place);
    }
  }
  /**
   * Untile tab: the page of the Favorite becomes the first tab of today.
   *
   * @param favoriteId The Favorite.
   */
  async untile(favoriteId) {
    await this.moveTo(favoriteId, { kind: "today", target: this.#deps.today.first() });
  }
  /**
   * Pin tab: the page of the Favorite becomes a link at the end of the workspace favorites.
   *
   * @param favoriteId The Favorite.
   */
  async pin(favoriteId) {
    const target = this.#deps.zone.end();
    if (target !== null) {
      await this.moveTo(favoriteId, { kind: "link", target });
    }
  }
  /**
   * Keeps the page of a Favorite at a place and takes the Favorite out of the grid.
   *
   * @param favoriteId The Favorite.
   * @param place Where the page goes.
   */
  async moveTo(favoriteId, place) {
    try {
      const { title, url } = await this.#deps.writer.get(favoriteId);
      if (url === void 0) {
        return;
      }
      const own = (await this.#deps.links.snapshot()).linked.get(favoriteId)?.id;
      const others = await this.#otherTabs(favoriteId, own);
      if (!await this.#keepPage(place, own, { title, url })) {
        this.#deps.logger.warn(`could not keep the page of the Favorite "${title}": the Favorite stays`);
        return;
      }
      await Promise.all(others.map((tabId) => this.#deps.tabs.remove(tabId)));
      await this.#deps.writer.remove(favoriteId);
    } catch (error) {
      this.#deps.logger.warn("could not take the Favorite out of the grid", error);
    }
  }
  async #otherTabs(favoriteId, own) {
    const tabs = await this.#deps.tabs.query({});
    return tabs.flatMap((tab) => tab.id !== void 0 && tab.id !== own && TabData.ownOf(tab).favoriteId === favoriteId ? [tab.id] : []);
  }
  async #keepPage(place, own, page) {
    if (own !== void 0) {
      await this.#release(own);
    }
    if (place.kind === "link") {
      return this.#deps.zone.drop(place.target, own === void 0 ? page : { tab: await this.#deps.tabs.get(own) });
    }
    if (own === void 0) {
      return (await this.#deps.tabs.create({ url: page.url, active: false })).id !== void 0;
    }
    await this.#rows.to(own, place.target.rowTabId);
    return true;
  }
  async #release(tabId) {
    await this.#writer.write(tabId, (tab) => TabData.withOwn(tab, { favoriteId: void 0, pinnedUrl: void 0 }));
    await this.#deps.tabs.update(tabId, { pinned: false });
  }
}
export {
  FavoriteRemoval
};
