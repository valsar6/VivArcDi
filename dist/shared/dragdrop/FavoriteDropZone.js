class FavoriteDropZone {
  static #instances = /* @__PURE__ */ new WeakMap();
  #targets = null;
  /**
   * The places where a dragged page can become a Favorite, shared so that no module calls
   * another: the Favorites register their grid, and whoever drags a page asks. It mirrors
   * `LinkDropZone`.
   *
   * @param scope Usually the browser window document; the same scope gives the same zone.
   * @returns The zone shared by every module of that scope.
   */
  static of(scope) {
    const existing = FavoriteDropZone.#instances.get(scope);
    if (existing !== void 0) {
      return existing;
    }
    const created = new FavoriteDropZone();
    FavoriteDropZone.#instances.set(scope, created);
    return created;
  }
  /**
   * @returns Whether the Favorites have registered their grid.
   */
  get available() {
    return this.#targets !== null;
  }
  /**
   * @param targets The places of the Favorites.
   * @returns A function that removes them, if they are still the registered ones.
   */
  register(targets) {
    this.#targets = targets;
    return () => {
      if (this.#targets === targets) {
        this.#targets = null;
      }
    };
  }
  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The place under the point, or null when there is none or nothing is registered.
   */
  at(x, y) {
    return this.#targets?.at(x, y) ?? null;
  }
  /**
   * @param target The place to mark, or null to unmark.
   */
  mark(target) {
    this.#targets?.mark(target);
  }
  /**
   * Removes the marks.
   */
  clear() {
    this.#targets?.clear();
  }
  /**
   * @returns The place at the end of the grid, or null when nothing is registered.
   */
  end() {
    return this.#targets?.end() ?? null;
  }
  /**
   * @param target A place given by `at`.
   * @param page The page to add there.
   * @returns Whether a Favorite was added; false when nothing is registered.
   */
  async drop(target, page) {
    return await this.#targets?.drop(target, page) ?? false;
  }
}
export {
  FavoriteDropZone
};
