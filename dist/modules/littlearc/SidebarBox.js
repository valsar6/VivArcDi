const ORIGIN = 0;
function measure(element) {
  if (typeof element.getBoundingClientRect !== "function") {
    return null;
  }
  const rect = element.getBoundingClientRect();
  return rect.width <= ORIGIN || rect.height <= ORIGIN ? null : rect;
}
class SidebarBox {
  left;
  right;
  top;
  bottom;
  /**
   * A rendered sidebar in screen coordinates.
   *
   * @param left Left edge in pixels.
   * @param right Right edge in pixels.
   * @param top Top edge in pixels.
   * @param bottom Bottom edge in pixels.
   */
  constructor(left, right, top, bottom) {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
  }
  /**
   * @param document The window's interface document.
   * @param selector The selector of the vertical tab bar.
   * @returns The box, or null when the sidebar is missing or hidden.
   */
  static read(document, selector) {
    const element = document.querySelector(selector);
    if (element === null) {
      return null;
    }
    const rect = measure(element);
    if (rect === null) {
      return null;
    }
    const offsetLeft = document.defaultView?.screenX ?? ORIGIN;
    const offsetTop = document.defaultView?.screenY ?? ORIGIN;
    return new SidebarBox(
      offsetLeft + rect.left,
      offsetLeft + rect.right,
      offsetTop + rect.top,
      offsetTop + rect.bottom
    );
  }
}
function sidebarOf(context) {
  if (!context.selectors.has("verticalTabBar")) {
    return null;
  }
  return SidebarBox.read(context.document, context.selectors.get("verticalTabBar"));
}
export {
  SidebarBox,
  sidebarOf
};
