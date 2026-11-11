import { FrameTask } from "./FrameTask.js";
const DRAG_PILL_ATTRIBUTE = "data-vivarcdi-drag-pill";
const OFFSET_PX = 12;
class DragPill {
  static #instances = /* @__PURE__ */ new WeakMap();
  #deps;
  #task;
  #element = null;
  #point = { x: 0, y: 0 };
  /**
   * The pill that follows the pointer while a tab, a link row or a tile is dragged: a white label
   * with the icon and the title of the page, fixed in the window and ignored by the pointer. It
   * follows the pointer with a transform, once per frame, and shows only while the pointer is
   * over the tab bar, so outside it the drag image of Vivaldi is the only one.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
    this.#task = new FrameTask(() => this.#place(), dependencies.timing);
  }
  /**
   * The pill shared by every module of a window, so that two drags never draw two pills.
   *
   * @param scope Usually the browser window document; the same scope gives the same pill.
   * @param selectors Needs `browser` and `tabBar`.
   * @returns The pill of that scope.
   */
  static of(scope, selectors) {
    const existing = DragPill.#instances.get(scope);
    if (existing !== void 0) {
      return existing;
    }
    const created = new DragPill({ document: scope, parentSelector: selectors.get("browser"), tabBarSelector: selectors.get("tabBar") });
    DragPill.#instances.set(scope, created);
    return created;
  }
  /**
   * Reads what the pill shows from a row or a tile: its `title` attribute and its first image.
   *
   * @param element A link row or a tile.
   * @returns The title and the icon address.
   */
  static contentOf(element) {
    return { title: element.getAttribute("title") ?? "", iconUrl: element.querySelector("img")?.getAttribute("src") ?? null };
  }
  /**
   * Draws the pill with a page and puts it at the pointer.
   *
   * @param content The title and the icon.
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  show(content, x, y) {
    this.hide();
    const element = this.#deps.document.createElement("div");
    element.setAttribute(DRAG_PILL_ATTRIBUTE, "");
    element.setAttribute("hidden", "");
    if (content.iconUrl !== null) {
      const icon = this.#deps.document.createElement("img");
      icon.setAttribute("alt", "");
      icon.setAttribute("src", content.iconUrl);
      element.append(icon);
    }
    const title = this.#deps.document.createElement("span");
    title.textContent = content.title;
    element.append(title);
    (this.#deps.document.querySelector(this.#deps.parentSelector) ?? this.#deps.document.body).append(element);
    this.#element = element;
    this.move(x, y);
  }
  /**
   * Follows the pointer on the next frame.
   *
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   */
  move(x, y) {
    this.#point = { x, y };
    this.#task.request();
  }
  /**
   * Removes the pill.
   */
  hide() {
    this.#task.cancel();
    this.#element?.remove();
    this.#element = null;
  }
  #place() {
    const element = this.#element;
    if (element === null) {
      return;
    }
    const { x, y } = this.#point;
    element.toggleAttribute("hidden", !this.#overTabBar(x, y));
    element.style.setProperty("transform", `translate(${x + OFFSET_PX}px, ${y + OFFSET_PX}px)`);
  }
  #overTabBar(x, y) {
    const bar = this.#deps.document.querySelector(this.#deps.tabBarSelector);
    if (bar === null) {
      return false;
    }
    const { left, right, top, bottom } = bar.getBoundingClientRect();
    return x >= left && x < right && y >= top && y < bottom;
  }
}
export {
  DRAG_PILL_ATTRIBUTE,
  DragPill
};
