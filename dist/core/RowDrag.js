import { DragPill } from "./DragPill.js";
const DRAGGING_ATTRIBUTE = "data-vivarcdi-dragging";
const DRAG_DISTANCE_PX = 6;
const PRIMARY_BUTTON = 0;
class RowDrag {
  #deps;
  #press = null;
  #onDown = (event) => this.#down(event);
  #onMove = (event) => this.#move(event);
  #onUp = (event) => this.#up(event);
  #onClick = (event) => this.#swallow(event);
  /**
   * Follows a row or a tile of VivArcDi being moved with the mouse: the button goes down on it,
   * the pointer moves more than a few pixels, and the button goes up somewhere. The element is
   * dimmed while it is dragged (unless `accepts` refuses its id), a pill with its icon and title follows the pointer, and the click that follows the release is swallowed so it does not
   * open.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies) {
    this.#deps = dependencies;
  }
  /**
   * Starts listening, in the capture phase.
   */
  attach() {
    const { document } = this.#deps;
    document.addEventListener("mousedown", this.#onDown, true);
    document.addEventListener("mousemove", this.#onMove, true);
    document.addEventListener("mouseup", this.#onUp, true);
  }
  /**
   * Stops listening and forgets a drag in progress.
   */
  detach() {
    const { document } = this.#deps;
    document.removeEventListener("mousedown", this.#onDown, true);
    document.removeEventListener("mousemove", this.#onMove, true);
    document.removeEventListener("mouseup", this.#onUp, true);
    document.removeEventListener("click", this.#onClick, true);
    this.#end();
  }
  #down(event) {
    this.#deps.document.removeEventListener("click", this.#onClick, true);
    this.#press = event.button === PRIMARY_BUTTON ? this.#pressOn(event) : null;
  }
  #pressOn(event) {
    const element = this.#elementOf(event.target);
    const id = element?.getAttribute(this.#deps.idAttribute) ?? null;
    const accepted = element !== null && id !== null && (this.#deps.accepts?.(id) ?? true);
    return accepted ? { element, id, x: event.clientX, y: event.clientY, dragging: false } : null;
  }
  #move(event) {
    const press = this.#press;
    if (press === null) {
      return;
    }
    if (event.buttons === 0) {
      this.#end();
      return;
    }
    if (!press.dragging && Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRAG_DISTANCE_PX) {
      press.dragging = true;
      press.element.setAttribute(DRAGGING_ATTRIBUTE, "");
      this.#deps.pill?.show(DragPill.contentOf(press.element), event.clientX, event.clientY);
    }
    if (press.dragging) {
      this.#deps.pill?.move(event.clientX, event.clientY);
      this.#deps.onMove(press.id, event.clientX, event.clientY);
    }
  }
  #up(event) {
    const press = this.#press;
    if (press?.dragging === true) {
      this.#deps.document.addEventListener("click", this.#onClick, true);
      this.#deps.onDrop(press.id, event.clientX, event.clientY);
    }
    this.#end();
  }
  #end() {
    const press = this.#press;
    this.#press = null;
    press?.element.removeAttribute(DRAGGING_ATTRIBUTE);
    if (press?.dragging === true) {
      this.#deps.pill?.hide();
      this.#deps.onEnd();
    }
  }
  #swallow(event) {
    this.#deps.document.removeEventListener("click", this.#onClick, true);
    event.preventDefault();
    event.stopPropagation();
  }
  #elementOf(target) {
    const element = target?.closest?.(this.#deps.selector);
    const container = this.#deps.container();
    return element != null && container !== null && element.parentElement === container ? element : null;
  }
}
export {
  DRAGGING_ATTRIBUTE,
  RowDrag
};
