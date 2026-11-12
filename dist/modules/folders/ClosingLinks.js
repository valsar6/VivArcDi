class ClosingLinks {
  #ids = /* @__PURE__ */ new Set();
  /**
   * The links whose tabs are about to close because their folder is being deleted. The section
   * leaves the tabs of these links alone, so they do not flash back into today's list first.
   */
  constructor() {
    this.#ids.clear();
  }
  /**
   * @param ids Links whose tabs are about to close.
   */
  add(ids) {
    for (const id of ids) {
      this.#ids.add(id);
    }
  }
  /**
   * @param ids Links whose tabs are closed, or will not close after all.
   */
  clear(ids) {
    for (const id of ids) {
      this.#ids.delete(id);
    }
  }
  /**
   * @param id A link.
   * @returns Whether its tabs are about to close.
   */
  has(id) {
    return this.#ids.has(id);
  }
}
export {
  ClosingLinks
};
