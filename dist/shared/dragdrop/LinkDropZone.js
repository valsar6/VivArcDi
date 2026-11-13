class LinkDropZone {
  static #instances = /* @__PURE__ */ new WeakMap();
  #targets = null;
  /**
   * The places where a dragged page can become a link of the workspace, shared so that no module
   * calls another: the folders section registers its places, and whoever drags a page asks.
   *
   * @param scope Usually the browser window document; the same scope gives the same zone.
   * @returns The zone shared by every module of that scope.
   */
  static of(scope) {
    const existing = LinkDropZone.#instances.get(scope);
    if (existing !== void 0) {
      return existing;
    }
    const created = new LinkDropZone();
    LinkDropZone.#instances.set(scope, created);
    return created;
  }
  /**
   * @returns Whether a section has registered its places.
   */
  get available() {
    return this.#targets !== null;
  }
  /**
   * @param targets The places of a section.
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
   * @returns The place at the end of the workspace favorites, or null when nothing is registered.
   */
  end() {
    return this.#targets?.end() ?? null;
  }
  /**
   * @param target A place given by `at`.
   * @param page The page to add there.
   * @returns Whether a link was added; false when nothing is registered.
   */
  async drop(target, page) {
    return await this.#targets?.drop(target, page) ?? false;
  }
}
export {
  LinkDropZone
};
