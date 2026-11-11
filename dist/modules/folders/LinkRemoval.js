import { TabData } from "../../core/TabData.js";
import { TabRowMove } from "../../core/TabRowMove.js";
import { FAILED_TEXT, KEPT_TEXT } from "./FavoriteShortcut.js";
class LinkRemoval {
  #deps;
  #rows;
  /**
   * Takes a link out of the folders section and keeps its page, as Arc does. Released over the
   * tab list under the separator, the page becomes a tab of today at the row under the pointer;
   * released over the Favorites grid, it becomes a Favorite at the drop position. The tab of the
   * link in the active workspace is the page; without one the page is opened or added from its
   * address. The page is placed first, and only then is the link taken out by the rule of
   * Cmd/Ctrl+D: the bookmark is removed when VivArcDi created it, otherwise it stays and a toast
   * says so. A failure leaves the link where it was. Released anywhere else, nothing changes. The
   * menu commands use the same move with a fixed place: the top of today's tabs, or the end of the
   * grid.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#rows = new TabRowMove({ tabs: dependencies.tabs, logger: dependencies.logger });
  }
  /**
   * Marks the place under the pointer while a link row is dragged.
   *
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  over(x, y) {
    const { grid, today } = this.#deps;
    const place = this.placeAt(x, y);
    grid.mark(place?.kind === "grid" ? place.target : null);
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
    this.#deps.grid.clear();
    this.#deps.today.clear();
  }
  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when it is neither the grid nor the tab list.
   */
  placeAt(x, y) {
    const target = this.#deps.grid.at(x, y);
    if (target !== null) {
      return { kind: "grid", target };
    }
    const today = this.#deps.today.at(x, y);
    return today === null ? null : { kind: "today", target: today };
  }
  /**
   * @param linkId The bookmark of the link row that was released.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  async release(linkId, x, y) {
    const place = this.placeAt(x, y);
    if (place !== null) {
      await this.moveTo(linkId, place);
    }
  }
  /**
   * Remove pin: the page of the link becomes the first tab of today.
   *
   * @param linkId The bookmark of the link.
   */
  async removePin(linkId) {
    await this.moveTo(linkId, { kind: "today", target: this.#deps.today.first() });
  }
  /**
   * Tile tab: the page of the link becomes a Favorite at the end of the grid.
   *
   * @param linkId The bookmark of the link.
   */
  async tile(linkId) {
    const target = this.#deps.grid.end();
    if (target !== null) {
      await this.moveTo(linkId, { kind: "grid", target });
    }
  }
  /**
   * Keeps the page of a link at a place and takes the link out.
   *
   * @param linkId The bookmark of the link.
   * @param place Where the page goes.
   */
  async moveTo(linkId, place) {
    try {
      const { title, url } = await this.#deps.writer.get(linkId);
      if (url === void 0) {
        return;
      }
      if (!await this.#keepPage(place, linkId, await this.#tabOf(linkId), { title, url })) {
        this.#deps.logger.warn(`could not keep the page of the link "${title}": the link stays`);
        return;
      }
      await this.#takeOut(linkId);
    } catch (error) {
      this.#deps.logger.warn("could not take the link out of the folders", error);
      this.#deps.notify(FAILED_TEXT);
    }
  }
  async #tabOf(linkId) {
    const tabs = await this.#deps.tabs.query({ currentWindow: true });
    const active = tabs.find((tab) => tab.active);
    const candidates = tabs.filter((tab) => TabData.ownOf(tab).bookmarkId === linkId && (active === void 0 || TabData.shares(tab, active)));
    return candidates.sort((first, second) => (second.lastAccessed ?? 0) - (first.lastAccessed ?? 0))[0]?.id;
  }
  async #keepPage(place, linkId, tabId, page) {
    if (place.kind === "grid") {
      return this.#keepAsFavorite(place.target, linkId, tabId, page);
    }
    if (tabId === void 0) {
      const { id } = await this.#deps.tabs.create({ url: page.url, active: false });
      if (id === void 0) {
        return false;
      }
      await this.#rows.to(id, place.target.rowTabId);
      return true;
    }
    await this.#deps.links.unlink(tabId);
    await this.#rows.to(tabId, place.target.rowTabId);
    return true;
  }
  async #keepAsFavorite(target, linkId, tabId, page) {
    if (tabId === void 0) {
      return this.#deps.grid.drop(target, page);
    }
    await this.#deps.links.unlink(tabId);
    const added = await this.#deps.grid.drop(target, { tab: await this.#deps.tabs.get(tabId) }).catch(() => false);
    if (!added) {
      await this.#deps.links.link(tabId, linkId);
    }
    return added;
  }
  async #takeOut(linkId) {
    const result = await this.#deps.favorites.take(linkId);
    if (result === "kept") {
      this.#deps.notify(KEPT_TEXT);
    } else if (result === "failed") {
      this.#deps.notify(FAILED_TEXT);
    }
  }
}
export {
  LinkRemoval
};
