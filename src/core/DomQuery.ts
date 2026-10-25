export class DomQuery {
  /**
   * Finds an element that must exist.
   *
   * @param root Document or element to search in.
   * @param selector CSS selector of the element.
   * @returns The first matching element.
   * @throws {Error} When nothing matches.
   */
  public static require<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (element === null) {
      throw new Error(`Element not found: ${selector}`);
    }
    return element;
  }
}
