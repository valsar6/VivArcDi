class DomQuery {
  /**
   * Finds an element that must exist.
   *
   * @param root Document or element to search in.
   * @param selector CSS selector of the element.
   * @returns The first matching element.
   * @throws {Error} When nothing matches.
   */
  static require(root, selector) {
    const element = root.querySelector(selector);
    if (element === null) {
      throw new Error(`Element not found: ${selector}`);
    }
    return element;
  }
}
export {
  DomQuery
};
