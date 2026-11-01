class TabDrops {
  #deps;
  /**
   * Turns a tab of today's list released over a target into a link: in a folder at its end, in the
   * root at the position of the drop, or at the end of the root for the header. A tab that is a
   * link, a Favorite, pinned or not a web page is ignored by `WorkspaceFavorites`.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * @param tabId The tab that was released.
   * @param target What was under the pointer, or null for nothing.
   */
  async drop(tabId, target) {
    if (target === null) {
      return;
    }
    try {
      await this.#deps.favorites.add(await this.#deps.tabs.get(tabId), this.#placeOf(target));
    } catch (error) {
      this.#deps.logger.warn("could not add the dropped tab", error);
    }
  }
  #placeOf(target) {
    if (target.kind === "folder") {
      return { parentId: target.id };
    }
    return target.kind === "between" ? { index: this.#deps.indexBefore(target.before) } : {};
  }
}
export {
  TabDrops
};
